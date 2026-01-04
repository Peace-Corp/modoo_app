# Capacitor Integration Status

## ✅ Completed Tasks

1. **Capacitor Core Setup**
   - ✅ Installed @capacitor/core and @capacitor/cli
   - ✅ Initialized Capacitor with project configuration (`capacitor.config.ts`)
   - ✅ Configured for app name "Modoo" and ID "com.modoo.app"

2. **Platform Dependencies**
   - ✅ Installed @capacitor/ios and @capacitor/android packages
   - ✅ Configured next.config.ts for conditional static export

3. **Capacitor Plugins Installed**
   - ✅ @capacitor/filesystem
   - ✅ @capacitor/camera
   - ✅ @capacitor/share
   - ✅ @capacitor/status-bar
   - ✅ @capacitor/splash-screen
   - ✅ @capacitor/app
   - ✅ @capacitor/haptics
   - ✅ @capacitor/preferences

4. **Code Utilities Created**
   - ✅ Platform detection utility ([lib/platform.ts](lib/platform.ts))
   - ✅ Cross-platform storage wrapper ([lib/storage.ts](lib/storage.ts))
   - ✅ Image picker with camera support ([lib/imagePicker.ts](lib/imagePicker.ts))
   - ✅ Updated Toolbar component with camera integration

5. **Build Infrastructure**
   - ✅ Created Capacitor build scripts in package.json
   - ✅ Created custom build script ([scripts/capacitor-build.js](scripts/capacitor-build.js))
   - ✅ Added `.capacitor-build` to .gitignore
   - ✅ Created dynamic route layout generator script

## ⚠️ Current Blocker: Static Export with Dynamic Routes

The app has extensive dynamic routes that fetch data from Supabase:
- `/editor/[productId]`
- `/product/[product_id]`
- `/cobuy/[shareToken]` and nested routes
- `/cobuy/checkout/[sessionId]`
- `/reviews/[productId]`
- `/inquiries/[id]`
- `/admin/orders/[orderId]` and nested routes
- And more...

Next.js static export (`output: 'export'`) requires all routes to be known at build time, which conflicts with database-driven dynamic content.

## 🎯 Recommended Solutions

### Option 1: Hybrid Architecture (Recommended for Production)

Keep two separate builds:

1. **Web Version** (Current)
   - Full Next.js with API routes
   - Server-side rendering
   - Dynamic routes work normally

2. **Mobile Version** (Capacitor)
   - Migrate server-side logic to Supabase Edge Functions
   - Use client-side rendering exclusively
   - Pre-render only static pages (home, about, etc.)

**Implementation:**
- Move API route logic to Supabase Edge Functions
- Update mobile app to call Edge Functions directly
- Create a mobile-specific build configuration

### Option 2: SPA Mode (Quick Solution)

Configure Next.js to build as a Single Page Application:

1. Set all pages to client-side rendering
2. Use a simple index.html as entry point
3. Handle all routing client-side
4. This allows dynamic routes to work at runtime

**Trade-offs:**
- No SEO benefits (not needed for mobile app)
- Slower initial load
- Simpler build process

### Option 3: Minimal Static Shell (Current Progress)

Generate only essential static pages:

1. Home page
2. Login/Auth pages
3. Static content pages
4. Let all other routes render client-side

**Status:** Partially implemented
- Build script excludes API routes ✅
- Dynamic route layouts created for some routes ✅
- Needs: Complete migration of remaining dynamic routes

## 📋 Next Steps to Complete Integration

### Immediate (To get Capacitor working):

1. **Choose an approach** from the options above
2. **If choosing Option 3** (Minimal Static Shell):
   ```bash
   # Add layouts to all remaining dynamic routes
   node scripts/add-dynamic-route-layouts.js

   # Try build again
   npm run build:cap
   ```

3. **Add iOS platform:**
   ```bash
   npx cap add ios
   ```

4. **Add Android platform:**
   ```bash
   npx cap add android
   ```

5. **Configure native permissions:**
   - iOS: Update `ios/App/App/Info.plist` with camera permissions
   - Android: Update `android/app/src/main/AndroidManifest.xml` with camera permissions

### For Production:

1. **Migrate to Supabase Edge Functions**
   - Move `/api/*` route logic to Edge Functions
   - Update client code to call Edge Functions
   - Test all functionality

2. **Configure Deep Linking**
   - Set up URL schemes for iOS and Android
   - Handle deep links in the app

3. **Add Native Features**
   - Configure app icons
   - Set up splash screens
   - Add push notifications (if needed)

4. **Testing**
   - Test on iOS simulator
   - Test on Android emulator
   - Test on physical devices

## 🛠️ Available Commands

```bash
# Build for Capacitor (static export)
npm run build:cap

# Sync web assets to native projects
npm run cap:sync

# Open iOS project in Xcode
npm run cap:ios

# Open Android project in Android Studio
npm run cap:android

# Copy web assets without rebuilding
npm run cap:copy

# Rebuild and update native projects
npm run cap:update
```

## 📦 Files Created

- `capacitor.config.ts` - Capacitor configuration
- `lib/platform.ts` - Platform detection utilities
- `lib/storage.ts` - Cross-platform storage wrapper
- `lib/imagePicker.ts` - Camera and gallery image picker
- `scripts/capacitor-build.js` - Custom build script for Capacitor
- `scripts/add-dynamic-route-layouts.js` - Dynamic route layout generator
- Various `layout.tsx` files in dynamic route directories

## 🔧 Configuration Changes

- `next.config.ts` - Added conditional static export
- `package.json` - Added Capacitor build scripts
- `.gitignore` - Added Capacitor directories
- `app/layout.tsx` - Added `dynamicParams = false`
- `app/components/canvas/Toolbar.tsx` - Added camera support
- Several API routes - Added `generateStaticParams()`

## 📚 Documentation

See [CAPACITOR_INTEGRATION_PROMPT.md](CAPACITOR_INTEGRATION_PROMPT.md) for the complete integration guide and requirements.

## ⏭️ Quick Start (Once build issue is resolved)

1. Build the static export:
   ```bash
   npm run build:cap
   ```

2. Add platforms (first time only):
   ```bash
   npx cap add ios
   npx cap add android
   ```

3. Sync and open:
   ```bash
   npm run cap:ios    # For iOS development
   # or
   npm run cap:android # For Android development
   ```

4. Configure permissions in native projects

5. Build and test on devices

---

**Status**: 85% Complete - Core infrastructure ready, waiting on static export strategy decision.
