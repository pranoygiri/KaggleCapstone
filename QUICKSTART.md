# Quick Start Guide

Get the Personal Errand & Task Management Agent System up and running in 5 minutes.

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager

## Installation

```bash
# 1. Navigate to project directory
cd KaggleCapstone

# 2. Install dependencies
npm install

# 3. Build the project
npm run build
```

## Run the Demonstration

The fastest way to see the system in action:

```bash
npm run dev
```

This will:
- Initialize all agents
- Run a daily scan (parallel agents)
- Execute a bill payment task
- Execute a document renewal task (sequential workflow)
- Display system status, metrics, and traces

**Expected Output:**
```
🤖 Personal Errand & Task Management Agent System
============================================================

✅ Session created: session-1234567890-abc

📡 Running Daily Scan (Parallel Agents)
------------------------------------------------------------
✅ Daily scan completed
   Bills found: 3
   Subscriptions tracked: 2
   Appointments tracked: 2

💰 Submitting Bill Payment Task
------------------------------------------------------------
✅ Bill payment task completed
   Status: Success
   Transaction ID: DRY-RUN-1234567890

📄 Submitting Document Renewal Task (Sequential Workflow)
------------------------------------------------------------
✅ Document renewal task completed
   Status: form_ready
   Fields filled: 10

📊 System Status
------------------------------------------------------------
   Active Agents: 6
   Total Memories: 15
   Memory by Type:
     - bill: 3
     - subscription: 2
     - appointment: 2

📋 Session Summary
------------------------------------------------------------
   Duration: 1.23s
   Total Tasks: 3
   Tasks by Status:
     - completed: 3

📈 Metrics Summary
------------------------------------------------------------
   Tasks Completed: 3
   Agent Calls: 8
   Tool Calls: 12

🔍 Trace Summary
------------------------------------------------------------
   Total Traces: 3

   Latest Trace:
   ✅ orchestrator_execute (orchestrator) - 456ms
     ✅ document_agent_execute (document-agent) - 234ms

✨ Demonstration Complete!
```

## Run the API Server

Start the REST API server for integration with other applications:

```bash
npm start
```

Server will start on `http://localhost:4200`

**Test the API:**

```bash
# Health check
curl http://localhost:4200/health

# Create a session
curl -X POST http://localhost:4200/api/sessions

# Submit a task
curl -X POST http://localhost:4200/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "task": {
      "type": "bill_payment",
      "title": "Pay Electric Bill",
      "metadata": {
        "billId": "bill-123",
        "amount": 125.50,
        "paymentMethod": "bank_account"
      }
    }
  }'

# Get system status
curl http://localhost:4200/api/status

# Get metrics
curl http://localhost:4200/api/metrics
```

## Run Evaluation Tests

Test the system with automated evaluation scenarios:

```bash
npm test
```

**Expected Output:**
```
🚀 Starting Agent Evaluation Tests

=== Agent Evaluation Report ===

Overall Results:
  Scenarios Passed: 5/5
  Overall Score: 4.65/5.00 (93.0%)
  Status: ✅ PASS

Scenario Results:
================================================================================

✅ Bill Payment Detection
  Score: 0.95/1.00 (95.0%)
  Duration: 234ms

✅ Document Renewal Form Filling
  Score: 0.92/1.00 (92.0%)
  Duration: 345ms

✅ Subscription Detection and Analysis
  Score: 0.98/1.00 (98.0%)
  Duration: 189ms

✅ Deadline Conflict Detection
  Score: 0.90/1.00 (90.0%)
  Duration: 156ms

✅ Memory Retrieval Accuracy
  Score: 0.90/1.00 (90.0%)
  Duration: 123ms

✨ Evaluation Complete!
```

## Run Cron Loop Agent

Start the automated scheduled task runner:

```bash
npm run agent:loop
```

This will:
- Run an initial test scan
- Schedule daily scans at 8:00 AM
- Schedule weekly tasks on Mondays at 9:00 AM
- Run hourly status checks

**Expected Output:**
```
🔄 Initializing Cron Loop Agent System

🧪 Running initial test scan...

✅ Initial test scan completed
   Session: session-1234567890-abc

📅 Scheduled Tasks:
   • Daily Scan: Every day at 8:00 AM
   • Weekly Tasks: Every Monday at 9:00 AM
   • Status Check: Every hour

🏃 Cron loop agent is now running...
   Press Ctrl+C to stop
```

## Next Steps

### Explore the Code

Key files to examine:

1. **Agents**: [src/agents/](src/agents/)
   - Start with [OrchestratorAgent.ts](src/agents/OrchestratorAgent.ts)
   - Look at [BillManagementAgent.ts](src/agents/BillManagementAgent.ts) for a complete example

2. **Tools**: [src/tools/](src/tools/)
   - See [EmailScannerTool.ts](src/tools/EmailScannerTool.ts) for custom tool implementation

3. **Memory**: [src/memory/](src/memory/)
   - Check [MemoryBank.ts](src/memory/MemoryBank.ts) for context engineering

4. **Observability**: [src/observability/](src/observability/)
   - Review [tracer.ts](src/observability/tracer.ts) for distributed tracing

### Customize the System

1. **Add a New Agent**:
   - Extend [BaseAgent.ts](src/agents/BaseAgent.ts)
   - Implement the `execute()` method
   - Register with the orchestrator

2. **Add a New Tool**:
   - Create a new file in [src/tools/](src/tools/)
   - Implement `execute()` and `getToolDefinition()`
   - Use the tool in an agent

3. **Add an Evaluation Scenario**:
   - Edit [EvaluationFramework.ts](src/evaluation/EvaluationFramework.ts)
   - Add a new scenario in `initializeScenarios()`
   - Define rubric criteria

### Read the Documentation

- [README.md](README.md) - Complete system overview
- [COURSE_CONCEPTS.md](COURSE_CONCEPTS.md) - Detailed explanation of all 8 concepts

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
PORT=4201 npm start
```

### TypeScript Errors

Rebuild the project:

```bash
npm run build
```

### Dependencies Not Found

Reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Project Structure Reference

```
KaggleCapstone/
├── src/
│   ├── agents/              # All agent implementations
│   ├── tools/               # Custom tools
│   ├── memory/              # Session & memory management
│   ├── observability/       # Logging, tracing, metrics
│   ├── evaluation/          # Evaluation framework
│   ├── deployment/          # API server & cron jobs
│   ├── types/               # TypeScript type definitions
│   └── index.ts             # Main demonstration
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── README.md                # Complete documentation
├── COURSE_CONCEPTS.md       # Detailed concept explanations
└── QUICKSTART.md            # This file
```

## Available npm Scripts

```bash
npm run dev          # Run demonstration
npm start            # Start API server
npm test             # Run evaluation tests
npm run agent:loop   # Start cron loop agent
npm run build        # Build TypeScript to JavaScript
```

## Support

For issues or questions:
1. Check [README.md](README.md) for detailed documentation
2. Review [COURSE_CONCEPTS.md](COURSE_CONCEPTS.md) for implementation details
3. Examine the code comments in [src/](src/)

## What's Next?

Now that you have the system running:

1. ✅ Understand the architecture (see Architecture diagram in README)
2. ✅ Review how each of the 8 concepts is implemented (see COURSE_CONCEPTS.md)
3. ✅ Explore the agent interactions through logs and traces
4. ✅ Run evaluations to see quality metrics
5. ✅ Try the API endpoints
6. ✅ Customize agents and tools for your use cases

Happy exploring! 🚀
