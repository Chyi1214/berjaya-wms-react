const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: 'berjaya-autotech',
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'berjaya-autotech',
  storageBucket: "berjaya-autotech.firebasestorage.app",
});

const db = admin.firestore();

async function checkDefectLocations() {
  console.log('🔍 Checking inspection: PRUPBGFB5SM302132\n');

  // Get the inspection
  const inspectionDoc = await db.collection('inspections').doc('PRUPBGFB5SM302132').get();

  if (!inspectionDoc.exists) {
    console.log('❌ Inspection not found');
    return;
  }

  const inspection = inspectionDoc.data();
  console.log('✅ Inspection found');
  console.log('Status:', inspection.status);
  console.log('Sections:', Object.keys(inspection.sections).join(', '));
  console.log('\n📍 Checking defect locations:\n');

  // Check each section for defect locations
  for (const [sectionName, sectionData] of Object.entries(inspection.sections)) {
    console.log(`\n--- Section: ${sectionName} ---`);
    console.log(`Status: ${sectionData.status}`);

    if (sectionData.results) {
      const results = Object.entries(sectionData.results);
      console.log(`Total results: ${results.length}`);

      for (const [itemName, result] of results) {
        if (result.defectType !== 'Ok') {
          console.log(`\n  ❗ Defect: ${itemName}`);
          console.log(`     Type: ${result.defectType}`);
          console.log(`     Has Location: ${result.defectLocation ? 'YES ✅' : 'NO ❌'}`);

          if (result.defectLocation) {
            console.log(`     Dot Number: ${result.defectLocation.dotNumber}`);
            console.log(`     Position: (${result.defectLocation.x.toFixed(1)}%, ${result.defectLocation.y.toFixed(1)}%)`);
            console.log(`     Image ID: ${result.defectLocation.imageId}`);
          }
        }
      }
    }
  }

  console.log('\n\n🖼️  Checking template images:\n');

  // Get the template
  const templateDoc = await db.collection('inspection-templates').doc('vehicle_inspection_v1').get();

  if (!templateDoc.exists) {
    console.log('❌ Template not found');
    return;
  }

  const template = templateDoc.data();

  for (const [sectionName, sectionData] of Object.entries(template.sections)) {
    if (sectionData.images && sectionData.images.length > 0) {
      console.log(`\n✅ Section "${sectionName}" has ${sectionData.images.length} image(s):`);
      sectionData.images.forEach((img, i) => {
        console.log(`   ${i + 1}. ${img.imageName} (ID: ${img.imageId})`);
      });
    } else {
      console.log(`\n❌ Section "${sectionName}" has NO images`);
    }
  }
}

checkDefectLocations()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
