const admin = require('firebase-admin');

// Initialize Firebase Admin (make sure you have the service account key)
const serviceAccount = require('../keys/serviceAcc.json'); // Adjust path as needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testSimpleRecompute() {
  try {
    console.log('🔍 Looking for ts_files documents...');
    
    // Get the first ts_files document
    const tsFilesSnapshot = await db.collection('ts_files').limit(1).get();
    
    if (tsFilesSnapshot.empty) {
      console.log('❌ No ts_files documents found. Please create one first.');
      return;
    }
    
    const doc = tsFilesSnapshot.docs[0];
    const data = doc.data();
    
    console.log(`📄 Found document: ${doc.id}`);
    console.log(`📝 Current content preview: ${(data.content || '').substring(0, 100)}...`);
    
    // Make a small change to trigger the function
    const timestamp = new Date().toISOString();
    const updatedContent = data.content + `\n// Test trigger: ${timestamp}`;
    
    console.log('🚀 Triggering onTypeScriptFunctionUpdatedSimple by updating document...');
    
    await doc.ref.update({
      content: updatedContent,
      lastModified: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Document updated successfully!');
    console.log('📊 Check the Firebase Console logs to see the function execution:');
    console.log('   https://console.firebase.google.com/project/imheretravels-a3f81/functions/logs');
    console.log('🔍 Look for logs starting with "[SIMPLE]"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testSimpleRecompute();