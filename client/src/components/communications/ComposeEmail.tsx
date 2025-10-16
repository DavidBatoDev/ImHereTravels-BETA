"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Image,
  Link,
  Smile,
  Send,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  MoreHorizontal,
} from "lucide-react";

interface ComposeEmailProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  replyToEmail?: any; // For reply/forward functionality
}

export function ComposeEmail({
  isOpen,
  onClose,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  replyToEmail,
}: ComposeEmailProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [body]);

  // Handle send email
  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      alert("Please fill in the recipient and subject fields.");
      return;
    }

    setIsSending(true);
    try {
      console.log("Sending email:", { to, cc, bcc, subject, body });

      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject: subject.trim(),
          body: body,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("Email sent successfully:", result.data);

        // Close compose window after sending
        onClose();

        // Reset form
        setTo("");
        setCc("");
        setBcc("");
        setSubject("");
        setBody("");
        setAttachments([]);
        setShowCc(false);
        setShowBcc(false);

        // Show success message (you could replace with a toast notification)
        alert("Email sent successfully!");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert(
        `Failed to send email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSending(false);
    }
  };

  // Handle file attachment
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 bg-white border border-gray-300 shadow-2xl rounded-t-lg ${
        isMaximized
          ? "inset-4"
          : isMinimized
          ? "bottom-0 right-12 w-80 h-12"
          : "bottom-0 right-12 w-[620px] h-[620px]"
      } ${isMinimized ? "overflow-hidden" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b rounded-t-lg border-gray-200">
        <div className="flex items-center gap-2 ">
          <span className="text-sm font-medium text-[#041e49]">
            {isMinimized ? `New Message - ${to || "Compose"}` : "New Message"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Minimize */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            <Minus className="w-4 h-4" />
          </Button>

          {/* Maximize/Restore */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content - Hidden when minimized */}
      {!isMinimized && (
        <div className="flex flex-col" style={{ height: "calc(100% - 60px)" }}>
          {/* Recipients */}
          <div className="px-4 py-2 space-y-1 flex-shrink-0">
            {/* To field */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-1 group">
              <label className="text-sm text-gray-600 w-4 flex-shrink-0 hidden group-focus-within:block">
                To
              </label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipients"
                className="flex-1 border-none shadow-none focus:ring-0 px-0 bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-6 text-sm"
                style={{ outline: "none", boxShadow: "none" }}
              />
              <div className="flex items-center gap-2">
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* CC field */}
            {showCc && (
              <div className="flex items-center gap-2 border-b border-gray-200 pb-1 group">
                <label className="text-xs text-gray-600 w-8 flex-shrink-0 hidden group-focus-within:block">
                  Cc
                </label>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Carbon copy"
                  className="flex-1 border-none shadow-none focus:ring-0 px-0 bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-6 text-sm"
                  style={{ outline: "none", boxShadow: "none" }}
                />
              </div>
            )}

            {/* BCC field */}
            {showBcc && (
              <div className="flex items-center gap-2 border-b border-gray-200 pb-1 group">
                <label className="text-xs text-gray-600 w-8 flex-shrink-0 hidden group-focus-within:block">
                  Bcc
                </label>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Blind carbon copy"
                  className="flex-1 border-none shadow-none focus:ring-0 px-0 bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-6 text-sm"
                  style={{ outline: "none", boxShadow: "none" }}
                />
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-2 border-b py-2 border-gray-200 pb-1">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 border-none shadow-none focus:ring-0 px-0 font-medium bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-6 text-sm"
                style={{ outline: "none", boxShadow: "none" }}
              />
            </div>
          </div>

          {/* Rich Text Editor Container */}
          <div
            className="flex-1 mb-2 overflow-y-auto bg-white flex flex-col"
            style={{ height: "250px" }}
          >
            {/* Message Body */}
            <div className="flex-1 p-4 min-h-0">
              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Compose your message..."
                className="w-full h-full border-none shadow-none resize-none focus:ring-0 p-0 bg-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{
                  minHeight: "150px",
                  outline: "none",
                  boxShadow: "none",
                }}
              />
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 flex-shrink-0">
              <div className="text-xs text-gray-600 mb-2">Attachments:</div>
              <div className="space-y-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="h-6 w-6 p-0 hover:bg-red-50"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex mb-2 items-center bg-slate-100 gap-1 mx-3 px-2 py-2 border-b border-gray-200 rounded-3xl flex-shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Underline className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <List className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smile className="w-4 h-4" />
            </Button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0 mt-auto">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSend}
                disabled={isSending || !to.trim() || !subject.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {isSending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send
                  </div>
                )}
              </Button>

              <Button variant="ghost" size="sm" className="text-gray-600">
                <Paperclip className="w-4 h-4 mr-1" />
                Attach
              </Button>
            </div>

            <Button variant="ghost" size="sm" className="text-gray-600">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
