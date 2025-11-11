// Initialize V8.0.0 Takt Time Production System
// This script sets up the production system state and work stations in Firestore

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyByLOZKPrhGV7tFCAZL6-vQ2XRZD_XTQSU",
  authDomain: "berjaya-autotech-4b4f4.firebaseapp.com",
  projectId: "berjaya-autotech-4b4f4",
  storageBucket: "berjaya-autotech-4b4f4.appspot.com",
  messagingSenderId: "313976506688",
  appId: "1:313976506688:web:94fa1ffe42b9b3c97e7631",
  measurementId: "G-SCLRKSHPNZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeProductionSystem() {
  console.log('🚀 Initializing V8.0.0 Takt Time Production System...\n');

  try {
    // 1. Initialize Production System State
    console.log('📊 Creating production system state...');
    const systemState = {
      isOn: false,  // Start with system OFF
      lastToggledAt: new Date(),
      lastToggledBy: 'system',
      lastToggledByName: 'System Initialization',
      todayOnTime: 0,
      todayOffTime: 0,
      onOffHistory: [{
        timestamp: new Date(),
        action: 'turn_off',
        by: 'system',
        byName: 'System Initialization'
      }]
    };

    await setDoc(doc(db, 'productionSystem', 'state'), systemState);
    console.log('✅ Production system state created (System OFF)\n');

    // 2. Initialize Work Stations (Zones 1-23 + Maintenance Zone 99)
    console.log('🏭 Creating work stations...');

    const zones = [];
    // Production zones 1-23
    for (let zoneId = 1; zoneId <= 23; zoneId++) {
      zones.push(zoneId);
    }
    // Maintenance zone
    zones.push(99);

    for (const zoneId of zones) {
      const workStation = {
        zoneId,
        status: 'paused', // All zones start paused since system is OFF
        causedStopTime: {
          current: 0,
          total: 0,
          starveTimeBlame: 0,
          blockTimeBlame: 0
        },
        timeAccumulation: {
          workTime: 0,
          starveTime: 0,
          blockTime: 0,
          lastCalculatedAt: new Date()
        },
        carsProcessedToday: 0,
        averageProcessingTime: 0,
        lastUpdated: new Date()
      };

      await setDoc(doc(db, 'workStations', zoneId.toString()), workStation);

      if (zoneId === 99) {
        console.log(`   ✅ Zone ${zoneId} (Maintenance) initialized`);
      } else if (zoneId === 1) {
        console.log(`   ✅ Zone ${zoneId} (Head Zone) initialized`);
      } else if (zoneId === 23) {
        console.log(`   ✅ Zone ${zoneId} (Tail Zone) initialized`);
      } else {
        console.log(`   ✅ Zone ${zoneId} initialized`);
      }
    }

    console.log(`\n✅ All ${zones.length} work stations initialized\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ V8.0.0 Takt Time Production System Ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 System Status:');
    console.log('   • Production System: OFF (Manual start required)');
    console.log('   • Production Zones: 1-23 (all paused)');
    console.log('   • Maintenance Zone: 99 (initialized)');
    console.log('   • All timers: Reset to 0');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Go to Manager → Production → Takt Time tab');
    console.log('   2. Toggle system ON to start production tracking');
    console.log('   3. Workers can access ProductionWorkerV5 for their zones');
    console.log('\n💡 Features Available:');
    console.log('   ✓ Flying Car workflow with manual handoff');
    console.log('   ✓ Work/Starve/Block status tracking');
    console.log('   ✓ Bottleneck attribution algorithm');
    console.log('   ✓ ON/OFF time tracking (excludes breaks)');
    console.log('   ✓ Real-time zone monitoring (5-second updates)');
    console.log('   ✓ Maintenance zone for problem cars');
    console.log('\n🔧 Database Collections:');
    console.log('   • productionSystem/state - System ON/OFF state');
    console.log('   • workStations/{zoneId} - Zone data (1-23, 99)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error initializing production system:', error);
    process.exit(1);
  }
}

// Run initialization
initializeProductionSystem()
  .then(() => {
    console.log('✅ Initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
