# Capacitor Integration Prompt for Multi-Platform Support

## Overview
Add Capacitor to this Next.js 16 product customization application to enable native iOS and Android deployment while maintaining the existing web functionality.

## Project Context
- **Framework**: Next.js 16 (App Router) with React 19.2.1
- **Canvas Library**: Fabric.js 6.9.1 (client-side only, requires special handling)
- **Backend**: Supabase (authentication and storage)
- **State Management**: Zustand 5.0.9
- **Styling**: Tailwind CSS 4
- **Current Features**:
  - Multi-side product designer with touch gestures
  - Canvas-based design tools (text, images, shapes)
  - localStorage for design persistence
  - Supabase Storage for product mockup images

## Goals
1. Enable the app to run as native iOS and Android applications
2. Maintain existing web functionality
3. Optimize touch interactions for mobile devices
4. Handle platform-specific features (camera access for image uploads, file system, etc.)
5. Ensure Fabric.js canvas works properly on mobile devices
6. Configure proper build pipeline for both platforms

## Implementation Tasks

### Phase 1: Capacitor Installation and Configuration

1. **Install Capacitor Core Dependencies**
   ```bash
   npm install @capacitor/core @capacitor/cli
   ```

2. **Initialize Capacitor**
   ```bash
   npx cap init
   ```
   - App name: "Modoo Designer" (or appropriate name)
   - App ID: Use reverse domain notation (e.g., `com.modoo.designer`)
   - Web directory: `out` (Next.js static export output)

