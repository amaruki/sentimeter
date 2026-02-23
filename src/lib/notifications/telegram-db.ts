/**
 * Telegram Database Operations
 */

import { db } from "../database/schema.ts";
import type { TelegramUser, TelegramUserInsert } from "../database/types.ts";

/**
 * Helper to map DB row to TelegramUser
 */
function mapRowToUser(row: any): TelegramUser {
  return {
    id: row.id,
    chatId: row.chat_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get all active Telegram users
 */
export function getActiveTelegramUsers(): TelegramUser[] {
  const rows = db
    .query("SELECT * FROM telegram_users WHERE is_active = 1")
    .all();
  return rows.map(mapRowToUser);
}

/**
 * Get a Telegram user by chat ID
 */
export function getTelegramUser(chatId: number): TelegramUser | null {
  const row = db
    .query("SELECT * FROM telegram_users WHERE chat_id = ?")
    .get(chatId);
  return row ? mapRowToUser(row) : null;
}

/**
 * Upsert a Telegram user (add or update)
 */
export function upsertTelegramUser(user: TelegramUserInsert): void {
  const existing = getTelegramUser(user.chatId);

  if (existing) {
    db.run(
      `UPDATE telegram_users 
       SET is_active = ?, 
           username = COALESCE(?, username), 
           first_name = COALESCE(?, first_name), 
           last_name = COALESCE(?, last_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE chat_id = ?`,
      [
        user.isActive !== undefined ? (user.isActive ? 1 : 0) : 1,
        user.username || null,
        user.firstName || null,
        user.lastName || null,
        user.chatId,
      ]
    );
  } else {
    db.run(
      `INSERT INTO telegram_users (chat_id, username, first_name, last_name, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        user.chatId,
        user.username || null,
        user.firstName || null,
        user.lastName || null,
        user.isActive !== undefined ? (user.isActive ? 1 : 0) : 1,
      ]
    );
  }
}

/**
 * Deactivate a Telegram user (e.g. when blocked)
 */
export function deactivateTelegramUser(chatId: number): void {
  db.run(
    "UPDATE telegram_users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?",
    [chatId]
  );
}
