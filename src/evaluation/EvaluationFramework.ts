import { Task } from '../types/index.js';
import { logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import { tracer } from '../observability/tracer.js';

/**
 * Agent Evaluation Framework
 * Evaluates agent performance using benchmarks, scenarios, and rubrics
 */

export interface EvaluationScenario {
  id: string;
  name: string;
  description: string;
  taskType: Task['type'];
  mockData: any;
  expectedOutcome: any;
  rubric: EvaluationRubric;
}

export interface EvaluationRubric {
  criteria: {
    name: string;
    weight: number;
    evaluate: (result: any, expected: any) => number; // Returns score 0-1
  }[];
}

export interface EvaluationResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  score: number;
  maxScore: number;
  criteriaResults: {
    name: string;
    score: number;
    maxScore: number;
    passed: boolean;
  }[];
  duration: number;
  metadata: any;
}

export class EvaluationFramework {
  private scenarios: Map<string, EvaluationScenario> = new Map();

  constructor() {
    this.initializeScenarios();
  }

  /**
   * Initialize evaluation scenarios
   */
  private initializeScenarios() {
    // Scenario 1: Bill Payment Detection
    this.scenarios.set('bill-payment-detection', {
      id: 'bill-payment-detection',
      name: 'Bill Payment Detection',
      description: 'Agent should detect bills from PDF and extract key information',
      taskType: 'bill_payment',
      mockData: {
        pdfPath: '/mock/bills/electric-bill.pdf'
      },
      expectedOutcome: {
        billsDetected: true,
        fieldsExtracted: ['provider', 'amount', 'dueDate'],
        correctAmount: 125.50
      },
      rubric: {
        criteria: [
          {
            name: 'Bill Detection',
            weight: 0.3,
            evaluate: (result: any, expected: any) => {
              return result.success && result.billsFound > 0 ? 1 : 0;
            }
          },
          {
            name: 'Field Extraction Accuracy',
            weight: 0.4,
            evaluate: (result: any, expected: any) => {
              const extractedFields = result.bills?.[0] ? Object.keys(result.bills[0]) : [];
              const requiredFields = expected.fieldsExtracted;
              const matches = requiredFields.filter((f: string) => extractedFields.includes(f));
              return matches.length / requiredFields.length;
            }
          },
          {
            name: 'Due Date Warning',
            weight: 0.3,
            evaluate: (result: any, expected: any) => {
              return result.billsDueSoon > 0 ? 1 : 0.5;
            }
          }
        ]
      }
    });

    // Scenario 2: Document Renewal Form Filling
    this.scenarios.set('document-renewal-form', {
      id: 'document-renewal-form',
      name: 'Document Renewal Form Filling',
      description: 'Agent should auto-fill renewal form correctly',
      taskType: 'document_renewal',
      mockData: {
        documentId: 'license-123',
        renewalUrl: 'https://dmv.example.com/renew'
      },
      expectedOutcome: {
        formFilled: true,
        requiredFieldsCompleted: true,
        missingFields: 0
      },
      rubric: {
        criteria: [
          {
            name: 'Form Analysis',
            weight: 0.2,
            evaluate: (result: any, expected: any) => {
              return result.success ? 1 : 0;
            }
          },
          {
            name: 'Field Completion Rate',
            weight: 0.5,
            evaluate: (result: any, expected: any) => {
              if (!result.filledFields) return 0;
              const total = result.filledFields.length;
              const filled = result.filledFields.filter((f: any) => f.value).length;
              return total > 0 ? filled / total : 0;
            }
          },
          {
            name: 'Missing Field Handling',
            weight: 0.3,
            evaluate: (result: any, expected: any) => {
              return result.missingFields?.length === 0 ? 1 : 0.5;
            }
          }
        ]
      }
    });

    // Scenario 3: Subscription Detection and Analysis
    this.scenarios.set('subscription-analysis', {
      id: 'subscription-analysis',
      name: 'Subscription Detection and Analysis',
      description: 'Agent should detect subscriptions and analyze spending',
      taskType: 'subscription_management',
      mockData: {},
      expectedOutcome: {
        subscriptionsFound: true,
        analysisProvided: true,
        upcomingRenewals: true
      },
      rubric: {
        criteria: [
          {
            name: 'Subscription Detection',
            weight: 0.3,
            evaluate: (result: any, expected: any) => {
              return result.subscriptionsTracked > 0 ? 1 : 0;
            }
          },
          {
            name: 'Cost Analysis',
            weight: 0.4,
            evaluate: (result: any, expected: any) => {
              return result.analysis && result.analysis.totalYearlyProjection ? 1 : 0;
            }
          },
          {
            name: 'Renewal Detection',
            weight: 0.3,
            evaluate: (result: any, expected: any) => {
              return result.upcomingRenewals >= 0 ? 1 : 0;
            }
          }
        ]
      }
    });

    // Scenario 4: Deadline Conflict Detection
    this.scenarios.set('deadline-conflicts', {
      id: 'deadline-conflicts',
      name: 'Deadline Conflict Detection',
      description: 'Agent should detect when multiple deadlines fall on same day',
      taskType: 'deadline_tracking',
      mockData: {},
      expectedOutcome: {
        deadlinesAggregated: true,
        conflictsDetected: true
      },
      rubric: {
        criteria: [
          {
            name: 'Deadline Aggregation',
            weight: 0.4,
            evaluate: (result: any, expected: any) => {
              return result.totalDeadlines > 0 ? 1 : 0;
            }
          },
          {
            name: 'Conflict Detection',
            weight: 0.6,
            evaluate: (result: any, expected: any) => {
              return result.conflicts !== undefined ? 1 : 0;
            }
          }
        ]
      }
    });

    // Scenario 5: Memory Retrieval Accuracy
    this.scenarios.set('memory-retrieval', {
      id: 'memory-retrieval',
      name: 'Memory Retrieval Accuracy',
      description: 'Agent should retrieve relevant memories for context',
      taskType: 'bill_payment',
      mockData: {},
      expectedOutcome: {
        relevantMemoriesRetrieved: true,
        contextCompacted: true
      },
      rubric: {
        criteria: [
          {
            name: 'Memory Retrieval',
            weight: 0.5,
            evaluate: (result: any, expected: any) => {
              const retrievedCount = metrics.getCounter('memory.retrieved');
              return retrievedCount > 0 ? 1 : 0;
            }
          },
          {
            name: 'Context Efficiency',
            weight: 0.5,
            evaluate: (result: any, expected: any) => {
              const retrievedCount = metrics.getCounter('memory.retrieved');
              return retrievedCount <= 10 ? 1 : 0.5; // Should use context compaction
            }
          }
        ]
      }
    });

    logger.info('Evaluation scenarios initialized', {
      count: this.scenarios.size
    });
  }

