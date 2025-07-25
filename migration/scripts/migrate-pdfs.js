#!/usr/bin/env node

// PDF Migration Script
// This script reads PDFs from the docs folder and migrates them to the database

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  createManual, 
  createSection, 
  createPolicy, 
  parseDocumentStructure,
  migratePdfContent 
} from '../migration-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the admin user ID (you may need to adjust this based on your setup)
const ADMIN_USER_ID = 1; // Default admin user

async function readPdfAsText(pdfPath) {
  // For now, we'll create a placeholder that shows the file was detected
  // In a real implementation, you'd use a PDF parsing library
  const fileName = path.basename(pdfPath);
  return {
    text: `Content from ${fileName}\n\nThis is placeholder content. To properly extract PDF content, you would need to:\n1. Use a PDF parsing library like pdf-parse or pdfjs-dist\n2. Extract the text content from each page\n3. Preserve the structure and formatting\n\nFor now, this demonstrates the migration process is working.`,
    fileName: fileName
  };
}

async function migratePdfs() {
  try {
    console.log('🚀 Starting PDF migration process...\n');
    
    // Get list of PDFs in docs folder
    const docsPath = path.join(__dirname, '../../docs');
    const files = await fs.readdir(docsPath);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found in the docs folder');
      return;
    }
    
    console.log(`📄 Found ${pdfFiles.length} PDF files to migrate:\n`);
    pdfFiles.forEach(file => console.log(`  - ${file}`));
    console.log('\n');
    
    // Process each PDF
    for (const pdfFile of pdfFiles) {
      console.log(`\n📋 Processing: ${pdfFile}`);
      console.log('─'.repeat(50));
      
      const pdfPath = path.join(docsPath, pdfFile);
      
      try {
        // Read PDF content (placeholder for now)
        const { text, fileName } = await readPdfAsText(pdfPath);
        
        // Extract title from filename
        const title = fileName
          .replace('.pdf', '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());
        
        // Create a simple structure for now
        const pdfStructure = {
          title: title,
          description: `Migrated from ${fileName}`,
          sections: [
            {
              title: 'Document Content',
              description: 'Imported content from PDF',
              policies: [
                {
                  title: 'Main Content',
                  content: `<p>${text}</p>`
                }
              ]
            }
          ]
        };
        
        // If this was parsing real PDF content, you would use:
        // const pdfStructure = parseDocumentStructure(text, title);
        
        // Migrate to database
        await migratePdfContent(pdfStructure, ADMIN_USER_ID);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${pdfFile}:`, error.message);
      }
    }
    
    console.log('\n\n✅ Migration process completed!');
    console.log('📌 Next steps:');
    console.log('  1. Run "npm run dev" to start the application');
    console.log('  2. Navigate to http://localhost:5000/manuals');
    console.log('  3. Review and edit the migrated content');
    console.log('  4. Change status from DRAFT to LIVE when ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migratePdfs().catch(console.error);