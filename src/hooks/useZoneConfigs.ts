// Custom hook for loading and using zone configurations
import { useState, useEffect, useCallback } from 'react';
import { ZoneConfig, getZoneDisplayName, getActiveProductionZones } from '../types/zoneConfig';
import { zoneConfigService } from '../services/zoneConfigService';
import { createModuleLogger } from '../services/logger';

const logger = createModuleLogger('useZoneConfigs');

export function useZoneConfigs() {
  const [zones, setZones] = useState<ZoneConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      const allZones = await zoneConfigService.getActiveZoneConfigs();
      setZones(allZones);
      setError(null);
    } catch (err) {
      logger.error('Failed to load zone configs:', err);
      setError('Failed to load zones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Get display name for a zone ID
  const getDisplayName = useCallback((zoneId: number): string => {
    return getZoneDisplayName(zoneId, zones);
  }, [zones]);

  // Get production zones sorted by sequence
  const productionZones = useCallback((): ZoneConfig[] => {
    return getActiveProductionZones(zones);
  }, [zones]);

  // Get all zones (production + maintenance) sorted by sequence for production, then maintenance
  const allZonesSorted = useCallback((): ZoneConfig[] => {
    const production = getActiveProductionZones(zones);
    const maintenance = zones.filter(z => z.type === 'maintenance');
    return [...production, ...maintenance];
  }, [zones]);

  // Get zone config by ID
  const getZoneById = useCallback((zoneId: number): ZoneConfig | undefined => {
    return zones.find(z => z.zoneId === zoneId);
  }, [zones]);

  return {
    zones,
    loading,
    error,
    reload: loadZones,
    getDisplayName,
    productionZones,
    allZonesSorted,
    getZoneById,
  };
}
