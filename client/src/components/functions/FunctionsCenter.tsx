"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import firebaseFunctionService from "@/services/firebase-function-service";
import {
  JSFile,
  JSFolder,
  CreateFileData,
  CreateFolderData,
} from "@/types/functions";
import CreateItemModal from "./CreateItemModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { useToast } from "@/hooks/use-toast";

// Initialize Firebase function service
firebaseFunctionService.initialize();

// Mock files removed - now using function service

export default function FunctionsCenter() {
  const { toast } = useToast();
  const [folders, setFolders] = useState<JSFolder[]>([]);
  const [files, setFiles] = useState<JSFile[]>([]);
  const [activeFile, setActiveFile] = useState<JSFile | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<JSFolder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
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

  // Load data from Firebase function service and set up real-time listeners
  useEffect(() => {
    const loadData = async () => {
      try {
        const allFolders = await firebaseFunctionService.folders.getAll();
        const allFiles = await firebaseFunctionService.files.getAll();

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
    const unsubscribeFolders = firebaseFunctionService.subscribeToFolders(
      (folders) => {
        setFolders(folders);
      }
    );

    const unsubscribeFiles = firebaseFunctionService.subscribeToFiles(
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

  const handleFileSelect = async (file: JSFile) => {
    setActiveFile(file);
    setIsEditing(false);
    // Update active state using Firebase service
    try {
      await firebaseFunctionService.files.setActive(file.id);
      const updatedFiles = await firebaseFunctionService.files.getAll();
      setFiles(updatedFiles);
    } catch (error) {
      console.error("Error setting file as active:", error);
    }
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
      const newFile = await firebaseFunctionService.files.create({
        name: fileName,
        content: `// ${fileName}\n// Created on ${new Date().toLocaleDateString()}\n\n// Your code here\n`,
        folderId: selectedFolder.id,
        isActive: false,
      });

      const updatedFiles = await firebaseFunctionService.files.getAll();
      setFiles(updatedFiles);
      setActiveFile(newFile);
      setIsEditing(true);

      toast({
        title: "Success",
        description: `File "${fileName}" created successfully.`,
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
      const newFolder = await firebaseFunctionService.folders.create({
        name: folderName,
        isCollapsed: false,
      });

      const updatedFolders = await firebaseFunctionService.folders.getAll();
      setFolders(updatedFolders);
      // Automatically select the newly created folder
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

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const success = await firebaseFunctionService.folders.delete(folderId);
      if (success) {
        const updatedFolders = await firebaseFunctionService.folders.getAll();
        const updatedFiles = await firebaseFunctionService.files.getAll();

        setFolders(updatedFolders);
        setFiles(updatedFiles);

        // If the active file was in the deleted folder, clear it
        if (activeFile && activeFile.folderId === folderId) {
          setActiveFile(null);
        }

        // If the selected folder was deleted, clear it
        if (selectedFolder && selectedFolder.id === folderId) {
          setSelectedFolder(null);
        }

        toast({
          title: "Success",
          description: "Folder deleted successfully.",
        });
      }
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
      const success = await firebaseFunctionService.files.delete(fileId);
      if (success) {
        const updatedFiles = await firebaseFunctionService.files.getAll();
        setFiles(updatedFiles);

        // If the deleted file was active, clear it
        if (activeFile && activeFile.id === fileId) {
          setActiveFile(null);
        }

        toast({
          title: "Success",
          description: "File deleted successfully.",
        });
      }
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
    if (activeFile) {
      try {
        // Update file content using Firebase service
        const updatedFile = await firebaseFunctionService.files.updateContent(
          activeFile.id,
          activeFile.content
        );
        if (updatedFile) {
          const updatedFiles = await firebaseFunctionService.files.getAll();
          setFiles(updatedFiles);
          setActiveFile(updatedFile);
        }
        setIsEditing(false);

        toast({
          title: "Success",
          description: "File saved successfully.",
        });
      } catch (error) {
        console.error("Error saving file:", error);
        toast({
          title: "Error",
          description: "Failed to save file. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRun = () => {
    // Simulate running the function
    console.log("Running function:", activeFile?.name);
  };

  const toggleFolder = async (folderId: string) => {
    try {
      // Toggle folder collapse using Firebase service
      const updatedFolder =
        await firebaseFunctionService.folders.toggleCollapse(folderId);
      if (updatedFolder) {
        const updatedFolders = await firebaseFunctionService.folders.getAll();
        setFolders(updatedFolders);
      }
    } catch (error) {
      console.error("Error toggling folder:", error);
    }
  };

  const handleFolderSelect = (folder: JSFolder) => {
    setSelectedFolder(folder);
    // Clear active file when selecting a folder
    setActiveFile(null);
  };

  const getFileIcon = () => {
    return <FileCode className="h-4 w-4 text-blue-500" />;
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Configure JavaScript validation
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Set compiler options for better JavaScript support
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ["node_modules/@types"],
    });
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">JS Files</h2>
              {selectedFolder && (
                <p className="text-xs text-blue-600 mt-1">
                  Selected: {selectedFolder.name}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant={selectedFolder ? "outline" : "secondary"}
                title={selectedFolder ? "New File" : "Select a folder first"}
                onClick={() => setIsCreateFileModalOpen(true)}
                disabled={!selectedFolder}
              >
                <FileCode className="h-4 w-4" />
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
              placeholder="Search files..."
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
                  Create a folder to get started
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
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {folder.isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                    <Folder className="h-4 w-4 text-gray-500" />
                    <span
                      className="text-sm font-medium text-gray-700 flex-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderSelect(folder);
                      }}
                    >
                      {folder.name}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {getFilesForFolder(folder.id).length}
                    </Badge>
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
                            {getFileIcon()}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium truncate ${
                                  file.isActive
                                    ? "text-blue-900"
                                    : "text-gray-900"
                                }`}
                              >
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Modified{" "}
                                {file.lastModified.toLocaleDateString()}
                              </p>
                            </div>
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
              <Code className="h-3 w-3" />
              <span>JavaScript</span>
            </div>
            <div className="mt-1">
              {allFiles.length === 0 ? "No files" : `${allFiles.length} files`}
            </div>
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
                    <p className="text-sm text-gray-500">
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
            <div className="flex-1 bg-gray-900 overflow-hidden">
              <Editor
                key={`${activeFile.id}-${isEditing}`}
                height="100%"
                defaultLanguage="javascript"
                value={activeFile.content}
                onChange={(value) => {
                  if (activeFile && value !== undefined) {
                    setActiveFile({
                      ...activeFile,
                      content: value,
                    });
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
                }}
              />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Code className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No file selected
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a file from the sidebar to view or edit its code.
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

      {/* Delete Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={deleteFolderModal.isOpen}
        onClose={() =>
          setDeleteFolderModal({ isOpen: false, folderId: "", folderName: "" })
        }
        onConfirm={() => handleDeleteFolder(deleteFolderModal.folderId)}
        title="Delete Folder"
        description="Are you sure you want to delete this folder? All files in it will also be deleted."
        itemName={deleteFolderModal.folderName}
        type="folder"
      />

      <ConfirmDeleteModal
        isOpen={deleteFileModal.isOpen}
        onClose={() =>
          setDeleteFileModal({ isOpen: false, fileId: "", fileName: "" })
        }
        onConfirm={() => handleDeleteFile(deleteFileModal.fileId)}
        title="Delete File"
        description="Are you sure you want to delete this file?"
        itemName={deleteFileModal.fileName}
        type="file"
      />
    </div>
  );
}
