// Quick script to delete corrupted template from Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDON7K48OawrKk8gs9pInosilci6VDLbgJh8",
  authDomain: "berjaya-autotech.firebaseapp.com",
  projectId: "berjaya-autotech",
  storageBucket: "berjaya-autotech.firebasestorage.app",
  messagingSenderId: "135068212334",
  appId: "1:135068212334:web:d1e50fb7d6e7d1c0b80f3c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteTemplate() {
  try {
    console.log('Deleting corrupted template...');
    await deleteDoc(doc(db, 'inspectionTemplates', 'vehicle_inspection_v1'));
    console.log('✅ Template deleted successfully!');
    console.log('Now refresh the app and click "Load Template" button.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteTemplate();
