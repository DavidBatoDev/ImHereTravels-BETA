const https = require("https");

console.log("🧪 Testing full email flow: Generate Draft → Send Email\n");

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
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          console.log(responseData);
          resolve({ status: res.statusCode, data: responseData });
        }
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

// Test the full flow
async function testFullFlow() {
  try {
    console.log("Step 1: Generating email draft...");

    // Step 1: Generate a new draft (use a different booking ID to avoid conflicts)
    const generateUrl =
      "https://asia-southeast1-imheretravels.cloudfunctions.net/generateReservationEmail";
    const generateResult = await makeRequest(generateUrl, {
      bookingId: "1", // Using booking ID "1" instead of "0" to avoid conflicts
      generateDraftCell: true,
    });

    if (generateResult.status !== 200) {
      console.log("❌ Failed to generate draft");
      return;
    }

    const draftId = generateResult.data.result.draftId;
    console.log(`✅ Draft generated with ID: ${draftId}`);

    console.log("\nStep 2: Sending email...");

    // Step 2: Send the email
    const sendUrl =
      "https://us-central1-imheretravels.cloudfunctions.net/sendEmail";
    const sendResult = await makeRequest(sendUrl, { draftId });

    if (sendResult.status === 200) {
      console.log("✅ Email sent successfully!");
      console.log(`📧 Message ID: ${sendResult.data.result.messageId}`);
    } else {
      console.log("❌ Failed to send email");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testFullFlow();
