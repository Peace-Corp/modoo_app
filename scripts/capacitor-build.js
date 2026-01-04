#!/usr/bin/env node

/**
 * Capacitor Build Script
 *
 * This script temporarily moves problematic folders during Capacitor builds:
 * - API routes (cannot be statically exported)
 * - Auth callback (dynamic route)
 * - Dynamic client routes (incompatible with generateStaticParams)
 *
 * After the build, it restores them for web development.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_DIR = path.join(__dirname, '../app');
const BACKUP_DIR = path.join(__dirname, '../.capacitor-build');

// Folders to temporarily move (relative to app directory)
const FOLDERS_TO_MOVE = [
  'api',
  'auth/callback',
  'cobuy',
  'editor',
  'product',
  'reviews',
  'inquiries',
  'home'  // Includes all home routes and nested dynamic routes
];

function moveFolder(relativePath) {
  const src = path.join(APP_DIR, relativePath);
  const dest = path.join(BACKUP_DIR, relativePath);

  if (fs.existsSync(src)) {
    console.log(`📦 Moving ${relativePath}`);
    // Ensure destination directory exists
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    return true;
  }
  return false;
}

function restoreFolder(relativePath) {
  const src = path.join(BACKUP_DIR, relativePath);
  const dest = path.join(APP_DIR, relativePath);

  if (fs.existsSync(src)) {
    console.log(`♻️  Restoring ${relativePath}`);
    // Ensure destination directory exists
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    return true;
  }
  return false;
}

async function build() {
  const movedFolders = [];

  try {
    console.log('\n🚀 Starting Capacitor build...\n');
    console.log('⚠️  Note: Building minimal version for testing core mobile functionality');
    console.log('   Dynamic routes will be handled client-side via the API client\n');

    // Move folders out of the way
    for (const folder of FOLDERS_TO_MOVE) {
      if (moveFolder(folder)) {
        movedFolders.push(folder);
      }
    }

    console.log('\n📱 Building Next.js for Capacitor (static export)...\n');

    // Run Next.js build with Capacitor flag
    execSync('CAPACITOR_BUILD=true next build', {
      stdio: 'inherit',
      env: { ...process.env, CAPACITOR_BUILD: 'true' }
    });

    console.log('\n✅ Build completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exitCode = 1;
  } finally {
    // Always restore the folders
    console.log('\n🔄 Restoring folders...\n');

    for (const folder of movedFolders) {
      restoreFolder(folder);
    }

    console.log('\n✨ Cleanup complete!\n');

    if (process.exitCode !== 1) {
      console.log('📋 Next steps:');
      console.log('   1. Add platform: npx cap add ios (or android)');
      console.log('   2. Sync: npx cap sync');
      console.log('   3. Open: npx cap open ios (or android)');
      console.log('   4. Test: platform detection, API client, camera integration\n');
    }
  }
}

build();
