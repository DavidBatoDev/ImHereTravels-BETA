const https = require("https");

console.log("🧪 Testing sendEmail function...\n");

// Function to make HTTP request
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ data });

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    console.log(`📡 Making HTTP request to: ${url}`);
    console.log(`📋 Request data:`, { data });

    const req = https.request(url, options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        console.log(`\n📊 Response Status: ${res.statusCode}`);
        console.log("\n📄 Response:");
        try {
          const parsed = JSON.parse(responseData);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(responseData);
        }
        resolve({ status: res.statusCode, data: responseData });
      });
    });

    req.on("error", (error) => {
      console.error("❌ Request error:", error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test the sendEmail function
async function testSendEmail() {
  try {
    // First, let's get the existing draft ID from the previous test
    // You'll need to replace this with the actual draft ID from your Firestore
    const draftId = "XtQIZ9FuZKKORrPr4EMp"; // This was from the previous successful test

    const url =
      "https://us-central1-imheretravels.cloudfunctions.net/sendEmail";
    const result = await makeRequest(url, { draftId });

    if (result.status === 200) {
      console.log("\n✅ Email sent successfully!");
    } else {
      console.log("\n❌ Failed to send email");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSendEmail();
