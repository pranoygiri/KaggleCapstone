# User Guide: How to Use the Personal Errand Agent System

This guide walks you through using the Personal Errand & Task Management Agent System as an end user.

## Table of Contents

- [First Time Setup](#first-time-setup)
- [Getting Started](#getting-started)
- [Usage Scenarios](#usage-scenarios)
- [Understanding the Output](#understanding-the-output)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## First Time Setup

### Prerequisites

You need:
- A computer with Node.js installed (version 20 or higher)
- Basic familiarity with the command line/terminal

Don't have Node.js? Download it from [nodejs.org](https://nodejs.org/)

### Installation (5 minutes)

1. **Download the project**
   ```bash
   # If you have git:
   git clone <repository-url>
   cd KaggleCapstone

   # OR download the ZIP file and extract it
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This downloads all required software packages. Takes about 1-2 minutes.

3. **Build the project**
   ```bash
   npm run build
   ```

   This compiles the TypeScript code. Takes about 10-20 seconds.

4. **Verify installation**
   ```bash
   npm run dev
   ```

   If you see output starting with "🤖 Personal Errand & Task Management Agent System", you're all set!

## Getting Started

### Option 1: See a Quick Demo (Recommended for First Time)

**What it does**: Runs a demonstration showing all system capabilities

```bash
npm run dev
```

**What you'll see**:
```
🤖 Personal Errand & Task Management Agent System
============================================================

Initializing system...

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

✨ Demonstration Complete!
```

**Time**: About 30 seconds

**Use case**: Understanding what the system does

### Option 2: Run Automated Background Tasks

**What it does**: Runs scheduled tasks automatically in the background

```bash
npm run agent:loop
```

**What happens**:
- System scans for bills, documents, subscriptions every day at 8:00 AM
- Runs weekly document checks every Monday at 9:00 AM
- Checks system status every hour
- Sends you reminders when tasks need attention

**Output**:
```
🔄 Initializing Cron Loop Agent System

🧪 Running initial test scan...

✅ Initial test scan completed

📅 Scheduled Tasks:
   • Daily Scan: Every day at 8:00 AM
   • Weekly Tasks: Every Monday at 9:00 AM
   • Status Check: Every hour

🏃 Cron loop agent is now running...
   Press Ctrl+C to stop
```

**Use case**: Set-it-and-forget-it automation

**To stop**: Press `Ctrl+C`

### Option 3: Use the API (For Developers)

**What it does**: Runs a web server you can interact with via HTTP requests

```bash
npm start
```

**Server starts on**: `http://localhost:4200`

**Use case**: Integrating with other applications, building a web/mobile app

## Usage Scenarios

### Scenario 1: "I want to see what bills are due soon"

**Using Demo Mode**:
```bash
npm run dev
```

Look for the section that says "Bills found" - it will show how many bills were detected.

**Using API**:
```bash
# Start server
npm start

# In another terminal, trigger a daily scan
curl -X POST http://localhost:4200/api/scans/daily
```

Response shows all bills found and which ones are due soon.

### Scenario 2: "I want to pay a specific bill"

**Using API**:

1. Start the server:
   ```bash
   npm start
   ```

2. Create a session:
   ```bash
   curl -X POST http://localhost:4200/api/sessions
   ```

   Response:
   ```json
   {
     "success": true,
     "sessionId": "session-1234567890-abc"
   }
   ```

3. Submit a bill payment task:
   ```bash
   curl -X POST http://localhost:4200/api/tasks \
     -H "Content-Type: application/json" \
     -d '{
       "sessionId": "session-1234567890-abc",
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
   ```

   Response:
   ```json
   {
     "success": true,
     "taskId": "task-123",
     "result": {
       "success": true,
       "payment": {
         "transactionId": "DRY-RUN-1234567890",
         "amount": 125.50,
         "status": "success"
       }
     }
   }
   ```

**Note**: By default, the system runs in DRY-RUN mode, meaning payments are simulated. No actual money is transferred.

### Scenario 3: "I need to renew my driver's license"

**Using API**:

```bash
# Create session (see above)

# Submit document renewal task
curl -X POST http://localhost:4200/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "task": {
      "type": "document_renewal",
      "title": "Renew Drivers License",
      "metadata": {
        "documentId": "license-123",
        "renewalUrl": "https://dmv.example.com/renew"
      }
    }
  }'
```

The system will:
1. Analyze the renewal form
2. Auto-fill fields with your information
3. Identify any missing required fields
4. Return a report of what's filled and what you need to provide

### Scenario 4: "I want to check my system status"

**Using API**:
```bash
curl http://localhost:4200/api/status
```

Response shows:
- Number of active agents
- Total memories stored
- Breakdown by memory type (bills, subscriptions, etc.)

### Scenario 5: "I want to see performance metrics"

**Using API**:
```bash
curl http://localhost:4200/api/metrics
```

Response shows:
- Tasks completed
- Agent calls
- Tool calls
- Success rates
- Response times

## Understanding the Output

### Daily Scan Output

```
📡 Running Daily Scan (Parallel Agents)
------------------------------------------------------------
✅ Daily scan completed
   Bills found: 3
   Subscriptions tracked: 2
   Appointments tracked: 2
```

**What this means**:
- System scanned your emails/data sources
- Found 3 bills (some may be due soon)
- Tracking 2 active subscriptions
- Found 2 upcoming appointments

### Task Execution Output

```
💰 Submitting Bill Payment Task
------------------------------------------------------------
✅ Bill payment task completed
   Status: Success
   Transaction ID: DRY-RUN-1234567890
```

**What this means**:
- A bill payment was processed
- Transaction ID for reference
- "DRY-RUN" means it was simulated (no actual payment)

### System Status Output

```
📊 System Status
------------------------------------------------------------
   Active Agents: 6
   Total Memories: 15
   Memory by Type:
     - bill: 3
     - subscription: 2
     - appointment: 2
     - document: 1
     - preference: 7
```

**What this means**:
- 6 specialized agents are running
- System has stored 15 pieces of information
- Breakdown shows what types of information are stored

## Advanced Usage

### Customizing Schedule

Edit the cron schedule in [src/deployment/cron-loop.ts](src/deployment/cron-loop.ts):

```typescript
// Change this line to adjust daily scan time
cron.schedule('0 8 * * *', async () => { ... }); // 8 AM

// Examples:
// '0 9 * * *'  - 9 AM daily
// '0 20 * * *' - 8 PM daily
// '*/30 * * * *' - Every 30 minutes
```

### Running Tests

To verify the system is working correctly:

```bash
npm test
```

Output shows:
- Which scenarios passed/failed
- Performance scores
- Detailed test results

### Checking Specific Memories

**Using API**:
```bash
# Query memories by search term
curl -X POST http://localhost:4200/api/memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "electric bill",
    "limit": 5
  }'
```

Returns the 5 most relevant memories matching "electric bill".

### Viewing Detailed Traces

To see exactly what happened during a task:

```bash
# Get all traces
curl http://localhost:4200/api/traces

# Get specific trace details
curl http://localhost:4200/api/traces/trace-1234567890
```

Shows:
- Which agents were called
- How long each step took
- Parent-child relationships
- Success/failure status

## Troubleshooting

### Problem: "Port 3000 already in use"

**Solution**: Use a different port

```bash
PORT=4201 npm start
```

### Problem: "Command not found: npm"

**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

### Problem: "Module not found" errors

**Solution**: Reinstall dependencies

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problem: TypeScript compilation errors

**Solution**: Ensure you have the latest version

```bash
npm install
npm run build
```

### Problem: "Nothing happens when I run npm run dev"

**Solution**: Check if the build succeeded

```bash
npm run build
# Look for any errors
# Then try again:
npm run dev
```

### Problem: Want to reset all data

**Solution**: Restart the system

The system stores data in memory, so restarting clears everything.

## Common Questions

### Q: Is my data stored permanently?

**A**: No, the current implementation stores data in memory only. When you stop the system, data is cleared. To add persistent storage, you would need to configure a database (see [COURSE_CONCEPTS.md](COURSE_CONCEPTS.md) for extension ideas).

### Q: Are payments actually executed?

**A**: No, the system runs in DRY-RUN mode by default. All payments are simulated. To enable real payments, you would need to:
1. Configure payment provider API keys
2. Set `DRY_RUN_MODE=false` in environment variables
3. Update PaymentExecutionTool to use real APIs

### Q: Can I use my actual email?

**A**: The current implementation uses mock data. To connect to real email:
1. Configure Gmail/Outlook API credentials
2. Update EmailScannerTool to use real email APIs
3. See `.env.example` for required configuration

### Q: How do I add my personal information?

**A**: Edit the user profile in [src/tools/FormFillerTool.ts](src/tools/FormFillerTool.ts):

```typescript
private getDefaultUserProfile(): Record<string, any> {
  return {
    firstName: 'Your Name',
    lastName: 'Your Last Name',
    email: 'your.email@example.com',
    // ... add your information
  };
}
```

### Q: Can multiple people use this system?

**A**: The current version is single-user. For multi-user support, you would need to add:
- User authentication
- User-specific memory isolation
- User management API endpoints

### Q: How do I stop the background tasks?

**A**: Press `Ctrl+C` in the terminal where you ran `npm run agent:loop`

### Q: Can I build a mobile app with this?

**A**: Yes! The API server provides all necessary endpoints. You can build a web or mobile app that:
- Creates sessions
- Submits tasks
- Checks status
- Views metrics

See the API endpoints in [README.md](README.md#api-documentation)

## Next Steps

Now that you understand how to use the system:

1. ✅ Run the demo to see all features: `npm run dev`
2. ✅ Try the API to submit custom tasks: `npm start`
3. ✅ Set up background automation: `npm run agent:loop`
4. ✅ Read [COURSE_CONCEPTS.md](COURSE_CONCEPTS.md) to understand how it works
5. ✅ Customize for your needs (see Advanced Usage above)

## Support

- **Documentation**: See [README.md](README.md) for complete system overview
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md) for visual diagrams
- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md) for fast setup
- **Concepts**: See [COURSE_CONCEPTS.md](COURSE_CONCEPTS.md) for implementation details

## Summary

The Personal Errand Agent System can be used in three main ways:

1. **Demo Mode** (`npm run dev`) - See what it does
2. **Background Mode** (`npm run agent:loop`) - Automated daily tasks
3. **API Mode** (`npm start`) - Interactive control via HTTP

Each mode serves different needs, and you can use all three depending on your requirements!

Happy automating! 🚀
