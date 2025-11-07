// Shared Image Cache Service
// Caches images by URL for fast loading across PDF generation and inspections

// Global cache: URL -> base64 data URL
const imageCache = new Map<string, string>();

// Track loading promises to avoid duplicate requests
const loadingPromises = new Map<string, Promise<string>>();

/**
 * Load image from URL and convert to Data URL
 * Uses cache if available
 */
export async function loadImageAsDataURL(url: string): Promise<string> {
  // Check cache first
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // Check if already loading
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  // Load and cache
  const loadPromise = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);

        // Cache it
        imageCache.set(url, dataURL);
        loadingPromises.delete(url);

        resolve(dataURL);
      } catch (error) {
        loadingPromises.delete(url);
        reject(error);
      }
    };
    img.onerror = () => {
      loadingPromises.delete(url);
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });

  loadingPromises.set(url, loadPromise);
  return loadPromise;
}

/**
 * Pre-load multiple images in parallel
 * Returns number of successfully cached images
 */
export async function preloadImages(urls: string[]): Promise<number> {
  const startTime = performance.now();
  const uniqueUrls = [...new Set(urls)]; // Remove duplicates

  // Filter out already cached
  const uncachedUrls = uniqueUrls.filter(url => !imageCache.has(url));

  if (uncachedUrls.length === 0) {
    console.log(`✅ All ${uniqueUrls.length} images already cached`);
    return uniqueUrls.length;
  }

  console.log(`⏳ Pre-loading ${uncachedUrls.length} images...`);

  const results = await Promise.allSettled(
    uncachedUrls.map(url => loadImageAsDataURL(url))
  );

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failCount = results.filter(r => r.status === 'rejected').length;
  const loadTime = performance.now() - startTime;

  console.log(
    `💾 Pre-loaded ${successCount}/${uncachedUrls.length} images in ${loadTime.toFixed(0)}ms` +
    (failCount > 0 ? ` (${failCount} failed)` : '')
  );

  return successCount;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: imageCache.size,
    loading: loadingPromises.size,
  };
}

/**
 * Clear the cache
 */
export function clearCache() {
  const size = imageCache.size;
  imageCache.clear();
  console.log(`🗑️ Cleared image cache (${size} images removed)`);
}

// Export the cache for direct access if needed
export { imageCache };
