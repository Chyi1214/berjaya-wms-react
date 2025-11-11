// Production Attribution Service - Calculates bottleneck blame
import { WorkStation, ZoneStatus } from '../types/production';

export interface AttributionResult {
  zoneId: number;
  blamedZone: number | null;  // Which zone to blame, null if no blame
  reason: 'starve' | 'block' | 'working' | null;
}

class ProductionAttributionService {
  /**
   * Calculate zone status based on current car, flying car, and previous zone's flying car
   */
  calculateZoneStatus(
    zone: WorkStation,
    previousZone: WorkStation | null,
    systemIsOn: boolean
  ): ZoneStatus {
    // If system is OFF, all zones are paused
    if (!systemIsOn) {
      return ZoneStatus.PAUSED;
    }

    // If zone has a car being worked on, it's WORK
    if (zone.currentCar) {
      return ZoneStatus.WORK;
    }

    // Zone is empty - check for STARVE or BLOCK
    // Look at previous zone's flying car
    if (previousZone?.flyingCar) {
      return ZoneStatus.BLOCK;  // Previous zone has flying car, this zone is blocked
    }

    return ZoneStatus.STARVE;  // Previous zone has no flying car, this zone is starved
  }

  /**
   * Calculate which zone to blame for current zone's stoppage
   * Returns the zone ID to blame, or null if zone is working
   */
  calculateAttribution(
    zoneId: number,
    allZones: Map<number, WorkStation>
  ): AttributionResult {
    const zone = allZones.get(zoneId);
    if (!zone) {
      return { zoneId, blamedZone: null, reason: null };
    }

    // If zone is working, no blame
    if (zone.status === ZoneStatus.WORK || zone.status === ZoneStatus.PAUSED) {
      return { zoneId, blamedZone: null, reason: null };
    }

    // Zone is STARVED - trace backwards to find blame
    if (zone.status === ZoneStatus.STARVE) {
      const blamedZone = this.traceStarveBlame(zoneId, allZones);
      return { zoneId, blamedZone, reason: 'starve' };
    }

    // Zone is BLOCKED - trace forwards to find blame
    if (zone.status === ZoneStatus.BLOCK) {
      const blamedZone = this.traceBlockBlame(zoneId, allZones);
      return { zoneId, blamedZone, reason: 'block' };
    }

    return { zoneId, blamedZone: null, reason: null };
  }

  /**
   * Trace backwards to find which zone is causing the starve
   *
   * Rules:
   * - If previous zone is WORKING → blame it (it's slow)
   * - If previous zone is BLOCKED → blame it (it's not accepting)
   * - If previous zone is STARVED → keep going backwards
   * - If reach Zone 1 → blame Zone 1
   */
  private traceStarveBlame(
    starvedZoneId: number,
    allZones: Map<number, WorkStation>
  ): number {
    let currentZoneId = starvedZoneId - 1;  // Start with previous zone

    while (currentZoneId >= 1) {
      const zone = allZones.get(currentZoneId);
      if (!zone) {
        // If zone doesn't exist, blame the starved zone itself
        return starvedZoneId;
      }

      // If zone is WORKING or BLOCKED, blame it
      if (zone.status === ZoneStatus.WORK || zone.status === ZoneStatus.BLOCK) {
        return currentZoneId;
      }

      // If zone is also STARVED, keep going backwards
      if (zone.status === ZoneStatus.STARVE) {
        currentZoneId--;
        continue;
      }

      // PAUSED zones - skip
      if (zone.status === ZoneStatus.PAUSED) {
        currentZoneId--;
        continue;
      }

      // Shouldn't reach here
      return currentZoneId;
    }

    // Reached Zone 1, blame Zone 1
    return 1;
  }

  /**
   * Trace forwards to find which zone is causing the block
   *
   * Rules:
   * - First check: If current zone has NO flying car → blame itself (not accepting from previous)
   * - If next zone is WORKING → blame it (it's slow to accept)
   * - If next zone is BLOCKED → keep going forwards
   * - If next zone is STARVED → blame current zone (the zone before the starved one)
   * - If reach last zone → blame last zone
   */
  private traceBlockBlame(
    blockedZoneId: number,
    allZones: Map<number, WorkStation>,
    maxZoneId: number = 23
  ): number {
    // First check: If this zone has no flying car, blame itself
    // (It's blocked because it hasn't accepted the car from previous zone)
    const blockedZone = allZones.get(blockedZoneId);
    if (blockedZone && !blockedZone.flyingCar) {
      return blockedZoneId;
    }

    // Zone has a flying car, so trace forwards to find who's not accepting
    let currentZoneId = blockedZoneId + 1;  // Start with next zone

    while (currentZoneId <= maxZoneId) {
      const zone = allZones.get(currentZoneId);
      if (!zone) {
        // If zone doesn't exist, blame the blocked zone itself
        return blockedZoneId;
      }

      // If zone is WORKING, blame it (it's slow to accept)
      if (zone.status === ZoneStatus.WORK) {
        return currentZoneId;
      }

      // If zone is STARVED, blame the zone BEFORE it (i.e., blockedZoneId)
      // This handles handover gaps
      if (zone.status === ZoneStatus.STARVE) {
        return currentZoneId - 1;
      }

      // If zone is also BLOCKED, keep going forwards
      if (zone.status === ZoneStatus.BLOCK) {
        currentZoneId++;
        continue;
      }

      // PAUSED zones - skip
      if (zone.status === ZoneStatus.PAUSED) {
        currentZoneId++;
        continue;
      }

      // Shouldn't reach here
      return currentZoneId;
    }

    // Reached last zone, blame last zone
    return maxZoneId;
  }

  /**
   * Calculate all attributions for all zones
   * Returns a map of zoneId -> attributed zones (which zones are blaming this zone)
   */
  calculateAllAttributions(
    allZones: Map<number, WorkStation>
  ): Map<number, { starveCount: number; blockCount: number }> {
    const attributions = new Map<number, { starveCount: number; blockCount: number }>();

    // Initialize all zones
    allZones.forEach((_, zoneId) => {
      attributions.set(zoneId, { starveCount: 0, blockCount: 0 });
    });

    // Calculate blame for each zone
    allZones.forEach((_zone, zoneId) => {
      const attribution = this.calculateAttribution(zoneId, allZones);

      if (attribution.blamedZone !== null) {
        const current = attributions.get(attribution.blamedZone) || { starveCount: 0, blockCount: 0 };

        if (attribution.reason === 'starve') {
          current.starveCount++;
        } else if (attribution.reason === 'block') {
          current.blockCount++;
        }

        attributions.set(attribution.blamedZone, current);
      }
    });

    return attributions;
  }
}

// Export singleton instance
export const productionAttributionService = new ProductionAttributionService();
export default productionAttributionService;
