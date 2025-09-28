const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');

// Load service account credentials
const serviceAccount = require('../keys/serviceAcc.json');

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'imheretravels'
});

const db = getFirestore();

async function testGenerateReservationEmail() {
  console.log('🧪 Testing generateReservationEmail function...\n');

  try {
    // Test 1: Check if booking document with ID "0" exists
    console.log('1️⃣ Checking if booking document "0" exists...');
    const bookingDoc = await db.collection('bookings').doc('0').get();
    
    if (!bookingDoc.exists) {
      console.log('❌ Booking document "0" not found!');
      console.log('📋 Available booking documents:');
      
      // List some available booking documents
      const bookingsSnapshot = await db.collection('bookings').limit(5).get();
      if (bookingsSnapshot.empty) {
        console.log('   No booking documents found in the collection.');
      } else {
        bookingsSnapshot.forEach(doc => {
          console.log(`   - ${doc.id}`);
        });
      }
      return;
    }

    const bookingData = bookingDoc.data();
    console.log('✅ Booking document "0" found!');
    console.log('📊 Booking data:', {
      emailAddress: bookingData.emailAddress,
      fullName: bookingData.fullName,
      tourPackageName: bookingData.tourPackageName,
      bookingType: bookingData.bookingType,
      availablePaymentTerms: bookingData.availablePaymentTerms
    });

    // Test 2: Check if email template exists
    console.log('\n2️⃣ Checking if email template exists...');
    const templateDoc = await db.collection('emailTemplates').doc('BnRGgT6E8SVrXZH961LT').get();
    
    if (!templateDoc.exists) {
      console.log('❌ Email template "BnRGgT6E8SVrXZH961LT" not found!');
      return;
    }

    const templateData = templateDoc.data();
    console.log('✅ Email template found!');
    console.log('📧 Template info:', {
      name: templateData.name,
      subject: templateData.subject,
      variableDefinitions: templateData.variableDefinitions?.length || 0
    });

    // Test 3: Call the generateReservationEmail function
    console.log('\n3️⃣ Calling generateReservationEmail function...');
    
    // Import the function (this simulates calling it from the deployed version)
    const { generateReservationEmail } = require('./lib/generate-reservation-email');
    
    // Create a mock request object
    const mockRequest = {
      data: {
        bookingId: '0',
        generateDraftCell: true
      }
    };

    console.log('📞 Calling function with parameters:', mockRequest.data);
    
    // Note: This will attempt to call the actual function
    // If the function is deployed, you should call it via HTTP instead
    try {
      const result = await generateReservationEmail(mockRequest);
      console.log('✅ Function executed successfully!');
      console.log('📤 Result:', result);
    } catch (functionError) {
      console.log('⚠️ Function execution error (expected if not properly deployed):', functionError.message);
      console.log('\n💡 To test the deployed function, use HTTP call instead:');
      console.log('   curl -X POST \\');
      console.log('     https://asia-southeast1-imheretravels.cloudfunctions.net/generateReservationEmail \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"data": {"bookingId": "0", "generateDraftCell": true}}\'');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Alternative: Test via HTTP call to deployed function
async function testViaHTTP() {
  console.log('\n🌐 Testing via HTTP call to deployed function...');
  
  const https = require('https');
  
  const postData = JSON.stringify({
    data: {
      bookingId: '0',
      generateDraftCell: true
    }
  });

  const options = {
    hostname: 'asia-southeast1-imheretravels.cloudfunctions.net',
    port: 443,
    path: '/generateReservationEmail',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`📡 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        console.log('✅ HTTP Response:', result);
      } catch (parseError) {
        console.log('📄 Raw Response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ HTTP Request Error:', error);
  });

  req.write(postData);
  req.end();
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting generateReservationEmail function tests...\n');
  
  await testGenerateReservationEmail();
  
  // Uncomment the line below to test via HTTP (requires deployed function)
  // await testViaHTTP();
  
  console.log('\n🏁 Tests completed!');
  process.exit(0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests();
