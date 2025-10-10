const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
const serviceAccount = require('../keys/serviceAcc.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function testTrigger() {
  try {
    // Update a document in ts_files collection to trigger our function
    const testDoc = db.collection('ts_files').doc('test-trigger-doc');
    
    console.log('Updating document to trigger function...');
    await testDoc.set({
      name: 'test-function',
      content: 'console.log("test trigger"); export default function() { return "test result"; }',
      path: '/test/trigger.ts',
      lastModified: new Date(),
      triggerTest: Math.random() // Add random value to ensure it's actually an update
    });
    
    console.log('Document updated successfully. Function should be triggered.');
    console.log('Check the Firebase Functions logs to see the detailed processing information.');
    
    // Wait a moment then exit
    setTimeout(() => {
      console.log('Test completed. The function should now be processing all booking documents...');
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('Error updating document:', error);
    process.exit(1);
  }
}

testTrigger();