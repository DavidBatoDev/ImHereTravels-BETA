// ============================================================================
// BCC USER TYPES
// ============================================================================

export interface BCCUser {
  id: string;
  bccId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date | any; // Firebase FieldValue
  updatedAt: Date | any; // Firebase FieldValue
}

// ============================================================================
// BCC USER FORM TYPES
// ============================================================================

export interface BCCUserFormData {
  firstName: string;
  lastName: string;
  email: string;
}

export interface BCCUserUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
}
