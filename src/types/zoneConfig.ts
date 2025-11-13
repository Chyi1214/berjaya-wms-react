// Zone Configuration Types - V8.1.0 Dynamic Zone System

export enum ZoneType {
  PRODUCTION = 'production',
  MAINTENANCE = 'maintenance'
}

export interface ZoneConfig {
  zoneId: number;              // Sequential ID used internally (1, 2, 3, 4, 5...)
  displayName: string;         // Display name shown in UI ("-1", "0", "1", "1.5", "CP7")
  type: ZoneType;              // Production (linked) or Maintenance (isolated)
  logisticsLocation: string;   // Linked inventory location
  active: boolean;             // Can be disabled without deleting
  description?: string;        // Optional description
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateZoneConfigInput {
  displayName: string;
  type: ZoneType;
  logisticsLocation: string;
  description?: string;
}

export interface UpdateZoneConfigInput {
  displayName?: string;
  type?: ZoneType;
  logisticsLocation?: string;
  active?: boolean;
  description?: string;
}

// Helper function to get display name
export function getZoneDisplayName(zoneId: number, configs: ZoneConfig[]): string {
  const config = configs.find(c => c.zoneId === zoneId);
  return config?.displayName || String(zoneId);
}

// Helper function to check if zone is maintenance
export function isMaintenanceZone(zoneId: number, configs: ZoneConfig[]): boolean {
  const config = configs.find(c => c.zoneId === zoneId);
  return config?.type === ZoneType.MAINTENANCE;
}

// Helper function to get active production zones in sequence
export function getActiveProductionZones(configs: ZoneConfig[]): ZoneConfig[] {
  return configs
    .filter(c => c.active && c.type === ZoneType.PRODUCTION)
    .sort((a, b) => a.zoneId - b.zoneId);
}

// Helper function to get all active zones
export function getActiveZones(configs: ZoneConfig[]): ZoneConfig[] {
  return configs
    .filter(c => c.active)
    .sort((a, b) => a.zoneId - b.zoneId);
}
