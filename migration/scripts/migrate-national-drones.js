#!/usr/bin/env node

// National Drones RPAS Manual Migration Script
// Specifically designed for the National Drones manual structure

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import { users, manuals, sections, policies, policyVersions } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse the National Drones manual structure
function parseNationalDronesManual(content) {
  const lines = content.split('\n');
  const structure = {
    title: 'National Drones RPAS Operational Procedures Library',
    description: 'Complete RPAS operational procedures manual for National Drones Pty Ltd, covering all aspects of drone operations, maintenance, and compliance.',
    sections: []
  };
  
  let currentSection = null;
  let currentPolicy = null;
  let contentBuffer = [];
  let inPolicy = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    const trimmedLine = line.trim();
    
    // Skip empty lines when not collecting content
    if (!trimmedLine && !inPolicy) continue;
    
    // Detect main sections (e.g., "1.0 General", "2.0 Normal Operations")
    if (/^\d+\.0\s+[A-Z]/.test(trimmedLine)) {
      // Save previous policy content
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = formatContentAsHTML(contentBuffer.join('\n'));
        contentBuffer = [];
        inPolicy = false;
      }
      
      // Create new section
      const sectionMatch = trimmedLine.match(/^(\d+\.0)\s+(.+)$/);
      if (sectionMatch) {
        currentSection = {
          number: sectionMatch[1],
          title: sectionMatch[2],
          policies: []
        };
        structure.sections.push(currentSection);
        currentPolicy = null;
      }
    }
    // Detect policies (e.g., "1.1 Applicability", "2.1 Orders of Authority")
    else if (currentSection && /^\d+\.\d+(?:\.\d+)?\s+[A-Z]/.test(trimmedLine)) {
      // Save previous policy content
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = formatContentAsHTML(contentBuffer.join('\n'));
        contentBuffer = [];
      }
      
      // Create new policy
      const policyMatch = trimmedLine.match(/^(\d+\.\d+(?:\.\d+)?)\s+(.+)$/);
      if (policyMatch) {
        currentPolicy = {
          number: policyMatch[1],
          title: policyMatch[2],
          content: ''
        };
        currentSection.policies.push(currentPolicy);
        inPolicy = true;
        
        // Start collecting content from the next line
        continue;
      }
    }
    // Collect content for current policy
    else if (currentPolicy && inPolicy) {
      // Check if this line might be the start of a new section/policy
      if (/^\d+\.\d+(?:\.\d+)?\s+[A-Z]/.test(trimmedLine) && trimmedLine !== currentPolicy.number + ' ' + currentPolicy.title) {
        // This is a new policy, process it in the next iteration
        i--;
        inPolicy = false;
        continue;
      }
      contentBuffer.push(line);
    }
  }
  
  // Save last policy content
  if (currentPolicy && contentBuffer.length > 0) {
    currentPolicy.content = formatContentAsHTML(contentBuffer.join('\n'));
  }
  
  return structure;
}

