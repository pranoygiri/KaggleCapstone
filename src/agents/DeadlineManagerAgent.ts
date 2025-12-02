import { BaseAgent } from './BaseAgent.js';
import { Task } from '../types/index.js';

/**
 * Deadline Manager Agent
 * Aggregates all deadlines from other agents, sends reminders, detects conflicts
 */
export class DeadlineManagerAgent extends BaseAgent {
  private deadlines: Map<string, any> = new Map();

  constructor(memoryBank: any, sessionService: any) {
    super('deadline-agent', 'deadline', memoryBank, sessionService);
  }

  async execute(task: Task, sessionId: string): Promise<any> {
    this.log('info', 'Deadline Manager Agent executing', { taskId: task.id });

    switch (task.type) {
      case 'deadline_tracking':
        return this.trackAndManageDeadlines(sessionId);
      default:
        return this.processIncomingDeadlines(sessionId);
    }
  }

  private async processIncomingDeadlines(sessionId: string): Promise<any> {
    // Process DeadlineUpcoming messages from other agents
    const messages = await this.receiveMessages({ type: 'DeadlineUpcoming' });

    this.log('info', 'Processing deadline messages', { count: messages.length });

    for (const msg of messages) {
      const deadlineId = `dl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.deadlines.set(deadlineId, {
        id: deadlineId,
        source: msg.from,
        data: msg.payload,
        receivedAt: msg.timestamp
      });

      await this.storeMemory('task_history', {
        type: 'deadline_registered',
        deadlineId,
        source: msg.from,
        data: msg.payload
      });
    }

    return { success: true, deadlinesProcessed: messages.length };
  }

  private async trackAndManageDeadlines(sessionId: string): Promise<any> {
    // Get all deadlines from memory
    const billMemories = await this.memoryBank.retrieveByType('bill');
    const docMemories = await this.memoryBank.retrieveByType('document');
    const subMemories = await this.memoryBank.retrieveByType('subscription');
    const apptMemories = await this.memoryBank.retrieveByType('appointment');

    const allDeadlines = [
      ...billMemories.map((m: any) => ({ type: 'bill', date: m.content.dueDate, data: m.content })),
      ...docMemories.map((m: any) => ({ type: 'document', date: m.content.expirationDate, data: m.content })),
      ...subMemories.map((m: any) => ({ type: 'subscription', date: m.content.nextBillingDate, data: m.content })),
      ...apptMemories.map((m: any) => ({ type: 'appointment', date: m.content.dateTime, data: m.content }))
    ];

    // Sort by date
    allDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Detect conflicts (multiple items on same day)
    const conflicts = this.detectConflicts(allDeadlines);

    this.log('info', 'Deadlines tracked', {
      total: allDeadlines.length,
      conflicts: conflicts.length
    });

    // Send reminders for upcoming deadlines (within 3 days)
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const upcomingDeadlines = allDeadlines.filter(
      d => new Date(d.date) <= threeDaysFromNow && new Date(d.date) >= now
    );

    for (const deadline of upcomingDeadlines) {
      await this.sendMessage({
        type: 'ReminderSet',
        to: 'orchestrator',
        payload: {
          deadline,
          daysUntil: Math.ceil((new Date(deadline.date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        }
      });
    }

    return {
      success: true,
      totalDeadlines: allDeadlines.length,
      upcomingDeadlines: upcomingDeadlines.length,
      conflicts,
      nextDeadline: allDeadlines[0] || null
    };
  }

  private detectConflicts(deadlines: any[]): any[] {
    const conflicts: any[] = [];
    const dateGroups = new Map<string, any[]>();

    for (const deadline of deadlines) {
      const dateKey = new Date(deadline.date).toDateString();
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(deadline);
    }

    for (const [date, items] of dateGroups.entries()) {
      if (items.length > 2) {
        conflicts.push({ date, items, severity: 'high' });
      }
    }

    return conflicts;
  }
}
