/**
 * HTML Parser for Gmail Drafts - Converts Gmail's complex HTML to rich text editor compatible format
 */

// Supported font families in the rich text editor
const SUPPORTED_FONTS = [
  "Arial, sans-serif",
  "Times New Roman, serif",
  "Helvetica, sans-serif",
  "Georgia, serif",
  "Courier New, monospace",
  "Verdana, sans-serif",
];

// Supported font sizes (Gmail uses 1-7, editor uses 1,3,4,6)
const FONT_SIZE_MAP: { [key: string]: string } = {
  "1": "1", // Small
  "2": "1", // Small (closest to 1)
  "3": "3", // Normal
  "4": "4", // Large
  "5": "4", // Large (closest to 4)
  "6": "6", // Huge
  "7": "6", // Huge (closest to 6)
};

// Supported text colors
const SUPPORTED_COLORS = [
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

// Supported background colors
const SUPPORTED_BG_COLORS = [
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#FF00FF",
  "#FFA500",
  "#FF0000",
  "#0000FF",
  "#800080",
];

/**
 * Converts Gmail's complex HTML to rich text editor compatible format
 */
export function parseGmailHtml(html: string): string {
  if (!html) return "";

  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.DOMParser) {
    // Browser environment - use DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const processedDoc = processDocument(doc);
    return processedDoc.documentElement.innerHTML;
  } else {
    // Server environment - use simple regex-based parsing
    return parseGmailHtmlServer(html);
  }
}

/**
 * Server-side HTML parsing using regex (fallback for Node.js)
 */
function parseGmailHtmlServer(html: string): string {
  if (!html) return "";

  let processed = html;

  // Convert font tags to spans with styles
  processed = processed.replace(
    /<font([^>]*)>(.*?)<\/font>/gi,
    (match, attrs, content) => {
      // Parse attributes and apply styles
      const faceMatch = attrs.match(/face=["']([^"']*)["']/i);
      const sizeMatch = attrs.match(/size=["']([^"']*)["']/i);
      const colorMatch = attrs.match(/color=["']([^"']*)["']/i);

      let style = "";
      if (faceMatch) {
        const fontFamily = normalizeFontFamily(faceMatch[1]);
        if (fontFamily) style += `font-family: ${fontFamily};`;
      }
      if (sizeMatch) {
        const fontSize = FONT_SIZE_MAP[sizeMatch[1]] || "3";
        style += `font-size: ${fontSize};`;
      }
      if (colorMatch) {
        const color = normalizeColor(colorMatch[1]);
        if (color) style += `color: ${color};`;
      }

      return style ? `<span style="${style}">${content}</span>` : content;
    }
  );

  // Convert divs to paragraphs if they contain only text
  processed = processed.replace(
    /<div([^>]*)>([^<]*?)<\/div>/gi,
    (match, attrs, content) => {
      if (content.trim() && !content.includes("<")) {
        return `<p${attrs}>${content}</p>`;
      }
      return match;
    }
  );

  // Remove empty elements
  processed = processed
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<div>\s*<\/div>/gi, "")
    .replace(/<span>\s*<\/span>/gi, "");

  // Clean up excessive whitespace
  processed = processed
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  return processed;
}

/**
 * Process the entire document
 */
function processDocument(doc: Document): Document {
  // Process all elements recursively
  processElement(doc.body);

  // Clean up empty elements
  cleanupEmptyElements(doc.body);

  return doc;
}

/**
 * Process a single element and its children
 */
function processElement(element: Element): void {
  if (!element) return;

  // Process child elements first
  const children = Array.from(element.children);
  children.forEach((child) => processElement(child));

  // Process the current element
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case "div":
      processDiv(element);
      break;
    case "span":
      processSpan(element);
      break;
    case "p":
      processParagraph(element);
      break;
    case "font":
      processFont(element);
      break;
    case "table":
      processTable(element);
      break;
    case "img":
      processImage(element);
      break;
    case "a":
      processLink(element);
      break;
    case "br":
      // Keep br tags as-is
      break;
    default:
      // For other tags, just clean up styles
      cleanStyles(element);
      break;
  }
}

/**
 * Process div elements
 */
function processDiv(element: Element): void {
  const div = element as HTMLDivElement;

  // Convert div to p if it contains text content and no block elements
  const hasBlockElements = Array.from(div.children).some((child) =>
    [
      "div",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "table",
    ].includes(child.tagName.toLowerCase())
  );

  if (!hasBlockElements && div.textContent?.trim()) {
    // Convert div to p
    const p = document.createElement("p");
    p.innerHTML = div.innerHTML;
    p.className = div.className;
    p.style.cssText = div.style.cssText;
    div.parentNode?.replaceChild(p, div);
    processElement(p);
    return;
  }

  // Clean up styles
  cleanStyles(div);
}

/**
 * Process span elements
 */
