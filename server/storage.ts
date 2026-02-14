import { users, type User, type UpsertUser, emailLogs, type EmailLog, type InsertEmailLog } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  getEmailLogsByExhibitor(org: string, exhibitorId: string): Promise<EmailLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData)
      .onConflictDoUpdate({ target: users.id, set: userData })
      .returning();
    return user;
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [entry] = await db.insert(emailLogs).values(log).returning();
    return entry;
  }

  async getEmailLogsByExhibitor(org: string, exhibitorId: string): Promise<EmailLog[]> {
    return db.select().from(emailLogs)
      .where(and(eq(emailLogs.org, org), eq(emailLogs.exhibitorId, exhibitorId)))
      .orderBy(desc(emailLogs.sentAt));
  }
}

export const storage = new DatabaseStorage();