  /**
   * Evaluate a single scenario
   */
  async evaluateScenario(
    scenarioId: string,
    agentExecuteFn: (task: Task, sessionId: string) => Promise<any>,
    sessionId: string
  ): Promise<EvaluationResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    logger.info('Evaluating scenario', {
      scenarioId,
      scenarioName: scenario.name
    });

    const startTime = Date.now();

    // Create task for scenario
    const task: Task = {
      id: `eval-task-${scenarioId}-${Date.now()}`,
      type: scenario.taskType,
      title: scenario.name,
      description: scenario.description,
      priority: 'medium',
      status: 'pending',
      metadata: scenario.mockData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Execute agent
    let result: any;
    try {
      result = await agentExecuteFn(task, sessionId);
    } catch (error) {
      logger.error('Scenario execution failed', { scenarioId, error });
      result = { success: false, error };
    }

    const duration = Date.now() - startTime;

    // Evaluate using rubric
    const criteriaResults = scenario.rubric.criteria.map(criterion => {
      const score = criterion.evaluate(result, scenario.expectedOutcome);
      const maxScore = criterion.weight;
      const actualScore = score * maxScore;

      return {
        name: criterion.name,
        score: actualScore,
        maxScore,
        passed: score >= 0.7 // 70% threshold
      };
    });

    const totalScore = criteriaResults.reduce((sum, c) => sum + c.score, 0);
    const maxScore = criteriaResults.reduce((sum, c) => sum + c.maxScore, 0);
    const passed = totalScore / maxScore >= 0.7; // 70% overall threshold

    const evaluationResult: EvaluationResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed,
      score: totalScore,
      maxScore,
      criteriaResults,
      duration,
      metadata: {
        result,
        expected: scenario.expectedOutcome
      }
    };

    logger.info('Scenario evaluation completed', {
      scenarioId,
      passed,
      score: totalScore,
      maxScore
    });

    return evaluationResult;
  }

  /**
   * Run all evaluation scenarios
   */
  async evaluateAll(
    agentExecuteFn: (task: Task, sessionId: string) => Promise<any>,
    sessionId: string
  ): Promise<EvaluationResult[]> {
    logger.info('Running all evaluation scenarios');

    const results: EvaluationResult[] = [];

    for (const [scenarioId] of this.scenarios) {
      try {
        const result = await this.evaluateScenario(scenarioId, agentExecuteFn, sessionId);
        results.push(result);
      } catch (error) {
        logger.error('Scenario evaluation error', { scenarioId, error });
      }
    }

    return results;
  }

  /**
   * Generate evaluation report
   */
  generateReport(results: EvaluationResult[]): string {
    let report = '=== Agent Evaluation Report ===\n\n';

    const totalPassed = results.filter(r => r.passed).length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const totalMaxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
    const overallPercentage = (totalScore / totalMaxScore) * 100;

    report += `Overall Results:\n`;
    report += `  Scenarios Passed: ${totalPassed}/${results.length}\n`;
    report += `  Overall Score: ${totalScore.toFixed(2)}/${totalMaxScore.toFixed(2)} (${overallPercentage.toFixed(1)}%)\n`;
    report += `  Status: ${overallPercentage >= 70 ? '✅ PASS' : '❌ FAIL'}\n\n`;

    report += `Scenario Results:\n`;
    report += `${'='.repeat(80)}\n\n`;

    for (const result of results) {
      const percentage = (result.score / result.maxScore) * 100;
      const status = result.passed ? '✅ PASS' : '❌ FAIL';

      report += `${status} ${result.scenarioName}\n`;
      report += `  Score: ${result.score.toFixed(2)}/${result.maxScore.toFixed(2)} (${percentage.toFixed(1)}%)\n`;
      report += `  Duration: ${result.duration}ms\n`;
      report += `  Criteria:\n`;

      for (const criterion of result.criteriaResults) {
        const critStatus = criterion.passed ? '  ✅' : '  ❌';
        const critPercentage = (criterion.score / criterion.maxScore) * 100;
        report += `${critStatus} ${criterion.name}: ${criterion.score.toFixed(2)}/${criterion.maxScore.toFixed(2)} (${critPercentage.toFixed(1)}%)\n`;
      }

      report += `\n`;
    }

    return report;
  }

  /**
   * Get all scenarios
   */
  getScenarios(): EvaluationScenario[] {
    return Array.from(this.scenarios.values());
  }
}
