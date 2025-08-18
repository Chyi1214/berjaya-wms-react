// Simple script to check Firebase configuration
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envContent = readFileSync(join(__dirname, '.env'), 'utf8');
  
  console.log('🔍 Checking Firebase configuration...\n');
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const envVars = {};
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      envVars[key.trim()] = value.trim();
    }
  });
  
  let allConfigured = true;
  
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    const isConfigured = value && value !== 'your_api_key_here' && value !== 'your_project.firebaseapp.com' && value !== 'your_project_id' && value !== 'your_project.appspot.com' && value !== '123456789' && value !== '1:123456789:web:abcdef123456';
    
    if (isConfigured) {
      console.log(`✅ ${varName}: Configured`);
    } else {
      console.log(`❌ ${varName}: Not configured (using placeholder)`);
      allConfigured = false;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  
  if (allConfigured) {
    console.log('🎉 All Firebase variables are configured!');
    console.log('   You can now test the login functionality.');
  } else {
    console.log('⚠️  Some Firebase variables need configuration.');
    console.log('   Please update your .env file with real Firebase credentials.');
    console.log('   The app will show an error until configured properly.');
  }
  
  console.log('\n📚 Next steps:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. You should see the login page');
  console.log('3. If Firebase is configured, test the login button');
  console.log('4. If not configured, update .env file first');
  
} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  console.log('💡 Make sure .env file exists in the project root');
}