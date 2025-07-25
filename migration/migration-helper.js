// PDF Migration Helper
// This file contains utilities for migrating PDF content to the database

import { db } from '../db/index.js';
import { manuals, sections, policies, policyVersions, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Create a manual in the database
 */
export async function createManual(title, description, createdById) {
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

/**
 * Create a section within a manual
 */
export async function createSection(manualId, title, description, orderIndex, createdById) {
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

/**
 * Create a policy within a section
 */
export async function createPolicy(sectionId, title, content, orderIndex, createdById) {
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

/**
 * Clean and format text content for HTML storage
 */
export function formatContentForHtml(text) {
  if (!text) return '';
  
  // Clean up common PDF extraction artifacts
  let cleaned = text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')       // Remove excessive line breaks
    .replace(/\s+$/gm, '')            // Remove trailing whitespace
    .replace(/^\s+/gm, '')            // Remove leading whitespace
    .trim();

  // Convert to basic HTML structure
  const paragraphs = cleaned
    .split('\n\n')
    .filter(p => p.trim().length > 0)
    .map(p => {
      const trimmed = p.trim();
      
      // Check if it looks like a heading (short, possibly all caps, or starts with number)
      if (trimmed.length < 100 && 
          (trimmed === trimmed.toUpperCase() || 
           /^\d+\.?\s/.test(trimmed) || 
           /^[A-Z][A-Z\s]{5,}$/.test(trimmed))) {
        return `<h3>${trimmed}</h3>`;
      }
      
      // Regular paragraph
      return `<p>${trimmed}</p>`;
    });

  return paragraphs.join('\n');
}

/**
 * Parse PDF text content into structured sections
 */
export function parseDocumentStructure(text, documentTitle) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const structure = {
    title: documentTitle,
    sections: []
  };

  let currentSection = null;
  let currentPolicy = null;
  let contentBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    
    // Skip very short lines that are likely artifacts
    if (line.length < 3) continue;
    
    // Detect major sections (often numbered or all caps)
    if (isLikelySection(line)) {
      // Save previous policy if exists
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = formatContentForHtml(contentBuffer.join('\n'));
        contentBuffer = [];
      }
      
      // Save previous section if exists
      if (currentSection) {
        structure.sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: line,
        description: '',
        policies: []
      };
      currentPolicy = null;
      
    } else if (currentSection && isLikelyPolicy(line)) {
      // Save previous policy content
      if (currentPolicy && contentBuffer.length > 0) {
        currentPolicy.content = formatContentForHtml(contentBuffer.join('\n'));
        contentBuffer = [];
      }
      
      // Start new policy
      currentPolicy = {
        title: line,
        content: ''
      };
      currentSection.policies.push(currentPolicy);
      
    } else {
      // Add to content buffer
      contentBuffer.push(line);
    }
  }

  // Clean up final policy and section
  if (currentPolicy && contentBuffer.length > 0) {
    currentPolicy.content = formatContentForHtml(contentBuffer.join('\n'));
  }
  if (currentSection) {
    structure.sections.push(currentSection);
  }

  return structure;
}

/**
 * Detect if a line is likely a section header
 */
function isLikelySection(line) {
  return (
    // Numbered sections
    /^\d+\.?\s+[A-Z]/.test(line) ||
    // All caps (likely headings)
    (line === line.toUpperCase() && line.length > 5 && line.length < 80) ||
    // Roman numerals
    /^[IVX]+\.?\s+/.test(line) ||
    // Letter sections
    /^[A-Z]\.?\s+[A-Z]/.test(line)
  );
}

/**
 * Detect if a line is likely a policy/subsection
 */
function isLikelyPolicy(line) {
  return (
    // Numbered subsections
    /^\d+\.\d+/.test(line) ||
    // Lettered subsections
    /^[a-z]\)|\([a-z]\)/.test(line) ||
    // Bullet-like items that are substantial
    (/^[-•·]/.test(line) && line.length > 20)
  );
}

/**
 * Main migration function
 */
export async function migratePdfContent(pdfStructure, createdById) {
  console.log(`🚀 Starting migration for: ${pdfStructure.title}`);
  
  // Create manual
  const manual = await createManual(pdfStructure.title, pdfStructure.description, createdById);
  
  // Create sections and policies
  for (let sectionIndex = 0; sectionIndex < pdfStructure.sections.length; sectionIndex++) {
    const sectionData = pdfStructure.sections[sectionIndex];
    
    const section = await createSection(
      manual.id,
      sectionData.title,
      sectionData.description,
      sectionIndex,
      createdById
    );
    
    // Create policies within section
    for (let policyIndex = 0; policyIndex < sectionData.policies.length; policyIndex++) {
      const policyData = sectionData.policies[policyIndex];
      
      if (policyData.content && policyData.content.trim()) {
        await createPolicy(
          section.id,
          policyData.title,
          policyData.content,
          policyIndex,
          createdById
        );
      }
    }
  }
  
  console.log(`🎉 Migration completed for: ${pdfStructure.title}`);
  return manual;
}