"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatListBulleted,
  MdFormatListNumbered,
} from "react-icons/md";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LateFeeNoticeComposerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termLabel?: string;
  recipient: string;
  initialSubject: string;
  initialHtmlContent: string;
  isSending: boolean;
  onSend: (payload: { subject: string; htmlContent: string }) => Promise<void>;
};

const EMAIL_ALLOWED_TAGS = [
  "style",
  "meta",
  "title",
  "link",
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
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "hr",
];

const EMAIL_ALLOWED_ATTRS = [
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
  "cellpadding",
  "cellspacing",
  "border",
  "colspan",
  "rowspan",
  "rel",
  "target",
  "content",
  "http-equiv",
  "name",
];

function sanitizeEmailHtml(html: string): string {
  if (!html) return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    doc.querySelectorAll("script, iframe, object, embed").forEach((node) => {
      node.remove();
    });

    doc.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || "";

        if (!EMAIL_ALLOWED_ATTRS.includes(name) && !name.startsWith("data-")) {
          element.removeAttribute(attr.name);
          return;
        }

        if (name.startsWith("on")) {
          element.removeAttribute(attr.name);
          return;
        }

        if (
          (name === "href" || name === "src") &&
          /^\s*javascript:/i.test(value)
        ) {
          element.removeAttribute(attr.name);
          return;
        }

        if (name === "style" && /expression\s*\(|javascript:/i.test(value)) {
          element.removeAttribute(attr.name);
        }
      });

      const tagName = element.tagName.toLowerCase();
      if (!EMAIL_ALLOWED_TAGS.includes(tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
      }
    });

    return doc.body.innerHTML || "";
  } catch {
    return html;
  }
}

function extractTemplateParts(html: string): {
  styleBlocks: string;
  bodyHtml: string;
} {
  if (!html) {
    return {
      styleBlocks: "",
      bodyHtml: "",
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const styleBlocks = Array.from(doc.head.querySelectorAll("style"))
      .map((node) => node.outerHTML)
      .join("\n");

    const bodyHtml = doc.body?.innerHTML || html;

    return {
      styleBlocks,
      bodyHtml,
    };
  } catch {
    return {
      styleBlocks: "",
      bodyHtml: html,
    };
  }
}

function hasVisibleEditorContent(html: string): boolean {
  if (!html || !html.trim()) return false;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    if (!root) return false;

    if ((root.textContent || "").trim().length > 0) {
      return true;
    }

    return Boolean(
      root.querySelector(
        "img,table,hr,ul,ol,li,p,div,span,a,br,strong,em,b,i,u,h1,h2,h3,h4,h5,h6",
      ),
    );
  } catch {
    return html.trim().length > 0;
  }
}

