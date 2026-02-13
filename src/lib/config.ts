/**
 * Application Configuration
 */

export const config = {
  // Server
  port: parseInt(process.env.PORT ?? "3001", 10),

  // Antigravity Manager (LLM Proxy)
  antigravity: {
    baseUrl: process.env.ANTIGRAVITY_BASE_URL ?? "http://127.0.0.1:8045/v1",
    apiKey: process.env.ANTIGRAVITY_API_KEY ?? "",
    model: process.env.ANTIGRAVITY_MODEL ?? "gemini-2.0-flash",
  },

  // Telegram Notification
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
};
