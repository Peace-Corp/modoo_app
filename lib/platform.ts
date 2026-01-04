import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Capacitor
 * Provides helpers to detect the current platform (iOS, Android, or Web)
 */

export type Platform = 'ios' | 'android' | 'web';

/**
 * Get the current platform
 * @returns The current platform: 'ios', 'android', or 'web'
 */
export function getPlatform(): Platform {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if running on web (not native)
 */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/**
 * Check if running on a native platform (iOS or Android)
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if a specific plugin is available
 * @param pluginName The name of the plugin to check
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Get platform-specific configuration
 * Useful for conditional rendering or behavior
 */
export function getPlatformConfig() {
  const platform = getPlatform();

  return {
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    isNative: platform !== 'web',
    // Touch target size (Apple HIG recommends 44px, Material Design recommends 48dp)
    minTouchTarget: platform === 'ios' ? 44 : platform === 'android' ? 48 : 40,
    // Status bar height (approximate, will vary by device)
    statusBarHeight: platform === 'ios' ? 44 : platform === 'android' ? 24 : 0,
    // Safe area insets
    hasSafeArea: platform === 'ios',
  };
}

/**
 * Execute code conditionally based on platform
 */
export function runOnPlatform<T>(handlers: {
  ios?: () => T;
  android?: () => T;
  web?: () => T;
  default?: () => T;
}): T | undefined {
  const platform = getPlatform();

  if (platform === 'ios' && handlers.ios) {
    return handlers.ios();
  }

  if (platform === 'android' && handlers.android) {
    return handlers.android();
  }

  if (platform === 'web' && handlers.web) {
    return handlers.web();
  }

  if (handlers.default) {
    return handlers.default();
  }

  return undefined;
}
