import { Session, sessionSchema } from "@shared/schema";

const STORAGE_KEY = "takhleesly_sessions";

export const sessionStorage = {
  save(session: Session): void {
    try {
      const sessions = this.getAll();
      sessions.unshift(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to save session:", error);
      throw new Error("فشل حفظ الجلسة");
    }
  },

  getAll(): Session[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return sessionSchema.array().parse(parsed);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      return [];
    }
  },

  getById(id: string): Session | null {
    const sessions = this.getAll();
    return sessions.find(s => s.id === id) || null;
  },

  delete(id: string): void {
    try {
      const sessions = this.getAll();
      const filtered = sessions.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to delete session:", error);
      throw new Error("فشل حذف الجلسة");
    }
  },

  deleteAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to delete all sessions:", error);
      throw new Error("فشل حذف جميع الجلسات");
    }
  }
};
