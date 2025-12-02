import { ToolResult } from '../types/index.js';
import { logger } from '../observability/logger.js';

export interface PaymentRequest {
  billId: string;
  amount: number;
  paymentMethod: 'bank_account' | 'credit_card' | 'debit_card';
  paymentDate?: Date;
  memo?: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'success' | 'pending' | 'failed';
  amount: number;
  fee?: number;
  confirmationNumber?: string;
  processedAt: Date;
}

/**
 * Custom Tool: PaymentExecutionTool
 * Executes bill payments through various payment methods
 * In production, integrates with payment APIs (Stripe, Plaid, bank APIs)
 */
export class PaymentExecutionTool {
  name = 'payment_execution';
  description = 'Executes bill payments using specified payment methods';

  private isDryRun: boolean;

  constructor(isDryRun: boolean = true) {
    this.isDryRun = isDryRun;
  }

  /**
   * Execute a payment for a bill
   */
  async execute(params: PaymentRequest): Promise<ToolResult> {
    try {
      logger.info('PaymentExecutionTool executing', {
        params,
        isDryRun: this.isDryRun
      });

      // Validation
      if (params.amount <= 0) {
        throw new Error('Payment amount must be positive');
      }

      if (!params.billId) {
        throw new Error('Bill ID is required');
      }

      // Simulate payment processing
      const response = await this.processPayment(params);

      logger.info('PaymentExecutionTool completed', {
        transactionId: response.transactionId,
        status: response.status,
        amount: response.amount
      });

      return {
        success: response.status === 'success',
        data: response,
        metadata: {
          isDryRun: this.isDryRun,
          paymentMethod: params.paymentMethod
        }
      };
    } catch (error) {
      logger.error('PaymentExecutionTool failed', { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate API call delay
    await this.sleep(500);

    if (this.isDryRun) {
      logger.info('DRY RUN: Payment not actually executed');
      return {
        transactionId: `DRY-RUN-${Date.now()}`,
        status: 'success',
        amount: request.amount,
        fee: this.calculateFee(request.amount, request.paymentMethod),
        confirmationNumber: `CONF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        processedAt: new Date()
      };
    }

    // In production, this would integrate with actual payment APIs
    // e.g., Stripe, Plaid, bank bill pay APIs, etc.

    // Simulate 95% success rate
    const isSuccess = Math.random() > 0.05;

    return {
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: isSuccess ? 'success' : 'failed',
      amount: request.amount,
      fee: this.calculateFee(request.amount, request.paymentMethod),
      confirmationNumber: isSuccess ? `CONF-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : undefined,
      processedAt: new Date()
    };
  }

  private calculateFee(amount: number, paymentMethod: string): number {
    // Simulate different fee structures
    switch (paymentMethod) {
      case 'bank_account':
        return 0; // Free
      case 'credit_card':
        return amount * 0.029 + 0.30; // 2.9% + $0.30
      case 'debit_card':
        return amount * 0.015; // 1.5%
      default:
        return 0;
    }
  }

  /**
   * Verify payment method before executing
   */
  async verifyPaymentMethod(paymentMethod: string): Promise<boolean> {
    // Mock verification - in production would verify with payment provider
    logger.info('Verifying payment method', { paymentMethod });

    // Simulate verification
    await this.sleep(200);
    return Math.random() > 0.1; // 90% success rate
  }

  /**
   * Schedule a future payment
   */
  async schedulePayment(request: PaymentRequest, scheduledDate: Date): Promise<ToolResult> {
    logger.info('Scheduling payment', { request, scheduledDate });

    return {
      success: true,
      data: {
        scheduledPaymentId: `SCHED-${Date.now()}`,
        billId: request.billId,
        amount: request.amount,
        scheduledDate,
        status: 'scheduled'
      },
      metadata: {
        isDryRun: this.isDryRun
      }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Tool definition for LLM to use
   */
  getToolDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          billId: {
            type: 'string',
            description: 'Unique identifier for the bill to pay'
          },
          amount: {
            type: 'number',
            description: 'Payment amount in USD'
          },
          paymentMethod: {
            type: 'string',
            enum: ['bank_account', 'credit_card', 'debit_card'],
            description: 'Payment method to use'
          },
          paymentDate: {
            type: 'string',
            description: 'Optional: Schedule payment for future date (ISO format)'
          },
          memo: {
            type: 'string',
            description: 'Optional memo for the payment'
          }
        },
        required: ['billId', 'amount', 'paymentMethod']
      }
    };
  }
}
