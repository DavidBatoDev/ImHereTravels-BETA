export interface JSFile {
  id: string;
  name: string;
  lastModified: Date;
  content: string;
  isActive: boolean;
  folderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JSFolder {
  id: string;
  name: string;
  isCollapsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFileData {
  name: string;
  content: string;
  folderId: string;
  isActive?: boolean;
}

export interface CreateFolderData {
  name: string;
  isCollapsed?: boolean;
}

export interface UpdateFileData {
  name?: string;
  content?: string;
  folderId?: string;
  isActive?: boolean;
}

export interface UpdateFolderData {
  name?: string;
  isCollapsed?: boolean;
}
