"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TestTube,
  Play,
  Copy,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Code,
  Monitor,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmailTemplateService from "@/services/email-template-service";
import { CommunicationTemplate as FirestoreTemplate } from "@/types/communications";

// Type declarations
type CommunicationTemplate = FirestoreTemplate;

interface TemplateArgument {
  key: string;
  value: string;
}

interface GeneratedTemplate {
  subject: string;
  content: string;
  variables: string[];
}

export default function TestTab() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateArgs, setTemplateArgs] = useState<Record<string, string>>({});
  const [generatedTemplate, setGeneratedTemplate] =
    useState<GeneratedTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewView, setPreviewView] = useState<"preview" | "code">("preview");

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Update template arguments when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const selectedTemplate = templates.find(
        (t) => t.id === selectedTemplateId
      );
      if (selectedTemplate && selectedTemplate.variableDefinitions) {
        // Initialize arguments with empty values for each variable definition
        const newArgs: Record<string, string> = {};
        selectedTemplate.variableDefinitions.forEach((varDef) => {
          newArgs[varDef.name] = templateArgs[varDef.name] || ""; // Keep existing values if any
        });
        setTemplateArgs(newArgs);
      }
    } else {
      setTemplateArgs({});
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await EmailTemplateService.getTemplates({
        sortBy: "metadata.updatedAt",
        sortOrder: "desc",
        limit: 100,
      });

      setTemplates(result.templates);
    } catch (error) {
      console.error("Failed to load templates:", error);
      setError("Failed to load templates");
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArgumentChange = (variable: string, value: string) => {
    setTemplateArgs((prev) => ({
      ...prev,
      [variable]: value,
    }));
  };

  const generateTemplate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Find the selected template
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (!template) {
        throw new Error("Template not found");
      }

      // Filter out empty arguments and create argument map
      const argumentMap: Record<string, string> = {};
      Object.entries(templateArgs).forEach(([key, value]) => {
        if (value.trim()) {
          argumentMap[key] = value;
        }
      });

      // Use the same processing logic as the template editor
      let processedSubject = template.subject;
      let processedContent = template.content;

      // Process subject using EmailTemplateService
      if (Object.keys(argumentMap).length > 0) {
        try {
          processedSubject = EmailTemplateService.processTemplate(
            template.subject,
            argumentMap
          );
        } catch (error) {
          console.warn("Error processing subject:", error);
          // Fallback to simple replacement for subject
          Object.entries(argumentMap).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            processedSubject = processedSubject.replace(
              new RegExp(placeholder, "g"),
              value
            );
          });
        }

        // Process content using EmailTemplateService (same as template editor)
        try {
          processedContent = EmailTemplateService.processTemplate(
            template.content,
            argumentMap
          );
        } catch (error) {
          console.warn(
            "Error processing content with EmailTemplateService:",
            error
          );
          // Fallback to simple replacement
          Object.entries(argumentMap).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            processedContent = processedContent.replace(
              new RegExp(placeholder, "g"),
              value
            );
          });
        }
      }

      // Get variables that were actually used
      const foundVariables = Object.keys(argumentMap).filter(
        (key) => argumentMap[key] && argumentMap[key].trim()
      );

      setGeneratedTemplate({
        subject: processedSubject,
        content: processedContent,
        variables: foundVariables,
      });

      toast({
        title: "Success",
        description: "Template generated successfully",
      });
    } catch (error) {
      console.error("Failed to generate template:", error);
      setError("Failed to generate template");
      toast({
        title: "Error",
        description: "Failed to generate template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${type} copied to clipboard`,
    });
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: `${filename} downloaded successfully`,
    });
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-primary/20 rounded-xl">
          <TestTube className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-hk-grotesk">
            Template Testing
          </h2>
          <p className="text-muted-foreground">
            Test email templates with custom arguments and preview the output
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card className="border border-royal-purple/20 dark:border-border shadow">
          <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
            <CardTitle className="flex items-center text-foreground">
              <Play className="mr-2 h-5 w-5 text-primary" />
              Template Configuration
            </CardTitle>
            <CardDescription>
              Select a template and provide arguments for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template-select" className="text-foreground">
                Template ID
              </Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{template.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {template.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-royal-purple/10">
                  <p className="text-sm text-muted-foreground">
                    <strong>Subject:</strong> {selectedTemplate.subject}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Variables:</strong>{" "}
                    {selectedTemplate.variableDefinitions
                      ?.map((vd) => vd.name)
                      .join(", ") || "None"}
                  </p>
                  {selectedTemplate.variableDefinitions &&
                    selectedTemplate.variableDefinitions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selectedTemplate.variableDefinitions.map((varDef) => (
                          <div
                            key={varDef.id}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-medium">{varDef.name}</span>
                            <span className="mx-1">({varDef.type})</span>
                            {varDef.description && (
                              <span className="ml-1">
                                - {varDef.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Arguments */}
            <div className="space-y-3">
              <Label className="text-foreground">Template Variables</Label>

              {selectedTemplate &&
              selectedTemplate.variableDefinitions &&
              selectedTemplate.variableDefinitions.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedTemplate.variableDefinitions.map((varDef) => (
                    <div key={varDef.id} className="space-y-2">
                      <Label
                        htmlFor={varDef.name}
                        className="text-sm font-medium text-foreground"
                      >
                        {varDef.name
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({varDef.type})
                        </span>
                      </Label>
                      {varDef.description && (
                        <p className="text-xs text-muted-foreground">
                          {varDef.description}
                        </p>
                      )}
                      <Input
                        id={varDef.name}
                        placeholder={`Enter value for ${varDef.name}`}
                        value={templateArgs[varDef.name] || ""}
                        onChange={(e) =>
                          handleArgumentChange(varDef.name, e.target.value)
                        }
                        className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                      />
                    </div>
                  ))}
                </div>
              ) : selectedTemplate ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    This template has no variables to configure.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Select a template to see its variables.
                  </p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateTemplate}
              disabled={isLoading || !selectedTemplateId}
              className="w-full bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generate Template
                </>
              )}
            </Button>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-crimson-red/10 border border-crimson-red/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-crimson-red" />
                <span className="text-sm text-crimson-red">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Output */}
        <Card className="border border-royal-purple/20 dark:border-border shadow">
          <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-foreground">
                  <Eye className="mr-2 h-5 w-5 text-primary" />
                  Generated Output
                </CardTitle>
                <CardDescription>
                  Preview the processed template with your arguments
                </CardDescription>
              </div>
              {generatedTemplate && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant={previewView === "preview" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewView("preview")}
                    className="h-8 px-3"
                  >
                    <Monitor className="mr-2 h-3 w-3" />
                    Preview
                  </Button>
                  <Button
                    variant={previewView === "code" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewView("code")}
                    className="h-8 px-3"
                  >
                    <Code className="mr-2 h-3 w-3" />
                    Code
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {generatedTemplate ? (
              <>
                {/* Subject */}
                <div className="space-y-2">
                  <Label className="text-foreground">Subject</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={generatedTemplate.subject}
                      readOnly
                      className="border-royal-purple/20 dark:border-border bg-muted/50"
                    />
                    <Button
                      onClick={() =>
                        copyToClipboard(generatedTemplate.subject, "Subject")
                      }
                      variant="outline"
                      size="sm"
                      className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content - Preview or Code */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Content</Label>
                    {previewView === "code" && (
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() =>
                            copyToClipboard(
                              generatedTemplate.content,
                              "Content"
                            )
                          }
                          variant="outline"
                          size="sm"
                          className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          onClick={() =>
                            downloadAsFile(
                              generatedTemplate.content,
                              `template-${selectedTemplateId}.html`
                            )
                          }
                          variant="outline"
                          size="sm"
                          className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>

                  {previewView === "preview" ? (
                    <div className="border border-royal-purple/20 dark:border-border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b">
                        <div className="flex items-center justify-between">
                          <span>Live Preview</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() =>
                                copyToClipboard(
                                  generatedTemplate.content,
                                  "Content"
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </Button>
                            <Button
                              onClick={() =>
                                downloadAsFile(
                                  generatedTemplate.content,
                                  `template-${selectedTemplateId}.html`
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div
                        className="p-4 bg-gray-50 overflow-auto"
                        style={{ maxHeight: "500px" }}
                      >
                        <div className="w-full max-w-2xl mx-auto">
                          <div className="rounded shadow-sm bg-white">
                            <div
                              dangerouslySetInnerHTML={{
                                __html: generatedTemplate.content,
                              }}
                              className="w-full text-black"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      value={generatedTemplate.content}
                      readOnly
                      rows={15}
                      className="border-royal-purple/20 dark:border-border bg-muted/50 resize-none font-mono text-sm"
                    />
                  )}
                </div>

                {/* Variables Used */}
                <div className="space-y-2">
                  <Label className="text-foreground">Variables Used</Label>
                  <div className="flex flex-wrap gap-2">
                    {generatedTemplate.variables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="border-spring-green/20 text-spring-green bg-spring-green/10"
                      >
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="p-3 bg-muted/50 rounded-xl inline-block mb-3">
                  <TestTube className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No Template Generated
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select a template and provide arguments, then click "Generate
                  Template" to see the output here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
