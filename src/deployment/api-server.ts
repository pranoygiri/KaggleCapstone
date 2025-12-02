import express, { Request, Response } from 'express';
import { OrchestratorAgent } from '../agents/OrchestratorAgent.js';
import { MemoryBank } from '../memory/MemoryBank.js';
import { SessionService } from '../memory/SessionService.js';
import { Task } from '../types/index.js';
import { logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';
import { tracer } from '../observability/tracer.js';

/**
 * REST API Server for Agent System
 * Exposes endpoints for task submission and system monitoring
 */

const app = express();
app.use(express.json());

// Enable CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Initialize system
const memoryBank = new MemoryBank();
const sessionService = new SessionService();
const orchestrator = new OrchestratorAgent(memoryBank, sessionService);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Create new session
app.post('/api/sessions', (req: Request, res: Response) => {
  const sessionId = sessionService.createSession();

  logger.info('Session created via API', { sessionId });

  res.json({
    success: true,
    sessionId,
    createdAt: new Date()
  });
});

// Get session details
app.get('/api/sessions/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const summary = sessionService.getSessionSummary(sessionId);

  if (!summary) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    session: summary
  });
});

// Submit a task
app.post('/api/tasks', async (req: Request, res: Response) => {
  const { sessionId, task } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'sessionId is required'
    });
  }

  if (!task || !task.type) {
    return res.status(400).json({
      success: false,
      error: 'task with type is required'
    });
  }

  // Create full task object
  const fullTask: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: task.type,
    title: task.title || `Task ${task.type}`,
    description: task.description || '',
    priority: task.priority || 'medium',
    status: 'pending',
    metadata: task.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  logger.info('Task submitted via API', {
    sessionId,
    taskId: fullTask.id,
    taskType: fullTask.type
  });

  // Add task to session
  sessionService.addTask(sessionId, fullTask);

  try {
    // Execute task
    const result = await orchestrator.executeWithObservability(fullTask, sessionId);

    // Update task status
    sessionService.updateTask(sessionId, fullTask.id, {
      status: 'completed'
    });

    res.json({
      success: true,
      taskId: fullTask.id,
      result
    });
  } catch (error) {
    logger.error('Task execution failed', { error });

    sessionService.updateTask(sessionId, fullTask.id, {
      status: 'failed'
    });

    res.status(500).json({
      success: false,
      taskId: fullTask.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run daily scan
app.post('/api/scans/daily', async (req: Request, res: Response) => {
  logger.info('Daily scan triggered via API');

  try {
    const result = await orchestrator.runDailyScan();
    res.json(result);
  } catch (error) {
    logger.error('Daily scan failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run weekly tasks
app.post('/api/scans/weekly', async (req: Request, res: Response) => {
  logger.info('Weekly tasks triggered via API');

  try {
    const result = await orchestrator.runWeeklyTasks();
    res.json(result);
  } catch (error) {
    logger.error('Weekly tasks failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system status
app.get('/api/status', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string | undefined;

  try {
    const status = await orchestrator.getSystemStatus(sessionId);
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get metrics
app.get('/api/metrics', (req: Request, res: Response) => {
  const metricsData = metrics.exportMetrics();
  res.json({
    success: true,
    metrics: metricsData
  });
});

// Get traces
app.get('/api/traces', (req: Request, res: Response) => {
  const traces = tracer.exportTraces();
  res.json({
    success: true,
    traces,
    count: traces.length
  });
});

// Get trace by ID
app.get('/api/traces/:traceId', (req: Request, res: Response) => {
  const { traceId } = req.params;
  const diagram = tracer.generateTraceDiagram(traceId);

  res.json({
    success: true,
    traceId,
    diagram
  });
});

// Get memory stats
app.get('/api/memory/stats', (req: Request, res: Response) => {
  const stats = memoryBank.getStats();
  res.json({
    success: true,
    stats
  });
});

// Query memories
app.post('/api/memory/query', async (req: Request, res: Response) => {
  const { query, limit } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'query is required'
    });
  }

  try {
    const memories = await memoryBank.retrieveByQuery(query, limit || 5);
    res.json({
      success: true,
      memories,
      count: memories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
const PORT = process.env.PORT || 4200;

app.listen(PORT, () => {
  logger.info(`Agent API Server running on port ${PORT}`);
  console.log(`\n🚀 Personal Errand Agent System API`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🎨 Web App: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics\n`);
});

export default app;
