import cron from 'node-cron';
import { OrchestratorAgent } from '../agents/OrchestratorAgent.js';
import { MemoryBank } from '../memory/MemoryBank.js';
import { SessionService } from '../memory/SessionService.js';
import { logger } from '../observability/logger.js';

/**
 * Cron-based Loop Agent Deployment
 * Schedules recurring agent tasks
 */

console.log('🔄 Initializing Cron Loop Agent System\n');

// Initialize system
const memoryBank = new MemoryBank();
const sessionService = new SessionService();
const orchestrator = new OrchestratorAgent(memoryBank, sessionService);

// Daily scan at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  logger.info('Starting scheduled daily scan');
  console.log('\n⏰ [Daily Scan] Starting at', new Date().toLocaleString());

  try {
    const result = await orchestrator.runDailyScan();
    console.log('✅ [Daily Scan] Completed successfully');
    console.log('   Session:', result.sessionId);
    console.log('   Summary:', result.summary);
  } catch (error) {
    console.error('❌ [Daily Scan] Failed:', error);
    logger.error('Daily scan failed', { error });
  }
}, {
  timezone: 'America/Los_Angeles'
});

// Weekly tasks on Monday at 9:00 AM
cron.schedule('0 9 * * 1', async () => {
  logger.info('Starting scheduled weekly tasks');
  console.log('\n⏰ [Weekly Tasks] Starting at', new Date().toLocaleString());

  try {
    const result = await orchestrator.runWeeklyTasks();
    console.log('✅ [Weekly Tasks] Completed successfully');
    console.log('   Session:', result.sessionId);
  } catch (error) {
    console.error('❌ [Weekly Tasks] Failed:', error);
    logger.error('Weekly tasks failed', { error });
  }
}, {
  timezone: 'America/Los_Angeles'
});

// Hourly status check
cron.schedule('0 * * * *', async () => {
  const status = await orchestrator.getSystemStatus();
  logger.info('Hourly status check', { status });
  console.log(`\n📊 [Status Check] ${new Date().toLocaleString()}`);
  console.log('   Memory:', status.memory.totalMemories, 'items');
  console.log('   Agents:', status.agents.length, 'active');
});

// Immediate test run on startup
console.log('🧪 Running initial test scan...\n');
orchestrator.runDailyScan()
  .then(result => {
    console.log('✅ Initial test scan completed');
    console.log('   Session:', result.sessionId);
    console.log('\n📅 Scheduled Tasks:');
    console.log('   • Daily Scan: Every day at 8:00 AM');
    console.log('   • Weekly Tasks: Every Monday at 9:00 AM');
    console.log('   • Status Check: Every hour');
    console.log('\n🏃 Cron loop agent is now running...');
    console.log('   Press Ctrl+C to stop\n');
  })
  .catch(error => {
    console.error('❌ Initial test scan failed:', error);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down cron loop agent...');
  logger.info('Cron loop agent shutting down');
  process.exit(0);
});
