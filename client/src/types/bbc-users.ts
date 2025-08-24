// ============================================================================
// BBC USER TYPES
// ============================================================================

export interface BBCUser {
  id: string;
  bbcId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date | any; // Firebase FieldValue
  updatedAt: Date | any; // Firebase FieldValue
}

// ============================================================================
// BBC USER FORM TYPES
// ============================================================================

export interface BBCUserFormData {
  firstName: string;
  lastName: string;
  email: string;
}

export interface BBCUserUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
}
