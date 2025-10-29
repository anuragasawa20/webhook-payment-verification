import express, { Request, Response, NextFunction } from "express";
import {
  webhookService,
  DuplicateTransactionError,
} from "../services/webhookService";
import { signatureValidator } from "../utils/signatureValidator";
import { ValidationError } from "../validators/transactionValidator";

const router = express.Router();

/**
 * Middleware to verify webhook signature
 */
export const verifySignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers["x-webhook-signature"] as string;
    const timestamp = req.headers["x-webhook-timestamp"] as string;

    if (!signature) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing webhook signature",
      });
    }

    // Get raw body (must be set up in app.ts with express.raw())
    const rawBody = (req as any).rawBody;

    let isValid: boolean;

    if (timestamp) {
      // Verify with timestamp (preferred - prevents replay attacks)
      isValid = signatureValidator.verifyWithTimestamp(
        rawBody,
        signature,
        timestamp
      );
    } else {
      // Verify without timestamp (basic verification)
      isValid = signatureValidator.verify(rawBody, signature);
    }

    if (!isValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid webhook signature",
      });
    }

    next();
  } catch (error) {
    console.error("Signature verification error:", error);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Signature verification failed",
    });
  }
};

/**
 *  Webhook endpoint (WITH signature verification)
 */
router.post(
  "/payment",
  verifySignature,
  async (req: Request, res: Response) => {
    try {
      const payload = req.body;

      // Process the webhook
      const transaction = await webhookService.processWebhook(payload);

      // Success response
      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
        data: {
          id: transaction.id,
          transaction_id: transaction.transaction_id,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          processing_fee: transaction.processing_fee,
          net_amount: transaction.net_amount,
        },
      });
    } catch (error) {
      // Handle duplicate transaction (409 Conflict)
      if (error instanceof DuplicateTransactionError) {
        return res.status(409).json({
          error: "Conflict",
          message: "Transaction already processed",
          data: {
            id: error.existingTransaction.id,
            transaction_id: error.existingTransaction.transaction_id,
            status: error.existingTransaction.status,
            processed_at: error.existingTransaction.processed_at,
          },
        });
      }

      // Handling validation error (400 Bad Request)
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.message,
          field: error.field,
        });
      }

      // Handling other errors (500 Internal Server Error)
      console.error("Webhook processing error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to process webhook",
      });
    }
  }
);

/**
 * GET /webhooks/health
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
