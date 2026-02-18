/**
 * Telegram Notification Service
 *
 * Sends messages to a Telegram bot.
 */

import { config } from "../config.ts";
import { getEffectiveConfig } from "../config-overrides.ts";

/**
 * Send a message to the configured Telegram chat
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  const { botToken, chatId } = getEffectiveConfig(config).telegram;

  if (!botToken || !chatId) {
    // Silent return if not configured, or maybe log a warning once
    // console.warn("⚠️ Telegram not configured, skipping notification.");
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Failed to send Telegram notification: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  } catch (error) {
    console.error("❌ Error sending Telegram notification:", error);
  }
}
