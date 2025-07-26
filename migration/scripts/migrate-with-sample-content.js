#!/usr/bin/env node

// Enhanced National Drones RPAS Manual Migration Script
// Handles cases where policy content might be missing from the source file

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import { users, manuals, sections, policies, policyVersions } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate appropriate sample content based on policy title
function generateSampleContent(policyNumber, policyTitle) {
  const templates = {
    'Applicability': `<p>This policy applies to all ${policyTitle.toLowerCase()} within the scope of National Drones RPAS operations.</p><p><strong>Scope:</strong> All personnel, aircraft, and operations conducted under this manual.</p><p><strong>Effective Date:</strong> This policy is effective immediately upon publication.</p>`,
    
    'Distribution Control': `<p>This document is controlled and distributed according to the following procedures:</p><ul><li>Distribution is limited to authorized personnel only</li><li>Electronic copies must be stored securely</li><li>Physical copies must be returned when superseded</li><li>Unauthorized distribution is prohibited</li></ul>`,
    
    'Amendment Procedure': `<p>Amendments to this manual shall be processed as follows:</p><ul><li>All amendments must be approved by the Chief Remote Pilot</li><li>Changes are tracked in the revision log</li><li>Personnel must be notified of changes within 7 days</li><li>Training updates are required for significant changes</li></ul>`,
    
    'Revision Log': `<p>This section contains the revision history for this manual.</p><table><tr><th>Version</th><th>Date</th><th>Changes</th><th>Approved By</th></tr><tr><td>1.0</td><td>Current</td><td>Initial Issue</td><td>Chief Remote Pilot</td></tr></table>`,
    
    'Normal Operations': `<p>Standard operating procedures for normal RPAS operations:</p><ul><li>Pre-flight planning and preparation</li><li>Aircraft inspection procedures</li><li>Weather assessment requirements</li><li>Flight authorization processes</li><li>Post-flight procedures and reporting</li></ul>`,
    
    'Emergency Procedures': `<p>Emergency procedures to be followed in non-normal situations:</p><ul><li>Lost link procedures</li><li>Engine failure protocols</li><li>Weather emergency responses</li><li>Medical emergency procedures</li><li>Aircraft recovery procedures</li></ul><p><strong>Note:</strong> All emergency situations must be reported immediately to the Chief Remote Pilot.</p>`,
    
    'Training': `<p>Training requirements for personnel involved in RPAS operations:</p><ul><li>Initial qualification training</li><li>Recurrent training requirements</li><li>Competency assessments</li><li>Record keeping requirements</li></ul>`,
    
    'Maintenance': `<p>Maintenance procedures and requirements:</p><ul><li>Scheduled maintenance intervals</li><li>Pre-flight inspection requirements</li><li>Defect reporting procedures</li><li>Maintenance record keeping</li><li>Return to service procedures</li></ul>`,
    
    'Operations': `<p>Operational procedures and limitations:</p><ul><li>Operational area definitions</li><li>Weather limitations</li><li>Airspace coordination requirements</li><li>Communication procedures</li><li>Safety protocols</li></ul>`
  };
  
  // Find the best matching template
  for (const [key, template] of Object.entries(templates)) {
    if (policyTitle.toLowerCase().includes(key.toLowerCase())) {
      return template;
    }
  }
  
  // Default content based on section type
  if (policyNumber.startsWith('1.')) {
    return `<p>This policy outlines the ${policyTitle.toLowerCase()} requirements for National Drones RPAS operations.</p><p><strong>Requirements:</strong></p><ul><li>All personnel must comply with this policy</li><li>Regular review and updates are required</li><li>Deviations must be approved by the Chief Remote Pilot</li></ul><p><em>Note: This content requires review and updating with specific operational details.</em></p>`;
  } else if (policyNumber.startsWith('2.')) {
    return `<p>Operational procedures for ${policyTitle.toLowerCase()}:</p><ul><li>Pre-operational planning requirements</li><li>Execution procedures and protocols</li><li>Safety considerations and risk mitigation</li><li>Post-operational reporting requirements</li></ul><p><em>Note: This content requires review and updating with specific operational details.</em></p>`;
  } else if (policyNumber.startsWith('3.')) {
    return `<p>Maintenance requirements for ${policyTitle.toLowerCase()}:</p><ul><li>Inspection intervals and procedures</li><li>Maintenance documentation requirements</li><li>Quality assurance procedures</li><li>Compliance verification</li></ul><p><em>Note: This content requires review and updating with specific maintenance details.</em></p>`;
  } else {
    return `<p>This section covers ${policyTitle.toLowerCase()} as part of the National Drones RPAS operational procedures.</p><p><strong>Key Points:</strong></p><ul><li>Compliance with CASA regulations is mandatory</li><li>All procedures must be followed as documented</li><li>Regular training and competency checks are required</li><li>Deviations require approval from authorized personnel</li></ul><p><em>Note: This content requires review and updating with specific details for this policy area.</em></p>`;
  }
}

