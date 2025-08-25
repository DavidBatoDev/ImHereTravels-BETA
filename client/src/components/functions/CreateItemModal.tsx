"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Folder, FileCode } from "lucide-react";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  type: "folder" | "file";
  selectedFolderName?: string;
}

export default function CreateItemModal({
  isOpen,
  onClose,
  onSubmit,
  type,
  selectedFolderName,
}: CreateItemModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      handleClose();
    } catch (error) {
      console.error("Error creating item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setIsSubmitting(false);
    onClose();
  };

  const getTitle = () => {
    return type === "folder" ? "Create New Folder" : "Create New File";
  };

  const getDescription = () => {
    if (type === "folder") {
      return "Enter a name for your new folder.";
    }
    return `Enter a name for your new JavaScript file. It will be created in "${selectedFolderName}".`;
  };

  const getIcon = () => {
    return type === "folder" ? (
      <Folder className="h-5 w-5 text-blue-500" />
    ) : (
      <FileCode className="h-5 w-5 text-green-500" />
    );
  };

  const getPlaceholder = () => {
    return type === "folder" ? "e.g., My Functions" : "e.g., newFile.js";
  };

  const validateName = (value: string) => {
    if (type === "file" && !value.endsWith(".js")) {
      return "File name must end with .js";
    }
    if (value.length < 1) {
      return "Name is required";
    }
    if (value.length > 50) {
      return "Name must be less than 50 characters";
    }
    return null;
  };

  const error = validateName(name);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {type === "folder" ? "Folder Name" : "File Name"}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={getPlaceholder()}
                autoFocus
                className={error ? "border-red-500" : ""}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !!error || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
