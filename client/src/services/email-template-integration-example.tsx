import React, { useState, useEffect } from "react";
import { useAuth } from "@/store/auth-store"; // Assuming you have an auth store
import EmailTemplateService from "./email-template-service";
import {
  CommunicationTemplate,
  TemplateType,
  TemplateStatus,
} from "@/types/communications";

/**
 * Example component showing how to integrate EmailTemplateService
 * with your existing TemplateDialog and CommunicationsCenter components
 */

export function EmailTemplateIntegrationExample() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates on component mount
  useEffect(() => {
    if (user?.uid) {
      loadTemplates();
    }
  }, [user?.uid]);

  // Real-time subscription to template updates
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = EmailTemplateService.subscribeToTemplates(
      (updatedTemplates) => {
        setTemplates(updatedTemplates);
      },
      {
        filters: { createdBy: user.uid },
        sortBy: "metadata.updatedAt",
        sortOrder: "desc",
        limit: 50,
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await EmailTemplateService.getTemplates({
        filters: { createdBy: user?.uid },
        sortBy: "metadata.updatedAt",
        sortOrder: "desc",
        limit: 50,
      });

      setTemplates(result.templates);
    } catch (error) {
      console.error("Failed to load templates:", error);
      setError("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (
    templateData: Omit<CommunicationTemplate, "id">
  ) => {
    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const newTemplateId = await EmailTemplateService.createTemplate(
        {
          type: templateData.type,
          name: templateData.name,
          subject: templateData.subject,
          content: templateData.content,
          variables: templateData.variables,
          status: templateData.status,
        },
        user.uid
      );

      console.log("Template created successfully:", newTemplateId);

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to create template:", error);
      setError("Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTemplate = async (templateData: CommunicationTemplate) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.updateTemplate({
        id: templateData.id,
        name: templateData.name,
        subject: templateData.subject,
        content: templateData.content,
        status: templateData.status,
        variables: templateData.variables,
      });

      console.log("Template updated successfully");

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to update template:", error);
      setError("Failed to update template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.deleteTemplate(templateId);
      console.log("Template deleted successfully");

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to delete template:", error);
      setError("Failed to delete template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateTemplate = async (template: CommunicationTemplate) => {
    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const newTemplateId = await EmailTemplateService.duplicateTemplate(
        template.id,
        user.uid
      );

      console.log("Template duplicated successfully:", newTemplateId);

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      setError("Failed to duplicate template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveTemplate = async (templateId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.archiveTemplate(templateId);
      console.log("Template archived successfully");

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to archive template:", error);
      setError("Failed to archive template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdateStatus = async (
    templateIds: string[],
    status: TemplateStatus
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.bulkUpdateStatus(templateIds, status);
      console.log(
        `Bulk status update completed for ${templateIds.length} templates`
      );

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to bulk update status:", error);
      setError("Failed to bulk update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStats = async () => {
    try {
      const stats = await EmailTemplateService.getTemplateStats();
      console.log("Template statistics:", stats);

      // You can use these stats to update your UI
      return stats;
    } catch (error) {
      console.error("Failed to get template stats:", error);
      setError("Failed to get template statistics");
      return null;
    }
  };

  // Example of how to integrate with your existing components
  const renderTemplateDialog = () => {
    // This would be your existing TemplateDialog component
    // You would pass these handlers to it
    return (
      <div>
        {/* Your TemplateDialog component would go here */}
        {/* Pass the handlers: handleCreateTemplate, handleUpdateTemplate */}
      </div>
    );
  };

  const renderCommunicationsCenter = () => {
    // This would be your existing CommunicationsCenter component
    // You would pass these handlers to it
    return (
      <div>
        {/* Your CommunicationsCenter component would go here */}
        {/* Pass the handlers: handleDeleteTemplate, handleDuplicateTemplate, etc. */}
      </div>
    );
  };

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <button onClick={loadTemplates}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Email Template Integration Example</h1>

      {/* Display templates count */}
      <div>
        <h2>Your Templates ({templates.length})</h2>
        <button onClick={handleGetStats}>Get Statistics</button>
      </div>

      {/* Display templates */}
      <div>
        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              border: "1px solid #ccc",
              margin: "10px",
              padding: "10px",
            }}
          >
            <h3>{template.name}</h3>
            <p>Type: {template.type}</p>
            <p>Status: {template.status}</p>
            <p>Subject: {template.subject}</p>
            <p>Variables: {template.variables.length}</p>
            <p>Used: {template.metadata?.usedCount || 0} times</p>

            <div>
              <button onClick={() => handleUpdateTemplate(template)}>
                Edit
              </button>
              <button onClick={() => handleDuplicateTemplate(template)}>
                Duplicate
              </button>
              <button onClick={() => handleArchiveTemplate(template.id)}>
                Archive
              </button>
              <button onClick={() => handleDeleteTemplate(template.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Example of bulk operations */}
      <div>
        <h3>Bulk Operations</h3>
        <button
          onClick={() => {
            const activeTemplateIds = templates
              .filter((t) => t.status === "active")
              .map((t) => t.id);
            handleBulkUpdateStatus(activeTemplateIds, "archived");
          }}
        >
          Archive All Active Templates
        </button>
      </div>

      {/* Render your existing components */}
      {renderTemplateDialog()}
      {renderCommunicationsCenter()}
    </div>
  );
}

/**
 * Hook for using email templates in your components
 */
export function useEmailTemplates(userId?: string) {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = EmailTemplateService.subscribeToTemplates(
      (updatedTemplates) => {
        setTemplates(updatedTemplates);
      },
      {
        filters: { createdBy: userId },
        sortBy: "metadata.updatedAt",
        sortOrder: "desc",
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const createTemplate = async (
    data: Omit<CommunicationTemplate, "id">,
    userId: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const templateId = await EmailTemplateService.createTemplate(
        data,
        userId
      );
      return templateId;
    } catch (error) {
      setError("Failed to create template");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplate = async (
    data: Partial<CommunicationTemplate> & { id: string }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.updateTemplate(data);
    } catch (error) {
      setError("Failed to update template");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.deleteTemplate(id);
    } catch (error) {
      setError("Failed to delete template");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refresh: () => {
      // Templates are automatically updated via real-time subscription
    },
  };
}

export default EmailTemplateIntegrationExample;
