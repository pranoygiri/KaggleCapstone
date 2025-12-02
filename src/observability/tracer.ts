import { ObservabilityEvent } from '../types/index.js';

export interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  agentId: string;
  taskId?: string;
  status: 'running' | 'completed' | 'error';
  metadata: Record<string, any>;
  children: TraceSpan[];
}

/**
 * Distributed tracing for agent workflows
 * Tracks execution flow across multiple agents and tools
 */
export class Tracer {
  private traces: Map<string, TraceSpan> = new Map();
  private activeSpans: Map<string, TraceSpan> = new Map();

  /**
   * Start a new trace span
   */
  startSpan(params: {
    name: string;
    agentId: string;
    taskId?: string;
    parentSpanId?: string;
    metadata?: Record<string, any>;
  }): string {
    const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const traceId = params.parentSpanId
      ? this.getTraceIdFromSpan(params.parentSpanId)
      : `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const span: TraceSpan = {
      spanId,
      parentSpanId: params.parentSpanId,
      traceId,
      name: params.name,
      startTime: new Date(),
      agentId: params.agentId,
      taskId: params.taskId,
      status: 'running',
      metadata: params.metadata || {},
      children: []
    };

    this.traces.set(spanId, span);
    this.activeSpans.set(spanId, span);

    // Link to parent
    if (params.parentSpanId) {
      const parent = this.traces.get(params.parentSpanId);
      if (parent) {
        parent.children.push(span);
      }
    }

    console.log(`[TRACE] Started span: ${params.name} (${spanId})`);
    return spanId;
  }

  /**
   * End a trace span
   */
  endSpan(spanId: string, status: 'completed' | 'error' = 'completed', metadata?: Record<string, any>) {
    const span = this.traces.get(spanId);
    if (!span) {
      console.warn(`[TRACE] Span not found: ${spanId}`);
      return;
    }

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;

    if (metadata) {
      span.metadata = { ...span.metadata, ...metadata };
    }

    this.activeSpans.delete(spanId);

    console.log(`[TRACE] Ended span: ${span.name} (${spanId}) - Duration: ${span.duration}ms - Status: ${status}`);
  }

  /**
   * Add metadata to a running span
   */
  addSpanMetadata(spanId: string, metadata: Record<string, any>) {
    const span = this.traces.get(spanId);
    if (span) {
      span.metadata = { ...span.metadata, ...metadata };
    }
  }

  /**
   * Get a trace by trace ID (root span and all children)
   */
  getTrace(traceId: string): TraceSpan[] {
    return Array.from(this.traces.values()).filter(span => span.traceId === traceId);
  }

  /**
   * Get all root spans (spans without parents)
   */
  getRootSpans(): TraceSpan[] {
    return Array.from(this.traces.values()).filter(span => !span.parentSpanId);
  }

  /**
   * Get trace hierarchy for visualization
   */
  getTraceHierarchy(traceId: string): TraceSpan | null {
    const rootSpan = Array.from(this.traces.values()).find(
      span => span.traceId === traceId && !span.parentSpanId
    );

    return rootSpan || null;
  }

  /**
   * Generate trace diagram (text-based)
   */
  generateTraceDiagram(traceId: string): string {
    const root = this.getTraceHierarchy(traceId);
    if (!root) {
      return 'Trace not found';
    }

    return this.spanToString(root, 0);
  }

  private spanToString(span: TraceSpan, depth: number): string {
    const indent = '  '.repeat(depth);
    const duration = span.duration ? `${span.duration}ms` : 'running';
    const status = span.status === 'error' ? '❌' : span.status === 'completed' ? '✅' : '⏳';

    let result = `${indent}${status} ${span.name} (${span.agentId}) - ${duration}\n`;

    for (const child of span.children) {
      result += this.spanToString(child, depth + 1);
    }

    return result;
  }

  private getTraceIdFromSpan(spanId: string): string {
    const span = this.traces.get(spanId);
    return span ? span.traceId : `trace-${Date.now()}`;
  }

  /**
   * Export traces for analysis
   */
  exportTraces(): TraceSpan[] {
    return Array.from(this.traces.values());
  }

  /**
   * Clear all traces
   */
  clearTraces() {
    this.traces.clear();
    this.activeSpans.clear();
  }

  /**
   * Get active (running) spans
   */
  getActiveSpans(): TraceSpan[] {
    return Array.from(this.activeSpans.values());
  }
}

// Global tracer instance
export const tracer = new Tracer();
