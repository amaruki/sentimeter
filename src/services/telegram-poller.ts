/**
 * Telegram Poller Service
 *
 * Polls for updates from Telegram bot API to handle commands like /start and /stop.
 */

import { upsertTelegramUser, deactivateTelegramUser } from "../lib/notifications/telegram-db.ts";
import { sendTelegramNotification } from "../lib/notifications/telegram.ts"; // Circular dep? No, telegram.ts uses telegram-db.ts, this uses telegram.ts. Wait.
// telegram.ts uses telegram-db.ts to get users.
// telegram-poller.ts uses telegram-db.ts to save users.
// telegram-poller.ts might want to send a welcome message.

// To avoid circular dependency, we'll implement a simple send function here or use the one from telegram.ts if it supports single user target.
// Actually, `sendTelegramNotification` broadcasts. We need a `sendToUser` function.

const POLL_INTERVAL_MS = 3000;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

let lastUpdateId = 0;
let isPolling = false;

/**
 * Start polling for Telegram updates
 */
export function startTelegramPolling() {
  if (isPolling) return;
  isPolling = true;

  console.log("🤖 Starting Telegram polling...");
  pollLoop();
}

/**
 * Polling loop
 */
async function pollLoop() {
  while (isPolling) {
    try {
      await pollUpdates();
    } catch (error) {
      console.error("❌ Error polling Telegram updates:", error);
    }
    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Poll for updates
 */
async function pollUpdates() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 409) {
            // Conflict: another instance is running. Stop polling.
            console.warn("⚠️ Telegram polling conflict. Another instance is likely running. Stopping local polling.");
            isPolling = false;
        }
        return;
    }

    const data = (await response.json()) as { ok: boolean; result: TelegramUpdate[] };

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        await handleUpdate(update);
      }
    }
  } catch (error) {
    // Ignore network errors/timeouts, just retry later
  }
}

/**
 * Handle a single update
 */
async function handleUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!message || !message.text) return;

  const text = message.text.trim();
  const chatId = message.chat.id;
  const user = message.from;

  if (text === "/start") {
    console.log(`👤 New Telegram user: ${user.first_name} ${user.last_name} (${user.username})`);
    
    upsertTelegramUser({
      chatId,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: true,
    });

    const welcomeMsg = `
🎉 *Welcome to Sentimeter!*

Hello ${user.first_name}! You are now successfully subscribed to receive AI-driven stock alerts. 📈

I will notify you here whenever:
🟢 A new position is entered
🎯 A target price is hit
🛑 A stop loss is triggered
⏰ A trade expires
🚀 Unusual volume or price anomalies are detected

_⚠️ Disclaimer: Prices may be delayed by up to 10 mins. Not financial advice. Always DYOR before trading._

🐙 *Open Source:* [GitHub Repository](https://github.com/snowfluke/sentimeter)

Type /stop at any time if you wish to unsubscribe.
    `.trim();

    await sendDirectMessage(process.env.TELEGRAM_BOT_TOKEN!, chatId, welcomeMsg);
  } else if (text === "/stop") {
    console.log(`👤 User unsubscribed: ${user.first_name} ${user.last_name} (${user.username})`);
    
    upsertTelegramUser({
      chatId,
      isActive: false,
    });

    const goodbyeMsg = `
🔕 *Alerts Disabled*

You have successfully unsubscribed from Sentimeter alerts. 

If you ever want to come back and start receiving notifications again, just type /start! 👋
    `.trim();

    await sendDirectMessage(process.env.TELEGRAM_BOT_TOKEN!, chatId, goodbyeMsg);
  }
}

/**
 * Send a direct message to a specific chat ID (helper)
 */
async function sendDirectMessage(token: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (e) {
    console.error(`Failed to send direct message to ${chatId}`, e);
  }
}
