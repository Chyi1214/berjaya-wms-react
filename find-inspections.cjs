const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'berjaya-autotech',
  storageBucket: "berjaya-autotech.firebasestorage.app",
});

const db = admin.firestore();

async function findInspections() {
  console.log('🔍 Searching for inspections...\n');

  const snapshot = await db.collection('carInspections').limit(10).get();

  if (snapshot.empty) {
    console.log('❌ No inspections found');
    return;
  }

  console.log(`Found ${snapshot.size} inspection(s):\n`);

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`📋 ID: ${doc.id}`);
    console.log(`   VIN: ${data.vin || 'N/A'}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Created: ${data.createdAt?.toDate?.() || data.createdAt}`);

    // Check for defects
    let totalDefects = 0;
    let defectsWithLocation = 0;

    if (data.sections) {
      for (const [sectionName, sectionData] of Object.entries(data.sections)) {
        if (sectionData.results) {
          for (const [itemName, result] of Object.entries(sectionData.results)) {
            if (result.defectType !== 'Ok') {
              totalDefects++;
              if (result.defectLocation) {
                defectsWithLocation++;
              }
            }
          }
        }
      }
    }

    console.log(`   Defects: ${totalDefects} (${defectsWithLocation} with locations)`);
    console.log('');
  });

  // Now check template images
  console.log('\n🖼️  Checking template images:\n');

  const templateDoc = await db.collection('inspectionTemplates').doc('vehicle_inspection_v1').get();

  if (!templateDoc.exists) {
    console.log('❌ Template not found');
    return;
  }

  const template = templateDoc.data();

  for (const [sectionName, sectionData] of Object.entries(template.sections)) {
    if (sectionData.images && sectionData.images.length > 0) {
      console.log(`✅ Section "${sectionName}" has ${sectionData.images.length} image(s)`);
    } else {
      console.log(`❌ Section "${sectionName}" has NO images`);
    }
  }
}

findInspections()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
