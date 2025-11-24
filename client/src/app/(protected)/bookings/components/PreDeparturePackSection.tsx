"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Trash2,
  Download,
  FileText,
  X,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  PreDeparturePack,
  TourPackageAssignment,
} from "@/types/pre-departure-pack";
import {
  getAllPreDeparturePacks,
  createPreDeparturePack,
  updatePackTourPackages,
  replacePackFile,
  deletePreDeparturePack,
} from "@/services/pre-departure-pack-service";
import { getTours } from "@/services/tours-service";
import { TourPackage } from "@/types/tours";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PreDeparturePackSection() {
  const { toast } = useToast();
  const [packs, setPacks] = useState<PreDeparturePack[]>([]);
  const [tourPackages, setTourPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create pack dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTourPackages, setSelectedTourPackages] = useState<
    TourPackageAssignment[]
  >([]);
  const [packDescription, setPackDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit pack dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<PreDeparturePack | null>(null);
  const [editSelectedTourPackages, setEditSelectedTourPackages] = useState<
    TourPackageAssignment[]
  >([]);
  const [updating, setUpdating] = useState(false);

  // Replace file dialog state
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replacingPack, setReplacingPack] = useState<PreDeparturePack | null>(
    null
  );
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);

  // Load tour packages
  useEffect(() => {
    loadTourPackages();
  }, []);

  // Real-time subscription to pre-departure packs
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "preDeparturePack"),
      (snapshot) => {
        const packsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PreDeparturePack[];

        // Sort by uploadedAt descending
        packsData.sort((a, b) => {
          const aTime = a.uploadedAt?.toMillis() || 0;
          const bTime = b.uploadedAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setPacks(packsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to pre-departure packs:", error);
        toast({
          title: "Error",
          description: "Failed to load pre-departure packs",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const loadTourPackages = async () => {
    try {
      const { tours } = await getTours({}, "name", "asc", 100);
      setTourPackages(tours);
    } catch (error) {
      console.error("Error loading tour packages:", error);
      toast({
        title: "Error",
        description: "Failed to load tour packages",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplaceFile(file);
    }
  };

  const addTourPackage = (tourPackageId: string) => {
    const tourPackage = tourPackages.find((tp) => tp.id === tourPackageId);
    if (!tourPackage) return;

    // Check if already added
    if (selectedTourPackages.some((tp) => tp.tourPackageId === tourPackageId)) {
      toast({
        title: "Already Added",
        description: "This tour package is already selected",
        variant: "destructive",
      });
      return;
    }

    setSelectedTourPackages([
      ...selectedTourPackages,
      {
        tourPackageId: tourPackage.id,
        tourPackageName: tourPackage.name,
      },
    ]);
  };

  const removeTourPackage = (tourPackageId: string) => {
    setSelectedTourPackages(
      selectedTourPackages.filter((tp) => tp.tourPackageId !== tourPackageId)
    );
  };

  const handleCreatePack = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (selectedTourPackages.length === 0) {
      toast({
        title: "No Tour Packages",
        description: "Please select at least one tour package",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      await createPreDeparturePack({
        tourPackages: selectedTourPackages,
        file: selectedFile,
        metadata: {
          description: packDescription,
        },
      });

      toast({
        title: "Success",
        description: "Pre-departure pack created successfully",
      });

      // Reset form
      setSelectedFile(null);
      setSelectedTourPackages([]);
      setPackDescription("");
      setCreateDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating pack:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pre-departure pack",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditPack = (pack: PreDeparturePack) => {
    setEditingPack(pack);
    setEditSelectedTourPackages([...pack.tourPackages]);
    setEditDialogOpen(true);
  };

  const addEditTourPackage = (tourPackageId: string) => {
    const tourPackage = tourPackages.find((tp) => tp.id === tourPackageId);
    if (!tourPackage) return;

    if (
      editSelectedTourPackages.some((tp) => tp.tourPackageId === tourPackageId)
    ) {
      toast({
        title: "Already Added",
        description: "This tour package is already selected",
        variant: "destructive",
      });
      return;
    }

    setEditSelectedTourPackages([
      ...editSelectedTourPackages,
      {
        tourPackageId: tourPackage.id,
        tourPackageName: tourPackage.name,
      },
    ]);
  };

  const removeEditTourPackage = (tourPackageId: string) => {
    setEditSelectedTourPackages(
      editSelectedTourPackages.filter(
        (tp) => tp.tourPackageId !== tourPackageId
      )
    );
  };

  const handleUpdatePackTourPackages = async () => {
    if (!editingPack) return;

    if (editSelectedTourPackages.length === 0) {
      toast({
        title: "No Tour Packages",
        description: "Please select at least one tour package",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      await updatePackTourPackages(editingPack.id, editSelectedTourPackages);

      toast({
        title: "Success",
        description: "Tour packages updated successfully",
      });

      setEditDialogOpen(false);
      setEditingPack(null);
    } catch (error: any) {
      console.error("Error updating tour packages:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tour packages",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleReplaceFile = (pack: PreDeparturePack) => {
    setReplacingPack(pack);
    setReplaceFile(null);
    setReplaceDialogOpen(true);
  };

  const handleConfirmReplaceFile = async () => {
    if (!replacingPack || !replaceFile) return;

    setReplacing(true);
    try {
      await replacePackFile(replacingPack.id, replaceFile);

      toast({
        title: "Success",
        description: "File replaced successfully",
      });

      setReplaceDialogOpen(false);
      setReplacingPack(null);
      setReplaceFile(null);
    } catch (error: any) {
      console.error("Error replacing file:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to replace file",
        variant: "destructive",
      });
    } finally {
      setReplacing(false);
    }
  };

  const handleDeletePack = async (pack: PreDeparturePack) => {
    if (!confirm(`Are you sure you want to delete "${pack.fileName}"?`)) {
      return;
    }

    try {
      await deletePreDeparturePack(pack.id);

      toast({
        title: "Success",
        description: "Pre-departure pack deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting pack:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete pre-departure pack",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredPacks = packs.filter((pack) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      pack.fileName.toLowerCase().includes(searchLower) ||
      pack.tourPackages.some((tp) =>
        tp.tourPackageName.toLowerCase().includes(searchLower)
      )
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Pre-departure Packs
          </h2>
          <p className="text-muted-foreground">
            Manage pre-departure pack files for tour packages
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Pack
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Pre-departure Pack</DialogTitle>
              <DialogDescription>
                Upload a file and assign it to tour packages
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name} (
                    {formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <Label>Tour Packages</Label>
                <Select onValueChange={addTourPackage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select tour packages..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tourPackages.map((tp) => (
                      <SelectItem key={tp.id} value={tp.id}>
                        {tp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTourPackages.map((tp) => (
                    <Badge key={tp.tourPackageId} variant="secondary">
                      {tp.tourPackageName}
                      <button
                        onClick={() => removeTourPackage(tp.tourPackageId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={packDescription}
                  onChange={(e) => setPackDescription(e.target.value)}
                  placeholder="Add a description for this pack..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePack} disabled={creating}>
                {creating ? "Uploading..." : "Upload Pack"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename or tour package..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Packs Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : filteredPacks.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pre-departure Packs</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "No packs match your search"
              : "Upload your first pack to get started"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Pack
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPacks.map((pack) => (
            <Card key={pack.id} className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium line-clamp-1">{pack.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(pack.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePack(pack)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Tour Packages
                </Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pack.tourPackages.map((tp) => (
                    <Badge
                      key={tp.tourPackageId}
                      variant="outline"
                      className="text-xs"
                    >
                      {tp.tourPackageName}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Uploaded {formatDate(pack.uploadedAt)}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(pack.fileDownloadURL, "_blank")}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPack(pack)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReplaceFile(pack)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Tour Packages Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tour Packages</DialogTitle>
            <DialogDescription>
              Update tour package assignments for {editingPack?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tour Packages</Label>
              <Select onValueChange={addEditTourPackage}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select tour packages..." />
                </SelectTrigger>
                <SelectContent>
                  {tourPackages.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>
                      {tp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {editSelectedTourPackages.map((tp) => (
                  <Badge key={tp.tourPackageId} variant="secondary">
                    {tp.tourPackageName}
                    <button
                      onClick={() => removeEditTourPackage(tp.tourPackageId)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePackTourPackages} disabled={updating}>
              {updating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace File Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace File</DialogTitle>
            <DialogDescription>
              Upload a new file to replace {replacingPack?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="replace-file">New File</Label>
              <Input
                id="replace-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={handleReplaceFileSelect}
                className="mt-1"
              />
              {replaceFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {replaceFile.name} (
                  {formatFileSize(replaceFile.size)})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplaceDialogOpen(false)}
              disabled={replacing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReplaceFile}
              disabled={replacing || !replaceFile}
            >
              {replacing ? "Replacing..." : "Replace File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
