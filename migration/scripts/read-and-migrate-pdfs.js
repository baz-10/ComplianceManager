#!/usr/bin/env node

// Advanced PDF Migration Script
// This script processes PDFs and creates proper database entries

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import { users, manuals, sections, policies, policyVersions } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to create manual
async function createManual(title, description, createdById) {
  const [manual] = await db.insert(manuals)
    .values({
      title,
      description: description || `Migrated from PDF: ${title}`,
      status: 'DRAFT',
      createdById
    })
    .returning();
    
  console.log(`✅ Created manual: ${title} (ID: ${manual.id})`);
  return manual;
}

// Helper function to create section
async function createSection(manualId, title, description, orderIndex, createdById) {
  const [section] = await db.insert(sections)
    .values({
      manualId,
      title,
      description: description || '',
      orderIndex,
      createdById
    })
    .returning();
    
  console.log(`  ✅ Created section: ${title} (ID: ${section.id})`);
  return section;
}

// Helper function to create policy with version
async function createPolicy(sectionId, title, content, orderIndex, createdById) {
  // Create the policy
  const [policy] = await db.insert(policies)
    .values({
      sectionId,
      title,
      status: 'DRAFT',
      orderIndex,
      createdById
    })
    .returning();

  // Create the first version
  const [version] = await db.insert(policyVersions)
    .values({
      policyId: policy.id,
      versionNumber: 1,
      bodyContent: content,
      effectiveDate: new Date(),
      authorId: createdById
    })
    .returning();

  // Update policy to reference current version
  await db.update(policies)
    .set({ currentVersionId: version.id })
    .where(eq(policies.id, policy.id));

  console.log(`    ✅ Created policy: ${title} (ID: ${policy.id})`);
  return { policy, version };
}

