import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import { initializeDatabase } from "./config/database";
import webhookRoutes from "./routes/webhook.routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  "/webhooks",
  express.raw({ type: "application/json" }),
  (req: Request, res: Response, next: NextFunction) => {
    // Store raw body for signature verification
    (req as any).rawBody = req.body;

    // Parse JSON for easier access
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    next();
  }
);

// Regular JSON parser for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/webhooks", webhookRoutes);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "Webhook Payment Processing Service",
    version: "1.0.0",
    endpoints: {
      health: "/webhooks/health",
      webhook: "/webhooks/payment",
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested endpoint does not exist",
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

startServer();

export default app;
