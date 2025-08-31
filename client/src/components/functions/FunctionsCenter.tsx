"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import Editor from "@monaco-editor/react";
import {
  Code,
  FileCode,
  Plus,
  Save,
  Play,
  Trash2,
  Search,
  FolderOpen,
  FileText,
  Settings,
  Folder,
  ChevronDown,
  ChevronRight,
  Edit,
  Zap,
  Layers,
  Type,
  Package,
} from "lucide-react";
import { typescriptFunctionService } from "@/services/firebase-function-service";
import {
  TSFile,
  TSFolder,
  CreateFileData,
  CreateFolderData,
} from "@/types/functions";
import CreateItemModal from "./CreateItemModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { useToast } from "@/hooks/use-toast";

// Initialize TypeScript function service
typescriptFunctionService.initialize();

export default function FunctionsCenter() {
  const { toast } = useToast();
  const [folders, setFolders] = useState<TSFolder[]>([]);
  const [files, setFiles] = useState<TSFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<TSFolder | null>(null);
  const [activeFile, setActiveFile] = useState<TSFile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [renameFileModal, setRenameFileModal] = useState<{
    isOpen: boolean;
    file: TSFile | null;
  }>({ isOpen: false, file: null });
  const [deleteFolderModal, setDeleteFolderModal] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({ isOpen: false, folderId: "", folderName: "" });
  const [deleteFileModal, setDeleteFileModal] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
  }>({ isOpen: false, fileId: "", fileName: "" });

  // Add editor instance ref and loading state
  const editorRef = useRef<any>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [editorValue, setEditorValue] = useState("");

  // Load data from TypeScript function service and set up real-time listeners
  useEffect(() => {
    const loadData = async () => {
      try {
        const allFolders = await typescriptFunctionService.folders.getAll();
        const allFiles = await typescriptFunctionService.files.getAll();

        setFolders(allFolders);
        setFiles(allFiles);

        // Set first file as active if available
        if (allFiles.length > 0) {
          setActiveFile(allFiles[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    // Initial data load
    loadData();

    // Set up real-time listeners
    const unsubscribeFolders = typescriptFunctionService.subscribeToFolders(
      (folders) => {
        setFolders(folders);
      }
    );

    const unsubscribeFiles = typescriptFunctionService.subscribeToFiles(
      (files) => {
        setFiles(files);
      }
    );

    // Cleanup listeners on unmount
    return () => {
      unsubscribeFolders();
      unsubscribeFiles();
    };
  }, []);

  // Get files for each folder
  const getFilesForFolder = (folderId: string) => {
    return files.filter((file) => file.folderId === folderId);
  };

  // Flatten all files for search and stats
  const allFiles = files;
  const filteredFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileSelect = async (file: TSFile) => {
    if (activeFile?.id === file.id) return; // Prevent unnecessary re-renders

    setIsEditorLoading(true);
    setActiveFile(file);
    setEditorValue(file.content);
    setIsEditing(false);

    // Update active state using TypeScript service
    try {
      await typescriptFunctionService.files.setActive(file.id);
      const updatedFiles = await typescriptFunctionService.files.getAll();
      setFiles(updatedFiles);
    } catch (error) {
      console.error("Error setting file as active:", error);
    }

    // Small delay to ensure smooth transition
    setTimeout(() => setIsEditorLoading(false), 100);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  const handleCreateFile = async (fileName: string) => {
    if (folders.length === 0) {
      toast({
        title: "No folders available",
        description: "Please create a folder first before creating files.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFolder) {
      toast({
        title: "No folder selected",
        description: "Please select a folder first by clicking on it.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Determine file extension based on name or default to .ts
      const fileExtension = fileName.includes(".") ? "" : ".ts";
      const fullFileName = fileName + fileExtension;

      const newFile = await typescriptFunctionService.files.create({
        name: fullFileName,
        content: `// ${fullFileName}
// Created on ${new Date().toLocaleDateString()}
// TypeScript file with export default function

export default function ${
          fileName.replace(/[^a-zA-Z0-9]/g, "") || "exampleFunction"
        }(
  // Add your parameters here
) {
  // Your implementation here
  return "Hello from TypeScript!";
}`,
        folderId: selectedFolder.id,
        isActive: false,
        fileType: "typescript",
      });

      const updatedFiles = await typescriptFunctionService.files.getAll();
      setFiles(updatedFiles);
      setActiveFile(newFile);
      setIsEditing(true);

      toast({
        title: "Success",
        description: `TypeScript file "${fullFileName}" created successfully.`,
      });
    } catch (error) {
      console.error("Error creating file:", error);
      toast({
        title: "Error",
        description: "Failed to create file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    try {
      const newFolder = await typescriptFunctionService.folders.create({
        name: folderName,
        isCollapsed: false,
        description: `TypeScript functions folder: ${folderName}`,
      });

      const updatedFolders = await typescriptFunctionService.folders.getAll();
      setFolders(updatedFolders);
      setSelectedFolder(newFolder);

      toast({
        title: "Success",
        description: `Folder "${folderName}" created successfully.`,
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFolderSelect = (folder: TSFolder) => {
    setSelectedFolder(folder);
  };

  const handleFolderToggle = async (folder: TSFolder) => {
    try {
      const updatedFolder =
        await typescriptFunctionService.folders.toggleCollapse(folder.id);
      if (updatedFolder) {
        const updatedFolders = await typescriptFunctionService.folders.getAll();
        setFolders(updatedFolders);
      }
    } catch (error) {
      console.error("Error toggling folder:", error);
    }
  };

  const handleRenameFile = (file: TSFile) => {
    setRenameFileModal({ isOpen: true, file });
  };

  const handleRenameFileSubmit = async (newName: string) => {
    if (!renameFileModal.file) return;

    try {
      const updatedFile = await typescriptFunctionService.files.update(
        renameFileModal.file.id,
        { name: newName }
      );

      if (updatedFile) {
        const updatedFiles = await typescriptFunctionService.files.getAll();
        setFiles(updatedFiles);
        setActiveFile(updatedFile);
        setRenameFileModal({ isOpen: false, file: null });

        toast({
          title: "Success",
          description: `File renamed to "${newName}" successfully.`,
        });
      }
    } catch (error) {
      console.error("Error renaming file:", error);
      toast({
        title: "Error",
        description: "Failed to rename file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await typescriptFunctionService.folders.delete(folderId);
      const updatedFolders = await typescriptFunctionService.folders.getAll();
      const updatedFiles = await typescriptFunctionService.files.getAll();
      setFolders(updatedFolders);
      setFiles(updatedFiles);

      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }

      toast({
        title: "Success",
        description: "Folder deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast({
        title: "Error",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await typescriptFunctionService.files.delete(fileId);
      const updatedFiles = await typescriptFunctionService.files.getAll();
      setFiles(updatedFiles);

      if (activeFile?.id === fileId) {
        setActiveFile(updatedFiles[0] || null);
      }

      toast({
        title: "Success",
        description: "File deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;

    try {
      const updatedFile = await typescriptFunctionService.files.updateContent(
        activeFile.id,
        editorValue
      );

      if (updatedFile) {
        setActiveFile(updatedFile);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "File saved successfully.",
        });
      }
    } catch (error) {
      console.error("Error saving file:", error);
      toast({
        title: "Error",
        description: "Failed to save file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRun = () => {
    // This would execute the TypeScript function
    toast({
      title: "Run Function",
      description: "Function execution feature coming soon!",
    });
  };

  const getFileIcon = () => {
    if (!activeFile) return <FileCode className="h-4 w-4 text-gray-500" />;

    // Return different icons based on file type and export type
    if (activeFile.fileType === "typescript") {
      return <Type className="h-4 w-4 text-blue-600" />;
    }

    if (activeFile.hasExportDefault) {
      switch (activeFile.exportType) {
        case "function":
          return <Code className="h-4 w-4 text-green-600" />;
        case "class":
          return <Package className="h-4 w-4 text-purple-600" />;
        case "object":
          return <Layers className="h-4 w-4 text-orange-600" />;
        default:
          return <Code className="h-4 w-4 text-gray-600" />;
      }
    }

    return <FileCode className="h-4 w-4 text-gray-500" />;
  };

  const getComplexityBadge = (complexity: string) => {
    const variants = {
      simple: "default",
      moderate: "secondary",
      complex: "destructive",
    } as const;

    return (
      <Badge
        variant={variants[complexity as keyof typeof variants]}
        className="text-xs"
      >
        {complexity}
      </Badge>
    );
  };

  const getFileTypeBadge = (fileType: string) => {
    return (
      <Badge variant="outline" className="text-xs">
        {fileType === "typescript" ? "TS" : "JS"}
      </Badge>
    );
  };

  const getExportTypeBadge = (exportType: string) => {
    if (!exportType || exportType === "none") return null;

    const variants = {
      function: "default",
      class: "secondary",
      object: "outline",
      value: "destructive",
    } as const;

    return (
      <Badge
        variant={variants[exportType as keyof typeof variants]}
        className="text-xs"
      >
        {exportType}
      </Badge>
    );
  };

  const handleEditorDidMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;

      // Configure TypeScript language features
      editor.updateOptions({
        language: "typescript",
        theme: "vs-light",
        // TypeScript-specific options
        suggest: {
          includeCompletionsForModuleExports: true,
          includeCompletionsWithInsertText: true,
        },
        typescript: {
          suggest: {
            includeCompletionsForModuleExports: true,
          },
        },
        // Enhanced IntelliSense
        quickSuggestions: {
          other: true,
          comments: true,
          strings: true,
        },
        parameterHints: { enabled: true },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: "on",
        wordBasedSuggestions: true,
        // TypeScript compiler options
        compilerOptions: {
          target: "ES2020",
          module: "ESNext",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        typeRoots: ["node_modules/@types"],
      });

      // Set initial value if available
      if (activeFile) {
        editor.setValue(activeFile.content);
        setEditorValue(activeFile.content);
      }

      setIsEditorLoading(false);
    },
    [activeFile]
  );

  // Update editor value when activeFile changes
  useEffect(() => {
    if (editorRef.current && activeFile && editorValue !== activeFile.content) {
      editorRef.current.setValue(activeFile.content);
      setEditorValue(activeFile.content);
    }
  }, [activeFile, editorValue]);

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                TS Functions
              </h2>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant={selectedFolder ? "outline" : "secondary"}
                title={
                  selectedFolder
                    ? "New TypeScript File"
                    : "Click a folder to select it and create files"
                }
                onClick={() => setIsCreateFileModalOpen(true)}
                disabled={!selectedFolder}
              >
                <Type className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                title="New Folder"
                onClick={() => setIsCreateFolderModalOpen(true)}
              >
                <Folder className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search TypeScript files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {folders.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-2">No folders yet</p>
                <p className="text-xs text-gray-400">
                  Create a folder to get started with TypeScript functions
                </p>
              </div>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="mb-2">
                  {/* Folder Header */}
                  <div
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedFolder?.id === folder.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleFolderSelect(folder)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderToggle(folder);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {folder.isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <Folder className="h-4 w-4 text-gray-500" />
                    <span
                      className="text-sm font-medium text-gray-700 flex-1 cursor-pointer select-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderSelect(folder);
                      }}
                    >
                      {folder.name}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      {getFilesForFolder(folder.id).length}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteFolderModal({
                          isOpen: true,
                          folderId: folder.id,
                          folderName: folder.name,
                        });
                      }}
                      title="Delete folder"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Folder Files */}
                  {!folder.isCollapsed && (
                    <div className="ml-6 space-y-1">
                      {getFilesForFolder(folder.id).map((file) => (
                        <div
                          key={file.id}
                          className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            file.isActive
                              ? "bg-blue-100 border border-blue-200"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => handleFileSelect(file)}
                        >
                          <div className="flex items-center space-x-2">
                            {file.fileType === "typescript" ? (
                              <Type className="h-4 w-4 text-blue-600" />
                            ) : (
                              <FileCode className="h-4 w-4 text-gray-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium truncate select-none ${
                                  file.isActive
                                    ? "text-blue-900"
                                    : "text-gray-900"
                                }`}
                              >
                                {file.name}
                              </p>
                              {/* Badges removed for cleaner file list */}
                              <p className="text-xs text-gray-500 mt-1">
                                Modified{" "}
                                {file.lastModified.toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameFile(file);
                              }}
                              title="Rename file"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteFileModal({
                                  isOpen: true,
                                  fileId: file.id,
                                  fileName: file.name,
                                });
                              }}
                              title="Delete file"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <Type className="h-3 w-3 text-blue-600" />
              <span>TypeScript</span>
            </div>
            <div className="mt-1">
              {allFiles.length === 0 ? "No files" : `${allFiles.length} files`}
            </div>
            {allFiles.length > 0 && (
              <div className="mt-1 text-xs">
                <div className="flex items-center space-x-1">
                  <span>
                    TS:{" "}
                    {allFiles.filter((f) => f.fileType === "typescript").length}
                  </span>
                  <span>
                    JS:{" "}
                    {allFiles.filter((f) => f.fileType === "javascript").length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Code Editor */}
      <div className="flex-1 flex flex-col">
        {activeFile ? (
          <>
            {/* Editor Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getFileIcon()}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {activeFile.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {getFileTypeBadge(activeFile.fileType)}
                      {activeFile.hasExportDefault &&
                        getExportTypeBadge(activeFile.exportType)}
                      {getComplexityBadge(activeFile.complexity)}
                      {activeFile.hasTypeAnnotations && (
                        <Badge variant="outline" className="text-xs">
                          <Type className="h-2 w-2 mr-1" />
                          Types
                        </Badge>
                      )}
                      {activeFile.hasExportDefault &&
                        activeFile.arguments.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {activeFile.arguments.length} params
                          </Badge>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Modified {activeFile.lastModified.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={toggleEditMode}>
                    {isEditing ? "View" : "Edit"}
                  </Button>
                  {isEditing && (
                    <Button size="sm" onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  )}
                  <Button size="sm" onClick={handleRun}>
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </Button>
                </div>
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1 bg-white overflow-hidden relative">
              {isEditorLoading && (
                <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">
                      Loading TypeScript editor...
                    </span>
                  </div>
                </div>
              )}
              <Editor
                key={activeFile?.id || "empty"}
                height="100%"
                defaultLanguage="typescript"
                value={editorValue}
                onChange={(value) => {
                  if (value !== undefined) {
                    setEditorValue(value);
                    if (activeFile) {
                      setActiveFile({
                        ...activeFile,
                        content: value,
                      });
                    }
                  }
                }}
                onMount={handleEditorDidMount}
                theme="vs-light"
                options={{
                  readOnly: !isEditing,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  parameterHints: { enabled: true },
                  formatOnPaste: true,
                  formatOnType: true,
                  // Add these options to reduce flashing
                  renderWhitespace: "none",
                  renderLineHighlight: "all",
                  smoothScrolling: true,
                  // Prevent cursor jumping
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                }}
                // Add loading component
                loading={
                  <div className="flex items-center justify-center h-full">
                    Loading TypeScript editor...
                  </div>
                }
              />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Type className="mx-auto h-12 w-12 text-blue-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No TypeScript file selected
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a file from the sidebar to view or edit its TypeScript
                code.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Item Modals */}
      <CreateItemModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
        type="folder"
      />

      <CreateItemModal
        isOpen={isCreateFileModalOpen}
        onClose={() => setIsCreateFileModalOpen(false)}
        onSubmit={handleCreateFile}
        type="file"
        selectedFolderName={selectedFolder?.name}
      />

      {/* Rename File Modal */}
      <CreateItemModal
        isOpen={renameFileModal.isOpen}
        onClose={() => setRenameFileModal({ isOpen: false, file: null })}
        onSubmit={handleRenameFileSubmit}
        type="file"
        isRenaming={true}
        currentName={renameFileModal.file?.name || ""}
      />

      {/* Delete Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={deleteFolderModal.isOpen}
        onClose={() =>
          setDeleteFolderModal({ isOpen: false, folderId: "", folderName: "" })
        }
        onConfirm={() => handleDeleteFolder(deleteFolderModal.folderId)}
        title="Delete Folder"
        description="Are you sure you want to delete this folder? All TypeScript files in it will also be deleted."
        itemName={deleteFolderModal.folderName}
        type="folder"
      />

      <ConfirmDeleteModal
        isOpen={deleteFileModal.isOpen}
        onClose={() =>
          setDeleteFileModal({ isOpen: false, fileId: "", fileName: "" })
        }
        onConfirm={() => handleDeleteFile(deleteFileModal.fileId)}
        title="Delete TypeScript File"
        description="Are you sure you want to delete this TypeScript file?"
        itemName={deleteFileModal.fileName}
        type="file"
      />
    </div>
  );
}
