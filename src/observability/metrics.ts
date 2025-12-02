import { MetricData } from '../types/index.js';

/**
 * Metrics collector for monitoring agent system performance
 */
export class MetricsCollector {
  private metrics: MetricData[] = [];
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();

  /**
   * Record a counter metric (cumulative)
   */
  incrementCounter(metricName: string, value: number = 1, tags?: Record<string, string>) {
    const currentValue = this.counters.get(metricName) || 0;
    this.counters.set(metricName, currentValue + value);

    this.recordMetric({
      metricName,
      value: currentValue + value,
      unit: 'count',
      tags: tags || {},
      timestamp: new Date()
    });
  }

  /**
   * Set a gauge metric (point-in-time value)
   */
  setGauge(metricName: string, value: number, tags?: Record<string, string>) {
    this.gauges.set(metricName, value);

    this.recordMetric({
      metricName,
      value,
      unit: 'value',
      tags: tags || {},
      timestamp: new Date()
    });
  }

  /**
   * Record a histogram/distribution metric
   */
  recordHistogram(metricName: string, value: number, unit: string, tags?: Record<string, string>) {
    this.recordMetric({
      metricName,
      value,
      unit,
      tags: tags || {},
      timestamp: new Date()
    });
  }

  /**
   * Record a timing metric (in milliseconds)
   */
  recordTiming(metricName: string, durationMs: number, tags?: Record<string, string>) {
    this.recordMetric({
      metricName,
      value: durationMs,
      unit: 'milliseconds',
      tags: tags || {},
      timestamp: new Date()
    });
  }

  private recordMetric(metric: MetricData) {
    this.metrics.push(metric);
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): MetricData[] {
    return this.metrics;
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(metricName: string): MetricData[] {
    return this.metrics.filter(m => m.metricName === metricName);
  }

  /**
   * Get counter value
   */
  getCounter(metricName: string): number {
    return this.counters.get(metricName) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(metricName: string): number {
    return this.gauges.get(metricName) || 0;
  }

  /**
   * Calculate statistics for a metric
   */
  getMetricStats(metricName: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } {
    const metricData = this.getMetricsByName(metricName);

    if (metricData.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const values = metricData.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: values.length,
      sum,
      avg,
      min,
      max
    };
  }

  /**
   * Generate metrics report
   */
  generateReport(): string {
    let report = '=== Metrics Report ===\n\n';

    // Counters
    report += '--- Counters ---\n';
    for (const [name, value] of this.counters.entries()) {
      report += `${name}: ${value}\n`;
    }

    // Gauges
    report += '\n--- Gauges ---\n';
    for (const [name, value] of this.gauges.entries()) {
      report += `${name}: ${value}\n`;
    }

    // Stats for histogram metrics
    report += '\n--- Timing Metrics ---\n';
    const timingMetrics = Array.from(new Set(
      this.metrics
        .filter(m => m.unit === 'milliseconds')
        .map(m => m.metricName)
    ));

    for (const metricName of timingMetrics) {
      const stats = this.getMetricStats(metricName);
      report += `${metricName}:\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Avg: ${stats.avg.toFixed(2)}ms\n`;
      report += `  Min: ${stats.min}ms\n`;
      report += `  Max: ${stats.max}ms\n`;
    }

    return report;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.counters.clear();
    this.gauges.clear();
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: MetricData[];
  } {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: this.metrics.filter(m => m.unit === 'milliseconds')
    };
  }
}

// Global metrics collector instance
export const metrics = new MetricsCollector();

// Standard metrics helpers
export const standardMetrics = {
  // Task metrics
  taskCompleted: (taskType: string) =>
    metrics.incrementCounter('tasks.completed', 1, { type: taskType }),

  taskFailed: (taskType: string, reason: string) =>
    metrics.incrementCounter('tasks.failed', 1, { type: taskType, reason }),

  // Agent metrics
  agentCalled: (agentId: string) =>
    metrics.incrementCounter('agents.calls', 1, { agent: agentId }),

  agentDuration: (agentId: string, durationMs: number) =>
    metrics.recordTiming('agents.duration', durationMs, { agent: agentId }),

  // Tool metrics
  toolCalled: (toolName: string) =>
    metrics.incrementCounter('tools.calls', 1, { tool: toolName }),

  toolSuccess: (toolName: string) =>
    metrics.incrementCounter('tools.success', 1, { tool: toolName }),

  toolFailure: (toolName: string) =>
    metrics.incrementCounter('tools.failure', 1, { tool: toolName }),

  // Bill payment metrics
  billPaymentSuccess: () =>
    metrics.incrementCounter('bills.payment.success'),

  billPaymentFailure: () =>
    metrics.incrementCounter('bills.payment.failure'),

  // Appointment metrics
  appointmentScheduled: () =>
    metrics.incrementCounter('appointments.scheduled'),

  appointmentSuccess: () =>
    metrics.incrementCounter('appointments.success'),

  // Subscription metrics
  subscriptionAdded: () =>
    metrics.incrementCounter('subscriptions.added'),

  subscriptionCancelled: () =>
    metrics.incrementCounter('subscriptions.cancelled'),

  // Memory metrics
  memoryRetrieved: (count: number) =>
    metrics.setGauge('memory.retrieved', count),

  memoryStored: () =>
    metrics.incrementCounter('memory.stored'),
};
