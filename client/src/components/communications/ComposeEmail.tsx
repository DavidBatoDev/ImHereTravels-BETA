"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline as UnderlineExtension } from "@tiptap/extension-underline";
import { Extension } from "@tiptap/core";
import "@/styles/tiptap.css";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  MoreHorizontal,
} from "lucide-react";
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

  // Custom FontSize extension
  const FontSize = Extension.create({
    name: "fontSize",

    addGlobalAttributes() {
      return [
        {
          types: ["textStyle"],
          attributes: {
            fontSize: {
              default: null,
              parseHTML: (element) => element.style.fontSize?.replace("px", ""),
              renderHTML: (attributes) => {
                if (!attributes.fontSize) {
                  return {};
                }
                return {
                  style: `font-size: ${attributes.fontSize}px`,
                };
              },
            },
          },
        },
      ];
    },

    addCommands() {
      return {
        setFontSize:
          (fontSize: string) =>
          ({ chain }) => {
            return chain().setMark("textStyle", { fontSize }).run();
          },
        unsetFontSize:
          () =>
          ({ chain }) => {
            return chain()
              .setMark("textStyle", { fontSize: null })
              .removeEmptyTextStyle()
              .run();
          },
      };
    },
  });

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

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Compose your message...",
      }),
      TextStyle,
      FontSize,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      Color.configure({
        types: ["textStyle"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      UnderlineExtension,
    ],
    content: initialBody,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setBody(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "max-w-none focus:outline-none min-h-[150px] p-4 text-sm leading-relaxed",
        style:
          "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
      },
    },
  });

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
      className={`fixed z-50 bg-white border border-gray-300 shadow-2xl rounded-t-lg transition-all duration-500 ease-out ${
        isMaximized
          ? "top-12 left-20 right-20 bottom-12"
          : isMinimized
          ? "bottom-0 right-12 w-80 h-12"
          : "bottom-0 right-12 w-[620px] h-[620px]"
      } ${isMinimized ? "overflow-hidden" : ""}`}
      style={{
        transitionProperty: "top, left, right, bottom, width, height, opacity",
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
          height: isMinimized ? "0px" : "calc(100% - 60px)",
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
            <EditorContent
              editor={editor}
              className="h-full w-full"
              style={{
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            />
          </div>

          {/* Enhanced Formatting Toolbar */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 flex-wrap rounded-3xl mx-3">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
            >
              <MdUndo className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
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
                        editor?.chain().focus().setFontFamily(font.value).run();
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
                        editor
                          ?.chain()
                          .focus()
                          .setFontSize(size.toString())
                          .run();
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
              className={`h-8 w-8 p-0 ${
                editor?.isActive("bold") ? "tiptap-button-active" : ""
              }`}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <MdFormatBold className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${
                editor?.isActive("italic") ? "bg-gray-200" : ""
              }`}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <MdFormatItalic className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${
                editor?.isActive("underline") ? "bg-gray-200" : ""
              }`}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
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
                            editor?.chain().focus().setColor(color).run();
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
                            editor
                              ?.chain()
                              .focus()
                              .setHighlight({ color })
                              .run();
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
                      editor?.chain().focus().setTextAlign("left").run();
                      setShowAlignMenu(false);
                    }}
                  >
                    <MdFormatAlignLeft className="w-5 h-5 font-bold" />
                    Left
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      editor?.chain().focus().setTextAlign("center").run();
                      setShowAlignMenu(false);
                    }}
                  >
                    <MdFormatAlignCenter className="w-5 h-5 font-bold" />
                    Center
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      editor?.chain().focus().setTextAlign("right").run();
                      setShowAlignMenu(false);
                    }}
                  >
                    <MdFormatAlignRight className="w-5 h-5 font-bold" />
                    Right
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                    onClick={() => {
                      editor?.chain().focus().setTextAlign("justify").run();
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
              className={`h-8 w-8 p-0 ${
                editor?.isActive("bulletList") ? "bg-gray-200" : ""
              }`}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <MdFormatListBulleted className="w-5 h-5 font-bold" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${
                editor?.isActive("orderedList") ? "bg-gray-200" : ""
              }`}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <MdFormatListNumbered className="w-5 h-5 font-bold" />
            </Button>
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
  );
}
