/**
 * Prepare Wrangler Build
 * 
 * This script prepares the build output for deployment to Cloudflare Workers.
 * It copies the compiled index.js file to the root dist directory where Wrangler expects it.
 */

const fs = require('fs');
const path = require('path');

console.log('Preparing build for Wrangler deployment...');

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log('Created dist directory');
}

// Source file
const sourceFile = path.join(distDir, 'src', 'index.js');
if (!fs.existsSync(sourceFile)) {
  console.error(`Error: Source file ${sourceFile} does not exist!`);
  process.exit(1);
}

// Target file
const targetFile = path.join(distDir, 'index.js');

// Copy the file
try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`Successfully copied ${sourceFile} to ${targetFile}`);
  
  // Also copy the source map file if it exists
  const sourceMapFile = `${sourceFile}.map`;
  const targetMapFile = `${targetFile}.map`;
  
  if (fs.existsSync(sourceMapFile)) {
    fs.copyFileSync(sourceMapFile, targetMapFile);
    console.log(`Successfully copied source map ${sourceMapFile} to ${targetMapFile}`);
  }
  
  // Also copy type definitions if they exist
  const sourceTypeFile = sourceFile.replace('.js', '.d.ts');
  const targetTypeFile = targetFile.replace('.js', '.d.ts');
  
  if (fs.existsSync(sourceTypeFile)) {
    fs.copyFileSync(sourceTypeFile, targetTypeFile);
    console.log(`Successfully copied type definitions ${sourceTypeFile} to ${targetTypeFile}`);
  }
  
  console.log('Build is now ready for Wrangler deployment');
} catch (error) {
  console.error('Error while preparing build:', error);
  process.exit(1);
} 