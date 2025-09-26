// Scanner Service - Barcode/QR code scanning with @zxing/library
import {
  BrowserMultiFormatReader,
  NotFoundException,
  DecodeHintType,
  BarcodeFormat
} from '@zxing/library';
import { ScannerConfig } from '../types';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('ScannerService');

class ScannerService {
  private codeReader: BrowserMultiFormatReader;
  private isScanning = false;
  private config: ScannerConfig = {
    enableBeep: true,
    enableVibration: true,
    autoFocus: true,
    flashMode: 'auto'
  };

  constructor() {
    // Configure hints for better barcode format support
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,  // Prioritize Code-128 first
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_93
    ]);

    // Initialize with hints to prioritize Code-128
    this.codeReader = new BrowserMultiFormatReader(hints);
    logger.info('Scanner configured with Code-128 priority for alphanumeric barcodes');
  }

  // Check if camera is available
  async isCameraAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      logger.error('Failed to check camera availability', error);
      return false;
    }
  }

  // Get specific camera troubleshooting advice based on device/browser
  getCameraTroubleshootingAdvice(): string[] {
    const advice: string[] = [];
    const userAgent = navigator.userAgent;

    // Check if HTTPS
    if (location.protocol !== 'https:') {
      advice.push('⚠️ HTTPS Required: Camera only works on secure (HTTPS) websites');
    }

    // iOS specific advice
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      if (/CriOS/i.test(userAgent)) {
        advice.push('📱 iOS Chrome Issue: Use Safari instead of Chrome on iOS devices');
      }
      advice.push('🔧 iOS Settings: Settings → Safari → Camera → Allow');
    }

    // Android specific advice
    if (/Android/i.test(userAgent)) {
      advice.push('🔧 Android Settings: Settings → Apps → Chrome → Permissions → Camera');
    }

    // Chrome specific advice
    if (/Chrome/i.test(userAgent) && !/CriOS/i.test(userAgent)) {
      advice.push('🌐 Chrome Settings: Settings → Privacy → Site Settings → Camera');
      advice.push('🔄 Try Reload: Refresh page and click scanner button again');
    }

    // Firefox specific advice
    if (/Firefox/i.test(userAgent)) {
      advice.push('🦊 Firefox Settings: Address bar → Camera icon → Allow');
    }

    // General advice
    advice.push('📱 Check Permissions: Ensure both browser AND phone settings allow camera');
    advice.push('🔄 Restart Browser: Close and reopen your browser completely');
    advice.push('⌨️ Alternative: Use Manual Entry to type barcode numbers');

    return advice;
  }

  // Request camera permission with better error handling
  async requestCameraPermission(): Promise<boolean> {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        logger.error('getUserMedia not supported by this browser');
        return false;
      }

      // Try with environment camera first (back camera on mobile)
      let constraints = {
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Stop the stream immediately, we just wanted to check permission
        stream.getTracks().forEach(track => track.stop());
        logger.info('Camera permission granted (environment camera)');
        return true;
      } catch (envError) {
        logger.warn('Environment camera failed, trying user camera', envError);

        // Fallback to user camera (front camera)
        constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach(track => track.stop());
          logger.info('Camera permission granted (user camera)');
          return true;
        } catch (userError) {
          logger.warn('User camera failed, trying basic constraints', userError);

          // Final fallback - basic video only
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            logger.info('Camera permission granted (basic constraints)');
            return true;
          } catch (basicError) {
            logger.error('All camera permission attempts failed', basicError);
            return false;
          }
        }
      }
    } catch (error) {
      logger.error('Camera permission check failed', error);
      return false;
    }
  }

  // Start scanning with camera
  async startScanning(
    videoElement: HTMLVideoElement,
    onScan: (result: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      
      // For iPhone/mobile, try using constraints first before device enumeration
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        logger.debug('Mobile device detected, using facingMode constraint');
        
        // Use facingMode constraint for mobile devices
        const constraints = {
          video: {
            facingMode: 'environment', // Back camera
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
        };
        
        // Start scanning with constraints
        this.codeReader.decodeFromConstraints(
          constraints,
          videoElement,
          (result, error) => {
            if (result) {
              const rawCode = result.getText();
              const scannedCode = this.normalizeBarcodeText(rawCode);
              logger.info('Barcode scanned', {
                raw: rawCode,
                normalized: scannedCode
              });

              // Play feedback
              this.playFeedback();

              // Return normalized result
              onScan(scannedCode);
            }
            
            if (error && !(error instanceof NotFoundException)) {
              logger.error('Scanner error', error);
              onError(new Error('Scanning failed'));
            }
          }
        );
        
        return; // Exit early for mobile
      }
      
      // Desktop/laptop: use device enumeration
      const videoInputDevices = await this.codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Prefer back camera for barcode scanning
      let selectedDevice = videoInputDevices[0];
      
      // Look for back camera (environment facing)
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('rear')
      );
      
      if (backCamera) {
        selectedDevice = backCamera;
        logger.debug('Using back camera for scanning', { cameraLabel: backCamera.label });
      } else {
        logger.debug('Using default camera', { cameraLabel: selectedDevice.label });
      }

      const deviceId = selectedDevice.deviceId;

      // Start continuous decode
      this.codeReader.decodeFromVideoDevice(
        deviceId,
        videoElement,
        (result, error) => {
          if (result) {
            const rawCode = result.getText();
            const scannedCode = this.normalizeBarcodeText(rawCode);
            logger.info('Barcode scanned', {
              raw: rawCode,
              normalized: scannedCode
            });

            // Play feedback
            this.playFeedback();

            // Return normalized result
            onScan(scannedCode);
          }
          
          if (error && !(error instanceof NotFoundException)) {
            logger.error('Scanner error', error);
            onError(new Error('Scanning failed'));
          }
        }
      );

    } catch (error) {
      this.isScanning = false;
      logger.error('Failed to start scanning', error);
      onError(error as Error);
    }
  }

  // Stop scanning
  stopScanning(): void {
    if (this.isScanning) {
      this.codeReader.reset();
      this.isScanning = false;
      logger.debug('Scanner stopped');
    }
  }

  // Play feedback (beep/vibration)
  private playFeedback(): void {
    // Beep feedback
    if (this.config.enableBeep) {
      this.playBeep();
    }

    // Vibration feedback
    if (this.config.enableVibration && 'vibrate' in navigator) {
      navigator.vibrate(200); // 200ms vibration
    }
  }

  // Normalize barcode text to handle character encoding issues
  private normalizeBarcodeText(rawText: string): string {
    try {
      // Handle character encoding issues that can cause PRUPBGFB^SM301702 to become 40452272
      let normalized = rawText;

      // Step 1: Unicode normalization to handle different character encodings
      normalized = normalized.normalize('NFKD');

      // Step 2: Remove any invisible control characters
      normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      // Step 3: Check for possible Code-128 character set C encoding errors
      if (/^[0-9]+$/.test(normalized) && rawText.length > 10) {
        // Pure numbers but original text was long - likely Code-128 set C encoding error
        logger.warn('Possible Code-128 character set C error detected', {
          raw: rawText,
          normalized: normalized,
          suggestion: 'This might be PRUPBGFB^SM301702 encoded as 40452272'
        });

        // Keep the result but warn about potential encoding issue
        // The QR processing logic will handle lookup attempts
      }

      // Step 4: Trim whitespace
      normalized = normalized.trim();

      logger.debug('Barcode text normalized', {
        original: rawText,
        normalized: normalized,
        lengthChange: rawText.length - normalized.length
      });

      return normalized;
    } catch (error) {
      logger.warn('Error normalizing barcode text, using original', { error, rawText });
      return rawText;
    }
  }

  // Play beep sound
  private playBeep(): void {
    try {
      // Create audio context for beep
      const audioContext = new (window.AudioContext || (window as Record<string, any>).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800Hz beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      logger.warn('Could not play beep sound', error);
    }
  }

  // Update scanner configuration
  updateConfig(newConfig: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): ScannerConfig {
    return { ...this.config };
  }

  // Check if currently scanning
  get isActive(): boolean {
    return this.isScanning;
  }

  // Public method to trigger feedback (beep + vibration)
  triggerFeedback(): void {
    this.playFeedback();
  }
}

export const scannerService = new ScannerService();
export default scannerService;