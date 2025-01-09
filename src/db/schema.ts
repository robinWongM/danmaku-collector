import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const danmakuTable = sqliteTable("danmaku_table", {
  id: int().primaryKey({ autoIncrement: true }),
  room_id: int(),
  sender_uid: int(),
  sender_name: text(),
  content: text(),
  timestamp: int(),
  raw: text(),

  updated_at: int({ mode: 'timestamp_ms' }),
  created_at: int({ mode: 'timestamp_ms' }).default(sql`(unixepoch('subsecond') * 1000)`).notNull(),
  deleted_at: int({ mode: 'timestamp_ms' }),
});

export const messageTable = sqliteTable("message_table", {
  id: int().primaryKey({ autoIncrement: true }),
  room_id: int(),
  raw: text(),

  updated_at: int({ mode: 'timestamp_ms' }),
  created_at: int({ mode: 'timestamp_ms' }).default(sql`(unixepoch('subsecond') * 1000)`).notNull(),
  deleted_at: int({ mode: 'timestamp_ms' }),
});