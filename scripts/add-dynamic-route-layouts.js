#!/usr/bin/env node

/**
 * Add generateStaticParams layouts to all dynamic routes
 * This script creates layout.tsx files for all dynamic routes ([param])
 * to satisfy Next.js static export requirements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const layoutTemplate = `// Generate static params for Capacitor builds
// Returns empty array since this route uses dynamic data
export async function generateStaticParams() {
  return []
}

export default function DynamicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
`;

function findDynamicRoutes(dir) {
  const routes = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Check if this is a dynamic route directory
        if (item.startsWith('[') && item.endsWith(']')) {
          // Check if there's a page.tsx file
          const pagePath = path.join(fullPath, 'page.tsx');
          const layoutPath = path.join(fullPath, 'layout.tsx');

          if (fs.existsSync(pagePath) && !fs.existsSync(layoutPath)) {
            routes.push(fullPath);
          }
        }

        // Recursively search subdirectories
        if (!item.startsWith('.') && item !== 'node_modules') {
          routes.push(...findDynamicRoutes(fullPath));
        }
      }
    }
  } catch (error) {
    // Ignore errors for inaccessible directories
  }

  return routes;
}

function createLayouts() {
  console.log('\n🔍 Searching for dynamic routes...\n');

  const appDir = path.join(__dirname, '../app');
  const dynamicRoutes = findDynamicRoutes(appDir);

  console.log(`Found ${dynamicRoutes.length} dynamic routes without layouts:\n`);

  for (const route of dynamicRoutes) {
    const relativePath = path.relative(appDir, route);
    console.log(`  📝 ${relativePath}/`);

    const layoutPath = path.join(route, 'layout.tsx');
    fs.writeFileSync(layoutPath, layoutTemplate);
  }

  if (dynamicRoutes.length > 0) {
    console.log(`\n✅ Created ${dynamicRoutes.length} layout files\n`);
  } else {
    console.log('\n✨ All dynamic routes already have layouts\n');
  }
}

createLayouts();
