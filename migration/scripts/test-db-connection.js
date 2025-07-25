#!/usr/bin/env node

// Test Database Connection
// This script verifies that the database connection is working

import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Try to query users table
    const userCount = await db.select().from(users).limit(1);
    console.log('✅ Database connection successful!');
    console.log(`   Found ${userCount.length} user(s) in the database\n`);
    
    if (userCount.length > 0) {
      console.log('📋 Sample user:');
      console.log(`   Email: ${userCount[0].email}`);
      console.log(`   Role: ${userCount[0].role}`);
    }
    
    console.log('\n✅ Database is ready for migration!');
    console.log('\n📌 Next step: Run one of the migration scripts:');
    console.log('   node migration/scripts/read-and-migrate-pdfs.js');
    
  } catch (error) {
    console.error('❌ Database connection failed!\n');
    console.error('Error:', error.message);
    console.error('\n🔍 Troubleshooting steps:');
    console.error('1. Check if DATABASE_URL is set in your environment:');
    console.error('   echo $DATABASE_URL');
    console.error('\n2. Ensure the database URL includes SSL mode:');
    console.error('   postgresql://user:pass@host/db?sslmode=require');
    console.error('\n3. Run database schema push:');
    console.error('   npm run db:push');
    console.error('\n4. Check if you have a .env or .env.local file with:');
    console.error('   DATABASE_URL="your-database-url"');
    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);