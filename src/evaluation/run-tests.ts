import { EvaluationFramework } from './EvaluationFramework.js';
import { OrchestratorAgent } from '../agents/OrchestratorAgent.js';
import { MemoryBank } from '../memory/MemoryBank.js';
import { SessionService } from '../memory/SessionService.js';
import { logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import { tracer } from '../observability/tracer.js';

/**
 * Run agent evaluation tests
 */
async function runEvaluationTests() {
  console.log('🚀 Starting Agent Evaluation Tests\n');

  // Initialize system
  const memoryBank = new MemoryBank();
  const sessionService = new SessionService();
  const orchestrator = new OrchestratorAgent(memoryBank, sessionService);
  const evaluationFramework = new EvaluationFramework();

  // Create test session
  const sessionId = sessionService.createSession();

  // Run evaluations
  const results = await evaluationFramework.evaluateAll(
    (task, sessionId) => orchestrator.execute(task, sessionId),
    sessionId
  );

  // Generate report
  const report = evaluationFramework.generateReport(results);
  console.log(report);

  // Export metrics
  console.log('\n=== Metrics Summary ===\n');
  console.log(metrics.generateReport());

  // Export traces
  console.log('\n=== Trace Summary ===\n');
  const rootSpans = tracer.getRootSpans();
  console.log(`Total traces: ${rootSpans.length}`);

  // Session summary
  console.log('\n=== Session Summary ===\n');
  const sessionSummary = sessionService.getSessionSummary(sessionId);
  console.log(JSON.stringify(sessionSummary, null, 2));

  // Memory stats
  console.log('\n=== Memory Stats ===\n');
  const memoryStats = memoryBank.getStats();
  console.log(JSON.stringify(memoryStats, null, 2));

  console.log('\n✨ Evaluation Complete!\n');

  // Return exit code based on results
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runEvaluationTests().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
