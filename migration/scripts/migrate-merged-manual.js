#!/usr/bin/env node

// Merged Manual Migration Script for ComplianceManager
// Combines multiple text files into a single comprehensive manual

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import { users, manuals, sections, policies, policyVersions } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to parse text content and identify structure
function parseTextContent(content, partNumber) {
  const lines = content.split('\n');
  const sections = [];
  
  let currentSection = null;
  let currentPolicy = null;
  let contentBuffer = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines in structure detection
    if (!trimmedLine && !currentPolicy) continue;
    
    // Detect section headers
    if (trimmedLine && (
      trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && !trimmedLine.match(/^[A-Z]\.|^\d+\./) ||
      /^Chapter\s+\d+/i.test(trimmedLine) ||
      /^Section\s+\d+/i.test(trimmedLine) ||
      /^\d+\.\s+[A-Z]/.test(trimmedLine) && trimmedLine.length > 10
    )) {
      // Save previous policy if exists
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = formatContentAsHTML(contentBuffer.join('\n'));
        contentBuffer = [];
      }
      
      // Create new section
      currentSection = {
        title: trimmedLine.replace(/^\d+\.\s+/, '').replace(/^(Chapter|Section)\s+\d+:?\s*/i, ''),
        partNumber: partNumber,
        policies: []
      };
      sections.push(currentSection);
      currentPolicy = null;
    }
    // Detect policy headers
    else if (currentSection && trimmedLine && (
      /^[A-Z]\.\s+/.test(trimmedLine) ||
      /^\d+\.\d+\s+/.test(trimmedLine) ||
      /^(Policy|Procedure|Requirement|Standard):/i.test(trimmedLine) ||
      (/^[A-Z][^.]*$/.test(trimmedLine) && trimmedLine.length > 5 && trimmedLine.length < 100)
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
  
  return sections;
}

// Format text content as HTML
function formatContentAsHTML(text) {
  let html = text
    .split('\n\n')
    .map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      
      // Check if it's a heading (shorter lines in caps)
      if (trimmed === trimmed.toUpperCase() && trimmed.length < 50 && trimmed.length > 2) {
        return `<h4>${trimmed}</h4>`;
      }
      // Check if it's a list item
      else if (/^[\-\*\•]\s+/.test(trimmed)) {
        return `<li>${trimmed.replace(/^[\-\*\•]\s+/, '')}</li>`;
      }
      // Check if it's a numbered list
      else if (/^\d+\.\s+/.test(trimmed)) {
        return `<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`;
      }
      // Check if it's an indented item (convert to list)
      else if (/^\s{2,}/.test(paragraph) && trimmed.length > 0) {
        return `<li>${trimmed}</li>`;
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
  
  return formattedHtml || '<p>Content pending review.</p>';
}

// Main migration function
async function migrateMergedManual() {
  try {
    console.log('🚀 Starting merged manual migration...\n');
    
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
    
    // Create the single comprehensive manual
    console.log('📘 Creating Operational Procedures Manual...\n');
    const [manual] = await db.insert(manuals)
      .values({
        title: 'Operational Procedures Manual',
        description: 'Comprehensive aviation operations manual covering all aspects of flight operations, safety procedures, maintenance requirements, and regulatory compliance.',
        status: 'DRAFT',
        createdById
      })
      .returning();
    
    console.log(`✅ Created manual: ${manual.title} (ID: ${manual.id})\n`);
    
    // Read all text files from docs directory
    const docsPath = path.join(__dirname, '../../docs');
    const files = await fs.readdir(docsPath);
    
    // Sort files to ensure correct order (part1, part2, etc.)
    const textFiles = files
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/part(\d+)/i)?.[1] || '0');
        const numB = parseInt(b.match(/part(\d+)/i)?.[1] || '0');
        return numA - numB;
      });
    
    if (textFiles.length === 0) {
      console.log('❌ No text files found in docs/ directory');
      console.log('\nPlease convert your PDFs to .txt files and place them in:');
      console.log(`  ${docsPath}`);
      return;
    }
    
    console.log(`Found ${textFiles.length} text file(s) to merge:\n`);
    textFiles.forEach(f => console.log(`  - ${f}`));
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Process all files and collect sections
    let allSections = [];
    let globalSectionIndex = 0;
    
    for (let i = 0; i < textFiles.length; i++) {
      const filename = textFiles[i];
      console.log(`📄 Processing: ${filename}`);
      
      const filepath = path.join(docsPath, filename);
      const content = await fs.readFile(filepath, 'utf-8');
      
      // Parse sections from this file
      const sections = parseTextContent(content, i + 1);
      
      // Add to global sections list
      allSections = allSections.concat(sections);
      
      console.log(`  ✓ Found ${sections.length} sections`);
    }
    
    console.log(`\n📊 Total sections found: ${allSections.length}\n`);
    console.log('Creating database entries...\n');
    
    // Create all sections and policies
    for (const sectionData of allSections) {
      const [section] = await db.insert(sections)
        .values({
          manualId: manual.id,
          title: sectionData.title,
          description: `From Part ${sectionData.partNumber} of the original documentation`,
          orderIndex: globalSectionIndex++,
          createdById
        })
        .returning();
      
      console.log(`✅ Section: ${section.title}`);
      
      // Create policies for this section
      let policyIndex = 0;
      for (const policyData of sectionData.policies) {
        const [policy] = await db.insert(policies)
          .values({
            sectionId: section.id,
            title: policyData.title,
            status: 'DRAFT',
            orderIndex: policyIndex++,
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
        
        console.log(`   ✓ Policy: ${policy.title}`);
      }
    }
    
    console.log('\n\n✅ Migration completed successfully!');
    console.log('\n📌 Summary:');
    console.log(`  - Created 1 comprehensive manual`);
    console.log(`  - Merged ${textFiles.length} files`);
    console.log(`  - Created ${allSections.length} sections`);
    console.log(`  - All content marked as DRAFT for review`);
    
    console.log('\n📌 Next steps:');
    console.log('  1. Run "npm run dev" to start the application');
    console.log('  2. Navigate to http://localhost:5000/manuals');
    console.log('  3. Review the merged manual structure');
    console.log('  4. Edit content using the rich text editor');
    console.log('  5. Change status from DRAFT to LIVE when ready');
    console.log('\n💡 Tip: Use the export/import script to transfer to Replit:');
    console.log('  node migration/scripts/export-import-data.js export');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('  1. Ensure all text files are in docs/ directory');
    console.error('  2. Check DATABASE_URL environment variable');
    console.error('  3. Run "npm run db:push" first');
    process.exit(1);
  }
}

// Run the migration
migrateMergedManual()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });