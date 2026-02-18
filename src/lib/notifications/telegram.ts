/**
 * Telegram Notification Service
 *
 * Sends messages to a Telegram bot.
 */

import { config } from "../config.ts";
import { getEffectiveConfig } from "../config-overrides.ts";
import { getActiveTelegramUsers, deactivateTelegramUser } from "./telegram-db.ts";

/**
 * Send a message to all active Telegram users
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  const { botToken } = getEffectiveConfig(config).telegram;

  if (!botToken) {
    // console.warn("⚠️ Telegram bot token not configured.");
    return;
  }

  const users = getActiveTelegramUsers();

  if (users.length === 0) {
    console.log("ℹ️ No active Telegram users to notify.");
    return;
  }

  console.log(`📤 Sending Telegram notification to ${users.length} users...`);

  // Send to all users in parallel
  await Promise.all(
    users.map(async (user) => {
      try {
        await sendToUser(botToken, user.chatId, message);
      } catch (error) {
        console.error(`❌ Failed to send to user ${user.chatId}:`, error);
        
        // If 403 Forbidden (user blocked bot), deactivate them
        if (error instanceof Error && error.message.includes("403")) {
          console.log(`🚫 Deactivating user ${user.chatId} (blocked bot)`);
          deactivateTelegramUser(user.chatId);
        }
      }
    })
  );
}

/**
 * Send message to a single user
 */
async function sendToUser(token: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
  }
}