// Format content as HTML with better structure
function formatContentAsHTML(text) {
  // Remove excessive blank lines
  let cleanText = text.replace(/\n{3,}/g, '\n\n');
  
  // Split into paragraphs
  const paragraphs = cleanText.split('\n\n');
  let html = '';
  let inList = false;
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    
    // Check for headers (lines in all caps or with specific patterns)
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 100 && !trimmed.match(/^[A-Z]\./)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h4>${trimmed}</h4>`;
    }
    // Check for list items
    else if (/^[a-z]\.\s+/i.test(trimmed) || /^[\-\*\•]\s+/.test(trimmed) || /^\d+\)\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const listContent = trimmed
        .replace(/^[a-z]\.\s+/i, '')
        .replace(/^[\-\*\•]\s+/, '')
        .replace(/^\d+\)\s+/, '');
      html += `<li>${listContent}</li>`;
    }
    // Check for indented content (often continuation of lists)
    else if (/^\s{2,}/.test(para) && inList) {
      html += `<li>${trimmed}</li>`;
    }
    // Regular paragraph
    else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      // Check if it's a definition or key-value pair
      if (trimmed.includes(':') && trimmed.indexOf(':') < 50) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        if (value) {
          html += `<p><strong>${key}:</strong> ${value}</p>`;
        } else {
          html += `<p>${trimmed}</p>`;
        }
      } else {
        html += `<p>${trimmed}</p>`;
      }
    }
  }
  
  if (inList) {
    html += '</ul>';
  }
  
  return html || '<p>Content to be added.</p>';
}

// Main migration function
async function migrateNationalDronesManual() {
  try {
    console.log('🚀 Starting National Drones manual migration...\n');
    
    // Get or create admin user
    let [adminUser] = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
    
    if (!adminUser) {
      console.log('Creating migration admin user...');
      [adminUser] = await db.insert(users)
        .values({
          email: 'migration@opdocs.local',
          name: 'Migration Admin',
          role: 'ADMIN',
          password: 'not-used'
        })
        .returning();
    }
    
    const createdById = adminUser.id;
    
    // Read the cleaned text file
    const docsPath = path.join(__dirname, '../../docs');
    const cleanedFile = path.join(docsPath, 'National-Drones-RPAS-Manual-cleaned.txt');
    
    console.log('📄 Reading cleaned manual file...');
    const content = await fs.readFile(cleanedFile, 'utf-8');
    
    // Parse the manual structure
    console.log('🔍 Parsing manual structure...');
    const manualStructure = parseNationalDronesManual(content);
    
    console.log(`\n📊 Found ${manualStructure.sections.length} main sections\n`);
    
    // Create the manual
    const [manual] = await db.insert(manuals)
      .values({
        title: manualStructure.title,
        description: manualStructure.description,
        status: 'DRAFT',
        createdById
      })
      .returning();
    
    console.log(`✅ Created manual: ${manual.title}\n`);
    console.log('Creating sections and policies...\n');
    
    // Create sections and policies
    for (let sectionIndex = 0; sectionIndex < manualStructure.sections.length; sectionIndex++) {
      const sectionData = manualStructure.sections[sectionIndex];
      
      const [section] = await db.insert(sections)
        .values({
          manualId: manual.id,
          title: `${sectionData.number} ${sectionData.title}`,
          description: '',
          orderIndex: sectionIndex,
          createdById
        })
        .returning();
      
      console.log(`✅ Section: ${section.title}`);
      
      // Create policies for this section
      for (let policyIndex = 0; policyIndex < sectionData.policies.length; policyIndex++) {
        const policyData = sectionData.policies[policyIndex];
        
        const [policy] = await db.insert(policies)
          .values({
            sectionId: section.id,
            title: `${policyData.number} ${policyData.title}`,
            status: 'DRAFT',
            orderIndex: policyIndex,
            createdById
          })
          .returning();

        const [version] = await db.insert(policyVersions)
          .values({
            policyId: policy.id,
            versionNumber: 1,
            bodyContent: policyData.content,
            effectiveDate: new Date(),
            authorId: createdById
          })
          .returning();

        await db.update(policies)
          .set({ currentVersionId: version.id })
          .where(eq(policies.id, policy.id));
        
        console.log(`   ✓ Policy: ${policyData.title}`);
      }
    }
    
    // Calculate total policies
    const totalPolicies = manualStructure.sections.reduce((sum, section) => sum + section.policies.length, 0);
    
    console.log('\n\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - 1 comprehensive manual created`);
    console.log(`  - ${manualStructure.sections.length} sections imported`);
    console.log(`  - ${totalPolicies} policies created`);
    console.log(`  - All content marked as DRAFT for review`);
    
    console.log('\n📌 Next steps:');
    console.log('  1. Run "npm run dev" to start the application');
    console.log('  2. Navigate to http://localhost:5000/manuals');
    console.log('  3. Review the imported manual structure');
    console.log('  4. Edit and enhance content using the rich text editor');
    console.log('  5. Change status from DRAFT to LIVE when ready');
    console.log('\n💡 To transfer to Replit:');
    console.log('  node migration/scripts/export-import-data.js export');
    console.log('  Then import the data-export.json file on Replit');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('  1. Ensure the cleaned text file exists');
    console.error('  2. Check DATABASE_URL environment variable');
    console.error('  3. Run "npm run db:push" first');
    process.exit(1);
  }
}

// Run the migration
migrateNationalDronesManual()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });