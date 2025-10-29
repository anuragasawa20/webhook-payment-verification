// src/config/database.ts
import { DataSource } from "typeorm";
import { Transaction, AuditLog } from "../entities/Transaction.entity";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL, // NeonDB connection string
  ssl: {
    rejectUnauthorized: false, // Required for NeonDB SSL
  },
  synchronize: false, // Use migrations for all environments
  logging: process.env.NODE_ENV === "development",
  entities: [Transaction, AuditLog],
  subscribers: [],
  migrations: ["src/migrations/*.ts"],
  migrationsRun: false, // Set to true to auto-run on app start
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connected successfully");
    console.log("📊 Connected to NeonDB");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};
