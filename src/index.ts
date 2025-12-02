/**
 * Personal Errand & Task Management Agent System
 * Main entry point demonstrating the system
 */

import { OrchestratorAgent } from './agents/OrchestratorAgent.js';
import { MemoryBank } from './memory/MemoryBank.js';
import { SessionService } from './memory/SessionService.js';
import { Task } from './types/index.js';
import { logger } from './observability/logger.js';
import { metrics } from './observability/metrics.js';
import { tracer } from './observability/tracer.js';

async function main() {
  console.log('\n🤖 Personal Errand & Task Management Agent System');
  console.log('='.repeat(60));
  console.log('\nInitializing system...\n');

  // Initialize components
  const memoryBank = new MemoryBank();
  const sessionService = new SessionService();
  const orchestrator = new OrchestratorAgent(memoryBank, sessionService);

  // Create a session
  const sessionId = sessionService.createSession();
  console.log(`✅ Session created: ${sessionId}\n`);

  // Demonstration 1: Run daily scan (parallel agents)
  console.log('📡 Running Daily Scan (Parallel Agents)');
  console.log('-'.repeat(60));
  const dailyScanResult = await orchestrator.runDailyScan();
  console.log('✅ Daily scan completed');
  console.log(`   Bills found: ${dailyScanResult.results[0]?.value?.billsFound || 0}`);
  console.log(`   Subscriptions tracked: ${dailyScanResult.results[1]?.value?.subscriptionsTracked || 0}`);
  console.log(`   Appointments tracked: ${dailyScanResult.results[2]?.value?.appointmentsTracked || 0}\n`);

  // Demonstration 2: Submit a bill payment task
  console.log('💰 Submitting Bill Payment Task');
  console.log('-'.repeat(60));

  const billTask: Task = {
    id: 'task-bill-demo',
    type: 'bill_payment',
    title: 'Pay Electric Bill',
    description: 'Pay electric company bill',
    priority: 'high',
    status: 'pending',
    metadata: {
      billId: 'bill-123',
      amount: 125.50,
      paymentMethod: 'bank_account'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  sessionService.addTask(sessionId, billTask);
  const billResult = await orchestrator.executeWithObservability(billTask, sessionId);
  console.log('✅ Bill payment task completed');
  console.log(`   Status: ${billResult.success ? 'Success' : 'Failed'}`);
  if (billResult.payment) {
    console.log(`   Transaction ID: ${billResult.payment.transactionId}\n`);
  }

  // Demonstration 3: Document renewal workflow
  console.log("📄 Submitting Document Renewal Task (Sequential Workflow)");
  console.log('-'.repeat(60));

  const docTask: Task = {
    id: 'task-doc-demo',
    type: 'document_renewal',
    title: "Renew Driver's License",
    description: 'Auto-fill and prepare license renewal form',
    priority: 'medium',
    status: 'pending',
    metadata: {
      documentId: 'license-123',
      renewalUrl: 'https://dmv.example.com/renew'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  sessionService.addTask(sessionId, docTask);
  const docResult = await orchestrator.executeWithObservability(docTask, sessionId);
  console.log('✅ Document renewal task completed');
  console.log(`   Status: ${docResult.status || 'completed'}`);
  console.log(`   Fields filled: ${docResult.filledFields?.length || 0}\n`);

  // Display system status
  console.log('📊 System Status');
  console.log('-'.repeat(60));
  const systemStatus = await orchestrator.getSystemStatus(sessionId);
  console.log(`   Active Agents: ${systemStatus.agents.length}`);
  console.log(`   Total Memories: ${systemStatus.memory.totalMemories}`);
  console.log(`   Memory by Type:`);
  Object.entries(systemStatus.memory.byType).forEach(([type, count]) => {
    console.log(`     - ${type}: ${count}`);
  });

  // Display session summary
  console.log('\n📋 Session Summary');
  console.log('-'.repeat(60));
  const sessionSummary = sessionService.getSessionSummary(sessionId);
  if (sessionSummary) {
    console.log(`   Session ID: ${sessionSummary.sessionId}`);
    console.log(`   Duration: ${(sessionSummary.duration / 1000).toFixed(2)}s`);
    console.log(`   Total Tasks: ${sessionSummary.totalTasks}`);
    console.log(`   Tasks by Status:`);
    Object.entries(sessionSummary.tasksByStatus).forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`);
    });
    console.log(`   Messages Exchanged: ${sessionSummary.messageCount}`);
  }

  // Display metrics
  console.log('\n📈 Metrics Summary');
  console.log('-'.repeat(60));
  console.log(`   Tasks Completed: ${metrics.getCounter('tasks.completed')}`);
  console.log(`   Agent Calls: ${metrics.getCounter('agents.calls')}`);
  console.log(`   Tool Calls: ${metrics.getCounter('tools.calls')}`);
  console.log(`   Memory Operations: ${metrics.getCounter('memory.stored')}`);

  // Display trace summary
  console.log('\n🔍 Trace Summary');
  console.log('-'.repeat(60));
  const rootSpans = tracer.getRootSpans();
  console.log(`   Total Traces: ${rootSpans.length}`);
  if (rootSpans.length > 0) {
    console.log('\n   Latest Trace:');
    const latestTrace = rootSpans[rootSpans.length - 1];
    console.log(tracer.generateTraceDiagram(latestTrace.traceId));
  }

  // End session
  sessionService.endSession(sessionId);

  console.log('\n' + '='.repeat(60));
  console.log('✨ Demonstration Complete!\n');
  console.log('Next Steps:');
  console.log('  • Run API server: npm start');
  console.log('  • Run evaluation tests: npm test');
  console.log('  • Run cron loop: npm run agent:loop\n');
}

// Run demonstration
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
