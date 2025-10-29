import { AppDataSource } from "../config/database";
import {
  Transaction,
  AuditLog,
  TransactionStatus,
} from "../entities/Transaction.entity";
import {
  WebhookPayload,
  TransactionValidator,
  TransactionCalculator,
  ValidationError,
} from "../validators/transactionValidator";

export class DuplicateTransactionError extends Error {
  constructor(public existingTransaction: Transaction) {
    super("Transaction already processed");
    this.name = "DuplicateTransactionError";
  }
}

export class WebhookService {
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private auditLogRepo = AppDataSource.getRepository(AuditLog);

  /**
   * Process webhook payload with idempotency check
   */
  async processWebhook(payload: WebhookPayload): Promise<Transaction> {
    //  Log to audit table
    await this.logWebhookEvent(payload, "received");

    try {
      //  Validate payload
      TransactionValidator.validate(payload);

      // Checking for duplicates (idempotency)
      await this.checkDuplicate(payload.event_id, payload.data.transaction_id);

      // Calculate derived fields
      const derivedFields = TransactionCalculator.calculateDerivedFields(
        payload.data.amount
      );

      // Create and save transaction
      const transaction = this.transactionRepo.create({
        event_id: payload.event_id,
        transaction_id: payload.data.transaction_id,
        amount: payload.data.amount,
        currency: payload.data.currency.toUpperCase(),
        sender_id: payload.data.sender.id,
        sender_name: payload.data.sender.name,
        sender_country: payload.data.sender.country.toUpperCase(),
        receiver_id: payload.data.receiver.id,
        receiver_name: payload.data.receiver.name,
        receiver_country: payload.data.receiver.country.toUpperCase(),
        status: payload.data.status as TransactionStatus,
        payment_method: payload.data.payment_method,
        processing_fee: derivedFields.processing_fee,
        net_amount: derivedFields.net_amount,
        metadata: payload.data.metadata,
        processed_at: new Date(),
      });

      const savedTransaction = await this.transactionRepo.save(transaction);

      // Update audit log
      await this.logWebhookEvent(payload, "processed");

      return savedTransaction;
    } catch (error) {
      // Logging error to audit table
      await this.logWebhookEvent(payload, "failed", error);
      throw error;
    }
  }

  /**
   * Check for duplicate transactions (idempotency)
   */
  private async checkDuplicate(
    eventId: string,
    transactionId: string
  ): Promise<void> {
    // Check by event_id first
    const existingByEvent = await this.transactionRepo.findOne({
      where: { event_id: eventId },
    });

    if (existingByEvent) {
      throw new DuplicateTransactionError(existingByEvent);
    }

    // Check by transaction_id
    const existingByTxn = await this.transactionRepo.findOne({
      where: { transaction_id: transactionId },
    });

    if (existingByTxn) {
      throw new DuplicateTransactionError(existingByTxn);
    }
  }

  /**
   * Log webhook event to audit table
   */
  private async logWebhookEvent(
    payload: WebhookPayload,
    status: string,
    error?: any
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepo.create({
        event_id: payload.event_id,
        event_type: payload.event_type,
        payload: payload as any,
        status,
        error_message: error ? error.message : null,
      });

      await this.auditLogRepo.save(auditLog);
    } catch (auditError) {
      console.error("Failed to log audit event:", auditError);
    }
  }
}

export const webhookService = new WebhookService();
