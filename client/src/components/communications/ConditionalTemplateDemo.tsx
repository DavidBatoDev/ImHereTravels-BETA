"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailTemplateService from "@/services/email-template-service";

// Sample template with conditional rendering
const sampleTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservation Email Template</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; margin: 0;">
    <div class="email-header" style="width: 100%; margin: 0 auto; margin-bottom: 10px;">
        <img src="https://imheretravels.com/wp-content/uploads/2024/05/siargao-header-1.webp" alt="ImHereTravels Banner" style="width: 100%; max-width: 636px; height: auto; display: block; margin: 0 auto;">
    </div>
    <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <p style="font-size: 16px; color: #333333;">Hi <strong>{{fullName}}</strong>,</p>

        <!-- Refund Details (for Invalid bookings) -->
        <? if (availablePaymentTerms === "Invalid") { ?>
            <p style="font-size: 16px; color: #333333;">Thank you for choosing ImHereTravels. We truly appreciate your interest in our <strong>{{tourPackage}}</strong>.</p>
            <h3 style="color: red;">Refund Details for Your Booking</h3>
            <p style="font-size: 16px;">Unfortunately, we're unable to process your booking because the tour is scheduled to begin within 48 hours.</p>
            <p style="font-size: 16px; color: #333333;">Regarding your deposit of <strong style="color: red;">£{{reservationFee}}</strong>, please let us know your preferred refund method.</p>
        <? } ?>

        <!-- Payment Terms Rendering -->
        <? if (availablePaymentTerms !== "Invalid" && availablePaymentTerms !== "Full payment required within 48hrs" && availablePaymentTerms !== "P1" && availablePaymentTerms !== "P2" && availablePaymentTerms !== "P3" && availablePaymentTerms !== "P4") { ?>
            <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
            <p style="font-size: 16px; color: #333333;">Your deposit of <span style="color: red;"><strong>£{{reservationFee}}</strong></span> has been received!</p>
        <? } ?>

        <!-- Final Payment Scenario -->
        <? if (availablePaymentTerms === "Full payment required within 48hrs") { ?>
            <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
            <p style="font-size: 16px; color: #333333;">We're holding your spot for <strong>{{tourPackage}}</strong>, but your reservation isn't confirmed yet.</p>
            
            <h2 style="color: red; font-size: 24px; margin-top: 0;">Booking Details</h2>
            <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
                <tr><td><strong>Traveler Name:</strong></td><td>{{fullName}}</td></tr>
                
                <!-- Conditional rendering for Main Booker -->
                <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
                    <tr><td><strong>Main Booker:</strong></td><td>{{mainBooker}}</td></tr>
                <? } ?>

                <tr><td><strong>Tour Name:</strong></td><td>{{tourPackage}}</td></tr>
                <tr><td><strong>Tour Date:</strong></td><td>{{tourDate}}</td></tr>
                <tr><td><strong>Return Date:</strong></td><td>{{returnDate}}</td></tr>
                <tr><td><strong>Tour Duration:</strong></td><td>{{tourDuration}}</td></tr>
                <tr><td><strong>Booking Type:</strong></td><td>{{bookingType}}</td></tr>
                
                <!-- Conditional rendering for Booking ID and Group ID -->
                <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
                    <tr><td><strong>Booking ID:</strong></td><td>{{bookingId}}</td></tr>
                    <tr><td><strong>Group ID:</strong></td><td>{{groupId}}</td></tr>
                <? } ?>
            </table>

            <p style="font-size: 16px; color: #333333;">We've received your deposit of <span style="color: red;"><strong>£{{reservationFee}}</strong></span> — thank you!</p>
            <h3 style="font-size: 18px; color: red; margin-top: 20px;">⚠️ Final Payment Required Within 48 Hours</h3>
        <? } ?>

        <!-- P1 Payment Scenario -->
        <? if (availablePaymentTerms === "P1") { ?>
            <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
            <p style="font-size: 16px; color: #333333;">We've received your deposit of <span style="color: red;"><strong>£{{reservationFee}}</strong></span> — and your spot is nearly secured!</p>
            
            <h2 style="color: red; font-size: 24px; margin-top: 0;">Booking Details</h2>
            <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
                <tr><td><strong>Traveler Name:</strong></td><td>{{fullName}}</td></tr>
                <tr><td><strong>Tour Name:</strong></td><td>{{tourPackage}}</td></tr>
                <tr><td><strong>Tour Date:</strong></td><td>{{tourDate}}</td></tr>
                <tr><td><strong>Return Date:</strong></td><td>{{returnDate}}</td></tr>        
                <tr><td><strong>Tour Duration:</strong></td><td>{{tourDuration}}</td></tr>
                <tr><td><strong>Booking Type:</strong></td><td>{{bookingType}}</td></tr>
                <tr><td><strong>Booking ID:</strong></td><td>{{bookingId}}</td></tr>
                <!-- Conditional rendering for Group ID -->
                <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
                    <tr><td><strong>Group ID:</strong></td><td>{{groupId}}</td></tr>
                <? } ?>
            </table>

            <h3 style="font-size: 20px; color: red;">Final Payment Due Soon</h3>
            <p style="font-size: 16px; color: #333333;">There is only one available payment plan for your tour, so the remaining balance must be paid in full on <strong>{{p1DueDate}}</strong>.</p>
        <? } ?>

        <? if (availablePaymentTerms !== 'Invalid') { ?>
            <h3 style="font-size: 20px; color: red;">Choose Your Payment Method</h3>
            <div style="background-color: #fff9c4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <ul style="font-size: 16px; color: #333333; margin-bottom: 20px; list-style-type: disc; padding-left: 20px;">
                    <li><strong>PM1 – Revolut Business</strong>:<br>
                        Account Name: I'M HERE TRAVELS LTD<br>
                        Account Number: 36834154<br>
                        Sort Code: 23-01-20
                    </li>
                </ul>
            </div>
            <p style="font-size: 16px; color: #333333;">We can't wait to welcome you to {{tourPackage}} — it's going to be an unforgettable adventure!</p>
        <? } ?>

        <p style="font-size: 16px; color: #333333;">Best regards,</p>
        <p style="font-size: 16px; color: #333333;"><strong>The ImHereTravels Team</strong></p>
        
        <div style="text-align: left; margin-top: 20px;">
            <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px; height: auto; display: block;">
        </div>
    </div>
