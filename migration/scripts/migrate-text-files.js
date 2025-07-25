#!/usr/bin/env node

// Text File Migration Script for ComplianceManager
// Processes .txt files and creates proper database entries

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import { users, manuals, sections, policies, policyVersions } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to parse text content and identify structure
function parseTextContent(content, filename) {
  const lines = content.split('\n');
  const structure = {
    title: filename.replace(/\.(txt|md)$/i, '').replace(/_/g, ' '),
    sections: []
  };
  
  let currentSection = null;
  let currentPolicy = null;
  let contentBuffer = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines in structure detection
    if (!trimmedLine && !currentPolicy) continue;
    
    // Detect section headers (lines in all caps or starting with numbers like "1.", "2.")
    if (trimmedLine && (
      trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 ||
      /^\d+\.\s+/.test(trimmedLine) ||
      /^Chapter\s+\d+/i.test(trimmedLine) ||
      /^Section\s+\d+/i.test(trimmedLine)
    )) {
      // Save previous policy if exists
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = formatContentAsHTML(contentBuffer.join('\n'));
        contentBuffer = [];
      }
      
      // Create new section
      currentSection = {
        title: trimmedLine.replace(/^\d+\.\s+/, '').replace(/^(Chapter|Section)\s+\d+:?\s*/i, ''),
        policies: []
      };
      structure.sections.push(currentSection);
      currentPolicy = null;
    }
    // Detect policy headers (lines starting with letters followed by period, or specific keywords)
    else if (currentSection && trimmedLine && (
      /^[A-Z]\.\s+/.test(trimmedLine) ||
      /^\d+\.\d+\s+/.test(trimmedLine) ||
      /^(Policy|Procedure|Requirement|Standard):/i.test(trimmedLine)
    )) {
      // Save previous policy if exists
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = formatContentAsHTML(contentBuffer.join('\n'));
        contentBuffer = [];
      }
      
      // Create new policy
      currentPolicy = {
        title: trimmedLine.replace(/^[A-Z]\.\s+/, '').replace(/^\d+\.\d+\s+/, '').replace(/^(Policy|Procedure|Requirement|Standard):\s*/i, ''),
        content: ''
      };
      currentSection.policies.push(currentPolicy);
    }
    // Accumulate content
    else if (currentPolicy || currentSection) {
      contentBuffer.push(line);
    }
  }
  
  // Save last policy
  if (currentPolicy && contentBuffer.length > 0) {
    currentPolicy.content = formatContentAsHTML(contentBuffer.join('\n'));
  }
  
  // If no sections were found, create a default section
  if (structure.sections.length === 0) {
    structure.sections.push({
      title: 'General Content',
      policies: [{
        title: 'Document Content',
        content: formatContentAsHTML(content)
      }]
    });
  }
  
  return structure;
}

// Format text content as HTML
function formatContentAsHTML(text) {
  // Convert text to HTML with basic formatting
  let html = text
    .split('\n\n')
    .map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      
      // Check if it's a list item
      if (/^[\-\*\•]\s+/.test(trimmed)) {
        return `<li>${trimmed.replace(/^[\-\*\•]\s+/, '')}</li>`;
      }
      // Check if it's a numbered list
      else if (/^\d+\.\s+/.test(trimmed)) {
        return `<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`;
      }
      // Regular paragraph
      else {
        return `<p>${trimmed}</p>`;
      }
    })
    .filter(p => p !== '');
  
  // Wrap consecutive list items in <ul> tags
  let formattedHtml = '';
  let inList = false;
  
  for (const element of html) {
    if (element.startsWith('<li>')) {
      if (!inList) {
        formattedHtml += '<ul>';
        inList = true;
      }
      formattedHtml += element;
    } else {
      if (inList) {
        formattedHtml += '</ul>';
        inList = false;
      }
      formattedHtml += element;
    }
  }
  
  if (inList) {
    formattedHtml += '</ul>';
  }
  
  return formattedHtml;
}

// Helper to create database entries
async function createManual(title, description, createdById) {
  const [manual] = await db.insert(manuals)
    .values({
      title,
      description,
      status: 'DRAFT',
      createdById
    })
    .returning();
  return manual;
}

async function createSection(manualId, title, orderIndex, createdById) {
  const [section] = await db.insert(sections)
    .values({
      manualId,
      title,
      description: '',
      orderIndex,
      createdById
    })
    .returning();
  return section;
}

async function createPolicy(sectionId, title, content, orderIndex, createdById) {
  const [policy] = await db.insert(policies)
    .values({
      sectionId,
      title,
      status: 'DRAFT',
      orderIndex,
      createdById
    })
    .returning();

  const [version] = await db.insert(policyVersions)
    .values({
      policyId: policy.id,
      versionNumber: 1,
      bodyContent: content,
      effectiveDate: new Date(),
      authorId: createdById
    })
    .returning();

  await db.update(policies)
    .set({ currentVersionId: version.id })
    .where(eq(policies.id, policy.id));

  return { policy, version };
}

// Main migration function
async function migrateTextFiles() {
  try {
    console.log('🚀 Starting text file migration...\n');
    
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
    
    // Read all text files from docs directory
    const docsPath = path.join(__dirname, '../../docs');
    const files = await fs.readdir(docsPath);
    const textFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    
    if (textFiles.length === 0) {
      console.log('❌ No text files found in docs/ directory');
      console.log('\nPlease convert your PDFs to .txt files and place them in:');
      console.log(`  ${docsPath}`);
      return;
    }
    
    console.log(`Found ${textFiles.length} text file(s) to process:\n`);
    
    // Process each file
    for (const filename of textFiles) {
      console.log(`\n📄 Processing: ${filename}`);
      console.log('─'.repeat(50));
      
      const filepath = path.join(docsPath, filename);
      const content = await fs.readFile(filepath, 'utf-8');
      
      // Parse the content structure
      const structure = parseTextContent(content, filename);
      
      // Create manual
      const manual = await createManual(
        structure.title,
        `Imported from ${filename}`,
        createdById
      );
      console.log(`✅ Created manual: ${manual.title}`);
      
      // Create sections and policies
      let sectionIndex = 0;
      for (const sectionData of structure.sections) {
        const section = await createSection(
          manual.id,
          sectionData.title,
          sectionIndex++,
          createdById
        );
        console.log(`  ✅ Created section: ${section.title}`);
        
        let policyIndex = 0;
        for (const policyData of sectionData.policies) {
          await createPolicy(
            section.id,
            policyData.title,
            policyData.content,
            policyIndex++,
            createdById
          );
          console.log(`    ✅ Created policy: ${policyData.title}`);
        }
      }
    }
    
    console.log('\n\n✅ Migration completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('  1. Run "npm run dev" to start the application');
    console.log('  2. Navigate to http://localhost:5000/manuals');
    console.log('  3. Review and edit the imported content');
    console.log('  4. Use the rich text editor to enhance formatting');
    console.log('  5. Change status from DRAFT to LIVE when ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateTextFiles()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });