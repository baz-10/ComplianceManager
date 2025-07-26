#!/usr/bin/env node

// Text File Formatter
// Adds proper line breaks before section numbers

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixTextFormatting() {
  try {
    console.log('🔧 Fixing text file formatting...\n');
    
    const docsPath = path.join(__dirname, '../../docs');
    const inputFile = path.join(docsPath, 'National-Drones-RPAS-Manual-cleaned.txt');
    const outputFile = path.join(docsPath, 'National-Drones-RPAS-Manual-formatted.txt');
    
    // Read the file
    console.log('📄 Reading cleaned file...');
    const content = await fs.readFile(inputFile, 'utf-8');
    
    // Add line breaks before section and policy numbers
    console.log('🔧 Adding proper line breaks...');
    let formattedContent = content
      // Add line breaks before main sections (e.g., 1.0, 2.0)
      .replace(/(\d+\.0\s+[A-Z])/g, '\n\n$1')
      // Add line breaks before sub-sections (e.g., 1.1, 2.1)
      .replace(/(\d+\.\d+(?:\.\d+)?\s+[A-Z])/g, '\n\n$1')
      // Clean up multiple line breaks
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim start and end
      .trim();
    
    // Save formatted content
    await fs.writeFile(outputFile, formattedContent);
    
    console.log('✅ Formatting completed!');
    console.log(`📄 Formatted file saved as: National-Drones-RPAS-Manual-formatted.txt`);
    console.log('\n📌 Next steps:');
    console.log('  1. Update the migration script to use the formatted file');
    console.log('  2. Or rename formatted file to replace the cleaned file');
    console.log('  3. Run migration again');
    
    // Show preview
    const lines = formattedContent.split('\n').slice(0, 20);
    console.log('\n📋 Preview (first 20 lines):');
    console.log('─'.repeat(50));
    lines.forEach((line, i) => {
      console.log(`${(i + 1).toString().padStart(3)}: ${line.substring(0, 80)}`);
    });
    
  } catch (error) {
    console.error('❌ Formatting failed:', error);
    process.exit(1);
  }
}

// Run the formatter
fixTextFormatting()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });