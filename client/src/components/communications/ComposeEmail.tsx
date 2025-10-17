"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DOMPurify from "dompurify";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  MoreHorizontal,
} from "lucide-react";

// Email signature HTML - Updated to match Gmail exactly
const EMAIL_SIGNATURE = `<div><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><div style="color:rgb(34,34,34)">Kind regards,&nbsp;</div><div style="color:rgb(34,34,34)"><br><div dir="ltr"><div dir="ltr"><span style="color:rgb(0,0,0)"><div dir="ltr" align="left" style="margin-left:0pt"><div align="left" style="margin-left:0pt"><div dir="ltr" align="left" style="margin-left:0pt"><table style="border:medium;border-collapse:collapse"><tbody><tr style="height:0pt"><td style="vertical-align:top;overflow:hidden"><span style="border:medium;display:inline-block;overflow:hidden;width:174px;height:174px"><img src="https://lh7-us.googleusercontent.com/W6PhRjN5UgrDp-2PibTWmAYHg_SMqQaitD63npeRzqu7Iy1QmjB1VgUSpwaWvQhYnFlJqgYh9t22O5zPUO3Rgf5oDc2urjsnba2jg8npqDf9GZGwL5hctWavIuDW95fdPYncuhBpvnRI8TZmjKhc5LM" width="167" height="167" style="margin-left: 0px; margin-top: 0px; margin-right: 0px;"></span><br></td><td style="vertical-align:top;overflow:hidden"><span style="font-family:&quot;DM Sans&quot;,sans-serif;font-size:12pt;font-weight:700">Bella Millan</span><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline">Outreach Manager</span></p><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline"><br></span></p><p dir="ltr" style="line-height:1;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline">&nbsp;&nbsp;<img src="https://ci3.googleusercontent.com/mail-sig/AIorK4xZqel1TeaN_XwhPphMi6LJk9bDE5tvQjKoqr8WZjpwZLfrkzJuGw9keRgg_Q6x7brg_L9A2pU" width="17" height="17" style="margin-right:0px">&nbsp;&nbsp;</span><a href="tel:639163041767" style="color:rgb(17,85,204)" target="_blank"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline;color:rgb(0,0,0)">+63 (916) 304 1767</span></a></p><p dir="ltr" style="line-height:1;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline">&nbsp;&nbsp;<img src="https://ci3.googleusercontent.com/mail-sig/AIorK4y5FclvwPG32SXqPSvbPd3beA1UB8Wx1dgwaJEcdWLwxjh1yRwhc2_GSpCg0zBpgiWvz9eb4eo">&nbsp; bella</span><a href="mailto:amer@imheretravels.com" style="color:rgb(17,85,204)" target="_blank"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline;color:rgb(0,0,0)">@imheretravels.com</span></a></p><p dir="ltr" style="line-height:1;margin-top:0pt;margin-bottom:0pt"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline">&nbsp;<a href="https://imheretravels.com/" style="color:rgb(17,85,204)" target="_blank">&nbsp;</a></span><img src="https://ci3.googleusercontent.com/mail-sig/AIorK4w81hW7M7z1ED8dHl5gyqSEylE_boBaxtpdxOxm_eOviPDAVjKkznVaFTCzCV8t_YYy7A_2sns"><a href="https://imheretravels.com/" style="color:rgb(17,85,204)" target="_blank"><span style="font-size:11pt;font-family:Arial,sans-serif;vertical-align:baseline;color:rgb(0,0,0)">&nbsp; www.imheretravels.com</span></a></p><p dir="ltr" style="line-height:0.9;margin-top:0pt;margin-bottom:0pt"><br></p>&nbsp;&nbsp;<a href="https://www.instagram.com/imheretravels/" style="color:rgb(17,85,204)" target="_blank"><img src="https://ci3.googleusercontent.com/mail-sig/AIorK4xLX1jMZKunN4wNGSCmIVUjCQgc1_FpjHTBZnn_GD9YIv0Q-aBxP4Iy7Rh_a7iBZeNGFqJnSUI" width="26" height="26" style="margin-right:0px"></a>&nbsp;&nbsp;<a href="https://www.tiktok.com/@imheretravels" style="color:rgb(17,85,204)" target="_blank"><img alt="https://www.tiktok.com/@imheretravels" src="https://ci3.googleusercontent.com/mail-sig/AIorK4yNZvr_t6SSKB69FIelx0LaypIom57zAMKJhGe2q8iNg3WK5gP2cxCXL_mtZOoe5gXiq2hG97g" width="25" height="25" style="margin-right:0px"></a>&nbsp;&nbsp;<a href="https://www.facebook.com/profile.php?id=100089932897402" style="color:rgb(17,85,204)" target="_blank"><img alt="https://www.facebook.com/profile.php?id=100089932897402" src="https://ci3.googleusercontent.com/mail-sig/AIorK4wOueqr6zk98SKG_4lWhrPrRcAuBBs2oDMmoGQbRH0ZhSmkhOaIOHB0oXXMYRky6QC2bA6dNQA" width="27" height="27" style="margin-right:0px"></a>&nbsp;&nbsp;<a href="http://www.imheretravels.com/" style="color:rgb(17,85,204)" target="_blank"><img alt="www.imheretravels.com" src="https://ci3.googleusercontent.com/mail-sig/AIorK4yYRJk1jr5S9TPJLoy2n2NotCbk7ihIfpokipZTmDFVi1R9s1wE3ykm_O4djLbzMvl9b99idZY" width="27" height="27" style="margin-right:0px"></a></td></tr></tbody></table></div></div></div></span></div></div></div></div></div></div>`;
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdUndo,
  MdRedo,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdFormatAlignJustify,
  MdExpandMore,
  MdPalette,
  MdTextFields,
} from "react-icons/md";

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
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState("14");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Font and style options
  const fontFamilies = [
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Times New Roman", value: "Times New Roman, serif" },
    { label: "Helvetica", value: "Helvetica, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Courier New", value: "Courier New, monospace" },
    { label: "Verdana", value: "Verdana, sans-serif" },
  ];

  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

  // Gmail-like execCommand functions
  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setBody(html);
    }
  };

  const textColors = [
    "#000000",
    "#333333",
    "#666666",
    "#999999",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
  ];

  const highlightColors = [
    "#FFFF00",
    "#00FF00",
    "#00FFFF",
    "#FF00FF",
    "#FFA500",
    "#FF0000",
    "#0000FF",
    "#800080",
  ];

  // Set initial content with signature
  useEffect(() => {
    if (editorRef.current) {
      const content = initialBody
        ? initialBody + EMAIL_SIGNATURE
        : EMAIL_SIGNATURE;

      // Preprocess HTML with DOMPurify to allow inline styles
      const cleanHTML = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          "div",
          "span",
          "p",
          "b",
          "i",
          "u",
          "br",
          "strong",
          "em",
          "a",
          "img",
          "table",
          "tr",
          "td",
          "tbody",
          "thead",
          "tfoot",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
        ],
        ALLOWED_ATTR: [
          "style",
          "class",
          "dir",
          "align",
          "href",
          "src",
          "alt",
          "width",
          "height",
          "data-smartmail",
        ],
        ALLOW_DATA_ATTR: true,
      });

      editorRef.current.innerHTML = cleanHTML;
      setBody(cleanHTML);
    }
  }, [initialBody]);

  // Handle clicks outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".relative")) {
        setShowFontMenu(false);
        setShowSizeMenu(false);
        setShowColorMenu(false);
        setShowAlignMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle send email
  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      alert("Please fill in the recipient and subject fields.");
      return;
    }

    setIsSending(true);
    try {
      console.log("Sending email:", {
        to,
        cc,
        bcc,
        subject,
        body,
      });

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
        setBody(EMAIL_SIGNATURE);
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
    <>
      {/* Gmail Signature Styles */}
      <style jsx global>{`
        /* Target the contentEditable div directly */
        [contenteditable="true"] {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif !important;
        }

        /* Gmail signature styling - more specific selectors */
        [contenteditable="true"] div[style*="color:rgb(34,34,34)"] {
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: small !important;
          color: rgb(34, 34, 34) !important;
          white-space-collapse: collapse !important;
        }

        [contenteditable="true"] div[dir="ltr"] {
          direction: ltr !important;
        }

        [contenteditable="true"] div[align="left"] {
          text-align: left !important;
        }

        [contenteditable="true"] table {
          border-collapse: collapse !important;
          border: medium !important;
          width: auto !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        [contenteditable="true"] td {
          vertical-align: top !important;
          padding: 2 !important;
          border: none !important;
          margin: 0px !important;
        }

        [contenteditable="true"] span[style*="display:inline-block"] {
          display: inline-block !important;
          border: medium !important;
          overflow: hidden !important;
        }

        /* Images inline for icon rows like Gmail */
        [contenteditable="true"] img {
          display: inline-block !important;
          max-width: 100% !important;
          height: auto !important;
          border: none !important;
        }
        /* Ensure social icons sit on a single row */
        [contenteditable="true"] a img {
          vertical-align: middle !important;
          margin-right: 8px !important;
        }

        /* Remove default underline from links to match Gmail compose */
        [contenteditable="true"] a {
          text-decoration: none !important;
        }
        [contenteditable="true"] a:hover {
          text-decoration: underline !important;
        }

        [contenteditable="true"] a {
          color: rgb(17, 85, 204) !important;
          text-decoration: none !important;
        }

        [contenteditable="true"] a:hover {
          text-decoration: underline !important;
        }

        [contenteditable="true"] p {
          line-height: 1.2 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Specific height for contact info paragraphs */
        [contenteditable="true"] p[style*="line-height:1"] {
          height: 25px !important;
          line-height: 1 !important;
          display: flex !important;
          align-items: center !important;
        }

        /* Empty paragraphs should be 17px */
        [contenteditable="true"] p:empty {
          height: 17px !important;
        }

        [contenteditable="true"] span {
          display: inline !important;
        }

        [contenteditable="true"] div {
          display: block !important;
        }

        /* Preserve original font families from inline styles */
        [contenteditable="true"] span[style*="font-family"] {
          font-family: inherit !important;
        }

        [contenteditable="true"] p[style*="font-family"] {
          font-family: inherit !important;
        }

        /* Fix border styles that get normalized by browser */
        [contenteditable="true"] table[style*="border-width: medium"] {
          border: medium !important;
        }

        [contenteditable="true"] span[style*="border-width: medium"] {
          border: medium !important;
        }

        /* Ensure proper spacing and alignment */
        [contenteditable="true"] [dir="ltr"] {
          direction: ltr !important;
          text-align: left !important;
        }

        [contenteditable="true"] [align="left"] {
          text-align: left !important;
        }

        /* Override browser normalization of border styles */
        [contenteditable="true"] *[style*="border-width: medium"] {
          border: medium !important;
        }

        [contenteditable="true"] *[style*="border-style: initial"] {
          border-style: solid !important;
        }

        [contenteditable="true"] *[style*="border-color: initial"] {
          border-color: initial !important;
        }
      `}</style>

      <div
        className={`fixed z-50 bg-white border border-gray-300 shadow-2xl rounded-t-lg transition-all duration-500 ease-out ${
          isMaximized
            ? "top-12 left-20 right-20 bottom-12"
            : isMinimized
            ? "bottom-0 right-12 w-80 h-12"
            : "bottom-0 right-12 w-[620px] h-[620px]"
        } ${isMinimized ? "overflow-hidden" : ""}`}
        style={{
          transitionProperty:
            "top, left, right, bottom, width, height, opacity",
          transitionDuration: "500ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
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
        <div
          className={`flex flex-col transition-all duration-500 ease-out ${
            isMinimized ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          style={{
            height: isMinimized ? "0px" : "calc(100%)",
            overflow: isMinimized ? "hidden" : "visible",
            transitionProperty: "height, opacity",
            transitionDuration: "500ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
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
            className="flex-1 mb-2 overflow-y-auto bg-white flex flex-col rounded-lg"
            style={{ height: "250px" }}
          >
            {/* Message Body */}
            <div className="flex-1 min-h-0">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                className="h-full w-full p-4 text-sm leading-relaxed focus:outline-none gmail-email-content"
                style={{
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  minHeight: "150px",
                  whiteSpace: "pre-wrap",
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

          {/* Enhanced Formatting Toolbar */}
          <div className="mb-2 flex items-center gap-1 p-1 bg-slate-100 flex-wrap rounded-3xl mx-3">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("undo")}
            >
              <MdUndo className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("redo")}
            >
              <MdRedo className="w-5 h-5 font-bold" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Font Family Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 flex items-center gap-1"
                onClick={() => setShowFontMenu(!showFontMenu)}
              >
                <MdTextFields className="w-5 h-5 font-bold" />
                <MdExpandMore className="w-4 h-4 font-bold" />
              </Button>
              {showFontMenu && (
                <div className="absolute bottom-9 left-0 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[160px]">
                  {fontFamilies.map((font) => (
                    <button
                      key={font.value}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      style={{ fontFamily: font.value }}
                      onClick={() => {
                        execCommand("fontName", font.value);
                        setShowFontMenu(false);
                      }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Font Size Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 flex items-center gap-1"
                onClick={() => setShowSizeMenu(!showSizeMenu)}
              >
                <span className="text-xs">{currentFontSize}</span>
                <MdExpandMore className="w-4 h-4 font-bold" />
              </Button>
              {showSizeMenu && (
                <div className="absolute bottom-9 left-0 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[80px]">
                  {fontSizes.map((size) => (
                    <button
                      key={size}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      onClick={() => {
                        execCommand("fontSize", size.toString());
                        setCurrentFontSize(size.toString());
                        setShowSizeMenu(false);
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Bold, Italic, Underline */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("bold")}
            >
              <MdFormatBold className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("italic")}
            >
              <MdFormatItalic className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("underline")}
            >
              <MdFormatUnderlined className="w-5 h-5 font-bold" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Color Picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 flex items-center gap-1"
                onClick={() => setShowColorMenu(!showColorMenu)}
              >
                <MdPalette className="w-5 h-5 font-bold" />
                <MdExpandMore className="w-4 h-4 font-bold" />
              </Button>
              {showColorMenu && (
                <div className="absolute bottom-9 left-0 bg-white border border-gray-200 rounded shadow-lg z-50 p-3 min-w-[220px]">
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Text Color
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {textColors.map((color) => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            execCommand("foreColor", color);
                            setShowColorMenu(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Background Color
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {highlightColors.map((color) => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            execCommand("backColor", color);
                            setShowColorMenu(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alignment Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 flex items-center gap-1"
                onClick={() => setShowAlignMenu(!showAlignMenu)}
              >
                <MdFormatAlignLeft className="w-5 h-5 font-bold" />
                <MdExpandMore className="w-4 h-4 font-bold" />
              </Button>
              {showAlignMenu && (
                <div className="absolute bottom-9 left-0 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[130px]">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      execCommand("justifyLeft");
                      setShowAlignMenu(false);
                    }}
                  >
                    <MdFormatAlignLeft className="w-5 h-5 font-bold" />
                    Left
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      execCommand("justifyCenter");
                      setShowAlignMenu(false);
                    }}
                  >
                    <MdFormatAlignCenter className="w-5 h-5 font-bold" />
                    Center
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      execCommand("justifyRight");
                      setShowAlignMenu(false);
                    }}
                  >
                    <MdFormatAlignRight className="w-5 h-5 font-bold" />
                    Right
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      execCommand("justifyFull");
                      setShowAlignMenu(false);
                    }}
                  >
                    <MdFormatAlignJustify className="w-5 h-5 font-bold" />
                    Justify
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Lists */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("insertUnorderedList")}
            >
              <MdFormatListBulleted className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("insertOrderedList")}
            >
              <MdFormatListNumbered className="w-5 h-5 font-bold" />
            </Button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-1 border-t border-gray-200 bg-gray-50 flex-shrink-0 mt-auto">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSend}
                disabled={isSending || !to.trim() || !subject.trim()}
                className="bg-[#0b57d0] rounded-3xl  hover:bg-blue-700 text-white px-6"
              >
                {isSending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-centergap-2">Send</div>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-1" />
                Attach
              </Button>
            </div>

            <Button variant="ghost" size="sm" className="text-gray-600">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </>
  );
}
