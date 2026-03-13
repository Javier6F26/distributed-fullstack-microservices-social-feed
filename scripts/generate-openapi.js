#!/usr/bin/env node

/**
 * Generate OpenAPI Specs from Running Services
 * 
 * This script fetches OpenAPI specifications from all running microservices
 * and saves them to the docs/openapi folder.
 * 
 * Usage:
 *   npm run generate:openapi
 * 
 * Requirements:
 *   - All services must be running
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SERVICES = [
  { name: 'api-gateway', url: 'http://localhost:3000/docs-json' },
  { name: 'user-service', url: 'http://localhost:3001/docs-json' },
  { name: 'post-service', url: 'http://localhost:3002/docs-json' },
  { name: 'comment-service', url: 'http://localhost:3003/docs-json' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'openapi');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetch OpenAPI spec from a service
 */
function fetchOpenApiSpec(service) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching OpenAPI spec from ${service.name}...`);
    
    https.get(service.url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const spec = JSON.parse(data);
          resolve(spec);
        } catch (error) {
          reject(new Error(`Failed to parse JSON from ${service.name}: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      // If https fails, try http
      const http = require('http');
      http.get(service.url.replace('https://', 'http://'), (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const spec = JSON.parse(data);
            resolve(spec);
          } catch (error) {
            reject(new Error(`Failed to fetch from ${service.name}: ${error.message}`));
          }
        });
      }).on('error', reject);
    });
  });
}

/**
 * Save OpenAPI spec to file
 */
function saveOpenApiSpec(name, spec) {
  const filePath = path.join(OUTPUT_DIR, `openapi-${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(spec, null, 2));
  console.log(`✓ Saved: ${filePath}`);
}

/**
 * Merge all OpenAPI specs into one
 */
function mergeOpenApiSpecs(specs) {
  const merged = {
    openapi: '3.0.0',
    info: {
      title: 'Distributed Fullstack Microservices API',
      version: '1.0.0',
      description: 'Complete API documentation for all microservices'
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'API Gateway' },
      { url: 'http://localhost:3001', description: 'User Service' },
      { url: 'http://localhost:3002', description: 'Post Service' },
      { url: 'http://localhost:3003', description: 'Comment Service' }
    ],
    paths: {},
    components: {
      schemas: {}
    }
  };

  specs.forEach(({ name, spec }) => {
    // Merge paths with service prefix
    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, methods]) => {
        const prefixedPath = name === 'api-gateway' ? path : `/${name}${path}`;
        merged.paths[prefixedPath] = {
          ...merged.paths[prefixedPath],
          ...methods
        };
      });
    }

    // Merge schemas
    if (spec.components?.schemas) {
      merged.components.schemas = {
        ...merged.components.schemas,
        ...spec.components.schemas
      };
    }
  });

  return merged;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Generating OpenAPI Specifications...\n');
  
  const specs = [];
  
  for (const service of SERVICES) {
    try {
      const spec = await fetchOpenApiSpec(service);
      saveOpenApiSpec(service.name, spec);
      specs.push({ name: service.name, spec });
    } catch (error) {
      console.error(`✗ Failed to fetch from ${service.name}: ${error.message}`);
      console.error(`  Make sure ${service.name} is running at ${service.url}`);
    }
  }

  if (specs.length > 0) {
    // Save merged spec
    const merged = mergeOpenApiSpecs(specs);
    const mergedPath = path.join(OUTPUT_DIR, 'openapi-merged.json');
    fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2));
    console.log(`✓ Saved merged spec: ${mergedPath}`);
    
    console.log(`\n✅ Generated ${specs.length} OpenAPI specs successfully!`);
    console.log(`\nFiles created:`);
    console.log(`  - docs/openapi/openapi-<service>.json (individual specs)`);
    console.log(`  - docs/openapi/openapi-merged.json (combined spec)`);
  } else {
    console.error('\n❌ Failed to generate any OpenAPI specs.');
    console.error('Make sure at least one service is running.');
    process.exit(1);
  }
}

main();
