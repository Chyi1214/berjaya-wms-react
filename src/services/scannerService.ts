// Scanner Service - Barcode/QR code scanning with @zxing/library
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
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
    this.codeReader = new BrowserMultiFormatReader();
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

  // Request camera permission
  async requestCameraPermission(): Promise<boolean> {
    try {
      // Use more specific constraints for mobile devices
      const constraints = {
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Stop the stream immediately, we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      logger.info('Camera permission granted');
      return true;
    } catch (error) {
      logger.error('Camera permission denied', error);
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
              const scannedCode = result.getText();
              logger.info('Barcode scanned', { code: scannedCode });
              
              // Play feedback
              this.playFeedback();
              
              // Return result
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
            const scannedCode = result.getText();
            logger.info('Barcode scanned', { code: scannedCode });
            
            // Play feedback
            this.playFeedback();
            
            // Return result
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