import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileUpload,
  TourCoverUpload,
  TourGalleryUpload,
  TourDocumentUpload,
} from "@/components/ui/file-upload";
import {
  useFileUpload,
  useTourCoverUpload,
  useTourGalleryUpload,
  type UploadResult,
} from "@/hooks/use-file-upload";
import {
  DEFAULT_BUCKETS,
  initializeDefaultBuckets,
  createBucket,
} from "@/lib/file-upload-service";
import {
  Upload,
  Image,
  FileText,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Database,
  Cloud,
} from "lucide-react";

export function FileUploadDemo() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

  // Example tour ID for demo purposes
  const demoTourId = "demo-tour-" + Date.now();

  const generalUpload = useFileUpload({
    onSuccess: (result) => {
      if ("successful" in result) {
        setUploadResults((prev) => [...prev, ...result.successful]);
      } else {
        setUploadResults((prev) => [...prev, result]);
      }
    },
    onError: (error) => {
      console.error("Upload error:", error);
    },
  });

  const tourCoverUpload = useTourCoverUpload(demoTourId, {
    onSuccess: (result) => {
      if ("successful" in result) {
        setUploadResults((prev) => [...prev, ...result.successful]);
      } else {
        setUploadResults((prev) => [...prev, result]);
      }
    },
  });

  const tourGalleryUpload = useTourGalleryUpload(demoTourId, {
    onSuccess: (result) => {
      if ("successful" in result) {
        setUploadResults((prev) => [...prev, ...result.successful]);
      } else {
        setUploadResults((prev) => [...prev, result]);
      }
    },
  });

  const handleInitializeBuckets = async () => {
    try {
      setInitializationError(null);
      await initializeDefaultBuckets();
      setIsInitialized(true);
    } catch (error) {
      setInitializationError(
        error instanceof Error ? error.message : "Failed to initialize buckets"
      );
    }
  };

  const handleCreateBucket = async (bucketName: string) => {
    try {
      const success = await createBucket(bucketName, true);
      if (success) {
        console.log(`Bucket ${bucketName} created successfully`);
      } else {
        console.error(`Failed to create bucket ${bucketName}`);
      }
    } catch (error) {
      console.error("Error creating bucket:", error);
    }
  };

  const clearResults = () => {
    setUploadResults([]);
    generalUpload.resetState();
    tourCoverUpload.resetState();
    tourGalleryUpload.resetState();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">File Upload Service Demo</h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive Supabase file upload with image processing, compression,
          and tour-specific uploads
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary">Supabase Storage</Badge>
          <Badge variant="secondary">Image Compression</Badge>
          <Badge variant="secondary">Multi-file Upload</Badge>
          <Badge variant="secondary">Tour Integration</Badge>
        </div>
      </div>

      {/* Initialization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Initialization
          </CardTitle>
          <CardDescription>
            Initialize Supabase storage buckets for the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Default Buckets</p>
              <p className="text-sm text-muted-foreground">
                Creates: {Object.values(DEFAULT_BUCKETS).join(", ")}
              </p>
            </div>
            <Button
              onClick={handleInitializeBuckets}
              disabled={isInitialized}
              className="flex items-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              {isInitialized ? "Initialized" : "Initialize Buckets"}
            </Button>
          </div>

          {initializationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{initializationError}</AlertDescription>
            </Alert>
          )}

          {isInitialized && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Storage buckets initialized successfully
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General Upload</TabsTrigger>
          <TabsTrigger value="tour-cover">Tour Cover</TabsTrigger>
          <TabsTrigger value="tour-gallery">Tour Gallery</TabsTrigger>
          <TabsTrigger value="tour-documents">Tour Documents</TabsTrigger>
        </TabsList>

        {/* General Upload */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                General File Upload
              </CardTitle>
              <CardDescription>
                Upload any files with automatic compression and optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                multiple={true}
                accept="image/*"
                maxSize={10 * 1024 * 1024} // 10MB
                maxFiles={5}
                onUploadComplete={(results) => {
                  setUploadResults((prev) => [...prev, ...results]);
                }}
                onUploadError={(error) => {
                  console.error("Upload error:", error);
                }}
                showPreview={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tour Cover Upload */}
        <TabsContent value="tour-cover" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Tour Cover Image
              </CardTitle>
              <CardDescription>
                Upload optimized cover images for tours (1200x800, compressed)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TourCoverUpload
                tourId={demoTourId}
                onUploadComplete={(results) => {
                  setUploadResults((prev) => [...prev, ...results]);
                }}
                onUploadError={(error) => {
                  console.error("Cover upload error:", error);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tour Gallery Upload */}
        <TabsContent value="tour-gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Tour Gallery Images
              </CardTitle>
              <CardDescription>
                Upload multiple gallery images for tours (1920x1080, compressed)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TourGalleryUpload
                tourId={demoTourId}
                onUploadComplete={(results) => {
                  setUploadResults((prev) => [...prev, ...results]);
                }}
                onUploadError={(error) => {
                  console.error("Gallery upload error:", error);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tour Documents Upload */}
        <TabsContent value="tour-documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tour Documents
              </CardTitle>
              <CardDescription>
                Upload tour-related documents (PDF, DOC, TXT up to 20MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TourDocumentUpload
                tourId={demoTourId}
                documentType="itinerary"
                onUploadComplete={(results) => {
                  setUploadResults((prev) => [...prev, ...results]);
                }}
                onUploadError={(error) => {
                  console.error("Document upload error:", error);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Upload Results
            </span>
            <Button variant="outline" size="sm" onClick={clearResults}>
              Clear Results
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadResults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No uploads yet. Try uploading some files above.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="default">
                  {uploadResults.length} files uploaded
                </Badge>
                <Badge variant="secondary">
                  {uploadResults.filter((r) => r.success).length} successful
                </Badge>
                <Badge variant="destructive">
                  {uploadResults.filter((r) => !r.success).length} failed
                </Badge>
              </div>

              <Separator />

              <div className="grid gap-4">
                {uploadResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {result.data?.path?.split("/").pop() ||
                            `Upload ${index + 1}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Path: {result.data?.path || "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <Badge variant="default">Success</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                        {result.data?.publicUrl && (
                          <a
                            href={result.data.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm"
                          >
                            View File
                          </a>
                        )}
                      </div>
                    </div>
                    {result.error && (
                      <p className="text-sm text-red-500 mt-2">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Features Implemented</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">File Processing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatic image compression</li>
                <li>• Resize with aspect ratio</li>
                <li>• File type validation</li>
                <li>• Size limit enforcement</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Upload Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Drag & drop interface</li>
                <li>• Progress indicators</li>
                <li>• Bulk upload support</li>
                <li>• Error handling</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Integration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tour-specific uploads</li>
                <li>• React hooks</li>
                <li>• TypeScript support</li>
                <li>• Supabase storage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
