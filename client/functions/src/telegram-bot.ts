// functions/src/telegram-bot.ts
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import TelegramBot from "node-telegram-bot-api";

// Telegram Bot Token
const BOT_TOKEN = "7889616304:AAFAThU8KbBYTUmiCsN3rOCcR8LgNaW-efU";

// Force all messages to this chat ID
const FORCE_CHAT_ID = "1854388945";

// Initialize Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

interface TelegramMessageRequest {
  chatId?: string; // ignored; function forces FORCE_CHAT_ID
  message: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

interface TelegramPhotoRequest {
  chatId?: string; // ignored; function forces FORCE_CHAT_ID
  photo: string; // Base64 encoded image or URL
  caption?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

export const telegramBot = onRequest(
  {
    region: "asia-southeast1",
    maxInstances: 10,
    cors: true, // Enable CORS for all origins
    invoker: "public", // Make function publicly accessible
  },
  async (request, response) => {
    try {
      logger.info("Telegram Bot function called", {
        method: request.method,
        body: request.body,
        structuredData: true,
      });

      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        response.status(200).send("");
        return;
      }

      // Only allow POST requests
      if (request.method !== "POST") {
        response.status(405).json({
          success: false,
          error: "Method not allowed. Use POST.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { action, ...data } = request.body;

      if (!action) {
        response.status(400).json({
          success: false,
          error: "Missing 'action' parameter. Use 'sendMessage' or 'sendPhoto'",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let result;

      switch (action) {
        case "sendMessage":
          result = await handleSendMessage(data as TelegramMessageRequest);
          break;
        case "sendPhoto":
          result = await handleSendPhoto(data as TelegramPhotoRequest);
          break;
        default:
          response.status(400).json({
            success: false,
            error: "Invalid action. Use 'sendMessage' or 'sendPhoto'",
            timestamp: new Date().toISOString(),
          });
          return;
      }

      response.status(200).json({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error in Telegram Bot function:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

async function handleSendMessage(data: TelegramMessageRequest) {
  const { message, parseMode = "HTML" } = data;

  if (!message) {
    throw new Error("Missing required parameter: message");
  }

  const targetChatId = FORCE_CHAT_ID;

  logger.info("Sending message to Telegram", {
    receivedChatId: data.chatId || null,
    targetChatId,
    messageLength: message.length,
    parseMode,
  });

  const result = await bot.sendMessage(targetChatId, message, {
    parse_mode: parseMode,
  });

  return {
    messageId: result.message_id,
    chatId: result.chat.id,
    text: result.text,
    date: result.date,
  };
}

async function handleSendPhoto(data: TelegramPhotoRequest) {
  const { photo, caption, parseMode = "HTML" } = data;

  if (!photo) {
    throw new Error("Missing required parameter: photo");
  }

  const targetChatId = FORCE_CHAT_ID;

  logger.info("Sending photo to Telegram", {
    receivedChatId: data.chatId || null,
    targetChatId,
    photoLength: photo.length,
    hasCaption: !!caption,
    parseMode,
  });

  // Determine if photo is base64 or URL
  let photoInput: string | Buffer;
  let options: any = {};

  if (
    photo.startsWith("data:image/") ||
    photo.startsWith("/9j/") ||
    photo.startsWith("iVBORw0KGgo")
  ) {
    // Base64 encoded image
    if (photo.startsWith("data:image/")) {
      // Remove data URL prefix
      const base64Data = photo.split(",")[1];
      photoInput = Buffer.from(base64Data, "base64");
    } else {
      // Direct base64
      photoInput = Buffer.from(photo, "base64");
    }
  } else {
    // URL
    photoInput = photo;
  }

  if (caption) {
    options.caption = caption;
    options.parse_mode = parseMode;
  }

  const result = await bot.sendPhoto(targetChatId, photoInput, options);

  return {
    messageId: result.message_id,
    chatId: result.chat.id,
    caption: result.caption,
    photo: result.photo ? result.photo[0] : null,
    date: result.date,
  };
}
