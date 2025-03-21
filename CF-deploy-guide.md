# Cloudflare Workers Deployment Guide

This guide explains how to deploy the Agentic Workflow TypeScript application to Cloudflare Workers, including troubleshooting common issues.

## Prerequisites

1. Node.js (v18+) installed
2. Cloudflare account with Workers access
3. Wrangler CLI installed: `npm install -g wrangler`
4. Authentication with Cloudflare: `wrangler login`

## Deployment Process

### 1. Prepare the Build

Ensure your project is correctly configured:

- Verify `wrangler.toml` points to the correct build output: `main = "dist/src/index.js"`
- Check that TypeScript configuration (`tsconfig.json` and `tsconfig.build.json`) has the correct output directory
- Make sure all dependencies are properly synchronized: `npm install`

### 2. Run the Build

Use one of the following methods:

```bash
# Standard build
npm run build:clean

# Worker-specific build
npm run build:worker
```

### 3. Deploy to Cloudflare

```bash
# Deploy to production
npm run deploy

# Deploy to development environment
npm run deploy:dev

# Start local development server
npm run wrangler:dev
```

## Configuration Files

### wrangler.toml

```toml
name = "agentic-workflow"
main = "dist/src/index.js"
compatibility_date = "2024-03-21"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"

[build.upload]
format = "modules"

[vars]
NODE_ENV = "production"

[[d1_databases]]
binding = "DB"
database_name = "bitebasedb"
database_id = "55ceede4-df98-49fd-9c17-c00d860fba86"
```

### package.json Scripts

Ensure your package.json contains these scripts:

```json
"scripts": {
  "build": "tsc -p tsconfig.build.json",
  "deploy": "wrangler deploy",
  "deploy:dev": "wrangler deploy --env development",
  "wrangler:dev": "wrangler dev",
  "clean": "rimraf dist",
  "build:clean": "npm run clean && npm run build",
  "build:worker": "npm run build && cp wrangler.toml dist/"
}
```

## Common Issues and Solutions

### 1. "Cannot find module" Errors

If you encounter module resolution errors:

- Check that all dependencies are installed: `npm install`
- Verify the `modules` field in `tsconfig.json` is set to `"commonjs"`
- Ensure TypeScript is compiling to the correct output format

### 2. Entry Point Not Found

If Wrangler can't find your entry point:

- Verify the `main` field in `wrangler.toml` matches your actual build output
- Check that TypeScript is outputting files to the expected directory
- Run `find dist -name "index.js"` to locate the actual build output

### 3. Database Connection Issues

If D1 database connections fail:

- Ensure the D1 database exists in your Cloudflare account
- Verify the `database_id` in `wrangler.toml` matches your D1 database
- Make sure your application correctly accesses the database via the env binding

### 4. Dependency Synchronization

If deployment fails due to package-lock.json mismatches:

- Run `npm install` locally before deployment
- Update deployment scripts to include `npm install` before building
- Consider using `npm ci` only after ensuring lock files are synchronized

## Upgrading Wrangler

It's recommended to use the latest version of Wrangler:

```bash
npm install wrangler@latest --save-dev
```

Then update your scripts to use the newer commands:
- `wrangler deploy` instead of `wrangler publish`
- `wrangler dev` for local development

## CI/CD Integration

For GitHub Actions workflows, use this template:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: npm install
        
      - name: Build Application
        run: npm run build
        
      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Monitoring and Logs

After deployment, you can monitor your application:

- View real-time logs: `wrangler tail`
- Set up Cloudflare Analytics for performance monitoring
- Use the Cloudflare Dashboard to view request statistics 