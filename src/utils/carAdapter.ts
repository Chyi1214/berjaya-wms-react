// Car Adapter - V5 Type Conversion Utility
// Converts between V5 workStation car format and legacy Car type
import { Car, CarStatus } from '../types';

export interface WorkStationCar {
  vin: string;
  type: string;
  color: string;
  enteredAt: Date;
  timeElapsed?: number;
}

export interface WorkStationWorker {
  email: string;
  displayName: string;
  checkedInAt: Date;
  timeWorking?: number;
}

/**
 * CarAdapter - Single source of truth for converting workStation data to Car type
 * Use this instead of duplicating conversion logic across components
 */
export class CarAdapter {
  /**
   * Convert workStation.currentCar to full Car type
   * @param wsCar - The currentCar from workStation
   * @param zoneId - The zone the car is in
   * @param worker - Optional worker info for zone history
   * @returns Car object compatible with legacy types
   */
  static fromWorkStationCar(
    wsCar: WorkStationCar,
    zoneId: number,
    worker?: WorkStationWorker
  ): Car {
    return {
      vin: wsCar.vin,
      type: wsCar.type,
      color: wsCar.color,
      series: 'Production',
      status: CarStatus.IN_PRODUCTION,
      currentZone: zoneId,
      zoneHistory: [{
        zoneId,
        enteredAt: wsCar.enteredAt,
        enteredBy: worker?.email || 'unknown'
      }],
      createdAt: wsCar.enteredAt,
      carType: wsCar.type // For BOM consumption compatibility
    };
  }

  /**
   * Create a minimal mock Car for callbacks/compatibility
   * @param vin - Vehicle VIN
   * @param zoneId - Current zone
   * @returns Minimal Car object
   */
  static createMockCar(vin: string, zoneId: number): Car {
    return {
      vin,
      type: 'Standard',
      color: 'Unknown',
      series: 'Production',
      status: CarStatus.IN_PRODUCTION,
      currentZone: zoneId,
      zoneHistory: [],
      createdAt: new Date()
    };
  }

  /**
   * Calculate time elapsed in current zone
   * @param enteredAt - When the car entered the zone
   * @returns Time in minutes
   */
  static calculateTimeInZone(enteredAt: Date): number {
    return Math.floor((new Date().getTime() - enteredAt.getTime()) / (1000 * 60));
  }

  /**
   * Format time for display
   * @param minutes - Time in minutes
   * @returns Formatted string (e.g., "2h 30m" or "45m")
   */
  static formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
}
