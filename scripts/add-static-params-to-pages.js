#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'app');

/**
 * Find all page.tsx files within dynamic route directories [param]
 */
function findDynamicPages(dir, dynamicPages = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Check if this is a dynamic route directory
      if (item.name.startsWith('[') && item.name.endsWith(']')) {
        // Look for page.tsx in this directory
        const pagePath = path.join(fullPath, 'page.tsx');
        if (fs.existsSync(pagePath)) {
          dynamicPages.push(pagePath);
        }
        // Also search subdirectories for nested pages
        findDynamicPages(fullPath, dynamicPages);
      } else if (!item.name.startsWith('_') && !item.name.startsWith('.')) {
        // Recurse into non-private directories
        findDynamicPages(fullPath, dynamicPages);
      }
    }
  }

  return dynamicPages;
}

/**
 * Check if a file already has generateStaticParams
 */
function hasGenerateStaticParams(content) {
  return /export\s+(async\s+)?function\s+generateStaticParams/.test(content);
}

/**
 * Add generateStaticParams to a page file
 */
function addGenerateStaticParams(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has generateStaticParams
  if (hasGenerateStaticParams(content)) {
    console.log(`✓ Already has generateStaticParams: ${filePath}`);
    return false;
  }

  // Add generateStaticParams at the top of the file, after imports
  const lines = content.split('\n');
  let insertIndex = 0;

  // Find the last import statement or 'use client'
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line === "'use client'" || line === '"use client"') {
      insertIndex = i + 1;
    } else if (line.startsWith('export ') || line.startsWith('function ') || line.startsWith('const ')) {
      break;
    }
  }

  // Insert generateStaticParams
  const staticParamsCode = `
// Generate static params for static export
export async function generateStaticParams() {
  return []
}
`;

  lines.splice(insertIndex, 0, staticParamsCode);
  const newContent = lines.join('\n');

  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`✓ Added generateStaticParams to: ${filePath}`);
  return true;
}

// Main execution
console.log('🔍 Finding dynamic route pages...\n');

const dynamicPages = findDynamicPages(APP_DIR);

console.log(`Found ${dynamicPages.length} page.tsx files in dynamic routes:\n`);
dynamicPages.forEach(page => {
  console.log(`  - ${path.relative(process.cwd(), page)}`);
});

console.log('\n📝 Adding generateStaticParams...\n');

let addedCount = 0;
dynamicPages.forEach(page => {
  if (addGenerateStaticParams(page)) {
    addedCount++;
  }
});

console.log(`\n✅ Done! Added generateStaticParams to ${addedCount} files.`);