function processSpan(element: Element): void {
  const span = element as HTMLSpanElement;

  // If span only contains text and has no special formatting, remove it
  if (span.children.length === 0 && !hasFormatting(span)) {
    const textNode = document.createTextNode(span.textContent || "");
    span.parentNode?.replaceChild(textNode, span);
    return;
  }

  // Clean up styles
  cleanStyles(span);
}

/**
 * Process paragraph elements
 */
function processParagraph(element: Element): void {
  const p = element as HTMLParagraphElement;

  // Clean up styles
  cleanStyles(p);

  // Remove empty paragraphs
  if (!p.textContent?.trim() && p.children.length === 0) {
    p.remove();
  }
}

/**
 * Process font elements (convert to supported format)
 */
function processFont(element: Element): void {
  const font = element as HTMLFontElement;
  const span = document.createElement("span");

  // Copy content
  span.innerHTML = font.innerHTML;

  // Handle font family
  if (font.face) {
    const fontFamily = normalizeFontFamily(font.face);
    if (fontFamily) {
      span.style.fontFamily = fontFamily;
    }
  }

  // Handle font size
  if (font.size) {
    const fontSize = FONT_SIZE_MAP[font.size] || "3";
    span.style.fontSize = fontSize;
  }

  // Handle color
  if (font.color) {
    const color = normalizeColor(font.color);
    if (color) {
      span.style.color = color;
    }
  }

  // Replace font with span
  font.parentNode?.replaceChild(span, font);
  processElement(span);
}

/**
 * Process table elements
 */
function processTable(element: Element): void {
  const table = element as HTMLTableElement;

  // Simplify table structure
  cleanStyles(table);

  // Process table cells
  const cells = table.querySelectorAll("td, th");
  cells.forEach((cell) => {
    cleanStyles(cell);
    // Convert cell content to paragraphs if needed
    const blockElements = cell.querySelectorAll("div, p");
    if (blockElements.length === 0 && cell.textContent?.trim()) {
      const p = document.createElement("p");
      p.innerHTML = cell.innerHTML;
      cell.innerHTML = "";
      cell.appendChild(p);
    }
  });
}

/**
 * Process image elements
 */
function processImage(element: Element): void {
  const img = element as HTMLImageElement;

  // Keep images but clean up attributes
  const allowedAttrs = ["src", "alt", "width", "height"];
  const attrs = Array.from(img.attributes);
  attrs.forEach((attr) => {
    if (!allowedAttrs.includes(attr.name)) {
      img.removeAttribute(attr.name);
    }
  });

  // Set max width for responsive images
  if (!img.style.maxWidth) {
    img.style.maxWidth = "100%";
  }
}

/**
 * Process link elements
 */
function processLink(element: Element): void {
  const link = element as HTMLAnchorElement;

  // Keep links but clean up styles
  cleanStyles(link);

  // Ensure href is valid
  if (!link.href || link.href === "#") {
    // Convert to span if no valid href
    const span = document.createElement("span");
    span.innerHTML = link.innerHTML;
    link.parentNode?.replaceChild(span, link);
  }
}

/**
 * Clean up inline styles to only include supported properties
 */
function cleanStyles(element: Element): void {
  const htmlElement = element as HTMLElement;

  if (!htmlElement.style) return;

  const style = htmlElement.style;
  const newStyle: { [key: string]: string } = {};

  // Font family
  if (style.fontFamily) {
    const fontFamily = normalizeFontFamily(style.fontFamily);
    if (fontFamily) {
      newStyle.fontFamily = fontFamily;
    }
  }

  // Font size
  if (style.fontSize) {
    const fontSize = normalizeFontSize(style.fontSize);
    if (fontSize) {
      newStyle.fontSize = fontSize;
    }
  }

  // Font weight
  if (
    style.fontWeight &&
    ["bold", "bolder", "700", "800", "900"].includes(style.fontWeight)
  ) {
    // Convert to <b> or <strong> tag instead of style
    const strong = document.createElement("strong");
    strong.innerHTML = htmlElement.innerHTML;
    htmlElement.innerHTML = "";
    htmlElement.appendChild(strong);
  }

  // Font style
  if (style.fontStyle === "italic") {
    // Convert to <i> or <em> tag instead of style
    const em = document.createElement("em");
    em.innerHTML = htmlElement.innerHTML;
    htmlElement.innerHTML = "";
    htmlElement.appendChild(em);
  }

  // Text decoration
  if (style.textDecoration === "underline") {
    // Convert to <u> tag instead of style
    const u = document.createElement("u");
    u.innerHTML = htmlElement.innerHTML;
    htmlElement.innerHTML = "";
    htmlElement.appendChild(u);
  }

  // Color
  if (style.color) {
    const color = normalizeColor(style.color);
    if (color) {
      newStyle.color = color;
    }
  }

  // Background color
  if (style.backgroundColor) {
    const bgColor = normalizeBackgroundColor(style.backgroundColor);
    if (bgColor) {
      newStyle.backgroundColor = bgColor;
    }
  }

  // Text align
  if (
    style.textAlign &&
    ["left", "center", "right", "justify"].includes(style.textAlign)
  ) {
    newStyle.textAlign = style.textAlign;
  }

  // Clear all styles and apply only supported ones
  htmlElement.style.cssText = "";
  Object.keys(newStyle).forEach((prop) => {
    htmlElement.style.setProperty(prop, newStyle[prop]);
  });
}

