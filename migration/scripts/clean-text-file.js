#!/usr/bin/env node

// Text File Cleaner Script
// Removes repeated watermarks and cleans up PDF export artifacts

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanTextFile() {
  try {
    console.log('🧹 Starting text file cleanup...\n');
    
    const docsPath = path.join(__dirname, '../../docs');
    const inputFile = path.join(docsPath, 'National-Drones-Pty-Ltd-RPAS-Operational-Procedures-Library_text.txt');
    const outputFile = path.join(docsPath, 'National-Drones-RPAS-Manual-cleaned.txt');
    
    // Read the file
    console.log('📄 Reading original file...');
    const content = await fs.readFile(inputFile, 'utf-8');
    
    // Clean up the content
    console.log('🔧 Cleaning content...');
    let cleanedContent = content
      // Remove repeated "EXPORTED BY" watermarks
      .replace(/(EXPORTED BY: AMANDA COVACCI)+/g, '')
      // Remove repeated "Content owned by" watermarks
      .replace(/(Content owned by National Drones)+/g, '')
      // Remove repeated "Exported:" dates
      .replace(/(Exported: \d{2}\/\d{2}\/\d{4})+/g, '')
      // Remove "Logo" text
      .replace(/Logo/g, '')
      // Clean up excessive whitespace
      .replace(/\s{4,}/g, '\n\n')
      // Remove empty lines at the beginning
      .replace(/^\s+/, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove trailing whitespace on each line
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n');
    
    // Further cleanup - remove lines that are just watermark remnants
    const lines = cleanedContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed !== '' || 
             (lines.indexOf(line) > 0 && lines[lines.indexOf(line) - 1].trim() !== '');
    });
    
    cleanedContent = filteredLines.join('\n');
    
    // Save cleaned content
    await fs.writeFile(outputFile, cleanedContent);
    
    // Get file sizes for comparison
    const originalStats = await fs.stat(inputFile);
    const cleanedStats = await fs.stat(outputFile);
    
    console.log('\n✅ Cleanup completed!');
    console.log(`📊 File size reduction: ${(originalStats.size / 1024).toFixed(2)}KB → ${(cleanedStats.size / 1024).toFixed(2)}KB`);
    console.log(`📄 Cleaned file saved as: National-Drones-RPAS-Manual-cleaned.txt`);
    console.log('\n📌 Next steps:');
    console.log('  1. Review the cleaned file to ensure content is preserved');
    console.log('  2. Run the migration script on the cleaned file');
    console.log('  3. You may need to manually edit the cleaned file if structure needs adjustment');
    
    // Show a preview of the cleaned content
    console.log('\n📋 Preview of cleaned content (first 500 characters):');
    console.log('─'.repeat(50));
    console.log(cleanedContent.substring(0, 500) + '...');
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanTextFile()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });