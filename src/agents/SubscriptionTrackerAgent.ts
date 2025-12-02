import { BaseAgent } from './BaseAgent.js';
import { Task, Subscription } from '../types/index.js';
import { EmailScannerTool } from '../tools/EmailScannerTool.js';
import { standardMetrics } from '../observability/metrics.js';

/**
 * Subscription Tracker Agent
 * Monitors subscriptions, detects renewals, and suggests optimizations
 */
export class SubscriptionTrackerAgent extends BaseAgent {
  private emailScanner: EmailScannerTool;

  constructor(memoryBank: any, sessionService: any) {
    super('subscription-agent', 'subscription', memoryBank, sessionService);
    this.emailScanner = new EmailScannerTool();
  }

  /**
   * Execute subscription management task
   */
  async execute(task: Task, sessionId: string): Promise<any> {
    this.log('info', 'Subscription Tracker Agent executing', { taskId: task.id });

    switch (task.type) {
      case 'subscription_management':
        return this.handleSubscriptionManagement(task, sessionId);
      default:
        return this.scanAndTrackSubscriptions(sessionId);
    }
  }

  /**
   * Scan and track subscriptions
   */
  private async scanAndTrackSubscriptions(sessionId: string): Promise<any> {
    // Step 1: Scan emails for subscription information
    const scanResult = await this.emailScanner.execute({
      categories: ['subscriptions']
    });

    if (!scanResult.success) {
      this.log('error', 'Email scan failed', { error: scanResult.error });
      return { success: false, error: scanResult.error };
    }

    const subscriptions: Subscription[] = scanResult.data.subscriptionChanges;
    this.log('info', 'Subscriptions scanned', { count: subscriptions.length });

    // Step 2: Store/update subscriptions in memory
    for (const sub of subscriptions) {
      await this.storeMemory('subscription', sub, {
        scannedAt: new Date(),
        source: 'email'
      });
      standardMetrics.subscriptionAdded();
    }

    // Step 3: Analyze subscription costs and identify opportunities
    const analysis = await this.analyzeSubscriptions(subscriptions);

    // Step 4: Check for upcoming renewals (within 15 days)
    const now = new Date();
    const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const upcomingRenewals = subscriptions.filter(
      sub => sub.autoRenew && sub.nextBillingDate <= fifteenDaysFromNow
    );

    this.log('info', 'Upcoming renewals identified', { count: upcomingRenewals.length });

    // Step 5: Send notifications for upcoming renewals
    for (const sub of upcomingRenewals) {
      await this.sendMessage({
        type: 'ReminderSet',
        to: 'orchestrator',
        payload: {
          subscription: sub,
          message: `${sub.service} will auto-renew in ${Math.ceil((sub.nextBillingDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))} days`,
          amount: sub.amount
        }
      });
    }

    return {
      success: true,
      subscriptionsTracked: subscriptions.length,
      upcomingRenewals: upcomingRenewals.length,
      analysis
    };
  }

  /**
   * Handle subscription management task
   */
  private async handleSubscriptionManagement(task: Task, sessionId: string): Promise<any> {
    const { action, subscriptionId } = task.metadata;

    this.log('info', 'Managing subscription', { action, subscriptionId });

    // Retrieve subscription from memory
    const memories = await this.memoryBank.retrieveByType('subscription');
    const subMemory = memories.find((m: any) => m.content.id === subscriptionId);

    if (!subMemory) {
      return {
        success: false,
        error: 'Subscription not found'
      };
    }

    const subscription = subMemory.content;

    switch (action) {
      case 'cancel':
        // In production, would call subscription provider API
        this.log('info', 'Cancelling subscription', { subscriptionId });

        subscription.autoRenew = false;
        await this.memoryBank.update(subMemory.id, subMemory);

        standardMetrics.subscriptionCancelled();

        await this.sendMessage({
          type: 'TaskCompleted',
          to: 'orchestrator',
          payload: {
            taskId: task.id,
            message: `Subscription ${subscription.service} cancelled`
          }
        });

        return {
          success: true,
          action: 'cancelled',
          subscription
        };

      case 'pause':
        this.log('info', 'Pausing subscription', { subscriptionId });
        // Would implement pause logic
        return {
          success: true,
          action: 'paused',
          subscription
        };

      case 'remind':
        this.log('info', 'Setting reminder for subscription', { subscriptionId });

        await this.sendMessage({
          type: 'ReminderSet',
          to: 'orchestrator',
          payload: {
            subscription,
            message: `Reminder: ${subscription.service} renews on ${subscription.nextBillingDate.toDateString()}`
          }
        });

        return {
          success: true,
          action: 'reminded',
          subscription
        };

      default:
        return {
          success: false,
          error: 'Unknown action'
        };
    }
  }

  /**
   * Analyze subscriptions for cost optimization
   */
  private async analyzeSubscriptions(subscriptions: Subscription[]): Promise<any> {
    const totalMonthly = subscriptions
      .filter(s => s.billingCycle === 'monthly')
      .reduce((sum, s) => sum + s.amount, 0);

    const totalAnnual = subscriptions
      .filter(s => s.billingCycle === 'annually')
      .reduce((sum, s) => sum + s.amount, 0);

    const byCategory = subscriptions.reduce((acc: Record<string, number>, sub) => {
      acc[sub.category] = (acc[sub.category] || 0) + sub.amount;
      return acc;
    }, {});

    // Identify potential duplicates (same category)
    const categoryGroups = subscriptions.reduce((acc: Record<string, Subscription[]>, sub) => {
      if (!acc[sub.category]) acc[sub.category] = [];
      acc[sub.category].push(sub);
      return acc;
    }, {});

    const potentialDuplicates = Object.entries(categoryGroups)
      .filter(([_, subs]) => subs.length > 1)
      .map(([category, subs]) => ({ category, subscriptions: subs }));

    return {
      totalMonthlySpend: totalMonthly,
      totalAnnualSpend: totalAnnual,
      totalYearlyProjection: totalMonthly * 12 + totalAnnual,
      spendByCategory: byCategory,
      potentialDuplicates,
      recommendations: potentialDuplicates.length > 0
        ? [`Consider consolidating ${potentialDuplicates.length} duplicate categories`]
        : []
    };
  }

  /**
   * Loop execution for weekly subscription checks
   */
  async weeklyLoop(): Promise<void> {
    this.log('info', 'Starting weekly subscription check loop');

    const sessionId = this.sessionService.createSession();

    try {
      const result = await this.scanAndTrackSubscriptions(sessionId);
      this.log('info', 'Weekly subscription check completed', result);
    } catch (error) {
      this.log('error', 'Weekly subscription check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.sessionService.endSession(sessionId);
    }
  }
}