export default function LateFeeNoticeComposerModal({
  open,
  onOpenChange,
  termLabel,
  recipient,
  initialSubject,
  initialHtmlContent,
  isSending,
  onSend,
}: LateFeeNoticeComposerModalProps) {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [templateStyleBlocks, setTemplateStyleBlocks] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const syncEditorStateFromDom = useCallback(() => {
    if (!editorRef.current) return;

    const extracted = extractTemplateParts(editorRef.current.innerHTML);
    if (extracted.styleBlocks) {
      setTemplateStyleBlocks(extracted.styleBlocks);
    }
    setHtmlContent(extracted.bodyHtml);
  }, []);

  const readFileAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  }, []);

  const insertImageFileAtCaret = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) return;

      const safeAlt = (file.name || "pasted-image").replace(/"/g, "");
      const imageHtml = `<img src="${dataUrl}" alt="${safeAlt}" style="max-width: 100%; height: auto; display: block; margin: 8px 0;" />`;

      document.execCommand("insertHTML", false, imageHtml);
      syncEditorStateFromDom();
    },
    [readFileAsDataUrl, syncEditorStateFromDom],
  );

  const setCaretFromDropPoint = useCallback((x: number, y: number) => {
    const selection = window.getSelection();
    if (!selection) return;

    const docWithCaret = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
    };

    let range: Range | null = null;

    if (docWithCaret.caretRangeFromPoint) {
      range = docWithCaret.caretRangeFromPoint(x, y);
    } else if (docWithCaret.caretPositionFromPoint) {
      const position = docWithCaret.caretPositionFromPoint(x, y);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }

    if (!range) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const focusEditorBody = useCallback(() => {
    setTimeout(() => {
      if (!editorRef.current) return;

      const editor = editorRef.current;
      editor.focus();

      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 0);
  }, []);

  const injectEditorHtml = useCallback((html: string) => {
    if (!editorRef.current) return;

    editorRef.current.innerHTML = "";
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
    }, 0);
  }, []);

  const setEditorNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      editorRef.current = node;
      if (!node || !open) return;

      const extracted = extractTemplateParts(initialHtmlContent);
      const fallbackBody =
        "<p>Hi,</p><p>A late fee has been applied to your payment term. Please settle the remaining balance as soon as possible.</p>";
      const initialEditorBody = hasVisibleEditorContent(extracted.bodyHtml)
        ? extracted.bodyHtml
        : fallbackBody;

      injectEditorHtml(`${extracted.styleBlocks}${initialEditorBody}`);
      focusEditorBody();
    },
    [open, initialHtmlContent, injectEditorHtml, focusEditorBody],
  );

  useEffect(() => {
    if (!open) return;

    const extracted = extractTemplateParts(initialHtmlContent);
    const fallbackBody =
      "<p>Hi,</p><p>A late fee has been applied to your payment term. Please settle the remaining balance as soon as possible.</p>";
    const initialEditorBody = hasVisibleEditorContent(extracted.bodyHtml)
      ? extracted.bodyHtml
      : fallbackBody;

    setSubject(initialSubject || "");
    setTemplateStyleBlocks(extracted.styleBlocks);
    setHtmlContent(initialEditorBody);

    injectEditorHtml(`${extracted.styleBlocks}${initialEditorBody}`);
    focusEditorBody();
  }, [
    open,
    initialSubject,
    initialHtmlContent,
    injectEditorHtml,
    focusEditorBody,
  ]);

  useEffect(() => {
    if (!open || !editorRef.current) return;

    const composedPreviewHtml = `${templateStyleBlocks}${htmlContent}`;
    if (editorRef.current.innerHTML !== composedPreviewHtml) {
      injectEditorHtml(composedPreviewHtml);
    }
  }, [open, htmlContent, templateStyleBlocks, injectEditorHtml]);

  const runEditorCommand = (command: string) => {
    document.execCommand(command, false);
    syncEditorStateFromDom();
  };

  const handleEditorInput = () => {
    syncEditorStateFromDom();
  };

  const handleEditorPaste = async (
    event: React.ClipboardEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const imageFiles = Array.from(event.clipboardData.files || []).filter(
      (file) => file.type.startsWith("image/"),
    );

    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        await insertImageFileAtCaret(file);
      }
      return;
    }

    const pastedHtml = event.clipboardData.getData("text/html");
    if (pastedHtml) {
      document.execCommand("insertHTML", false, sanitizeEmailHtml(pastedHtml));
    } else {
      const pastedText = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, pastedText);
    }

    syncEditorStateFromDom();
  };

  const handleEditorDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleEditorDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!editorRef.current) return;

    editorRef.current.focus();
    setCaretFromDropPoint(event.clientX, event.clientY);

    const imageFiles = Array.from(event.dataTransfer.files || []).filter(
      (file) => file.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {
      await insertImageFileAtCaret(file);
    }
  };

  const handleSendClick = async () => {
    const composedHtml = `${templateStyleBlocks}${htmlContent}`;

    await onSend({
      subject: subject.trim(),
      htmlContent: composedHtml,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSending) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>
            {termLabel
              ? `Send Late Fee Notice (${termLabel})`
              : "Send Late Fee Notice"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 pb-28">
          <div className="grid grid-cols-[72px_1fr] items-center gap-2">
            <label className="text-sm text-muted-foreground">To</label>
            <div className="min-h-9 border-b py-2 text-sm text-foreground">
              {recipient || "-"}
            </div>
          </div>

          <div className="grid grid-cols-[72px_1fr] items-center gap-2">
            <label className="text-sm text-muted-foreground">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Email subject"
              className="h-9 w-full border-0 border-b bg-transparent px-0 text-sm shadow-none outline-none focus-visible:ring-0"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Email Body</label>
            <div className="rounded-md border bg-white">
              <div className="flex flex-wrap items-center gap-1 border-b bg-slate-50 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Bold"
                  onClick={() => runEditorCommand("bold")}
                >
                  <MdFormatBold className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Italic"
                  onClick={() => runEditorCommand("italic")}
                >
                  <MdFormatItalic className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Underline"
                  onClick={() => runEditorCommand("underline")}
                >
                  <MdFormatUnderlined className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Bullet List"
                  onClick={() => runEditorCommand("insertUnorderedList")}
                >
                  <MdFormatListBulleted className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Numbered List"
                  onClick={() => runEditorCommand("insertOrderedList")}
                >
                  <MdFormatListNumbered className="h-5 w-5" />
                </Button>
              </div>

              <div
                ref={setEditorNodeRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onPaste={handleEditorPaste}
                onDragOver={handleEditorDragOver}
                onDrop={handleEditorDrop}
                className="min-h-[360px] p-3 text-sm leading-relaxed focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t bg-white px-6 py-4">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendClick}
              disabled={isSending || !subject.trim() || !htmlContent.trim()}
            >
              {isSending ? "Sending..." : "Send Notice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
