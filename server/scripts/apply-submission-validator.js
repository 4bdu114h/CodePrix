/**
 * Applies MongoDB native $jsonSchema validation to the submissions collection.
 * Run with: node scripts/apply-submission-validator.js
 * Requires: MONGO_URI in .env (uses same DB config as server)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['user', 'problem', 'language', 'code', 'status'],
    properties: {
      user: { bsonType: 'objectId' },
      problem: { bsonType: 'objectId' },
      contest: { bsonType: ['objectId', 'null'] },
      language: {
        enum: ['cpp', 'java', 'python', 'javascript'],
        description: 'Must be one of the supported runtime environments.',
      },
      code: {
        bsonType: 'string',
        maxLength: 65536,
        description: 'Hard limit 64KB to prevent BSON document bloat.',
      },
      status: {
        enum: ['PEND', 'RUN', 'AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'IE'],
      },
      metrics: {
        bsonType: 'object',
        properties: {
          time: { bsonType: ['int', 'double'], minimum: 0, maximum: 15000 },
          memory: { bsonType: ['int', 'double'], minimum: 0, maximum: 1024000 },
        },
      },
      failedTestCase: { bsonType: ['int', 'null'], minimum: 0 },
      logs: {
        bsonType: 'object',
        properties: {
          stdout: { bsonType: 'string', maxLength: 2048 },
          stderr: { bsonType: 'string', maxLength: 2048 },
        },
      },
      createdAt: { bsonType: 'date' },
    },
  },
};

async function main() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: 'submissions' }).toArray();
    const exists = collections.length > 0;

    if (exists) {
      await db.command({
        collMod: 'submissions',
        validator,
        validationLevel: 'strict',
        validationAction: 'error',
      });
      console.log('Successfully applied $jsonSchema validator to existing submissions collection.');
    } else {
      await db.createCollection('submissions', {
        validator,
        validationLevel: 'strict',
        validationAction: 'error',
      });
      console.log('Successfully created submissions collection with $jsonSchema validator.');
    }
  } catch (err) {
    console.error('Failed to apply validator:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
