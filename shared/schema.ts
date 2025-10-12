import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Language types for audio processing
export const languages = ["ar", "fr", "dz"] as const;
export type Language = (typeof languages)[number];

export const languageNames: Record<Language, string> = {
  ar: "🇩🇿 العربية",
  fr: "🇫🇷 الفرنسية",
  dz: "🗣️ اللهجة الجزائرية",
};

export const languageSchema = z.object({
  language: z.enum(languages),
});

export type LanguageSelection = z.infer<typeof languageSchema>;
