import { DataSource } from "typeorm";
import { Transaction, AuditLog } from "./src/entities/Transaction.entity";
import * as dotenv from "dotenv";

dotenv.config();

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  entities: ["src/entities/*.ts"],
  migrations: ["src/migrations/*.ts"],
  synchronize: false, // Always false when using migrations
});
