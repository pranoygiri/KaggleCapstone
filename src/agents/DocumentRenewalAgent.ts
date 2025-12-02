import { BaseAgent } from './BaseAgent.js';
import { Task, Document } from '../types/index.js';
import { EmailScannerTool } from '../tools/EmailScannerTool.js';
import { FormFillerTool } from '../tools/FormFillerTool.js';
import { DocumentReaderTool } from '../tools/DocumentReaderTool.js';

/**
 * Document Renewal Agent
 * Tracks document expiration dates and handles renewal workflows
 * Sequential workflow agent for multi-step renewal process
 */
export class DocumentRenewalAgent extends BaseAgent {
  private emailScanner: EmailScannerTool;
  private formFiller: FormFillerTool;
  private documentReader: DocumentReaderTool;

  constructor(memoryBank: any, sessionService: any) {
    super('document-agent', 'document', memoryBank, sessionService);
    this.emailScanner = new EmailScannerTool();
    this.formFiller = new FormFillerTool();
    this.documentReader = new DocumentReaderTool();
  }

  /**
   * Execute document renewal task
   */
  async execute(task: Task, sessionId: string): Promise<any> {
    this.log('info', 'Document Renewal Agent executing', { taskId: task.id });

    switch (task.type) {
      case 'document_renewal':
        return this.handleDocumentRenewal(task, sessionId);
      default:
        return this.scanAndTrackDocuments(sessionId);
    }
  }

  /**
   * Scan for document expiration notices
   */
  private async scanAndTrackDocuments(sessionId: string): Promise<any> {
    // Step 1: Scan emails for renewal notices
    const scanResult = await this.emailScanner.execute({
      categories: ['renewals']
    });

    if (!scanResult.success) {
      this.log('error', 'Email scan failed', { error: scanResult.error });
      return { success: false, error: scanResult.error };
    }

    const renewalNotices = scanResult.data.renewalNotices;
    this.log('info', 'Renewal notices scanned', { count: renewalNotices.length });

    // Step 2: Store documents in memory
    for (const notice of renewalNotices) {
      const document: Document = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: notice.type,
        name: notice.name,
        expirationDate: notice.expirationDate,
        issuer: notice.issuer,
        documentNumber: `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        renewalUrl: notice.renewalUrl
      };

      await this.storeMemory('document', document, {
        scannedAt: new Date(),
        source: 'email'
      });
    }

    // Step 3: Check for documents expiring soon (within 60 days)
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const docsExpiringSoon = renewalNotices.filter(
      (doc: any) => doc.expirationDate <= sixtyDaysFromNow
    );

    this.log('info', 'Documents expiring soon', { count: docsExpiringSoon.length });

    // Step 4: Send notifications
    for (const doc of docsExpiringSoon) {
      await this.sendMessage({
        type: 'DeadlineUpcoming',
        to: 'deadline-agent',
        payload: {
          document: doc,
          daysUntilExpiration: Math.ceil((doc.expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        }
      });
    }

    return {
      success: true,
      documentsFound: renewalNotices.length,
      documentsExpiringSoon: docsExpiringSoon.length
    };
  }

  /**
   * Handle document renewal (sequential workflow)
   */
  private async handleDocumentRenewal(task: Task, sessionId: string): Promise<any> {
    const { documentId, renewalUrl } = task.metadata;

    this.log('info', 'Starting document renewal workflow', { documentId });

    // Sequential workflow steps:
    // 1. Analyze renewal form
    // 2. Fill form with user data
    // 3. Check for missing fields
    // 4. Request user input if needed
    // 5. Submit form (if possible)

    try {
      // Step 1: Analyze form
      this.log('info', 'Step 1: Analyzing renewal form', { renewalUrl });
      const formAnalysis = await this.formFiller.analyzeForm(renewalUrl);

      if (!formAnalysis.success) {
        throw new Error('Form analysis failed');
      }

      // Step 2: Fill form
      this.log('info', 'Step 2: Filling form fields');
      const fillResult = await this.formFiller.execute({
        formUrl: renewalUrl,
        autoSubmit: false // Don't auto-submit, wait for user confirmation
      });

      if (!fillResult.success) {
        throw new Error('Form filling failed');
      }

      const { filledFields, missingFields, readyForSubmission } = fillResult.data;

      // Step 3: Check for missing required fields
      if (missingFields.length > 0) {
        this.log('warn', 'Step 3: Missing required fields', { missingFields });

        // Step 4: Request user input
        await this.sendMessage({
          type: 'AgentQuery',
          to: 'orchestrator',
          payload: {
            taskId: task.id,
            question: `Document renewal requires additional information`,
            missingFields,
            filledFields
          }
        });

        return {
          success: false,
          status: 'awaiting_user_input',
          missingFields,
          filledFields
        };
      }

      // Step 5: Form is ready (would submit in production)
      this.log('info', 'Step 5: Form ready for submission', { documentId });

      await this.sendMessage({
        type: 'FormCompleted',
        to: 'orchestrator',
        payload: {
          taskId: task.id,
          documentId,
          formUrl: renewalUrl,
          readyForSubmission: true
        }
      });

      return {
        success: true,
        status: 'form_ready',
        filledFields,
        message: 'Form filled and ready for submission'
      };
    } catch (error) {
      this.log('error', 'Document renewal workflow failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Loop execution for weekly document checks
   */
  async weeklyLoop(): Promise<void> {
    this.log('info', 'Starting weekly document check loop');

    const sessionId = this.sessionService.createSession();

    try {
      const result = await this.scanAndTrackDocuments(sessionId);
      this.log('info', 'Weekly document check completed', result);
    } catch (error) {
      this.log('error', 'Weekly document check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.sessionService.endSession(sessionId);
    }
  }
}