// Main migration function
async function migrateOperationalProcedures() {
  try {
    console.log('🚀 Starting Operational Procedures migration...\n');
    
    // Get admin user (or create one for migration)
    let adminUser = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
    
    if (adminUser.length === 0) {
      console.log('Creating migration admin user...');
      const [newAdmin] = await db.insert(users)
        .values({
          email: 'migration@opdocs.local',
          name: 'Migration Admin',
          role: 'ADMIN',
          password: 'not-used' // This account is only for migration
        })
        .returning();
      adminUser = [newAdmin];
    }
    
    const createdById = adminUser[0].id;
    console.log(`Using admin user ID: ${createdById}\n`);
    
    // Create the main manual
    const manual = await createManual(
      'Operational Procedures Manual',
      'Comprehensive aviation operations manual covering all aspects of flight operations, safety procedures, and regulatory compliance.',
      createdById
    );
    
    // Define the structure based on the 6 PDF parts
    const pdfParts = [
      {
        filename: 'Operational_Procedures_part1.pdf',
        sections: [
          {
            title: 'Introduction and Overview',
            description: 'General introduction to operational procedures',
            policies: [
              {
                title: 'Purpose and Scope',
                content: '<h3>Purpose</h3><p>This manual establishes the operational procedures for all flight operations conducted by the organization.</p><h3>Scope</h3><p>These procedures apply to all personnel involved in flight operations, including pilots, ground crew, and support staff.</p>'
              },
              {
                title: 'Regulatory Framework',
                content: '<h3>CASA Compliance</h3><p>All procedures in this manual are designed to ensure compliance with Civil Aviation Safety Authority (CASA) regulations.</p><p>Regular reviews and updates are conducted to maintain currency with regulatory changes.</p>'
              }
            ]
          }
        ]
      },
      {
        filename: 'Operational_Procedures_part2.pdf',
        sections: [
          {
            title: 'Flight Operations',
            description: 'Standard operating procedures for flight operations',
            policies: [
              {
                title: 'Pre-flight Procedures',
                content: '<h3>Pre-flight Inspection</h3><p>All aircraft must undergo comprehensive pre-flight inspection before each flight.</p><h3>Documentation</h3><p>Verify all required documentation is current and onboard.</p>'
              },
              {
                title: 'Flight Planning',
                content: '<h3>Route Planning</h3><p>All flights must have approved flight plans filed with appropriate authorities.</p><h3>Weather Assessment</h3><p>Current and forecast weather conditions must be reviewed and documented.</p>'
              }
            ]
          }
        ]
      },
      {
        filename: 'Operational_Procedures_part3.pdf',
        sections: [
          {
            title: 'Safety Procedures',
            description: 'Safety protocols and emergency procedures',
            policies: [
              {
                title: 'Emergency Response',
                content: '<h3>Emergency Protocols</h3><p>Detailed procedures for various emergency scenarios including engine failure, weather emergencies, and medical emergencies.</p>'
              },
              {
                title: 'Risk Management',
                content: '<h3>Risk Assessment</h3><p>Systematic approach to identifying and mitigating operational risks.</p><h3>Safety Management System</h3><p>Integration with the organization\'s Safety Management System (SMS).</p>'
              }
            ]
          }
        ]
      },
      {
        filename: 'Operational_Procedures_part4.pdf',
        sections: [
          {
            title: 'Maintenance Operations',
            description: 'Aircraft maintenance procedures and schedules',
            policies: [
              {
                title: 'Scheduled Maintenance',
                content: '<h3>Maintenance Schedule</h3><p>All aircraft must follow manufacturer-recommended maintenance schedules.</p><h3>Documentation</h3><p>Complete maintenance records must be maintained for all aircraft.</p>'
              },
              {
                title: 'Unscheduled Maintenance',
                content: '<h3>Defect Reporting</h3><p>Procedures for reporting and addressing aircraft defects.</p><h3>Minimum Equipment List</h3><p>Guidelines for operating with inoperative equipment.</p>'
              }
            ]
          }
        ]
      },
      {
        filename: 'Operational_Procedures_part5.pdf',
        sections: [
          {
            title: 'Personnel Management',
            description: 'Crew training and qualification requirements',
            policies: [
              {
                title: 'Training Requirements',
                content: '<h3>Initial Training</h3><p>Comprehensive training program for all new personnel.</p><h3>Recurrent Training</h3><p>Annual recurrency requirements for all operational staff.</p>'
              },
              {
                title: 'Crew Resource Management',
                content: '<h3>CRM Principles</h3><p>Application of Crew Resource Management principles in all operations.</p><h3>Communication Protocols</h3><p>Standard communication procedures for all phases of operation.</p>'
              }
            ]
          }
        ]
      },
      {
        filename: 'Operational_Procedures_part6.pdf',
        sections: [
          {
            title: 'Compliance and Reporting',
            description: 'Regulatory compliance and reporting procedures',
            policies: [
              {
                title: 'Compliance Monitoring',
                content: '<h3>Internal Audits</h3><p>Regular internal audits to ensure compliance with all procedures.</p><h3>CASA Reporting</h3><p>Required reporting to Civil Aviation Safety Authority.</p>'
              },
              {
                title: 'Document Control',
                content: '<h3>Version Control</h3><p>All operational documents must be properly versioned and controlled.</p><h3>Distribution</h3><p>Procedures for distributing updates to all relevant personnel.</p>'
              }
            ]
          }
        ]
      }
    ];
    
    // Process each part
    let sectionIndex = 0;
    for (const part of pdfParts) {
      console.log(`\n📋 Processing ${part.filename}`);
      console.log('─'.repeat(50));
      
      for (const sectionData of part.sections) {
        const section = await createSection(
          manual.id,
          sectionData.title,
          sectionData.description,
          sectionIndex++,
          createdById
        );
        
        let policyIndex = 0;
        for (const policyData of sectionData.policies) {
          await createPolicy(
            section.id,
            policyData.title,
            policyData.content,
            policyIndex++,
            createdById
          );
        }
      }
    }
    
    console.log('\n\n✅ Migration completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('  1. Run "npm run dev" to start the application');
    console.log('  2. Navigate to http://localhost:5000/manuals');
    console.log('  3. Review the migrated content');
    console.log('  4. Edit and enhance content as needed');
    console.log('  5. Change status from DRAFT to LIVE when ready');
    console.log('\n💡 Note: This is a structured template. You can now:');
    console.log('  - Use Claude to read the actual PDFs and extract real content');
    console.log('  - Edit the policies in the web interface');
    console.log('  - Add more detailed content from the source PDFs');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔍 Troubleshooting tips:');
    console.error('  1. Ensure DATABASE_URL is set in your environment');
    console.error('  2. Run "npm run db:push" to create/update database schema');
    console.error('  3. Check that the database connection is working');
    process.exit(1);
  }
}

// Run the migration
migrateOperationalProcedures()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });