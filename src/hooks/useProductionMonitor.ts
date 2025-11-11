// Production Monitor Hook - Manages periodic updates for takt time system
import { useEffect, useRef, useState } from 'react';
import { workStationServiceV5 } from '../services/workStationServiceV5';
import { productionSystemService } from '../services/productionSystemService';
import { WorkStation, ProductionSystemState } from '../types/production';
import { createModuleLogger } from '../services/logger';

const logger = createModuleLogger('ProductionMonitor');

const UPDATE_INTERVAL = 1000; // 1 second

export function useProductionMonitor() {
  const [zones, setZones] = useState<WorkStation[]>([]);
  const [maintenanceZone, setMaintenanceZone] = useState<WorkStation | null>(null);
  const [systemState, setSystemState] = useState<ProductionSystemState | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [allZones, maintenance, state] = await Promise.all([
        workStationServiceV5.getAllProductionZones(),
        workStationServiceV5.getMaintenanceZone(),
        productionSystemService.getSystemState(),
      ]);

      setZones(allZones);
      setMaintenanceZone(maintenance);
      setSystemState(state);
      setLastUpdate(new Date());
    } catch (error) {
      logger.error('Failed to load production data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Update time accumulations (background refresh - no loading screen)
  const updateTimes = async () => {
    try {
      await workStationServiceV5.updateTimeAccumulations();
      await loadData(false); // Reload data silently without loading screen
    } catch (error) {
      logger.error('Failed to update time accumulations:', error);
    }
  };

  // Start periodic updates
  useEffect(() => {
    loadData();

    // Start interval
    intervalRef.current = setInterval(() => {
      updateTimes();
    }, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Toggle production system
  const toggleSystem = async (turnOn: boolean, userEmail: string, userName: string) => {
    try {
      const newState = await productionSystemService.toggleSystem(turnOn, userEmail, userName);
      setSystemState(newState);

      // Recalculate zone statuses after toggle
      await workStationServiceV5.recalculateAllZoneStatuses();
      await loadData(false); // Refresh data without loading screen

      logger.info(`Production system turned ${turnOn ? 'ON' : 'OFF'}`);
    } catch (error) {
      logger.error('Failed to toggle system:', error);
      throw error;
    }
  };

  // Reset all zones (daily reset - clear all data and reinitialize)
  const resetAllZones = async () => {
    try {
      setLoading(true);
      logger.info('Resetting all production zones...');

      // Reset all zones
      await workStationServiceV5.resetAllZones();

      // Reset daily counters
      await productionSystemService.resetDailyCounters();

      // Load fresh data
      await loadData();

      logger.info('✅ All zones reset successfully');
    } catch (error) {
      logger.error('Failed to reset zones:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    zones,
    maintenanceZone,
    systemState,
    loading,
    lastUpdate,
    refreshData: loadData,
    toggleSystem,
    resetAllZones,
  };
}
