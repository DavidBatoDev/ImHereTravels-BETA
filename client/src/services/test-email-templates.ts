/**
 * Test script for Email Templates Service
 * Run this in the browser console or as a test file
 */

import { EmailTemplatesService } from "./email-templates-service";

// Test data
const testTemplate = {
  type: "reservation" as const,
  name: "Test Template",
  subject: "Test Email Subject",
  content: "<html><body><h1>Hello {{traveler_name}}</h1></body></html>",
  variables: ["{{traveler_name}}"],
  status: "draft" as const,
};

// Test user ID (replace with actual user ID)
const testUserId = "test-user-123";

export async function testEmailTemplatesService() {
  console.log("🧪 Testing Email Templates Service...");

  try {
    // Test 1: Create Template
    console.log("1. Testing template creation...");
    const templateId = await EmailTemplatesService.createTemplate(
      testTemplate,
      testUserId
    );
    console.log("✅ Template created with ID:", templateId);

    // Test 2: Get Template
    console.log("2. Testing template retrieval...");
    const retrievedTemplate = await EmailTemplatesService.getTemplate(
      templateId
    );
    console.log("✅ Template retrieved:", retrievedTemplate);

    // Test 3: Get All Templates
    console.log("3. Testing get all templates...");
    const allTemplates = await EmailTemplatesService.getTemplates();
    console.log("✅ All templates:", allTemplates);

    // Test 4: Update Template
    console.log("4. Testing template update...");
    await EmailTemplatesService.updateTemplate({
      id: templateId,
      name: "Updated Test Template",
      status: "active",
    });
    console.log("✅ Template updated");

    // Test 5: Get Templates with Filters
    console.log("5. Testing filtered templates...");
    const filteredTemplates = await EmailTemplatesService.getTemplates({
      filters: {
        type: "reservation",
        status: "active",
      },
    });
    console.log("✅ Filtered templates:", filteredTemplates);

    // Test 6: Duplicate Template
    console.log("6. Testing template duplication...");
    const duplicatedId = await EmailTemplatesService.duplicateTemplate(
      templateId,
      testUserId
    );
    console.log("✅ Template duplicated with ID:", duplicatedId);

    // Test 7: Get Template Statistics
    console.log("7. Testing template statistics...");
    const stats = await EmailTemplatesService.getTemplateStats();
    console.log("✅ Template statistics:", stats);

    // Test 8: Delete Duplicated Template
    console.log("8. Testing template deletion...");
    await EmailTemplatesService.deleteTemplate(duplicatedId);
    console.log("✅ Duplicated template deleted");

    // Test 9: Delete Original Template
    await EmailTemplatesService.deleteTemplate(templateId);
    console.log("✅ Original template deleted");

    console.log("🎉 All tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Export for use in other files
export { testEmailTemplatesService };

// Uncomment to run tests automatically (be careful in production)
// if (typeof window !== 'undefined') {
//   window.testEmailTemplatesService = testEmailTemplatesService;
// }