/**
 * Normalize font family to supported fonts
 */
function normalizeFontFamily(fontFamily: string): string | null {
  const normalized = fontFamily.toLowerCase().replace(/['"]/g, "");

  for (const supportedFont of SUPPORTED_FONTS) {
    const supportedNormalized = supportedFont
      .toLowerCase()
      .replace(/['"]/g, "");
    if (supportedNormalized.includes(normalized.split(",")[0].trim())) {
      return supportedFont;
    }
  }

  return null; // Use default font
}

/**
 * Normalize font size to supported sizes
 */
function normalizeFontSize(fontSize: string): string | null {
  // Extract numeric value
  const match = fontSize.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const size = parseFloat(match[1]);

  // Map to supported sizes
  if (size <= 10) return "1"; // Small
  if (size <= 12) return "3"; // Normal
  if (size <= 16) return "4"; // Large
  return "6"; // Huge
}

/**
 * Normalize color to supported colors
 */
function normalizeColor(color: string): string | null {
  const normalized = color.toLowerCase().trim();

  // Check if it's already a supported color
  if (SUPPORTED_COLORS.includes(normalized)) {
    return normalized;
  }

  // Try to find closest match
  const rgb = parseRgbColor(normalized);
  if (rgb) {
    return findClosestColor(rgb, SUPPORTED_COLORS);
  }

  return null; // Use default color
}

/**
 * Normalize background color to supported colors
 */
function normalizeBackgroundColor(bgColor: string): string | null {
  const normalized = bgColor.toLowerCase().trim();

  // Check if it's already a supported color
  if (SUPPORTED_BG_COLORS.includes(normalized)) {
    return normalized;
  }

  // Try to find closest match
  const rgb = parseRgbColor(normalized);
  if (rgb) {
    return findClosestColor(rgb, SUPPORTED_BG_COLORS);
  }

  return null; // Use default color
}

/**
 * Parse RGB color from various formats
 */
function parseRgbColor(
  color: string
): { r: number; g: number; b: number } | null {
  // Handle rgb(r,g,b) format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // Handle #hex format
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16),
    };
  }

  return null;
}

/**
 * Find closest color from supported colors
 */
function findClosestColor(
  rgb: { r: number; g: number; b: number },
  supportedColors: string[]
): string {
  let closestColor = supportedColors[0];
  let minDistance = Infinity;

  for (const color of supportedColors) {
    const colorRgb = parseRgbColor(color);
    if (colorRgb) {
      const distance = Math.sqrt(
        Math.pow(rgb.r - colorRgb.r, 2) +
          Math.pow(rgb.g - colorRgb.g, 2) +
          Math.pow(rgb.b - colorRgb.b, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color;
      }
    }
  }

  return closestColor;
}

/**
 * Check if element has any formatting
 */
function hasFormatting(element: Element): boolean {
  const htmlElement = element as HTMLElement;
  const style = htmlElement.style;

  return !!(
    style.fontWeight ||
    style.fontStyle ||
    style.textDecoration ||
    style.color ||
    style.backgroundColor ||
    style.fontSize ||
    style.fontFamily
  );
}

/**
 * Clean up empty elements
 */
function cleanupEmptyElements(element: Element): void {
  const children = Array.from(element.children);

  children.forEach((child) => {
    // Recursively clean up children
    cleanupEmptyElements(child);

    // Remove empty elements
    if (!child.textContent?.trim() && child.children.length === 0) {
      child.remove();
    }
  });
}

/**
 * Convert Gmail's complex HTML to simple, editor-compatible HTML
 */
export function simplifyGmailHtml(html: string): string {
  if (!html) return "";

  // First, parse and clean the HTML
  const cleaned = parseGmailHtml(html);

  // Additional simplifications
  let simplified = cleaned
    // Remove excessive whitespace
    .replace(/\s+/g, " ")
    // Remove empty paragraphs
    .replace(/<p>\s*<\/p>/g, "")
    // Remove empty divs
    .replace(/<div>\s*<\/div>/g, "")
    // Remove empty spans
    .replace(/<span>\s*<\/span>/g, "")
    // Clean up line breaks
    .replace(/\n\s*\n/g, "\n")
    // Remove leading/trailing whitespace
    .trim();

  return simplified;
}