3. **Update next.config.ts for Static Export**
   - Configure Next.js for static export since Capacitor requires static files
   - Add `output: 'export'` to next.config
   - Handle image optimization (Capacitor doesn't support Next.js Image optimization server)
   - Configure `trailingSlash: true` for proper routing
   - Set `basePath` if needed for subfolder deployments

4. **Install Platform-Specific Dependencies**
   ```bash
   npm install @capacitor/ios @capacitor/android
   npx cap add ios
   npx cap add android
   ```

5. **Create capacitor.config.ts**
   - Configure server settings
   - Set webDir to 'out'
   - Configure plugins
   - Add platform-specific settings

### Phase 2: Platform-Specific Plugins

Install required Capacitor plugins:

1. **Filesystem Plugin** (for image handling and storage)
   ```bash
   npm install @capacitor/filesystem
   ```

2. **Camera Plugin** (for taking photos to add to designs)
   ```bash
   npm install @capacitor/camera
   ```

3. **Share Plugin** (for sharing designs)
   ```bash
   npm install @capacitor/share
   ```

4. **Status Bar Plugin** (for UI consistency)
   ```bash
   npm install @capacitor/status-bar
   ```

5. **Splash Screen Plugin**
   ```bash
   npm install @capacitor/splash-screen
   ```

6. **App Plugin** (for app state management)
   ```bash
   npm install @capacitor/app
   ```

7. **Haptics Plugin** (for touch feedback)
   ```bash
   npm install @capacitor/haptics
   ```

### Phase 3: Code Modifications

1. **Create Platform Detection Utility** (`utils/platform.ts`)
   - Detect if running on iOS, Android, or web
   - Provide platform-specific configuration
   - Export helper functions for conditional rendering

2. **Update Canvas Components for Mobile**
   - Ensure Fabric.js touch events work on mobile
   - Adjust canvas sizing for mobile viewports
   - Test pinch-to-zoom and multi-touch gestures
   - Handle mobile keyboard interactions
   - Verify SingleSideCanvas works on native platforms

3. **Update Image Upload Flow**
   - Add camera capture option using @capacitor/camera
   - Handle file selection from device gallery
   - Convert images to base64 or blob URLs for Fabric.js
   - Update Toolbar component to include camera option on mobile

4. **Update Storage Strategy**
   - Keep localStorage for web
   - Consider using @capacitor/preferences for native apps (more reliable than localStorage)
   - Update useCanvasStore serialization to work with native storage

5. **Configure Supabase for Mobile**
   - Ensure Supabase client works on native platforms
   - Test authentication flows on mobile
   - Verify storage URLs are accessible from native apps
   - Handle deep linking for auth callbacks if needed

6. **Update Navigation and Routing**
   - Ensure Next.js App Router works with static export
   - Test all routes on native platforms
   - Handle back button behavior on Android
   - Configure iOS swipe-back gestures

### Phase 4: Native Configuration

1. **iOS Configuration** (`ios/App/App/`)
   - Configure Info.plist with required permissions:
     - Camera usage description
     - Photo library usage description
     - File access permissions
   - Set up app icons and splash screens
   - Configure scheme for deep linking
   - Set deployment target (iOS 13.0+)

2. **Android Configuration** (`android/app/src/main/`)
   - Configure AndroidManifest.xml with permissions:
     - Camera permission
     - Read/write external storage
     - Internet permission
   - Set up app icons and splash screens
   - Configure intent filters for deep linking
   - Set minSdkVersion (22+) and targetSdkVersion (34+)
   - Configure Gradle files if needed

3. **Configure App Icons and Splash Screens**
   - Generate icon sets for both platforms
   - Create adaptive icons for Android
   - Design splash screens
   - Use Capacitor asset generator or manual configuration

### Phase 5: Build Scripts and Workflow

1. **Update package.json Scripts**
   ```json
   {
     "scripts": {
       "build": "next build",
       "export": "next build && next export",
       "cap:sync": "npm run export && npx cap sync",
       "cap:ios": "npm run cap:sync && npx cap open ios",
       "cap:android": "npm run cap:sync && npx cap open android",
       "cap:copy": "npx cap copy",
       "cap:update": "npm run export && npx cap update"
     }
   }
   ```

2. **Create Development Workflow Documentation**
   - Document sync process (build → export → cap sync)
   - Explain when to use `cap copy` vs `cap sync`
   - Detail how to debug on devices
   - Provide testing guidelines

### Phase 6: Mobile Optimization

1. **Canvas Performance**
   - Test Fabric.js performance on mobile devices
   - Optimize canvas rendering for lower-powered devices
   - Consider reducing canvas resolution on mobile if needed
   - Test memory usage with large designs

2. **Touch Interactions**
   - Verify existing swipe gestures work correctly
   - Test two-finger gestures on canvas
   - Ensure toolbar buttons are touch-friendly (min 44px touch targets)
   - Add haptic feedback for important actions

3. **Responsive Design**
   - Test all layouts on various screen sizes (phones, tablets)
   - Ensure canvas fits mobile screens properly
   - Verify toolbar is accessible on small screens
   - Test landscape and portrait orientations

4. **Performance Optimization**
   - Implement lazy loading for heavy components
   - Optimize image loading from Supabase
   - Minimize bundle size
   - Test app launch time

### Phase 7: Testing

1. **Test on Simulators/Emulators**
   - iOS Simulator (Xcode)
   - Android Emulator (Android Studio)
   - Test all core features

2. **Test on Physical Devices**
   - At least one iOS device
   - At least one Android device
   - Test various screen sizes

3. **Key Features to Test**
   - Canvas manipulation (add text, images, shapes)
   - Side navigation with swipe gestures
   - Image upload from camera and gallery
   - Design save/load from storage
   - Product color changes
   - Edit mode toggle
   - Supabase authentication
   - Supabase Storage image loading

4. **Performance Testing**
   - Canvas rendering performance
   - App startup time
   - Memory usage
   - Battery consumption

### Phase 8: Production Considerations

1. **Environment Variables**
   - Ensure Supabase credentials are properly configured for production
   - Use different Supabase projects for dev/staging/prod if needed
   - Handle environment-specific configuration

2. **Code Signing and Certificates**
   - Set up iOS provisioning profiles
   - Configure Android keystore for release builds
   - Document signing process

3. **App Store Preparation**
   - Prepare iOS app for App Store submission
   - Prepare Android app for Google Play submission
   - Create app descriptions, screenshots, privacy policy
   - Configure app versioning strategy

4. **Updates and Maintenance**
   - Set up Capacitor Live Updates (optional, for hot fixes)
   - Plan for app update distribution
   - Monitor crash reports and analytics

## Special Considerations for This Project

### Fabric.js on Mobile
- Fabric.js is a client-side library that should work on mobile, but needs testing
- Ensure touch events are properly handled
- Canvas performance may vary on different devices
- Consider implementing canvas quality settings for different devices

### Next.js Static Export Limitations
- No server-side rendering on native platforms
- API routes won't work (use Supabase instead)
- Image optimization must be disabled or handled differently
- Dynamic routes need special configuration

### Supabase Integration
- Test auth flows on native platforms
- Ensure Storage URLs work from native apps
- Consider using Supabase deep linking for OAuth flows
- Test offline behavior and error handling

### LocalStorage
- Consider migrating from localStorage to @capacitor/preferences
- Preferences plugin is more reliable on native platforms
- Provides a consistent API across web and native

## Success Criteria

- [ ] App builds successfully for iOS and Android
- [ ] All canvas features work on native platforms
- [ ] Touch gestures function properly
- [ ] Camera integration works for image uploads
- [ ] Designs can be saved and loaded on native apps
- [ ] Supabase authentication and storage work correctly
- [ ] App performance is acceptable on target devices
- [ ] No critical bugs or crashes on native platforms
- [ ] UI is responsive and touch-friendly
- [ ] Build and deployment process is documented

## Deliverables

1. Updated `capacitor.config.ts` with proper configuration
2. Modified `next.config.ts` for static export
3. Platform detection utility (`utils/platform.ts`)
4. Updated image upload components with camera support
5. iOS and Android native projects configured
6. Updated build scripts in package.json
7. Documentation for building and deploying to native platforms
8. Test reports from iOS and Android devices

## References

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor with Next.js Guide](https://capacitorjs.com/docs/getting-started/nextjs)
- [Fabric.js Touch Events](http://fabricjs.com/fabric-intro-part-4)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

## Timeline Estimation

- Phase 1-2: 2-3 hours (installation and plugin setup)
- Phase 3: 4-6 hours (code modifications)
- Phase 4: 2-3 hours (native configuration)
- Phase 5: 1-2 hours (build scripts)
- Phase 6: 3-4 hours (mobile optimization)
- Phase 7: 4-6 hours (testing)
- Phase 8: Variable (depends on deployment requirements)

**Total estimated time**: 16-24 hours of development work

## Notes

- Start with iOS or Android first, then add the second platform
- Test frequently on actual devices, not just simulators
- Keep the web version functional throughout the process
- Document any platform-specific workarounds or issues
- Consider creating a separate branch for Capacitor integration
- Plan for backwards compatibility if web version needs to remain primary
