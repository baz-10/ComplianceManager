#!/usr/bin/env node

// Database Export/Import Script for ComplianceManager
// Allows you to export data locally and import it on Replit

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import { manuals, sections, policies, policyVersions, users } from '../../db/schema.js';
import { sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportData() {
  try {
    console.log('📤 Exporting data from database...\n');
    
    // Export all relevant tables
    const data = {
      exportDate: new Date().toISOString(),
      manuals: await db.select().from(manuals),
      sections: await db.select().from(sections),
      policies: await db.select().from(policies),
      policyVersions: await db.select().from(policyVersions)
    };
    
    // Save to file
    const exportPath = path.join(__dirname, '../data-export.json');
    await fs.writeFile(exportPath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Data exported successfully to: ${exportPath}`);
    console.log(`\n📊 Export summary:`);
    console.log(`  - Manuals: ${data.manuals.length}`);
    console.log(`  - Sections: ${data.sections.length}`);
    console.log(`  - Policies: ${data.policies.length}`);
    console.log(`  - Policy Versions: ${data.policyVersions.length}`);
    
    console.log('\n📌 Next steps:');
    console.log('  1. Copy data-export.json to your Replit instance');
    console.log('  2. Run: node migration/scripts/export-import-data.js import');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

async function importData() {
  try {
    console.log('📥 Importing data to database...\n');
    
    // Read export file
    const exportPath = path.join(__dirname, '../data-export.json');
    const dataString = await fs.readFile(exportPath, 'utf-8');
    const data = JSON.parse(dataString);
    
    console.log(`📅 Import file date: ${data.exportDate}`);
    console.log('\n⚠️  WARNING: This will add to existing data, not replace it.');
    console.log('   If you need a clean import, truncate tables first.\n');
    
    // Import in correct order (respecting foreign keys)
    
    // 1. Import manuals
    if (data.manuals.length > 0) {
      console.log(`Importing ${data.manuals.length} manuals...`);
      for (const manual of data.manuals) {
        // Check if user exists, if not use first admin
        let userId = manual.createdById;
        const userExists = await db.select().from(users).where(sql`id = ${userId}`).limit(1);
        if (userExists.length === 0) {
          const [admin] = await db.select().from(users).where(sql`role = 'ADMIN'`).limit(1);
          userId = admin?.id || (await createMigrationUser()).id;
        }
        
        await db.insert(manuals).values({
          ...manual,
          createdById: userId,
          createdAt: new Date(manual.createdAt),
          updatedAt: new Date(manual.updatedAt)
        });
      }
      console.log('✅ Manuals imported');
    }
    
    // 2. Import sections
    if (data.sections.length > 0) {
      console.log(`Importing ${data.sections.length} sections...`);
      for (const section of data.sections) {
        await db.insert(sections).values({
          ...section,
          createdAt: new Date(section.createdAt),
          updatedAt: new Date(section.updatedAt)
        });
      }
      console.log('✅ Sections imported');
    }
    
    // 3. Import policies
    if (data.policies.length > 0) {
      console.log(`Importing ${data.policies.length} policies...`);
      for (const policy of data.policies) {
        await db.insert(policies).values({
          ...policy,
          createdAt: new Date(policy.createdAt),
          updatedAt: new Date(policy.updatedAt)
        });
      }
      console.log('✅ Policies imported');
    }
    
    // 4. Import policy versions
    if (data.policyVersions.length > 0) {
      console.log(`Importing ${data.policyVersions.length} policy versions...`);
      for (const version of data.policyVersions) {
        await db.insert(policyVersions).values({
          ...version,
          effectiveDate: new Date(version.effectiveDate),
          createdAt: new Date(version.createdAt)
        });
      }
      console.log('✅ Policy versions imported');
    }
    
    console.log('\n✅ Import completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('  1. Run "npm run dev" to start the application');
    console.log('  2. Navigate to http://localhost:5000/manuals');
    console.log('  3. Review the imported content');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('\n🔍 Common issues:');
    console.error('  - Ensure data-export.json exists in migration/ directory');
    console.error('  - Check for duplicate ID conflicts');
    console.error('  - Verify database schema matches export');
    process.exit(1);
  }
}

async function createMigrationUser() {
  const [user] = await db.insert(users)
    .values({
      email: 'migration@opdocs.local',
      name: 'Migration Admin',
      role: 'ADMIN',
      password: 'not-used'
    })
    .returning();
  return user;
}

// Check command line argument
const command = process.argv[2];

if (command === 'export') {
  exportData();
} else if (command === 'import') {
  importData();
} else {
  console.log('Usage:');
  console.log('  Export data: node export-import-data.js export');
  console.log('  Import data: node export-import-data.js import');
}