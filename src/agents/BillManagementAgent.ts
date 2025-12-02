import { BaseAgent } from './BaseAgent.js';
import { Task, Bill } from '../types/index.js';
import { EmailScannerTool } from '../tools/EmailScannerTool.js';
import { PaymentExecutionTool } from '../tools/PaymentExecutionTool.js';
import { DocumentReaderTool } from '../tools/DocumentReaderTool.js';
import { standardMetrics } from '../observability/metrics.js';

/**
 * Bill Management Agent
 * Handles bill scanning, tracking due dates, and payment execution
 * Runs as a loop agent (daily/weekly scanning)
 */
export class BillManagementAgent extends BaseAgent {
  private emailScanner: EmailScannerTool;
  private paymentTool: PaymentExecutionTool;
  private documentReader: DocumentReaderTool;

  constructor(memoryBank: any, sessionService: any) {
    super('bill-agent', 'bill', memoryBank, sessionService);
    this.emailScanner = new EmailScannerTool();
    this.paymentTool = new PaymentExecutionTool(true); // dry run mode
    this.documentReader = new DocumentReaderTool();
  }

  /**
   * Execute bill management task
   */
  async execute(task: Task, sessionId: string): Promise<any> {
    this.log('info', 'Bill Management Agent executing', { taskId: task.id });

    switch (task.type) {
      case 'bill_payment':
        return this.handleBillPayment(task, sessionId);
      default:
        return this.scanAndManageBills(sessionId);
    }
  }

  /**
   * Scan for bills and manage them
   */
  private async scanAndManageBills(sessionId: string): Promise<any> {
    // Step 1: Scan emails for bills
    const scanResult = await this.emailScanner.execute({
      categories: ['bills']
    });

    if (!scanResult.success) {
      this.log('error', 'Email scan failed', { error: scanResult.error });
      return { success: false, error: scanResult.error };
    }

    const bills: Bill[] = scanResult.data.bills;
    this.log('info', 'Bills scanned', { count: bills.length });

    // Step 2: Store bills in memory
    for (const bill of bills) {
      await this.storeMemory('bill', bill, {
        scannedAt: new Date(),
        source: 'email'
      });
    }

    // Step 3: Check for bills due soon (within 5 days)
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const billsDueSoon = bills.filter(
      bill => !bill.isPaid && bill.dueDate <= fiveDaysFromNow
    );

    this.log('info', 'Bills due soon identified', { count: billsDueSoon.length });

    // Step 4: Send notifications for bills due soon
    for (const bill of billsDueSoon) {
      await this.sendMessage({
        type: 'DeadlineUpcoming',
        to: 'deadline-agent',
        payload: {
          bill,
          daysUntilDue: Math.ceil((bill.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        }
      });

      await this.sendMessage({
        type: 'PaymentRequired',
        to: 'orchestrator',
        payload: {
          billId: bill.id,
          provider: bill.provider,
          amount: bill.amount,
          dueDate: bill.dueDate
        }
      });
    }

    return {
      success: true,
      billsFound: bills.length,
      billsDueSoon: billsDueSoon.length,
      bills: billsDueSoon
    };
  }

  /**
   * Handle bill payment
   */
  private async handleBillPayment(task: Task, sessionId: string): Promise<any> {
    const { billId, amount, paymentMethod } = task.metadata;

    this.log('info', 'Executing bill payment', { billId, amount });

    // Step 1: Verify payment method
    const isVerified = await this.paymentTool.verifyPaymentMethod(paymentMethod);
    if (!isVerified) {
      this.log('error', 'Payment method verification failed', { paymentMethod });
      standardMetrics.billPaymentFailure();
      return {
        success: false,
        error: 'Payment method verification failed'
      };
    }

    // Step 2: Execute payment
    const paymentResult = await this.paymentTool.execute({
      billId,
      amount,
      paymentMethod,
      memo: `Bill payment via agent system`
    });

    if (paymentResult.success) {
      this.log('info', 'Bill payment successful', {
        billId,
        transactionId: paymentResult.data.transactionId
      });

      // Update bill status in memory
      const memories = await this.memoryBank.retrieveByType('bill');
      const billMemory = memories.find((m: any) => m.content.id === billId);
      if (billMemory) {
        billMemory.content.isPaid = true;
        this.memoryBank.update(billMemory.id, billMemory);
      }

      // Notify orchestrator
      await this.sendMessage({
        type: 'TaskCompleted',
        to: 'orchestrator',
        payload: {
          taskId: task.id,
          result: paymentResult.data
        }
      });

      standardMetrics.billPaymentSuccess();

      return {
        success: true,
        payment: paymentResult.data
      };
    } else {
      this.log('error', 'Bill payment failed', {
        billId,
        error: paymentResult.error
      });

      standardMetrics.billPaymentFailure();

      return {
        success: false,
        error: paymentResult.error
      };
    }
  }

  /**
   * Loop execution for daily bill scanning
   */
  async dailyLoop(): Promise<void> {
    this.log('info', 'Starting daily bill scan loop');

    const sessionId = this.sessionService.createSession();

    try {
      const result = await this.scanAndManageBills(sessionId);
      this.log('info', 'Daily bill scan completed', result);
    } catch (error) {
      this.log('error', 'Daily bill scan failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.sessionService.endSession(sessionId);
    }
  }
}
