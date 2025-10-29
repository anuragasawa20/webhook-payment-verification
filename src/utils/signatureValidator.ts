import crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

export class SignatureValidator {
  private readonly secret: string;

  constructor() {
    this.secret = process.env.WEBHOOK_SECRET as string;
    if (!this.secret) {
      throw new Error("WEBHOOK_SECRET is not configured");
    }
  }

  /**
   * Verifies webhook signature using HMAC SHA256
   * @param payload - Raw request body (string or Buffer)
   * @param receivedSignature - Signature from X-Webhook-Signature header
   * @returns boolean - true if signature is valid
   */
  verify(payload: string | Buffer, receivedSignature: string): boolean {
    try {
      // Generate expected signature using HMAC SHA256
      const expectedSignature = crypto
        .createHmac("sha256", this.secret)
        .update(payload)
        .digest("hex");

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  /**
   * Verifies webhook with timestamp to prevent replay attacks
   * @param payload - Raw request body
   * @param receivedSignature - Signature from header
   * @param timestamp - Unix timestamp from header
   * @param toleranceSeconds - How old the webhook can be (default: 5 minutes)
   * @returns boolean - true if signature and timestamp are valid
   */
  verifyWithTimestamp(
    payload: string | Buffer,
    receivedSignature: string,
    timestamp: string,
    toleranceSeconds: number = 300
  ): boolean {
    // Check if timestamp is within tolerance (5 minutes by default)
    const currentTime = Math.floor(Date.now() / 1000);
    const payloadTime = parseInt(timestamp);

    if (isNaN(payloadTime)) {
      console.warn("Invalid timestamp format");
      return false;
    }

    if (Math.abs(currentTime - payloadTime) > toleranceSeconds) {
      console.warn(`Webhook timestamp outside tolerance window. 
        Current: ${currentTime}, Payload: ${payloadTime}, 
        Difference: ${Math.abs(currentTime - payloadTime)}s`);
      return false;
    }

    // Create signed payload with timestamp (prevents replay attacks)
    const signedPayload = `${timestamp}.${payload}`;
    return this.verify(signedPayload, receivedSignature);
  }
}

export const signatureValidator = new SignatureValidator();
