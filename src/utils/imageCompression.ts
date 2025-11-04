// Image Compression Utility - Smart compression only when needed
import { createModuleLogger } from '../services/logger';

const logger = createModuleLogger('ImageCompression');

interface CompressionOptions {
  maxSizeMB?: number;        // Only compress if larger than this (default: 1MB)
  maxWidthOrHeight?: number; // Max dimension (default: 1920px)
  quality?: number;          // JPEG quality 0-1 (default: 0.85)
}

/**
 * Compress image only if it's larger than the threshold
 * Returns original file if small enough, compressed blob otherwise
 */
export async function compressImageIfNeeded(
  file: File,
  options: CompressionOptions = {}
): Promise<{ file: File | Blob; wasCompressed: boolean; originalSize: number; finalSize: number }> {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    quality = 0.85,
  } = options;

  const originalSize = file.size;
  const thresholdBytes = maxSizeMB * 1024 * 1024;

  // Check if compression is needed
  if (originalSize <= thresholdBytes) {
    logger.info('Image is small enough, skipping compression:', {
      size: `${(originalSize / 1024).toFixed(2)} KB`,
      threshold: `${maxSizeMB} MB`,
    });
    return {
      file,
      wasCompressed: false,
      originalSize,
      finalSize: originalSize,
    };
  }

  logger.info('Image is too large, compressing...', {
    size: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
    threshold: `${maxSizeMB} MB`,
  });

  try {
    // Load image
    const img = await loadImage(file);

    // Calculate new dimensions while maintaining aspect ratio
    let width = img.width;
    let height = img.height;

    if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
      if (width > height) {
        height = Math.round((height * maxWidthOrHeight) / width);
        width = maxWidthOrHeight;
      } else {
        width = Math.round((width * maxWidthOrHeight) / height);
        height = maxWidthOrHeight;
      }
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });

    const finalSize = compressedBlob.size;

    logger.info('Compression complete:', {
      originalSize: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
      finalSize: `${(finalSize / 1024 / 1024).toFixed(2)} MB`,
      reduction: `${(((originalSize - finalSize) / originalSize) * 100).toFixed(1)}%`,
      dimensions: `${width}x${height}`,
    });

    return {
      file: compressedBlob,
      wasCompressed: true,
      originalSize,
      finalSize,
    };
  } catch (error) {
    logger.error('Compression failed, using original:', error);
    // Return original if compression fails
    return {
      file,
      wasCompressed: false,
      originalSize,
      finalSize: originalSize,
    };
  }
}

/**
 * Load image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
