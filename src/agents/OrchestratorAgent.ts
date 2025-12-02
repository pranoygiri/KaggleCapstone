import { BaseAgent } from './BaseAgent.js';
import { Task, AgentMessage } from '../types/index.js';
import { BillManagementAgent } from './BillManagementAgent.js';
import { DocumentRenewalAgent } from './DocumentRenewalAgent.js';
import { SubscriptionTrackerAgent } from './SubscriptionTrackerAgent.js';
import { AppointmentSchedulerAgent } from './AppointmentSchedulerAgent.js';
import { DeadlineManagerAgent } from './DeadlineManagerAgent.js';

/**
 * Orchestrator Agent
 * Central decision-maker that routes tasks to specialized agents
 * Implements A2A (Agent-to-Agent) protocol for communication
 */
export class OrchestratorAgent extends BaseAgent {
  private agents: Map<string, BaseAgent> = new Map();
  private sharedMessageBus: AgentMessage[] = [];

  constructor(memoryBank: any, sessionService: any) {
    super('orchestrator', 'orchestrator', memoryBank, sessionService);

    // Initialize specialized agents
    this.agents.set('bill-agent', new BillManagementAgent(memoryBank, sessionService));
    this.agents.set('document-agent', new DocumentRenewalAgent(memoryBank, sessionService));
    this.agents.set('subscription-agent', new SubscriptionTrackerAgent(memoryBank, sessionService));
    this.agents.set('appointment-agent', new AppointmentSchedulerAgent(memoryBank, sessionService));
    this.agents.set('deadline-agent', new DeadlineManagerAgent(memoryBank, sessionService));

    this.log('info', 'Orchestrator initialized with agents', {
      agents: Array.from(this.agents.keys())
    });
  }

  async execute(task: Task, sessionId: string): Promise<any> {
    this.log('info', 'Orchestrator executing', { taskId: task.id, taskType: task.type });

    // Route task to appropriate agent
    const targetAgent = this.routeTask(task);

    if (!targetAgent) {
      this.log('error', 'No agent found for task', { taskType: task.type });
      return { success: false, error: 'No suitable agent found' };
    }

    this.log('info', 'Routing task to agent', {
      taskId: task.id,
      targetAgent: targetAgent.getAgentId()
    });

    // Execute task with target agent
    const result = await targetAgent.executeWithObservability(task, sessionId);

    // Process any messages from agents (A2A protocol)
    await this.processAgentMessages(sessionId);

    return result;
  }

  /**
   * Route task to appropriate agent based on task type
   */
  private routeTask(task: Task): BaseAgent | null {
    const routingMap: Record<Task['type'], string> = {
      'bill_payment': 'bill-agent',
      'document_renewal': 'document-agent',
      'subscription_management': 'subscription-agent',
      'appointment_scheduling': 'appointment-agent',
      'deadline_tracking': 'deadline-agent'
    };

    const agentId = routingMap[task.type];
    return agentId ? this.agents.get(agentId) || null : null;
  }

  /**
   * Process incoming messages from agents (A2A Protocol)
   */
  private async processAgentMessages(sessionId: string): Promise<void> {
    // Get messages addressed to orchestrator
    const messages = this.sharedMessageBus.filter(m => m.to === 'orchestrator');

    for (const message of messages) {
      this.log('info', 'Processing A2A message', {
        type: message.type,
        from: message.from
      });

      await this.handleA2AMessage(message, sessionId);

      // Add to session
      this.sessionService.addMessage(sessionId, message);
    }

    // Clear processed messages
    this.sharedMessageBus = this.sharedMessageBus.filter(m => m.to !== 'orchestrator');
  }

  /**
   * Handle different types of A2A messages
   */
  private async handleA2AMessage(message: AgentMessage, sessionId: string): Promise<void> {
    switch (message.type) {
      case 'PaymentRequired':
        this.log('info', 'Payment required notification received', message.payload);
        // Could create a new task for payment or notify user
        break;

      case 'DeadlineUpcoming':
        this.log('info', 'Deadline upcoming notification received', message.payload);
        // Could send user notification
        break;

      case 'FormCompleted':
        this.log('info', 'Form completed notification received', message.payload);
        // Could notify user that form is ready for review
        break;

      case 'TaskCompleted':
        this.log('info', 'Task completed notification received', message.payload);
        // Update task status in session
        if (message.payload.taskId) {
          this.sessionService.updateTask(sessionId, message.payload.taskId, {
            status: 'completed'
          });
        }
        break;

      case 'AgentQuery':
        this.log('info', 'Agent query received', message.payload);
        // Agent needs user input - would notify user in production
        break;

      case 'ReminderSet':
        this.log('info', 'Reminder set notification received', message.payload);
        // Could schedule notification or add to calendar
        break;

      default:
        this.log('warn', 'Unknown message type', { type: message.type });
    }
  }

  /**
   * Execute all agents in parallel for daily scan
   */
  async runDailyScan(): Promise<any> {
    this.log('info', 'Running daily scan with all agents in parallel');

    const sessionId = this.sessionService.createSession();
    this.sessionService.createCheckpoint(sessionId, 'daily_scan_start');

    const results = await Promise.allSettled([
      this.agents.get('bill-agent')?.execute(this.createScanTask('bill'), sessionId),
      this.agents.get('subscription-agent')?.execute(this.createScanTask('subscription'), sessionId),
      this.agents.get('appointment-agent')?.execute(this.createScanTask('appointment'), sessionId)
    ]);

    // After parallel scanning, run deadline agent to aggregate
    await this.agents.get('deadline-agent')?.execute(
      this.createScanTask('deadline'),
      sessionId
    );

    // Process all A2A messages
    await this.processAgentMessages(sessionId);

    this.sessionService.createCheckpoint(sessionId, 'daily_scan_complete');

    const summary = this.sessionService.getSessionSummary(sessionId);

    this.log('info', 'Daily scan completed', summary);

    return { success: true, sessionId, summary, results };
  }

  /**
   * Execute weekly tasks
   */
  async runWeeklyTasks(): Promise<any> {
    this.log('info', 'Running weekly tasks');

    const sessionId = this.sessionService.createSession();

    // Weekly tasks run sequentially
    const documentScan = await this.agents.get('document-agent')?.execute(
      this.createScanTask('document'),
      sessionId
    );

    const subscriptionAnalysis = await this.agents.get('subscription-agent')?.execute(
      this.createScanTask('subscription'),
      sessionId
    );

    await this.processAgentMessages(sessionId);

    return { success: true, sessionId, documentScan, subscriptionAnalysis };
  }

  /**
   * Get system status across all agents
   */
  async getSystemStatus(sessionId?: string): Promise<any> {
    const memoryStats = this.memoryBank.getStats();
    const sessions = sessionId
      ? [this.sessionService.getSessionSummary(sessionId)]
      : [];

    const agentStatuses = Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      type: agent.getAgentType()
    }));

    return {
      orchestrator: this.agentId,
      agents: agentStatuses,
      memory: memoryStats,
      sessions
    };
  }

  /**
   * Send message via shared bus (A2A Protocol implementation)
   */
  async broadcastMessage(message: AgentMessage): Promise<void> {
    this.sharedMessageBus.push(message);

    this.log('info', 'Message broadcasted', {
      type: message.type,
      from: message.from,
      to: message.to
    });
  }

  /**
   * Helper to create scan tasks
   */
  private createScanTask(type: string): Task {
    return {
      id: `task-${type}-${Date.now()}`,
      type: type as any,
      title: `${type} scan`,
      description: `Automated ${type} scanning task`,
      priority: 'medium',
      status: 'pending',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