// Parse the National Drones manual structure with enhanced content handling
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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Detect main sections (e.g., "1.0 General", "2.0 Normal Operations")
    if (/^\d+\.0\s+[A-Z]/.test(trimmedLine)) {
      // Save previous policy content
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = contentBuffer.join('\n').trim() || generateSampleContent(currentPolicy.number, currentPolicy.title);
        contentBuffer = [];
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
        currentPolicy.content = contentBuffer.join('\n').trim() || generateSampleContent(currentPolicy.number, currentPolicy.title);
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
      }
    }
    // Collect content for current policy
    else if (currentPolicy) {
      // Only collect non-header content
      if (!(/^\d+\.\d+(?:\.\d+)?\s+[A-Z]/.test(trimmedLine))) {
        contentBuffer.push(line);
      }
    }
  }
  
  // Save last policy content
  if (currentPolicy) {
    currentPolicy.content = contentBuffer.join('\n').trim() || generateSampleContent(currentPolicy.number, currentPolicy.title);
  }
  
  // Generate content for any policies without content
  structure.sections.forEach(section => {
    section.policies.forEach(policy => {
      if (!policy.content || policy.content.trim() === '') {
        policy.content = generateSampleContent(policy.number, policy.title);
      } else {
        // Format existing content as HTML
        policy.content = formatContentAsHTML(policy.content);
      }
    });
  });
  
  return structure;
}

// Format content as HTML
function formatContentAsHTML(text) {
  if (!text || text.trim() === '') {
    return '<p>Content to be added.</p>';
  }
  
  // If it's already HTML, return as-is
  if (text.includes('<p>') || text.includes('<ul>')) {
    return text;
  }
  
  // Convert plain text to HTML
  const paragraphs = text.split('\n\n');
  let html = '';
  let inList = false;
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    
    // Check for list items
    if (/^[\-\*\•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const listContent = trimmed.replace(/^[\-\*\•]\s+/, '').replace(/^\d+\.\s+/, '');
      html += `<li>${listContent}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${trimmed}</p>`;
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
    console.log('🚀 Starting Enhanced National Drones manual migration...\n');
    
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
    
    // Check if manual already exists
    const existingManual = await db.select().from(manuals).where(eq(manuals.title, 'National Drones RPAS Operational Procedures Library')).limit(1);
    
    if (existingManual.length > 0) {
      console.log('⚠️  Manual already exists. Updating content...\n');
      
      // Delete existing policies and sections to recreate with content
      const manual = existingManual[0];
      const existingSections = await db.select().from(sections).where(eq(sections.manualId, manual.id));
      
      for (const section of existingSections) {
        const existingPolicies = await db.select().from(policies).where(eq(policies.sectionId, section.id));
        for (const policy of existingPolicies) {
          await db.delete(policyVersions).where(eq(policyVersions.policyId, policy.id));
        }
        await db.delete(policies).where(eq(policies.sectionId, section.id));
      }
      await db.delete(sections).where(eq(sections.manualId, manual.id));
      
      var manual = existingManual[0];
    } else {
      // Create new manual
      const [newManual] = await db.insert(manuals)
        .values({
          title: 'National Drones RPAS Operational Procedures Library',
          description: 'Complete RPAS operational procedures manual for National Drones Pty Ltd, covering all aspects of drone operations, maintenance, and compliance.',
          status: 'DRAFT',
          createdById
        })
        .returning();
      
      var manual = newManual;
      console.log(`✅ Created manual: ${manual.title}\n`);
    }
    
    // Read the formatted text file
    const docsPath = path.join(__dirname, '../../docs');
    const cleanedFile = path.join(docsPath, 'National-Drones-RPAS-Manual-cleaned.txt');
    
    console.log('📄 Reading manual file...');
    const content = await fs.readFile(cleanedFile, 'utf-8');
    
    // Parse the manual structure
    console.log('🔍 Parsing manual structure with content generation...');
    const manualStructure = parseNationalDronesManual(content);
    
    console.log(`\n📊 Found ${manualStructure.sections.length} main sections\n`);
    
    // Create sections and policies
    for (let sectionIndex = 0; sectionIndex < manualStructure.sections.length; sectionIndex++) {
      const sectionData = manualStructure.sections[sectionIndex];
      
      const [section] = await db.insert(sections)
        .values({
          manualId: manual.id,
          title: `${sectionData.number} ${sectionData.title}`,
          description: `Section covering ${sectionData.title.toLowerCase()} for RPAS operations`,
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
        
        console.log(`   ✓ Policy: ${policyData.title} (with content)`);
      }
    }
    
    // Calculate total policies
    const totalPolicies = manualStructure.sections.reduce((sum, section) => sum + section.policies.length, 0);
    
    console.log('\n\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Manual updated with content`);
    console.log(`  - ${manualStructure.sections.length} sections imported`);
    console.log(`  - ${totalPolicies} policies created with sample content`);
    console.log(`  - All content marked as DRAFT for review`);
    
    console.log('\n📌 Next steps:');
    console.log('  1. Navigate to /manuals to review the imported content');
    console.log('  2. Edit policies using the rich text editor to add specific details');
    console.log('  3. Update sample content with actual operational procedures');
    console.log('  4. Change status from DRAFT to LIVE when ready');
    console.log('\n💡 Note: Sample content has been generated where source content was missing.');
    console.log('    Please review and update all policies with accurate operational details.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('  1. Ensure the text file exists in docs/ folder');
    console.error('  2. Check DATABASE_URL environment variable');
    console.error('  3. Verify database schema is up to date');
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