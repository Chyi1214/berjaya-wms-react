# V8.0.0 Takt Time Production System

## Overview

The Takt Time Production System introduces a complete redesign of production tracking with the "Flying Car" workflow, bottleneck detection, and real-time attribution tracking.

## Key Concepts

### Flying Car Workflow
- Cars complete work and become "flying" (waiting for next zone to accept)
- Flying cars remain indefinitely until manually scanned and accepted by next zone
- No auto-accept - workers must scan VIN to confirm acceptance
- Enables precise handoff tracking and prevents automatic zone progression

### Zone States
- **WORK**: Zone has a car currently being worked on
- **STARVE**: Zone is empty AND previous zone has no flying car (upstream is slow)
- **BLOCK**: Zone is empty AND previous zone HAS a flying car (current zone not accepting)
- **PAUSED**: System is OFF (during breaks)

### Bottleneck Attribution Algorithm

**Starve Attribution** (traces backwards):
- If previous zone is WORKING → blame it (it's slow)
- If previous zone is BLOCKED → blame it (it's not accepting from its previous zone)
- If previous zone is STARVED → keep going backwards
- If reach Zone 1 → blame Zone 1

**Block Attribution** (traces forwards):
- First: If current zone has NO flying car → blame itself (hasn't accepted incoming car)
- If zone has flying car:
  - If next zone is WORKING → blame it (slow to accept)
  - If next zone is BLOCKED → keep going forwards
  - If next zone is STARVED → blame zone before starved (handover gap)
  - If reach Zone 23 → blame Zone 23

### ON/OFF System
- Manager can toggle production tracking ON/OFF
- OFF periods represent breaks (lunch, rest periods)
- All timers freeze during OFF periods
- Zone status still visible during OFF (leaders can respond)
- ON/OFF events logged with timestamps

### Time Tracking
- **Work Time**: Time spent working on cars (green)
- **Starve Time**: Time spent waiting for upstream work (yellow)
- **Block Time**: Time spent waiting for downstream acceptance (red)
- **Caused Stop Time**: Accumulated time this zone caused line delays
  - Resets when car completes work
  - Starts accumulating when blame comes to this zone

## System Architecture

### New Services

#### `productionSystemService.ts`
Manages ON/OFF toggle and break time tracking:
- `toggleSystem(turnOn, userEmail, userName)` - Toggle production ON/OFF
- `getSystemState()` - Get current system state
- `resetDailyCounters()` - Reset daily ON/OFF time (scheduled)

#### `productionAttributionService.ts`
Core bottleneck detection algorithm:
- `calculateZoneStatus(zone, previousZone, systemIsOn)` - Determine zone state
- `calculateAttribution(zoneId, allZones)` - Find which zone to blame
- `calculateAllAttributions(allZones)` - Calculate blame for all zones

#### `workStationServiceV5.ts`
Flying car operations and zone management:
- `startWork(zoneId, carVin, ..., fromFlyingCar)` - Start work on car
- `completeWork(zoneId, carVin)` - Complete work (car becomes flying)
- `moveToMaintenance(fromZoneId, carVin, ...)` - Move car to maintenance
- `updateTimeAccumulations()` - Update all timers (called every 5 seconds)
- `recalculateAllZoneStatuses()` - Update zone states after changes

### New Components

#### `ProductionMonitorV5.tsx` (Manager View)
Full dashboard showing:
- System ON/OFF toggle
- All 23 production zones + maintenance zone
- Stacked bar graphs (work/starve/block time)
- Caused stop timers for each zone
- Current car and flying car information
- Real-time updates every 5 seconds

#### `ProductionWorkerV5.tsx` (Worker View)
Zone-specific interface for workers:
- Current car information and work duration
- Flying car status (if work completed)
- Accept incoming flying car from previous zone (requires VIN scan)
- Start new car (Zone 1 only)
- Complete work button
- Move to maintenance button

#### `useProductionMonitor.ts` (React Hook)
Manages auto-refresh and system state:
- Loads all zones and system state
- Updates timers every 5 seconds
- Provides toggle function for managers

## Database Structure

### Collections

**`productionSystem/state`** - System-wide state
```javascript
{
  isOn: boolean,
  lastToggledAt: Date,
  lastToggledBy: string,
  lastToggledByName: string,
  todayOnTime: number,        // Total minutes ON today
  todayOffTime: number,       // Total minutes OFF today
  onOffHistory: Array<{
    timestamp: Date,
    action: 'turn_on' | 'turn_off',
    by: string,
    byName: string
  }>
}
```

**`workStations/{zoneId}`** - Individual zone data (zones 1-23, 99)
```javascript
{
  zoneId: number,

  currentCar?: {
    vin: string,
    type: string,
    color: string,
    enteredAt: Date,
    timeElapsed: number       // Minutes (excluding OFF time)
  },

  flyingCar?: {
    vin: string,
    type: string,
    color: string,
    completedAt: Date,
    flyingTime: number        // Minutes waiting (excluding OFF time)
  },

  status: 'work' | 'starve' | 'block' | 'paused',

  causedStopTime: {
    current: number,          // Current accumulation (resets on complete)
    total: number,            // Historical total
    lastResetAt?: Date,
    starveTimeBlame: number,  // Time blamed for causing starve
    blockTimeBlame: number    // Time blamed for causing block
  },

  timeAccumulation: {
    workTime: number,
    starveTime: number,
    blockTime: number,
    lastCalculatedAt: Date
  },

  carsProcessedToday: number,
  averageProcessingTime: number,
  lastUpdated: Date
}
```

## Setup Instructions

### 1. Initialize Database

Run the initialization script to set up production system state and work stations:

```bash
node scripts/init-takt-time-system.js
```

This will:
- Create production system state (OFF)
- Initialize 23 production zones
- Initialize maintenance zone (99)
- Reset all timers to 0

### 2. Access Manager Dashboard

1. Login as manager
2. Navigate to Manager → Production → **Takt Time** tab
3. You'll see all zones with their status

### 3. Start Production Tracking

1. In the Takt Time tab, click **Turn System ON**
2. Timers will start accumulating
3. Zones will show STARVE status initially (no cars)

### 4. Worker Operations

Workers can access the Takt Time workflow through ProductionWorkerV5 component.

**Zone 1 (Head Zone):**
1. Enter VIN, select Type and Color
2. Click "Start Work on New Car"
3. Work on the car
4. Click "Complete Work" when done → car becomes flying

**Zone 2-23:**
1. When previous zone has flying car, it will show as "Incoming Car"
2. **Scan the VIN** to accept the car (must match exactly)
3. Work on the car
4. Click "Complete Work" when done → car becomes flying

**Any Zone - Maintenance:**
1. If car has issues, click "Move to Maintenance"
2. Car will be removed from production flow
3. Car appears in Maintenance Zone (99)

## Workflow Example

### Normal Flow

1. **Zone 1**: Worker starts new car "VIN123" → Status: WORK
2. **Zone 2-23**: All empty, no flying cars → Status: STARVE (blame Zone 1)
3. **Zone 1**: Worker completes VIN123 → car becomes flying → Status: changes based on Zone 2
4. **Zone 2**: Sees incoming car, scans "VIN123" → Status: WORK
5. **Zone 1**: Now empty, no flying car → Status: STARVE (blame itself if no new cars)
6. Process repeats down the line

### Handover Gap

1. **Zone 4**: Completes car → flying car created → Status: depends on Zone 5
2. **Zone 5**: Empty, sees Zone 4 has flying car → Status: BLOCK
3. **Zone 4** is blamed for Zone 5's blockage (hasn't accepted yet)
4. **Zone 5**: Worker scans VIN and accepts → Status: WORK
5. **Zone 4**: Flying car cleared → Status: STARVE (if Zone 3 has no flying car)

## Features

### Real-Time Monitoring
- Dashboard updates every 5 seconds
- Shows current state of all 23 zones
- Visual stacked bars for time breakdown
- Caused stop timers below each zone

### Break Time Handling
- Toggle system OFF during lunch/breaks
- All timers pause
- Zone status still visible
- Resume by toggling system ON

### Bottleneck Identification
- Automatic attribution algorithm
- Zones accumulate "caused stop time" when they slow the line
- Helps identify problem zones quickly
- Timer resets when car completes (fresh start)

### Maintenance Zone
- Zone 99 separate from production flow
- Workers can move problem cars there
- No attribution for maintenance zone
- Special styling in dashboard

### VIN Scan Verification
- Workers must scan VIN to accept flying cars
- Prevents mistakes in car handoff
- Alert shown if VIN doesn't match
- Ensures accurate tracking

## UI Access

### Manager View
**Path:** Manager → Production → Takt Time tab

**Components:**
- `ProductionMonitorV5` - Full dashboard with all zones
- System ON/OFF toggle
- Zone status cards with graphs
- Real-time updates

### Worker View
**Component:** `ProductionWorkerV5`

**Props:**
- `zoneId: number` - The zone this worker is assigned to

**Usage:**
```tsx
<ProductionWorkerV5 zoneId={5} />
```

## Data Migration Notes

### Backward Compatibility
- Old `workStationService` still exists for legacy features
- New `workStationServiceV5` is separate service
- Old WorkStation interface extended (not replaced)
- Gradual migration supported

### Version History
- **V7.x**: Old car tracking with instant transfers
- **V8.0.0**: New Takt Time system with flying cars
  - Added ProductionSystemService
  - Added ProductionAttributionService
  - Added WorkStationServiceV5
  - Added ProductionMonitorV5 component
  - Added ProductionWorkerV5 component
  - Added useProductionMonitor hook

## Troubleshooting

### System not tracking time
- Check if system is ON (toggle in manager view)
- Verify `productionSystem/state` exists in Firestore
- Check browser console for errors

### Zone status not updating
- Ensure auto-refresh is running (5-second interval)
- Check network connection to Firestore
- Verify zone documents exist in `workStations` collection

### Flying car not appearing
- Verify worker clicked "Complete Work"
- Check Firestore for `flyingCar` field in zone document
- Ensure `completeWork` service function completed successfully

### VIN scan not accepting car
- Ensure scanned VIN exactly matches flying car VIN
- Check for extra spaces or case differences
- Verify previous zone actually has a flying car

### Attribution seems wrong
- Review zone status (WORK/STARVE/BLOCK)
- Check previous and next zone states
- Verify attribution algorithm logic in `productionAttributionService.ts`

## Technical Notes

### Timer Update Frequency
- Auto-refresh: 5 seconds
- Time accumulation: Updated every 5 seconds when system is ON
- Caused stop time: Calculated based on attribution every 5 seconds

### Performance Considerations
- 23 zones + 1 maintenance zone = 24 Firestore reads per refresh
- Manager dashboard updates all zones simultaneously
- Worker views only load their assigned zone
- Consider implementing Firestore listeners for real-time updates (future enhancement)

### Future Enhancements
- Takt time reference line in graphs
- Historical trend analysis
- Zone comparison reports
- Shift-based reporting
- Push notifications for long-running caused stop timers
- Real-time Firestore listeners instead of polling
