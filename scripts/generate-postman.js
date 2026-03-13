#!/usr/bin/env node

/**
 * Generate Postman Collections from OpenAPI Specs
 * 
 * This script converts OpenAPI specifications to Postman collections
 * and saves them to the docs/postman folder.
 * 
 * Usage:
 *   npm run generate:postman
 * 
 * Requirements:
 *   - OpenAPI specs must exist in docs/openapi/
 *   - Run 'npm run generate:openapi' first if services are running
 */

const fs = require('fs');
const path = require('path');
const openapiToPostman = require('openapi-to-postmanv2');

const OPENAPI_DIR = path.join(__dirname, '..', 'docs', 'openapi');
const POSTMAN_DIR = path.join(__dirname, '..', 'docs', 'postman');

const SERVICES = [
  { name: 'api-gateway', file: 'openapi-api-gateway.json' },
  { name: 'user-service', file: 'openapi-user-service.json' },
  { name: 'post-service', file: 'openapi-post-service.json' },
  { name: 'comment-service', file: 'openapi-comment-service.json' },
];

// Ensure output directory exists
if (!fs.existsSync(POSTMAN_DIR)) {
  fs.mkdirSync(POSTMAN_DIR, { recursive: true });
}

/**
 * Convert OpenAPI spec to Postman collection
 */
function convertToPostman(openApiPath, serviceName) {
  return new Promise((resolve, reject) => {
    console.log(`Converting ${serviceName} to Postman collection...`);
    
    const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
    
    const conversionOptions = {
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            value: 'Bearer {{accessToken}}'
          }
        }
      },
      variables: {
        baseUrl: {
          type: 'string',
          value: serviceName === 'api-gateway' 
            ? 'http://localhost:3000/api/v1'
            : `http://localhost:${serviceName === 'user-service' ? '3001' : serviceName === 'post-service' ? '3002' : '3003'}`
        }
      }
    };

    openapiToPostman.convert(openApiSpec, conversionOptions, (err, status) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!status.result) {
        reject(new Error(status.reason || 'Conversion failed'));
        return;
      }
      
      resolve(status.output[0].data);
    });
  });
}

/**
 * Save Postman collection to file
 */
function savePostmanCollection(name, collection) {
  const filePath = path.join(POSTMAN_DIR, `Postman_${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(collection, null, 2));
  console.log(`✓ Saved: ${filePath}`);
  return filePath;
}

/**
 * Create Postman environment file
 */
function createEnvironment() {
  const environment = {
    id: 'distributed-fullstack-env',
    name: 'Distributed Fullstack API - Local',
    values: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000/api/v1',
        type: 'default',
        enabled: true
      },
      {
        key: 'userUrl',
        value: 'http://localhost:3001',
        type: 'default',
        enabled: true
      },
      {
        key: 'postUrl',
        value: 'http://localhost:3002',
        type: 'default',
        enabled: true
      },
      {
        key: 'commentUrl',
        value: 'http://localhost:3003',
        type: 'default',
        enabled: true
      },
      {
        key: 'accessToken',
        value: '',
        type: 'secret',
        enabled: true
      },
      {
        key: 'refreshToken',
        value: '',
        type: 'secret',
        enabled: true
      }
    ],
    _postman_variable_scope: 'environment'
  };

  const filePath = path.join(POSTMAN_DIR, 'Postman_Environment.json');
  fs.writeFileSync(filePath, JSON.stringify(environment, null, 2));
  console.log(`✓ Saved: ${filePath}`);
  return filePath;
}

/**
 * Merge all Postman collections into one
 */
function mergeCollections(collections) {
  const merged = {
    info: {
      name: 'Distributed Fullstack Microservices',
      description: 'Complete API collection for all microservices',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [],
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000/api/v1',
        type: 'string'
      },
      {
        key: 'userUrl',
        value: 'http://localhost:3001',
        type: 'string'
      },
      {
        key: 'postUrl',
        value: 'http://localhost:3002',
        type: 'string'
      },
      {
        key: 'commentUrl',
        value: 'http://localhost:3003',
        type: 'string'
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string'
      },
      {
        key: 'refreshToken',
        value: '',
        type: 'string'
      }
    ]
  };

  collections.forEach(({ name, collection }) => {
    const serviceFolder = {
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '),
      item: collection.item || []
    };
    merged.item.push(serviceFolder);
  });

  return merged;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Generating Postman Collections...\n');
  
  // Check if OpenAPI specs exist
  if (!fs.existsSync(OPENAPI_DIR)) {
    console.error('❌ OpenAPI directory not found!');
    console.error('Run "npm run generate:openapi" first or ensure services are running.');
    process.exit(1);
  }

  const collections = [];
  
  for (const service of SERVICES) {
    const openApiPath = path.join(OPENAPI_DIR, service.file);
    
    if (!fs.existsSync(openApiPath)) {
      console.warn(`⚠ Skipping ${service.name}: OpenAPI spec not found at ${openApiPath}`);
      console.warn('  Run "npm run generate:openapi" first.');
      continue;
    }

    try {
      const postmanCollection = await convertToPostman(openApiPath, service.name);
      savePostmanCollection(service.name, postmanCollection);
      collections.push({ name: service.name, collection: postmanCollection });
    } catch (error) {
      console.error(`✗ Failed to convert ${service.name}: ${error.message}`);
    }
  }

  if (collections.length > 0) {
    // Save merged collection
    const merged = mergeCollections(collections);
    const mergedPath = path.join(POSTMAN_DIR, 'Postman_Collection.json');
    fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2));
    console.log(`✓ Saved merged collection: ${mergedPath}`);

    // Create environment
    createEnvironment();
    
    console.log(`\n✅ Generated ${collections.length} Postman collections successfully!`);
    console.log(`\nFiles created:`);
    console.log(`  - docs/postman/Postman_<service>.json (individual collections)`);
    console.log(`  - docs/postman/Postman_Collection.json (merged collection)`);
    console.log(`  - docs/postman/Postman_Environment.json (environment variables)`);
    console.log(`\n📥 Import to Postman:`);
    console.log(`  1. Open Postman`);
    console.log(`  2. Click Import`);
    console.log(`  3. Select Postman_Collection.json and Postman_Environment.json`);
  } else {
    console.error('\n❌ Failed to generate any Postman collections.');
    console.error('Make sure OpenAPI specs exist in docs/openapi/');
    process.exit(1);
  }
}

main();
