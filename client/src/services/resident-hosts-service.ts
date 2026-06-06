import { auth } from "@/lib/firebase";
import {
  ResidentHost,
  ResidentHostFormData,
  ResidentHostStatus,
} from "@/types/resident-hosts";

const API_BASE = "/api/resident-hosts";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to manage resident hosts");
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

// ============================================================================
// CREATE
// ============================================================================

export async function createResidentHost(
  data: ResidentHostFormData,
): Promise<string> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to create resident host");
    }

    console.log(`✅ Created resident host with ID: ${result.hostId}`);
    return result.hostId;
  } catch (error) {
    console.error("Error creating resident host:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to create resident host",
    );
  }
}

// ============================================================================
// READ
// ============================================================================

export async function getAllResidentHosts(): Promise<ResidentHost[]> {
  try {
    const response = await fetch(`${API_BASE}?limit=1000`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to fetch resident hosts");
    }

    return data.hosts;
  } catch (error) {
    console.error("Error getting resident hosts:", error);
    throw new Error("Failed to fetch resident hosts");
  }
}

export async function getResidentHostById(
  id: string,
): Promise<ResidentHost | null> {
  try {
    const response = await fetch(`${API_BASE}/${id}`);

    if (response.status === 404) {
      return null;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to fetch resident host");
    }

    return data.host;
  } catch (error) {
    console.error("Error getting resident host:", error);
    throw new Error("Failed to fetch resident host");
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateResidentHost(
  id: string,
  updates: Partial<ResidentHostFormData>,
): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to update resident host");
    }

    console.log(`✅ Updated resident host ${id}`);
  } catch (error) {
    console.error("Error updating resident host:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update resident host",
    );
  }
}

export async function updateResidentHostStatus(
  id: string,
  status: ResidentHostStatus,
): Promise<void> {
  await updateResidentHost(id, { status });
}

// Soft delete — mark as archived instead of deleting.
export async function archiveResidentHost(id: string): Promise<void> {
  await updateResidentHost(id, { status: "archived" });
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteResidentHost(id: string): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to delete resident host");
    }

    console.log(`✅ Deleted resident host ${id}`);
  } catch (error) {
    console.error("Error deleting resident host:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to delete resident host",
    );
  }
}