</body>
</html>`;

// Sample data sets for different scenarios
const sampleDataSets = {
  invalid: {
    fullName: "John Doe",
    tourPackage: "Siargao Adventure",
    reservationFee: 150,
    availablePaymentTerms: "Invalid",
    bookingType: "Individual",
    tourDate: "2024-12-15",
    returnDate: "2024-12-22",
    tourDuration: "7 days",
    bookingId: "BK001",
    groupId: "",
    mainBooker: "",
    p1DueDate: "",
    p1Amount: "",
    p2Amount: "",
    p2DueDate: "",
    p3Amount: "",
    p3DueDate: "",
    p4Amount: "",
    p4DueDate: "",
    remainingBalance: "",
    fullPaymentDueDate: "",
  },
  p1: {
    fullName: "Jane Smith",
    tourPackage: "Philippines Explorer",
    reservationFee: 200,
    availablePaymentTerms: "P1",
    bookingType: "Individual",
    tourDate: "2025-03-20",
    returnDate: "2025-03-27",
    tourDuration: "7 days",
    bookingId: "BK002",
    groupId: "",
    mainBooker: "",
    p1DueDate: "2025-02-20",
    p1Amount: 800,
    p2Amount: "",
    p2DueDate: "",
    p3Amount: "",
    p3DueDate: "",
    p4Amount: "",
    p4DueDate: "",
    remainingBalance: "",
    fullPaymentDueDate: "",
  },
  group: {
    fullName: "Mike Johnson",
    tourPackage: "Island Hopping Tour",
    reservationFee: 300,
    availablePaymentTerms: "P2",
    bookingType: "Group Booking",
    tourDate: "2025-04-15",
    returnDate: "2025-04-22",
    tourDuration: "7 days",
    bookingId: "BK003",
    groupId: "GRP001",
    mainBooker: "Mike Johnson",
    p1DueDate: "2025-03-15",
    p1Amount: 1200,
    p2Amount: 600,
    p2DueDate: "2025-04-01",
    p3Amount: "",
    p3DueDate: "",
    p4Amount: "",
    p4DueDate: "",
    remainingBalance: "",
    fullPaymentDueDate: "",
  },
  final48: {
    fullName: "Sarah Wilson",
    tourPackage: "Last Minute Adventure",
    reservationFee: 250,
    availablePaymentTerms: "Full payment required within 48hrs",
    bookingType: "Duo Booking",
    tourDate: "2024-12-20",
    returnDate: "2024-12-27",
    tourDuration: "7 days",
    bookingId: "BK004",
    groupId: "GRP002",
    mainBooker: "Sarah Wilson",
    p1DueDate: "",
    p1Amount: "",
    p2Amount: "",
    p2DueDate: "",
    p3Amount: "",
    p3DueDate: "",
    p4Amount: "",
    p4DueDate: "",
    remainingBalance: 750,
    fullPaymentDueDate: "2024-12-18",
  },
};

export default function ConditionalTemplateDemo() {
  const [selectedScenario, setSelectedScenario] =
    useState<keyof typeof sampleDataSets>("p1");
  const [processedTemplate, setProcessedTemplate] = useState("");

  const processTemplate = () => {
    const data = sampleDataSets[selectedScenario];
    const processed = EmailTemplateService.processTemplate(
      sampleTemplate,
      data
    );
    setProcessedTemplate(processed);
  };

  const getVariables = () => {
    return EmailTemplateService.extractTemplateVariables(sampleTemplate);
  };

  const validateTemplate = () => {
    return EmailTemplateService.validateTemplateSyntax(sampleTemplate);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Conditional Template Rendering Demo
        </h1>
        <p className="text-gray-600">
          See how conditional rendering works with different data scenarios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Controls and Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Variables</CardTitle>
              <CardDescription>Variables found in the template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {getVariables().map((variable) => (
                  <Badge key={variable} variant="secondary">
                    {variable}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Validation</CardTitle>
              <CardDescription>Check template syntax</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const validation = validateTemplate();
                return (
                  <div className="space-y-2">
                    <div
                      className={`flex items-center space-x-2 ${
                        validation.isValid ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          validation.isValid ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></span>
                      <span className="font-medium">
                        {validation.isValid
                          ? "Template is valid"
                          : "Template has errors"}
                      </span>
                    </div>
                    {!validation.isValid && (
                      <ul className="text-sm text-red-600 space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Scenarios</CardTitle>
              <CardDescription>
                Select a scenario to test conditional rendering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(sampleDataSets).map((scenario) => (
                  <Button
                    key={scenario}
                    variant={
                      selectedScenario === scenario ? "default" : "outline"
                    }
                    onClick={() =>
                      setSelectedScenario(
                        scenario as keyof typeof sampleDataSets
                      )
                    }
                    className="text-xs"
                  >
                    {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
                  </Button>
                ))}
              </div>

              <Button onClick={processTemplate} className="w-full">
                Process Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Scenario Data</CardTitle>
              <CardDescription>
                Data being used for template processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(sampleDataSets[selectedScenario]).map(
                  ([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium">{key}:</span>
                      <span className="text-gray-600">{String(value)}</span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Template Output */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Output</CardTitle>
              <CardDescription>
                Processed template with conditional rendering applied
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedTemplate ? (
                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <div
                    dangerouslySetInnerHTML={{ __html: processedTemplate }}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Click "Process Template" to see the output</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Raw HTML Output</CardTitle>
              <CardDescription>Generated HTML code</CardDescription>
            </CardHeader>
            <CardContent>
              {processedTemplate ? (
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                  {processedTemplate}
                </pre>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No processed template yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
