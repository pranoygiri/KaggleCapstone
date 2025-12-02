import { AgentState, Task, AgentMessage } from '../types/index.js';
import { logger } from '../observability/logger.js';

/**
 * Session management for agent orchestration
 * Maintains state across agent interactions within a single run
 */
export class SessionService {
  private sessions: Map<string, Session> = new Map();

  /**
   * Create a new session
   */
  createSession(sessionId?: string): string {
    const id = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: Session = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      agentStates: new Map(),
      tasks: new Map(),
      messages: [],
      checkpoints: []
    };

    this.sessions.set(id, session);
    logger.info('Session created', { sessionId: id });

    return id;
  }

  /**
   * Get a session
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Update agent state in session
   */
  updateAgentState(sessionId: string, agentState: AgentState): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.agentStates.set(agentState.agentId, agentState);
    session.updatedAt = new Date();

    logger.debug('Agent state updated', {
      sessionId,
      agentId: agentState.agentId,
      status: agentState.status
    });

    return true;
  }

  /**
   * Get agent state from session
   */
  getAgentState(sessionId: string, agentId: string): AgentState | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return session.agentStates.get(agentId) || null;
  }

  /**
   * Add a task to session
   */
  addTask(sessionId: string, task: Task): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.tasks.set(task.id, task);
    session.updatedAt = new Date();

    logger.info('Task added to session', {
      sessionId,
      taskId: task.id,
      taskType: task.type
    });

    return true;
  }

  /**
   * Update a task in session
   */
  updateTask(sessionId: string, taskId: string, updates: Partial<Task>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const task = session.tasks.get(taskId);
    if (!task) {
      return false;
    }

    Object.assign(task, updates);
    task.updatedAt = new Date();
    session.updatedAt = new Date();

    logger.debug('Task updated in session', {
      sessionId,
      taskId,
      status: task.status
    });

    return true;
  }

  /**
   * Get all tasks in session
   */
  getTasks(sessionId: string, filter?: { status?: Task['status']; type?: Task['type'] }): Task[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    let tasks = Array.from(session.tasks.values());

    if (filter) {
      if (filter.status) {
        tasks = tasks.filter(t => t.status === filter.status);
      }
      if (filter.type) {
        tasks = tasks.filter(t => t.type === filter.type);
      }
    }

    return tasks;
  }

  /**
   * Add a message to session
   */
  addMessage(sessionId: string, message: AgentMessage): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.messages.push(message);
    session.updatedAt = new Date();

    logger.debug('Message added to session', {
      sessionId,
      messageType: message.type,
      from: message.from,
      to: message.to
    });

    return true;
  }

  /**
   * Get messages in session
   */
  getMessages(sessionId: string, filter?: { from?: string; to?: string; type?: AgentMessage['type'] }): AgentMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    let messages = session.messages;

    if (filter) {
      if (filter.from) {
        messages = messages.filter(m => m.from === filter.from);
      }
      if (filter.to) {
        messages = messages.filter(m => m.to === filter.to);
      }
      if (filter.type) {
        messages = messages.filter(m => m.type === filter.type);
      }
    }

    return messages;
  }

  /**
   * Create a checkpoint of current session state
   */
  createCheckpoint(sessionId: string, name: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const checkpoint: SessionCheckpoint = {
      name,
      timestamp: new Date(),
      agentStates: new Map(session.agentStates),
      tasks: new Map(session.tasks),
      messageCount: session.messages.length
    };

    session.checkpoints.push(checkpoint);

    logger.info('Session checkpoint created', {
      sessionId,
      checkpointName: name
    });

    return true;
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): SessionSummary | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const tasks = Array.from(session.tasks.values());
    const tasksByStatus: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0
    };

    tasks.forEach(t => {
      tasksByStatus[t.status]++;
    });

    const agents = Array.from(session.agentStates.keys());

    return {
      sessionId: session.id,
      duration: Date.now() - session.createdAt.getTime(),
      totalTasks: tasks.length,
      tasksByStatus,
      activeAgents: agents,
      messageCount: session.messages.length,
      checkpointCount: session.checkpoints.length
    };
  }

  /**
   * End a session
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Create final checkpoint
    this.createCheckpoint(sessionId, 'session_end');

    logger.info('Session ended', {
      sessionId,
      duration: Date.now() - session.createdAt.getTime(),
      taskCount: session.tasks.size
    });

    return true;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logger.info('Session deleted', { sessionId });
    }
    return deleted;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions
   */
  clearAll() {
    this.sessions.clear();
    logger.info('All sessions cleared');
  }
}

// Supporting interfaces

interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  agentStates: Map<string, AgentState>;
  tasks: Map<string, Task>;
  messages: AgentMessage[];
  checkpoints: SessionCheckpoint[];
}

interface SessionCheckpoint {
  name: string;
  timestamp: Date;
  agentStates: Map<string, AgentState>;
  tasks: Map<string, Task>;
  messageCount: number;
}

interface SessionSummary {
  sessionId: string;
  duration: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  activeAgents: string[];
  messageCount: number;
  checkpointCount: number;
}
