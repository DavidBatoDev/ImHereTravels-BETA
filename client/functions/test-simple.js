const https = require("https");

console.log("🧪 Testing generateReservationEmail function...\n");

const postData = JSON.stringify({
  data: {
    bookingId: "0",
    generateDraftCell: true,
  },
});

const options = {
  hostname: "asia-southeast1-imheretravels.cloudfunctions.net",
  port: 443,
  path: "/generateReservationEmail",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
  },
};

console.log(
  "📡 Making HTTP request to:",
  `https://${options.hostname}${options.path}`
);
console.log("📋 Request data:", JSON.parse(postData));

const req = https.request(options, (res) => {
  console.log(`\n📊 Response Status: ${res.statusCode}`);

  let responseData = "";
  res.on("data", (chunk) => {
    responseData += chunk;
  });

  res.on("end", () => {
    console.log("\n📄 Response:");
    try {
      const result = JSON.parse(responseData);
      console.log(JSON.stringify(result, null, 2));

      if (result.success) {
        console.log("\n🎉 SUCCESS! Email draft created!");
        console.log("📧 Draft Link:", result.draftLink);
        console.log("📝 Subject:", result.subject);
        console.log("👤 Email:", result.email);
        console.log("🆔 Message ID:", result.messageId);
      }
    } catch (parseError) {
      console.log("Raw Response:", responseData);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Error:", error);
});

req.write(postData);
req.end();
