# System Architecture

Visual diagrams and architecture details for the Personal Errand & Task Management Agent System.

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│         (Web App / Mobile App / API Calls / Cron Jobs)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR AGENT                         │
│                   (Central Coordinator)                         │
│  • Routes tasks to specialized agents                           │
│  • Implements A2A message protocol                              │
│  • Manages parallel & sequential workflows                      │
└─────┬───────────┬───────────┬───────────┬───────────┬───────────┘
      │           │           │           │           │
      ▼           ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  BILL   │ │DOCUMENT │ │SUBSCRIP-│ │APPOINT- │ │DEADLINE │
│  AGENT  │ │  AGENT  │ │  TION   │ │  MENT   │ │ MANAGER │
│         │ │         │ │  AGENT  │ │  AGENT  │ │  AGENT  │
│ (Loop)  │ │  (Seq)  │ │(Parallel│ │(Parallel│ │  (Agg)  │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │           │
     └───────────┴───────────┴───────────┴───────────┘
                             │
                   ┌─────────┴─────────┐
                   │   CUSTOM TOOLS     │
                   │                    │
                   │ • EmailScanner     │
                   │ • DocumentReader   │
                   │ • PaymentExecution │
                   │ • FormFiller       │
                   └─────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
         ┌────▼─────┐              ┌───────▼────┐
         │  MEMORY  │              │  SESSION   │
         │   BANK   │              │  SERVICE   │
         │          │              │            │
         │(Long-term│              │(Current    │
         │ Storage) │              │   State)   │
         └────┬─────┘              └───────┬────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │  OBSERVABILITY  │
                    │                 │
                    │ • Logger        │
                    │ • Tracer        │
                    │ • Metrics       │
                    └─────────────────┘
```

## Agent Communication Flow (A2A Protocol)

```
Daily Scan Workflow:
────────────────────

User/Cron ──► Orchestrator ──► [Parallel Execution]
                                      │
                     ┌────────────────┼────────────────┐
                     │                │                │
                     ▼                ▼                ▼
              Bill Agent      Subscription      Appointment
                  │              Agent               Agent
                  │                │                   │
        ┌─────────┴────────┐       │                  │
        │                  │       │                  │
        ▼                  ▼       ▼                  ▼
  EmailScanner      PaymentTool   EmailScanner    EmailScanner
        │                  │       │                  │
        │                  │       │                  │
        └─────────┬────────┘       │                  │
                  │                │                  │
                  └────────────────┴──────────────────┘
                                   │
                            A2A Messages
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ Message Types:   │
                         │ • PaymentRequired│
                         │ • DeadlineUpcoming│
                         │ • ReminderSet    │
                         └─────────────────┘
                                   │
                                   ▼
                          Deadline Manager
                                   │
                                   ▼
                          User Notification


Sequential Workflow Example (Document Renewal):
───────────────────────────────────────────────

User ──► Orchestrator ──► Document Agent
                                 │
                        ┌────────┴────────┐
                        │ Step 1: Analyze │
                        │    FormFiller   │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │ Step 2: Fill    │
                        │    FormFiller   │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────────┐
                        │ Step 3: Check       │
                        │ Missing Fields?     │
                        └────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
               Yes  ▼                         ▼  No
           ┌────────────────┐         ┌─────────────┐
           │ Step 4: Query  │         │ Step 5:     │
           │ User (A2A Msg) │         │ Submit Form │
           └────────────────┘         └─────────────┘
                    │                         │
                    ▼                         ▼
              Wait for Input            Task Complete
```

## Memory Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     MEMORY BANK                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Memory Storage                      │  │
│  │                                                  │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │  │
│  │  │ Bill │  │ Doc  │  │ Sub  │  │ Appt │       │  │
│  │  │Memory│  │Memory│  │Memory│  │Memory│  ...  │  │
│  │  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘       │  │
│  │     │         │         │         │            │  │
│  └─────┼─────────┼─────────┼─────────┼────────────┘  │
│        │         │         │         │                │
│  ┌─────▼─────────▼─────────▼─────────▼───────────┐   │
│  │           Type Index                           │   │
│  │  bill → [mem1, mem2, ...]                     │   │
│  │  document → [mem3, mem4, ...]                 │   │
│  │  subscription → [mem5, mem6, ...]             │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │         Vector Embeddings (Semantic Search)     │  │
│  │  mem1 → [0.1, 0.5, 0.3, ..., 0.8]  (128-dim)  │  │
│  │  mem2 → [0.2, 0.4, 0.1, ..., 0.9]             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │         Context Compaction                      │  │
│  │                                                 │  │
│  │  Query Bucketing:                              │  │
│  │    Bill Agent → ['bill', 'preference']         │  │
│  │    Doc Agent → ['document', 'preference']      │  │
│  │    Deadline Agent → ['bill', 'doc', 'sub']     │  │
│  │                                                 │  │
│  │  Access Scoring:                               │  │
│  │    score = accessCount + recency_factor        │  │
│  │                                                 │  │
│  │  Limit: Top 10 most relevant memories          │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Session State Management

```
┌─────────────────────────────────────────────────────────┐
│                    SESSION                              │
│  ID: session-1234567890-abc                            │
│  Created: 2024-01-10T10:00:00Z                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Agent States                           │  │
│  │                                                  │  │
│  │  bill-agent:        { status: 'idle' }          │  │
│  │  document-agent:    { status: 'running' }       │  │
│  │  orchestrator:      { status: 'running' }       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │                Tasks                             │  │
│  │                                                  │  │
│  │  task-1: { type: 'bill_payment', status: 'completed' }  │
│  │  task-2: { type: 'document_renewal', status: 'in_progress' }  │
│  │  task-3: { type: 'deadline_tracking', status: 'pending' }  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │           A2A Messages                           │  │
│  │                                                  │  │
│  │  [10:01] bill-agent → orchestrator: PaymentRequired  │
│  │  [10:02] orchestrator → deadline-agent: DeadlineUpcoming  │
│  │  [10:03] deadline-agent → orchestrator: ReminderSet  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Checkpoints                            │  │
│  │                                                  │  │
│  │  [10:00] daily_scan_start                       │  │
│  │  [10:02] before_payment                         │  │
│  │  [10:05] daily_scan_complete                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Observability Stack

```
┌─────────────────────────────────────────────────────────┐
│                   OBSERVABILITY                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              LOGGING                              │  │
│  │                                                   │  │
│  │  [2024-01-10 10:00:00] [INFO] Task executing     │  │
│  │  [2024-01-10 10:00:01] [INFO] Tool called        │  │
│  │  [2024-01-10 10:00:02] [WARN] Missing fields     │  │
│  │  [2024-01-10 10:00:03] [ERROR] Payment failed    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              TRACING                              │  │
│  │                                                   │  │
│  │  Trace ID: trace-1234567890                      │  │
│  │                                                   │  │
│  │  ✅ orchestrator_execute - 1234ms                │  │
│  │    ✅ bill_agent_execute - 456ms                 │  │
│  │      ✅ email_scanner - 123ms                    │  │
│  │      ✅ payment_execution - 234ms                │  │
│  │    ✅ deadline_agent_execute - 234ms             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              METRICS                              │  │
│  │                                                   │  │
│  │  Counters:                                       │  │
│  │    tasks.completed: 15                           │  │
│  │    agents.calls: 42                              │  │
│  │    tools.calls: 68                               │  │
│  │                                                   │  │
│  │  Gauges:                                         │  │
│  │    memory.size: 1024                             │  │
│  │    active.sessions: 3                            │  │
│  │                                                   │  │
│  │  Timings:                                        │  │
│  │    agent.duration: avg 345ms, p95 1200ms         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 DEPLOYMENT OPTIONS                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Option 1: API Server                     │  │
│  │                                                  │  │
│  │  ┌────────────┐         ┌─────────────┐        │  │
│  │  │   Client   │────────►│ Express.js  │        │  │
│  │  │ (Web/Mobile│  HTTP   │   Server    │        │  │
│  │  └────────────┘         │  Port 3000  │        │  │
│  │                         └──────┬──────┘        │  │
│  │                                │               │  │
│  │                         ┌──────▼──────┐       │  │
│  │                         │ Orchestrator│       │  │
│  │                         └─────────────┘       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Option 2: Cron Loop Agent                │  │
│  │                                                  │  │
│  │  ┌─────────────┐                               │  │
│  │  │ Cron Jobs   │                               │  │
│  │  │             │                               │  │
│  │  │ Daily 8AM ──┼──► Daily Scan                 │  │
│  │  │ Mon 9AM ────┼──► Weekly Tasks               │  │
│  │  │ Every Hour ─┼──► Status Check               │  │
│  │  └─────────────┘                               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Option 3: Cloud Deployment               │  │
│  │                                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │ Lambda   │  │   ECS    │  │Kubernetes│     │  │
│  │  │Serverless│  │Container │  │   Pod    │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow Example: Bill Payment

```
Step-by-Step Flow:
──────────────────

1. Trigger (Daily 8AM Cron)
   │
   ▼
2. Orchestrator.runDailyScan()
   │
   ├─► Bill Agent (parallel)
   ├─► Subscription Agent (parallel)
   └─► Appointment Agent (parallel)
       │
       ▼
3. Bill Agent.scanAndManageBills()
   │
   ├─► EmailScannerTool.execute()
   │   └─► Returns: [Bill1, Bill2, Bill3]
   │
   ├─► Store bills in Memory Bank
   │
   ├─► Filter bills due soon
   │   └─► Bill1 due in 3 days ✓
   │
   └─► Send A2A Messages
       ├─► DeadlineUpcoming → Deadline Agent
       └─► PaymentRequired → Orchestrator
           │
           ▼
4. Orchestrator receives PaymentRequired
   │
   ├─► Logs message
   ├─► Creates payment task
   └─► Routes to Bill Agent
       │
       ▼
5. Bill Agent.handleBillPayment()
   │
   ├─► PaymentExecutionTool.verifyPaymentMethod()
   │   └─► Verified ✓
   │
   ├─► PaymentExecutionTool.execute()
   │   └─► Transaction: DRY-RUN-1234567890 ✓
   │
   ├─► Update bill in Memory Bank (isPaid: true)
   │
   └─► Send A2A Message
       └─► TaskCompleted → Orchestrator
           │
           ▼
6. Task marked as completed
   │
   ├─► Session updated
   ├─► Metrics recorded
   └─► Trace completed

Observability Throughout:
─────────────────────────

Logger:   [INFO] Bill Agent executing
          [INFO] Payment successful

Tracer:   ✅ orchestrator_execute - 1234ms
            ✅ bill_agent_execute - 456ms
              ✅ email_scanner - 123ms
              ✅ payment_execution - 234ms

Metrics:  tasks.completed: +1
          bills.payment.success: +1
          agent.duration: 456ms
```

## System Health Monitoring

```
┌─────────────────────────────────────────────────────────┐
│                  HEALTH DASHBOARD                       │
│                                                         │
│  System Status: ✅ Healthy                              │
│  Uptime: 5 days 3 hours                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Agents Status                                   │  │
│  │  ✅ Orchestrator:    Idle                        │  │
│  │  ✅ Bill Agent:      Idle                        │  │
│  │  ✅ Document Agent:  Idle                        │  │
│  │  ✅ Subscription:    Idle                        │  │
│  │  ✅ Appointment:     Idle                        │  │
│  │  ✅ Deadline:        Idle                        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Today's Activity                                │  │
│  │  Tasks Completed:     12                         │  │
│  │  Bills Processed:     5                          │  │
│  │  Payments Made:       3                          │  │
│  │  Forms Filled:        2                          │  │
│  │  Deadlines Tracked:   8                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Memory Usage                                    │  │
│  │  Total Memories:      156                        │  │
│  │  Bills:               45                         │  │
│  │  Documents:           23                         │  │
│  │  Subscriptions:       31                         │  │
│  │  Appointments:        12                         │  │
│  │  Preferences:         45                         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Performance                                     │  │
│  │  Avg Response Time:   234ms                      │  │
│  │  P95 Response Time:   890ms                      │  │
│  │  P99 Response Time:   1.2s                       │  │
│  │  Success Rate:        98.5%                      │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

This architecture document provides visual representations of how all components work together in the Personal Errand & Task Management Agent System.
