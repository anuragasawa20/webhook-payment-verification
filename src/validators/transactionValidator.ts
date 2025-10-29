// src/validators/transactionValidator.ts
import { TransactionStatus } from "../entities/Transaction.entity";

export interface WebhookPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: {
    transaction_id: string;
    amount: number;
    currency: string;
    sender: {
      id: string;
      name: string;
      email: string;
      country: string;
    };
    receiver: {
      id: string;
      name: string;
      email: string;
      country: string;
    };
    status: string;
    payment_method: string;
    metadata?: Record<string, any>;
  };
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TransactionValidator {
  private static readonly VALID_CURRENCIES = [
    "USD",
    "EUR",
    "GBP",
    "INR",
    "JPY",
  ];

  private static readonly VALID_STATUSES = Object.values(TransactionStatus);

  /**
   * Validates the entire webhook payload
   */
  static validate(payload: WebhookPayload): void {
    this.validateRequired(payload);
    this.validateAmount(payload.data.amount);
    this.validateCurrency(payload.data.currency);
    this.validateStatus(payload.data.status);
    this.validateCountryCodes(
      payload.data.sender.country,
      payload.data.receiver.country
    );
    this.validateEmail(payload.data.sender.email, "sender.email");
    this.validateEmail(payload.data.receiver.email, "receiver.email");
  }

  /**
   * Check all required fields are present
   */
  private static validateRequired(payload: WebhookPayload): void {
    const requiredFields = {
      event_id: payload.event_id,
      event_type: payload.event_type,
      "data.transaction_id": payload.data?.transaction_id,
      "data.amount": payload.data?.amount,
      "data.currency": payload.data?.currency,
      "data.sender.id": payload.data?.sender?.id,
      "data.sender.name": payload.data?.sender?.name,
      "data.sender.email": payload.data?.sender?.email,
      "data.sender.country": payload.data?.sender?.country,
      "data.receiver.id": payload.data?.receiver?.id,
      "data.receiver.name": payload.data?.receiver?.name,
      "data.receiver.email": payload.data?.receiver?.email,
      "data.receiver.country": payload.data?.receiver?.country,
      "data.status": payload.data?.status,
      "data.payment_method": payload.data?.payment_method,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null || value === "") {
        throw new ValidationError(field, `${field} is required`);
      }
    }
  }

  /**
   * Validate amount is positive
   */
  private static validateAmount(amount: number): void {
    if (typeof amount !== "number" || isNaN(amount)) {
      throw new ValidationError("amount", "Amount must be a valid number");
    }

    if (amount <= 0) {
      throw new ValidationError("amount", "Amount must be a positive number");
    }

    // Check for reasonable decimal places (max 2 for currency)
    if (amount.toString().split(".")[1]?.length > 2) {
      throw new ValidationError(
        "amount",
        "Amount cannot have more than 2 decimal places"
      );
    }
  }

  /**
   * Validate currency is valid ISO code
   */
  private static validateCurrency(currency: string): void {
    if (!currency || typeof currency !== "string") {
      throw new ValidationError("currency", "Currency is required");
    }

    const upperCurrency = currency.toUpperCase();
    if (!this.VALID_CURRENCIES.includes(upperCurrency)) {
      throw new ValidationError(
        "currency",
        `Currency must be a valid ISO code. Supported: ${this.VALID_CURRENCIES.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Validate status is valid enum value
   */
  private static validateStatus(status: string): void {
    if (!status || typeof status !== "string") {
      throw new ValidationError("status", "Status is required");
    }

    if (!this.VALID_STATUSES.includes(status as TransactionStatus)) {
      throw new ValidationError(
        "status",
        `Status must be one of: ${this.VALID_STATUSES.join(", ")}`
      );
    }
  }

  /**
   * Validate country codes are 2-letter ISO codes
   */
  private static validateCountryCodes(...countries: string[]): void {
    const iso2Regex = /^[A-Z]{2}$/;
    countries.forEach((country, index) => {
      if (!country || typeof country !== "string") {
        throw new ValidationError(
          `country_${index}`,
          "Country code is required"
        );
      }

      const upperCountry = country.toUpperCase();
      if (!iso2Regex.test(upperCountry)) {
        throw new ValidationError(
          `country_${index}`,
          `Country code must be 2-letter ISO code (e.g., US, IN, GB). Received: ${country}`
        );
      }
    });
  }

  /**
   * Validate email format
   */
  private static validateEmail(email: string, fieldName: string): void {
    if (!email || typeof email !== "string") {
      throw new ValidationError(fieldName, `${fieldName} is required`);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        fieldName,
        `${fieldName} must be a valid email address`
      );
    }
  }
}

/**
 * Calculate derived fields for transaction
 */
export class TransactionCalculator {
  private static readonly PROCESSING_FEE_RATE = 0.02; // 2%

  /**
   * Calculate processing fee and net amount
   * @param amount - Transaction amount
   * @returns Object with processing_fee and net_amount
   */
  static calculateDerivedFields(amount: number) {
    const processingFee = parseFloat(
      (amount * this.PROCESSING_FEE_RATE).toFixed(2)
    );
    const netAmount = parseFloat((amount - processingFee).toFixed(2));

    return {
      processing_fee: processingFee,
      net_amount: netAmount,
    };
  }

  /**
   * Calculate exchange rate (placeholder for future implementation)
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param amount - Amount to convert
   */
  static calculateExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): number | null {
    // Placeholder - in real app, call currency conversion API
    // For now, return null (will be added to DB as null)
    return null;
  }
}
