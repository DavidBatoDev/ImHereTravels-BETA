const https = require('https');

async function testGenerateReservationEmailHTTP() {
  console.log('🧪 Testing generateReservationEmail function via HTTP...\n');

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

  console.log('📡 Making HTTP request to:', `https://${options.hostname}${options.path}`);
  console.log('📋 Request data:', JSON.parse(postData));

  const req = https.request(options, (res) => {
    console.log(`\n📊 Response Status: ${res.statusCode}`);
    console.log(`📋 Response Headers:`, res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('\n📄 Response Body:');
      try {
        const result = JSON.parse(responseData);
        console.log('✅ Parsed Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          console.log('\n🎉 SUCCESS! Email draft created!');
          console.log('📧 Draft Link:', result.draftLink);
          console.log('📝 Subject:', result.subject);
          console.log('👤 Email:', result.email);
          console.log('🆔 Message ID:', result.messageId);
        } else {
          console.log('\n❌ Function returned success: false');
        }
      } catch (parseError) {
        console.log('⚠️ Raw Response (not JSON):', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ HTTP Request Error:', error);
  });

  req.write(postData);
  req.end();
}

// Alternative test with curl command
function showCurlCommand() {
  console.log('\n🔧 Alternative: Use curl command to test:');
  console.log('curl -X POST \\');
  console.log('  https://asia-southeast1-imheretravels.cloudfunctions.net/generateReservationEmail \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"data": {"bookingId": "0", "generateDraftCell": true}}\'');
}

// Run the test
console.log('🚀 Starting HTTP test for generateReservationEmail function...\n');

testGenerateReservationEmailHTTP().catch(console.error);

// Also show the curl command
setTimeout(() => {
  showCurlCommand();
}, 2000);
