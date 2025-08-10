import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface BlobFileUploadProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
  selectedFiles?: File[];
  onRemoveFile?: (index: number) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BlobFileUpload({
  onFilesSelected,
  multiple = false,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  className,
  disabled = false,
  selectedFiles = [],
  onRemoveFile,
}: BlobFileUploadProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop: (acceptedFiles) => {
      setDragError(null);
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.flatMap(f => f.errors.map(e => e.message));
      setDragError(errors.join(', '));
    },
    accept: accept === 'image/*' 
      ? { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] }
      : accept === 'document/*'
      ? { 
          'application/pdf': ['.pdf'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          'text/plain': ['.txt'],
        }
      : undefined,
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const removeFile = (index: number) => {
    const file = selectedFiles[index];
    if (file) {
      // Cleanup blob URL if it exists
      const objectUrl = URL.createObjectURL(file);
      URL.revokeObjectURL(objectUrl);
    }
    onRemoveFile?.(index);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragActive && !isDragReject && 'border-blue-500 bg-blue-50',
          isDragReject && 'border-red-500 bg-red-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <CardContent
          {...getRootProps()}
          className="flex flex-col items-center justify-center p-8 text-center"
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {multiple 
                  ? 'Drop files here, or click to select multiple'
                  : 'Drop file here, or click to select'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Max size: {formatFileSize(maxSize)}
                {multiple && ` • Max files: ${maxFiles}`}
              </p>
              <p className="text-xs text-orange-600 font-medium">
                Files will be uploaded after tour creation
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {(dragError || fileRejections.length > 0) && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {dragError && <div>{dragError}</div>}
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              {file.name}: {errors.map(e => e.message).join(', ')}
            </div>
          ))}
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            Selected Files ({selectedFiles.length})
            <Badge variant="secondary" className="text-xs">
              Ready for upload
            </Badge>
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <Card key={index}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
