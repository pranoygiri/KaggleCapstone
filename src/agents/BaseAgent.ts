import { Task, AgentMessage, AgentState, Memory } from '../types/index.js';
import { logger } from '../observability/logger.js';
import { tracer } from '../observability/tracer.js';
import { standardMetrics } from '../observability/metrics.js';
import { MemoryBank } from '../memory/MemoryBank.js';
import { SessionService } from '../memory/SessionService.js';

/**
 * Base Agent class that all specialized agents extend
 * Provides common functionality for agent operations
 */
export abstract class BaseAgent {
  protected agentId: string;
  protected agentType: string;
  protected memoryBank: MemoryBank;
  protected sessionService: SessionService;
  protected messageQueue: AgentMessage[] = [];

  constructor(
    agentId: string,
    agentType: string,
    memoryBank: MemoryBank,
    sessionService: SessionService
  ) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.memoryBank = memoryBank;
    this.sessionService = sessionService;
  }

  /**
   * Abstract method that each agent must implement
   * Main execution logic for the agent
   */
  abstract execute(task: Task, sessionId: string): Promise<any>;

  /**
   * Send a message to another agent (A2A communication)
   */
  protected async sendMessage(message: Omit<AgentMessage, 'from' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      from: this.agentId,
      timestamp: new Date()
    };

    logger.info('Agent sending message', {
      from: fullMessage.from,
      to: fullMessage.to,
      type: fullMessage.type
    });

    // Add to recipient's queue (in production, would use message broker)
    this.messageQueue.push(fullMessage);
  }

  /**
   * Receive and process incoming messages
   */
  protected async receiveMessages(filter?: { type?: AgentMessage['type'] }): Promise<AgentMessage[]> {
    let messages = this.messageQueue.filter(m => m.to === this.agentId);

    if (filter?.type) {
      messages = messages.filter(m => m.type === filter.type);
    }

    // Clear processed messages
    this.messageQueue = this.messageQueue.filter(m => m.to !== this.agentId);

    return messages;
  }

  /**
   * Get relevant memories for this agent
   */
  protected async getRelevantMemories(maxMemories: number = 10): Promise<Memory[]> {
    return this.memoryBank.compactContextForAgent({
      agentType: this.agentType,
      maxMemories
    });
  }

  /**
   * Store a memory
   */
  protected async storeMemory(type: Memory['type'], content: any, metadata?: Record<string, any>): Promise<string> {
    return this.memoryBank.store({ type, content, metadata });
  }

  /**
   * Update agent state in session
   */
  protected async updateState(
    sessionId: string,
    status: AgentState['status'],
    currentTask?: Task,
    metadata?: Record<string, any>
  ): Promise<void> {
    const memories = await this.getRelevantMemories(5);

    const state: AgentState = {
      agentId: this.agentId,
      status,
      currentTask,
      memorySnapshot: memories,
      lastUpdate: new Date(),
      metadata: metadata || {}
    };

    this.sessionService.updateAgentState(sessionId, state);

    logger.debug('Agent state updated', {
      agentId: this.agentId,
      status,
      sessionId
    });
  }

  /**
   * Start tracing for this agent's execution
   */
  protected startTrace(name: string, taskId?: string, parentSpanId?: string): string {
    return tracer.startSpan({
      name,
      agentId: this.agentId,
      taskId,
      parentSpanId,
      metadata: { agentType: this.agentType }
    });
  }

  /**
   * End tracing span
   */
  protected endTrace(spanId: string, status: 'completed' | 'error' = 'completed', metadata?: Record<string, any>): void {
    tracer.endSpan(spanId, status, metadata);
  }

  /**
   * Log agent activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      agentId: this.agentId,
      agentType: this.agentType,
      ...data
    };

    switch (level) {
      case 'info':
        logger.info(message, logData);
        break;
      case 'warn':
        logger.warn(message, logData);
        break;
      case 'error':
        logger.error(message, logData);
        break;
    }
  }

  /**
   * Record metrics
   */
  protected recordMetric(metricName: string, value: number, tags?: Record<string, string>): void {
    const metricTags = {
      agent: this.agentId,
      agentType: this.agentType,
      ...tags
    };

    standardMetrics.agentCalled(this.agentId);
  }

  /**
   * Execute with full observability
   */
  async executeWithObservability(task: Task, sessionId: string): Promise<any> {
    const spanId = this.startTrace(`${this.agentType}_execute`, task.id);
    const startTime = Date.now();

    try {
      // Update state to running
      await this.updateState(sessionId, 'running', task);

      // Record metric
      standardMetrics.agentCalled(this.agentId);

      // Execute agent logic
      const result = await this.execute(task, sessionId);

      // Update state to idle
      await this.updateState(sessionId, 'idle');

      // Record success
      const duration = Date.now() - startTime;
      standardMetrics.agentDuration(this.agentId, duration);
      this.endTrace(spanId, 'completed', { result, duration });

      this.log('info', 'Agent execution completed', {
        taskId: task.id,
        duration
      });

      return result;
    } catch (error) {
      // Update state to error
      await this.updateState(sessionId, 'error', task, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Record failure
      const duration = Date.now() - startTime;
      this.endTrace(spanId, 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      this.log('error', 'Agent execution failed', {
        taskId: task.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Get agent ID
   */
  getAgentId(): string {
    return this.agentId;
  }

  /**
   * Get agent type
   */
  getAgentType(): string {
    return this.agentType;
  }
}
