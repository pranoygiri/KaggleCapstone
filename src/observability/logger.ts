import { ObservabilityEvent } from '../types/index.js';

/**
 * Simple logger for the agent system
 * In production, would use Winston, Pino, or similar structured logging library
 */
export class Logger {
  private events: ObservabilityEvent[] = [];
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel;
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      this.log('info', message, data);
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      this.log('warn', message, data);
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog('error')) {
      this.log('error', message, data);
    }
  }

  private log(level: string, message: string, data?: any) {
    const event: ObservabilityEvent = {
      id: `log-${Date.now()}-${Math.random()}`,
      type: 'log',
      timestamp: new Date(),
      agentId: 'system',
      data: {
        level,
        message,
        ...data
      }
    };

    this.events.push(event);

    // Console output
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${logData}`);
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  getEvents(): ObservabilityEvent[] {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

// Global logger instance
export const logger = new Logger('info');
