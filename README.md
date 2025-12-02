# Personal Errand & Task Management Agent System

A comprehensive multi-agent automation system that manages recurring "life admin" tasks such as paying bills, renewing documents, tracking subscriptions, scheduling appointments, managing deadlines, and handling paperwork.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Key Concepts](#key-concepts)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Agent Descriptions](#agent-descriptions)
- [Evaluation](#evaluation)
- [Deployment](#deployment)

## System Overview

### Goal

Create an intelligent assistant that automatically:
- Monitors recurring tasks
- Fetches relevant data (bills, deadlines, expiration dates)
- Schedules or completes tasks where possible
- Reminds the user or requests required inputs
- Logs all actions and states for observability

### Features

- **Multi-Agent Architecture**: Specialized agents for different task types
- **Custom Tools**: Email scanning, document reading, payment execution, form filling
- **Memory Bank**: Long-term storage with context compaction
- **A2A Protocol**: Agent-to-agent communication
- **Full Observability**: Logging, tracing, and metrics
- **Evaluation Framework**: Automated testing and scoring
- **Multiple Deployment Options**: API server, cron jobs, or standalone

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                        │
│            (Central Decision Maker & Router)                 │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Routes tasks to specialized agents
             │
     ┌───────┴──────┬──────────┬───────────┬──────────┐
     │              │          │           │          │
┌────▼────┐   ┌────▼────┐  ┌──▼──┐   ┌────▼───┐  ┌──▼─────┐
│  Bill   │   │Document │  │Sub- │   │Appoint-│  │Deadline│
│ Agent   │   │ Agent   │  │scrip│   │ment    │  │Manager │
│         │   │         │  │tion │   │Agent   │  │        │
│(Loop)   │   │(Seq)    │  │Agent│   │        │  │        │
└─────────┘   └─────────┘  └─────┘   └────────┘  └────────┘
     │              │          │           │          │
     └──────────────┴──────────┴───────────┴──────────┘
                          │
                ┌─────────▼──────────┐
                │   Memory Bank      │
                │ (Long-term Storage)│
                └────────────────────┘
```

### Agent Types

1. **Parallel Agents**: Bill, Subscription, and Appointment agents run simultaneously during daily scans
2. **Sequential Workflow Agents**: Document Renewal agent follows multi-step processes
3. **Loop Agents**: Bill Management runs daily/weekly scanning cycles
4. **Aggregator Agent**: Deadline Manager consolidates information from all agents

## Key Concepts

This project demonstrates **8 key concepts**:

### 1. Multi-Agent Architecture

**Location**: [src/agents/](src/agents/)

The system uses specialized agents working together:
- **BillManagementAgent**: Scans for bills, tracks due dates, initiates payments
- **DocumentRenewalAgent**: Tracks expiration dates, auto-fills renewal forms
- **SubscriptionTrackerAgent**: Monitors subscriptions, analyzes costs
- **AppointmentSchedulerAgent**: Manages appointments and calendar sync
- **DeadlineManagerAgent**: Aggregates deadlines, detects conflicts
- **OrchestratorAgent**: Routes tasks and coordinates agents

### 2. Tools (Custom, Built-in, OpenAPI)

**Location**: [src/tools/](src/tools/)

#### Custom Tools
- **EmailScannerTool**: Extracts bills, renewals, subscriptions from emails
- **DocumentReaderTool**: Reads and extracts structured data from PDFs
- **PaymentExecutionTool**: Executes payments through various methods
- **FormFillerTool**: Auto-populates form fields using LLM extraction

### 3. Sessions & Memory

**Location**: [src/memory/](src/memory/)

#### Session Management
- Maintains state across agent interactions
- Tracks tasks, agent states, and messages
- Creates checkpoints for rollback capability

#### Memory Bank
- Stores recurring information (bills, subscriptions, documents)
- Implements vector embeddings for semantic search
- Query bucketing: retrieves only relevant memories per agent type

### 4. Context Engineering

**Location**: [src/memory/MemoryBank.ts](src/memory/MemoryBank.ts)

- **Context Compaction**: Only retrieves relevant memory types per agent, limits to 10 items
- **Tiered Summarization**: Groups memories by type, generates condensed summaries
- **Task Embedding**: Vector embeddings for semantic memory retrieval
- **Query Bucketing**: Agent-specific memory filtering

### 5. Observability

**Location**: [src/observability/](src/observability/)

- **Logging**: Structured logging with levels, every agent logs state transitions
- **Tracing**: Distributed tracing with parent-child relationships, trace visualization
- **Metrics**: Counters, gauges, histograms for task completion, agent calls, tool usage

### 6. Agent Evaluation

**Location**: [src/evaluation/](src/evaluation/)

- **Benchmark Tasks**: Bill payment, document renewal, subscription analysis, deadline detection, memory retrieval
- **Scenario-Based Tests**: Mock inbox, bills, forms with expected outcomes
- **Rubrics**: Each scenario has weighted criteria (e.g., 30% detection, 40% accuracy, 30% warnings)
- **Metrics**: Task completion rate, tool correctness, memory accuracy, end-to-end success

### 7. A2A Protocol (Agent-to-Agent Communication)

**Location**: [src/agents/OrchestratorAgent.ts](src/agents/OrchestratorAgent.ts)

Message types: TaskDetected, DeadlineUpcoming, PaymentRequired, FormCompleted, ReminderSet, TaskCompleted, AgentQuery, AgentResponse

Multi-step workflow coordination and parallel agent collaboration.

### 8. Agent Deployment

**Location**: [src/deployment/](src/deployment/)

- **Local Server**: REST API on port 3000
- **Scheduled Cron Jobs**: Daily scan at 8 AM, weekly tasks on Mondays
- **Standalone Execution**: One-time demonstration
- **API Endpoints**: Sessions, tasks, scans, status, metrics, traces

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd KaggleCapstone

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Quick Start - Demonstration

```bash
npm run dev
```

### Run API Server

```bash
npm start
```

Access the API at `http://localhost:3000`

### Run Evaluation Tests

```bash
npm test
```

### Run Cron Loop Agent

```bash
npm run agent:loop
```

## Agent Descriptions

### Orchestrator Agent
- Central decision-maker and task router
- Routes tasks to specialized agents
- Implements A2A message protocol

### Bill Management Agent
- Loop agent (daily/weekly scanning)
- Scans emails for bills, tracks due dates, initiates payments
- Uses EmailScanner, DocumentReader, PaymentExecution tools

### Document Renewal Agent
- Sequential workflow agent
- Tracks expiration dates, auto-fills renewal forms
- Multi-step process: analyze → fill → check → submit

### Subscription Tracker Agent
- Parallel agent
- Tracks subscriptions, analyzes spending, detects duplicates

### Appointment Scheduler Agent
- Parallel agent
- Manages appointments and calendar sync

### Deadline Manager Agent
- Aggregator agent
- Collects deadlines from all agents, detects conflicts

## Project Structure

```
KaggleCapstone/
├── src/
│   ├── agents/             # All agent implementations
│   ├── tools/              # Custom tools
│   ├── memory/             # Memory and session management
│   ├── observability/      # Logging, tracing, metrics
│   ├── evaluation/         # Evaluation framework
│   ├── deployment/         # Deployment configurations
│   ├── types/              # TypeScript types
│   └── index.ts            # Main demonstration
├── package.json
├── tsconfig.json
└── README.md
```

## Course Concepts Summary

| Concept | Location | Description |
|---------|----------|-------------|
| Multi-Agent Architecture | [src/agents/](src/agents/) | 6 specialized agents with orchestrator |
| Custom Tools | [src/tools/](src/tools/) | 4 custom tools for domain tasks |
| Sessions & Memory | [src/memory/](src/memory/) | Session management + memory bank |
| Context Engineering | [MemoryBank.ts](src/memory/MemoryBank.ts) | Context compaction, query bucketing |
| Observability | [src/observability/](src/observability/) | Logging, tracing, metrics |
| Agent Evaluation | [src/evaluation/](src/evaluation/) | 5 scenarios with rubrics |
| A2A Protocol | [OrchestratorAgent.ts](src/agents/OrchestratorAgent.ts) | 7 message types |
| Deployment | [src/deployment/](src/deployment/) | API server, cron jobs |

## License

MIT