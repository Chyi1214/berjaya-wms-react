// Migration Script: Add carType='TK1' to existing scanLookups (v7.19.0)
// Run this script ONCE to migrate existing scanner lookup data to the multi-car-type system
//
// Usage: node migrate-scanner-to-tk1.js
//
// This script will:
// 1. Find all scanLookup documents that don't have a carType field
// 2. Add carType='TK1' to each document
// 3. Update the document ID from SKU_ZONE to TK1_SKU_ZONE format
// 4. Delete old document and create new one with new ID

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateScannerLookups() {
  console.log('🔄 Starting migration of scanner lookups to TK1 car type...\n');

  try {
    // Step 1: Get all scan lookups
    const scanLookupsRef = db.collection('scanLookups');
    const snapshot = await scanLookupsRef.get();

    console.log(`📊 Found ${snapshot.size} total scanner lookup documents\n`);

    if (snapshot.empty) {
      console.log('✅ No scanner lookups found. Nothing to migrate.');
      return;
    }

    // Step 2: Process each document
    const batch = db.batch();
    const updates = [];
    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;

      // Skip if already has carType
      if (data.carType) {
        console.log(`⏭️  Skipping ${docId} - already has carType: ${data.carType}`);
        skippedCount++;
        continue;
      }

      // Extract SKU and zone from old document
      const sku = data.sku;
      const zone = data.targetZone;

      if (!sku || !zone) {
        console.log(`⚠️  Skipping ${docId} - missing SKU or zone`);
        skippedCount++;
        continue;
      }

      // Create new document with carType='TK1'
      const newDocId = `TK1_${sku}_${zone}`;
      const newData = {
        ...data,
        carType: 'TK1',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      console.log(`📝 Migrating: ${docId} → ${newDocId}`);
      console.log(`   SKU: ${sku}, Zone: ${zone}, ItemName: ${data.itemName || 'N/A'}`);

      // Delete old document and create new one
      batch.delete(doc.ref);
      batch.set(scanLookupsRef.doc(newDocId), newData);

      updates.push({ old: docId, new: newDocId, sku, zone });
      migratedCount++;
    }

    // Step 3: Commit all changes
    if (migratedCount > 0) {
      console.log(`\n🚀 Committing ${migratedCount} migrations...`);
      await batch.commit();
      console.log('✅ Migration completed successfully!\n');

      // Print summary
      console.log('📋 Migration Summary:');
      console.log(`   ✅ Migrated: ${migratedCount} documents`);
      console.log(`   ⏭️  Skipped: ${skippedCount} documents (already migrated or invalid)`);
      console.log(`   📊 Total: ${snapshot.size} documents\n`);

      console.log('📝 Migrated Documents:');
      updates.forEach(({ old, new: newId, sku, zone }, index) => {
        console.log(`   ${index + 1}. ${sku} (Zone ${zone}): ${old} → ${newId}`);
      });
    } else {
      console.log('\n✅ No documents needed migration. All scanner lookups already have carType field.\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    // Cleanup
    await admin.app().delete();
  }
}

// Run migration
migrateScannerLookups()
  .then(() => {
    console.log('\n🎉 Migration script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
