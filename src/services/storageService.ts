// Firebase Storage Service - Upload images to Firebase Storage
import { ref, getDownloadURL, uploadBytes } from './costTracking/storageWrapper';
import { storage } from './firebase';
import { compressWasteReportImage } from '../utils/imageCompression';

/**
 * Upload waste report image to Firebase Storage
 * Images are compressed before upload to save storage and bandwidth
 */
export async function uploadWasteReportImage(
  file: File,
  reportId: string,
  imageType: 'label' | 'damage'
): Promise<{ url: string; size: number }> {
  try {
    console.log(`📤 Uploading ${imageType} image for report ${reportId}...`);

    // Compress image first
    const { compressedFile } = await compressWasteReportImage(file);
    const compressedSize = compressedFile.size;

    // Create storage path: waste_reports/{reportId}/{imageType}_{timestamp}.jpg
    const timestamp = Date.now();
    const fileName = `${imageType}_${timestamp}.jpg`;
    const storagePath = `waste_reports/${reportId}/${fileName}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressedFile, 'StorageService', 'uploadWasteReportImage');

    // Get download URL (with cost tracking)
    const downloadURL = await getDownloadURL(storageRef, 'StorageService', 'uploadWasteReportImage');

    console.log(`✅ ${imageType} image uploaded:`, downloadURL, `(${(compressedSize / 1024).toFixed(2)} KB)`);

    return { url: downloadURL, size: compressedSize };
  } catch (error) {
    console.error(`❌ Failed to upload ${imageType} image:`, error);
    throw new Error(`Failed to upload ${imageType} image`);
  }
}

/**
 * Upload both label and damage images for waste report
 * Returns object with both URLs
 */
export async function uploadWasteReportImages(
  labelImage: File,
  damageImage: File,
  reportId: string
): Promise<{
  labelImageUrl: string;
  damageImageUrl: string;
  labelImageSize: number;
  damageImageSize: number;
}> {
  try {
    console.log('📤 Uploading waste report images...');

    // Upload both images in parallel for speed
    const [labelResult, damageResult] = await Promise.all([
      uploadWasteReportImage(labelImage, reportId, 'label'),
      uploadWasteReportImage(damageImage, reportId, 'damage')
    ]);

    console.log('✅ All waste report images uploaded successfully');

    return {
      labelImageUrl: labelResult.url,
      damageImageUrl: damageResult.url,
      labelImageSize: labelResult.size,
      damageImageSize: damageResult.size
    };
  } catch (error) {
    console.error('❌ Failed to upload waste report images:', error);
    throw error;
  }
}
