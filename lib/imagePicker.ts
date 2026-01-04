import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNative } from './platform';

export interface ImagePickerOptions {
  source?: 'camera' | 'gallery' | 'prompt';
  quality?: number;
  allowEditing?: boolean;
}

export interface ImagePickerResult {
  success: boolean;
  file?: File;
  dataUrl?: string;
  error?: string;
}

/**
 * Pick an image from camera or gallery
 * On web: Uses standard file input
 * On native: Uses Capacitor Camera plugin with camera/gallery options
 */
export async function pickImage(options: ImagePickerOptions = {}): Promise<ImagePickerResult> {
  const {
    source = 'prompt',
    quality = 90,
    allowEditing = false,
  } = options;

  try {
    if (isNative()) {
      // Native platform: Use Capacitor Camera plugin
      return await pickImageNative(source, quality, allowEditing);
    } else {
      // Web platform: Use file input
      return await pickImageWeb();
    }
  } catch (error) {
    console.error('Error picking image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pick image on native platforms using Capacitor Camera
 */
async function pickImageNative(
  source: 'camera' | 'gallery' | 'prompt',
  quality: number,
  allowEditing: boolean
): Promise<ImagePickerResult> {
  try {
    // Determine camera source
    let cameraSource: CameraSource;
    if (source === 'camera') {
      cameraSource = CameraSource.Camera;
    } else if (source === 'gallery') {
      cameraSource = CameraSource.Photos;
    } else {
      // 'prompt' - let user choose
      cameraSource = CameraSource.Prompt;
    }

    // Take/select photo
    const photo = await Camera.getPhoto({
      quality,
      allowEditing,
      resultType: CameraResultType.DataUrl, // Get base64 data URL
      source: cameraSource,
    });

    if (!photo.dataUrl) {
      return {
        success: false,
        error: 'No image data received',
      };
    }

    // Convert data URL to File object
    const file = await dataUrlToFile(photo.dataUrl, 'image.jpg');

    return {
      success: true,
      file,
      dataUrl: photo.dataUrl,
    };
  } catch (error) {
    // User cancelled or error occurred
    if (error instanceof Error && error.message.includes('cancel')) {
      return {
        success: false,
        error: 'User cancelled',
      };
    }

    throw error;
  }
}

/**
 * Pick image on web platform using file input
 */
async function pickImageWeb(): Promise<ImagePickerResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.ai,.psd'; // Accept images, AI, and PSD files

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        resolve({
          success: false,
          error: 'No file selected',
        });
        return;
      }

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          success: true,
          file,
          dataUrl: reader.result as string,
        });
      };
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to read file',
        });
      };
      reader.readAsDataURL(file);
    };

    input.oncancel = () => {
      resolve({
        success: false,
        error: 'User cancelled',
      });
    };

    // Trigger file input
    input.click();
  });
}

/**
 * Convert data URL to File object
 */
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * Check if camera is available
 */
export async function isCameraAvailable(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    // Check camera permissions
    const permissions = await Camera.checkPermissions();
    return permissions.camera !== 'denied';
  } catch {
    return false;
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    const permissions = await Camera.requestPermissions();
    return permissions.camera === 'granted';
  } catch {
    return false;
  }
}
