// Production Test Data Service - Version 4.0 Complete Production Line Test Scenarios
import { carTrackingService } from './carTrackingService';
import { workStationService } from './workStationService';
import { workerActivityService } from './workerActivityService';
import { CarStatus } from '../types';

class ProductionTestDataService {

  // Initialize complete production test scenario
  async generateCompleteProductionTest(): Promise<void> {
    console.log('🏭 Starting Production Test Data Generation...');

    try {
      // Step 1: Initialize work stations for all zones
      console.log('📍 Initializing work stations...');
      await workStationService.initializeAllStations();

      // Step 2: Create test cars
      console.log('🚗 Creating test cars...');
      await this.createTestCars();

      // Step 3: Create realistic production scenarios
      console.log('⚡ Creating production scenarios...');
      await this.createProductionScenarios();

      console.log('✅ Production test data generation complete!');
    } catch (error) {
      console.error('❌ Production test data generation failed:', error);
      throw error;
    }
  }

  // Create comprehensive test cars
  private async createTestCars(): Promise<void> {
    const testCars = [
      // Completed cars
      {
        vin: 'TEST2024RED001',
        type: 'Basic',
        color: 'Red',
        series: 'Standard',
        status: CarStatus.COMPLETED,
        currentZone: null
      },
      {
        vin: 'TEST2024BLU002',
        type: 'Premium',
        color: 'Blue',
        series: 'Premium',
        status: CarStatus.COMPLETED,
        currentZone: null
      },

      // Cars in production
      {
        vin: 'PROD2024WHT003',
        type: 'Series3',
        color: 'White',
        series: 'Series3',
        status: CarStatus.IN_PRODUCTION,
        currentZone: 5
      },
      {
        vin: 'PROD2024GRY004',
        type: 'Luxury',
        color: 'Gray',
        series: 'Limited',
        status: CarStatus.IN_PRODUCTION,
        currentZone: 12
      },
      {
        vin: 'PROD2024BLK005',
        type: 'Basic',
        color: 'Black',
        series: 'Standard',
        status: CarStatus.IN_PRODUCTION,
        currentZone: 8
      },
      {
        vin: 'PROD2024SIL006',
        type: 'Premium',
        color: 'Silver',
        series: 'Premium',
        status: CarStatus.IN_PRODUCTION,
        currentZone: 18
      },

      // Recently started cars
      {
        vin: 'NEW2024GRN007',
        type: 'Basic',
        color: 'Green',
        series: 'Standard',
        status: CarStatus.IN_PRODUCTION,
        currentZone: 1
      },
      {
        vin: 'NEW2024RED008',
        type: 'Premium',
        color: 'Red',
        series: 'Premium',
        status: CarStatus.IN_PRODUCTION,
        currentZone: 3
      }
    ];

    // Create all test cars
    for (const carData of testCars) {
      try {
        await carTrackingService.createCar(carData);
        console.log(`✅ Created car: ${carData.vin}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`ℹ️ Car ${carData.vin} already exists, skipping...`);
        } else {
          console.error(`❌ Failed to create car ${carData.vin}:`, error);
        }
      }
    }
  }

  // Create realistic production scenarios
  private async createProductionScenarios(): Promise<void> {
    console.log('🎭 Creating realistic production scenarios...');

    // Scenario 1: Complete car journey (TEST2024RED001)
    await this.simulateCompleteCarJourney('TEST2024RED001', 'testworker@example.com');

    // Scenario 2: Car currently in zone 5
    await this.simulateCarInProgress('PROD2024WHT003', 5, 'worker1@example.com');

    // Scenario 3: Car currently in zone 12
    await this.simulateCarInProgress('PROD2024GRY004', 12, 'worker2@example.com');

    // Scenario 4: Car currently in zone 8
    await this.simulateCarInProgress('PROD2024BLK005', 8, 'worker3@example.com');

    // Scenario 5: Multiple workers active
    await this.simulateActiveWorkers();
  }

  // Simulate complete car journey from start to finish
  private async simulateCompleteCarJourney(vin: string, workerEmail: string): Promise<void> {
    try {
      const zones = [1, 3, 7, 12, 18, 23]; // Sample journey through production line
      
      for (let i = 0; i < zones.length; i++) {
        const zoneId = zones[i];
        const timeInZone = 20 + Math.floor(Math.random() * 40); // 20-60 minutes
        
        // Scan car into zone
        await carTrackingService.scanCarIntoZone(vin, zoneId, workerEmail);
        
        // Simulate work time (by manipulating the car's history manually)
        const car = await carTrackingService.getCarByVIN(vin);
        if (car && car.zoneHistory.length > 0) {
          const lastEntry = car.zoneHistory[car.zoneHistory.length - 1];
          
          // Simulate earlier entry time
          const enteredAt = new Date();
          enteredAt.setMinutes(enteredAt.getMinutes() - timeInZone - (zones.length - i) * 60);
          lastEntry.enteredAt = enteredAt;
        }
        
        // Complete work in zone
        await carTrackingService.completeCarWork(
          vin, 
          workerEmail, 
          `Test: Work completed in zone ${zoneId}`
        );
      }

      // Mark entire production as complete
      await carTrackingService.completeCarProduction(vin, workerEmail);
      console.log(`✅ Simulated complete journey for ${vin}`);
    } catch (error) {
      console.error(`❌ Failed to simulate journey for ${vin}:`, error);
    }
  }

  // Simulate car currently in progress in a specific zone
  private async simulateCarInProgress(vin: string, zoneId: number, workerEmail: string): Promise<void> {
    try {
      // Scan car into zone
      await carTrackingService.scanCarIntoZone(vin, zoneId, workerEmail);
      
      // Update work station
      await workStationService.updateStationWithCar(zoneId, vin);
      
      console.log(`✅ Placed ${vin} in Zone ${zoneId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already in zone')) {
        console.log(`ℹ️ Car ${vin} already in a zone, skipping...`);
      } else {
        console.error(`❌ Failed to place ${vin} in zone ${zoneId}:`, error);
      }
    }
  }

  // Simulate active workers in various zones
  private async simulateActiveWorkers(): Promise<void> {
    const activeWorkers = [
      { email: 'alice.smith@berjaya.com', name: 'Alice Smith', zoneId: 5 },
      { email: 'bob.johnson@berjaya.com', name: 'Bob Johnson', zoneId: 8 },
      { email: 'charlie.brown@berjaya.com', name: 'Charlie Brown', zoneId: 12 },
      { email: 'diana.wilson@berjaya.com', name: 'Diana Wilson', zoneId: 18 }
    ];

    for (const worker of activeWorkers) {
      try {
        // Check if worker is already checked in somewhere
        const existingActivity = await workerActivityService.getActiveWorkerActivity(worker.email);
        
        if (!existingActivity) {
          await workerActivityService.checkWorkerIn(
            worker.email,
            worker.name,
            worker.zoneId
          );
          console.log(`✅ Checked in ${worker.name} to Zone ${worker.zoneId}`);
        } else {
          console.log(`ℹ️ Worker ${worker.name} already checked in, skipping...`);
        }
      } catch (error) {
        console.error(`❌ Failed to check in ${worker.name}:`, error);
      }
    }
  }

  // Generate daily productivity scenarios
  async generateDailyProductivityTest(): Promise<void> {
    console.log('📊 Generating daily productivity test scenarios...');

    try {
      // Create some completed work sessions
      const workSessions = [
        {
          worker: { email: 'morning.worker@berjaya.com', name: 'Morning Worker' },
          zoneId: 3,
          duration: 120, // 2 hours
          carsWorkedOn: ['HIST2024001', 'HIST2024002']
        },
        {
          worker: { email: 'afternoon.worker@berjaya.com', name: 'Afternoon Worker' },
          zoneId: 15,
          duration: 180, // 3 hours
          carsWorkedOn: ['HIST2024003', 'HIST2024004', 'HIST2024005']
        }
      ];

      // Note: Creating historical data requires more complex backdating
      // For now, just create the workers and zones
      for (const session of workSessions) {
        await workStationService.getWorkStation(session.zoneId);
        console.log(`✅ Prepared Zone ${session.zoneId} for ${session.worker.name}`);
      }

      console.log('✅ Daily productivity test scenarios prepared');
    } catch (error) {
      console.error('❌ Failed to generate productivity scenarios:', error);
      throw error;
    }
  }

  // Initialize minimal test data (for quick testing)
  async generateMinimalProductionTest(): Promise<void> {
    console.log('🚀 Generating minimal production test...');

    try {
      // Just create the basic test cars from carTrackingService
      await carTrackingService.initializeTestData();
      
      // Initialize work stations
      await workStationService.initializeAllStations();
      
      console.log('✅ Minimal production test complete');
    } catch (error) {
      console.error('❌ Minimal production test failed:', error);
      throw error;
    }
  }

  // Clean up all production test data
  async cleanupProductionTestData(): Promise<void> {
    console.log('🧹 Cleaning up production test data...');
    
    try {
      // Note: In a real implementation, we would need methods to clean up test data
      // For now, just log what would be cleaned
      console.log('ℹ️ Would clean up: test cars, work stations, worker activities');
      console.log('ℹ️ Manual cleanup required in Firebase console for now');
      
      // Force check out all workers
      await workerActivityService.forceCheckOutAllWorkers();
      
      console.log('✅ Available cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productionTestDataService = new ProductionTestDataService();
export default productionTestDataService;