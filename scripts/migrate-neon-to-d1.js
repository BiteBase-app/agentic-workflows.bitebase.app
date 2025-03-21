/**
 * Migration script to move data from Neon (PostgreSQL) to Cloudflare D1 (SQLite)
 * 
 * This script:
 * 1. Connects to Neon PostgreSQL database
 * 2. Extracts all data from the relevant tables
 * 3. Transforms data if needed for SQLite compatibility
 * 4. Loads data into Cloudflare D1 database
 * 
 * Usage:
 * - Set NEON_CONNECTION_STRING in environment variables
 *   - Bash: export NEON_CONNECTION_STRING="postgresql://username:password@hostname:port/database"
 *   - PowerShell: $env:NEON_CONNECTION_STRING="postgresql://username:password@hostname:port/database"
 * - Run: node scripts/migrate-neon-to-d1.js
 */

const { Client } = require('pg');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Configuration
const NEON_CONNECTION_STRING = process.env.NEON_CONNECTION_STRING;
const TEMP_DIR = path.join(__dirname, 'temp');
const D1_DATABASE_NAME = process.env.D1_DATABASE_NAME || 'agentic-workflow-db';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Connect to Neon PostgreSQL
 */
async function connectToNeon() {
  if (!NEON_CONNECTION_STRING) {
    throw new Error('NEON_CONNECTION_STRING environment variable is required');
  }
  
  const client = new Client({
    connectionString: NEON_CONNECTION_STRING,
  });
  
  await client.connect();
  console.log('Connected to Neon PostgreSQL database');
  return client;
}

/**
 * Extract data from PostgreSQL tables
 */
async function extractDataFromNeon(client) {
  console.log('Extracting data from Neon...');
  
  // Define tables to migrate
  const tables = [
    'workflow_executions',
    'analysis_requests',
    'agent_executions'
  ];
  
  const data = {};
  
  for (const table of tables) {
    console.log(`Extracting data from table: ${table}`);
    const result = await client.query(`SELECT * FROM ${table}`);
    data[table] = result.rows;
    console.log(`Extracted ${result.rows.length} rows from ${table}`);
  }
  
  return data;
}

/**
 * Transform data for SQLite compatibility if needed
 */
function transformData(data) {
  console.log('Transforming data for SQLite compatibility...');
  
  const transformed = JSON.parse(JSON.stringify(data));
  
  // Handle specific transformations for each table
  
  // workflow_executions: Handle JSON columns and date formats
  if (transformed.workflow_executions) {
    transformed.workflow_executions = transformed.workflow_executions.map(row => {
      // Convert JSON objects to strings if they're not already
      if (row.input_data && typeof row.input_data !== 'string') {
        row.input_data = JSON.stringify(row.input_data);
      }
      if (row.output_data && typeof row.output_data !== 'string') {
        row.output_data = JSON.stringify(row.output_data);
      }
      return row;
    });
  }
  
  // analysis_requests: Handle JSON columns and date formats
  if (transformed.analysis_requests) {
    transformed.analysis_requests = transformed.analysis_requests.map(row => {
      // Convert JSON objects to strings if they're not already
      if (row.request_data && typeof row.request_data !== 'string') {
        row.request_data = JSON.stringify(row.request_data);
      }
      if (row.result_data && typeof row.result_data !== 'string') {
        row.result_data = JSON.stringify(row.result_data);
      }
      
      // Ensure analysis_types is a comma-separated string
      if (Array.isArray(row.analysis_types)) {
        row.analysis_types = row.analysis_types.join(',');
      }
      
      return row;
    });
  }
  
  // agent_executions: Handle JSON columns and date formats
  if (transformed.agent_executions) {
    transformed.agent_executions = transformed.agent_executions.map(row => {
      // Convert JSON objects to strings if they're not already
      if (row.input_data && typeof row.input_data !== 'string') {
        row.input_data = JSON.stringify(row.input_data);
      }
      if (row.output_data && typeof row.output_data !== 'string') {
        row.output_data = JSON.stringify(row.output_data);
      }
      return row;
    });
  }
  
  return transformed;
}

/**
 * Generate SQL files for D1 import
 */
function generateSqlFiles(data) {
  console.log('Generating SQL files for D1 import...');
  
  // Clear any existing SQL files in the temp directory
  const sqlFiles = fs.readdirSync(TEMP_DIR).filter(file => file.endsWith('.sql'));
  for (const file of sqlFiles) {
    fs.unlinkSync(path.join(TEMP_DIR, file));
  }
  
  const sqlFilePaths = {};
  
  for (const [table, rows] of Object.entries(data)) {
    if (!rows || rows.length === 0) {
      console.log(`No data for table ${table}, skipping`);
      continue;
    }
    
    const filePath = path.join(TEMP_DIR, `${table}.sql`);
    let sql = '';
    
    // Generate INSERT statements
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const value = row[col];
        
        if (value === null || value === undefined) {
          return 'NULL';
        } else if (typeof value === 'string') {
          // Escape single quotes and wrap in single quotes
          return `'${value.replace(/'/g, "''")}'`;
        } else if (value instanceof Date) {
          return `'${value.toISOString()}'`;
        } else {
          return `'${value}'`;
        }
      });
      
      sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    fs.writeFileSync(filePath, sql);
    sqlFilePaths[table] = filePath;
    console.log(`Generated SQL file for table ${table} at ${filePath}`);
  }
  
  return sqlFilePaths;
}

/**
 * Import data into Cloudflare D1
 */
async function importDataToD1(sqlFilePaths) {
  console.log('Importing data into Cloudflare D1...');
  
  for (const [table, filePath] of Object.entries(sqlFilePaths)) {
    try {
      console.log(`Importing data for table ${table}...`);
      
      // Execute the D1 command to execute SQL
      const { stdout, stderr } = await execPromise(
        `wrangler d1 execute ${D1_DATABASE_NAME} --file=${filePath}`
      );
      
      if (stderr) {
        console.error(`Error importing table ${table}:`, stderr);
      } else {
        console.log(`Successfully imported data for table ${table}`);
        console.log(stdout);
      }
    } catch (error) {
      console.error(`Failed to import data for table ${table}:`, error);
    }
  }
}

/**
 * Verify data migration
 */
async function verifyMigration() {
  console.log('Verifying data migration...');
  
  // Define tables to verify
  const tables = [
    'workflow_executions',
    'analysis_requests',
    'agent_executions'
  ];
  
  for (const table of tables) {
    try {
      console.log(`Verifying data for table ${table}...`);
      
      // Execute the D1 command to count rows
      const { stdout, stderr } = await execPromise(
        `wrangler d1 execute ${D1_DATABASE_NAME} --command="SELECT COUNT(*) AS count FROM ${table}"`
      );
      
      if (stderr) {
        console.error(`Error verifying table ${table}:`, stderr);
      } else {
        console.log(`Table ${table} verification:`, stdout);
      }
    } catch (error) {
      console.error(`Failed to verify data for table ${table}:`, error);
    }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('Starting migration from Neon to D1...');
  
  let client;
  try {
    // Connect to Neon
    client = await connectToNeon();
    
    // Extract data
    const data = await extractDataFromNeon(client);
    
    // Transform data
    const transformedData = transformData(data);
    
    // Generate SQL files
    const sqlFilePaths = generateSqlFiles(transformedData);
    
    // Import data to D1
    await importDataToD1(sqlFilePaths);
    
    // Verify migration
    await verifyMigration();
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    if (client) {
      await client.end();
      console.log('Closed Neon database connection');
    }
  }
}

// Run the migration
migrate().catch(error => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
}); 