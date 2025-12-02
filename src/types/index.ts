// Core types for the Personal Errand Agent System

export interface AgentMessage {
  type: 'TaskDetected' | 'DeadlineUpcoming' | 'PaymentRequired' | 'FormCompleted' | 'ReminderSet' | 'TaskCompleted' | 'AgentQuery' | 'AgentResponse';
  from: string;
  to: string;
  timestamp: Date;
  payload: any;
  correlationId?: string;
}

export interface Task {
  id: string;
  type: 'bill_payment' | 'document_renewal' | 'subscription_management' | 'appointment_scheduling' | 'deadline_tracking';
  title: string;
  description: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bill {
  id: string;
  provider: string;
  amount: number;
  dueDate: Date;
  category: string;
  isPaid: boolean;
  pdfPath?: string;
  accountNumber?: string;
}

export interface Document {
  id: string;
  type: 'license' | 'passport' | 'insurance' | 'registration' | 'other';
  name: string;
  expirationDate: Date;
  issuer: string;
  documentNumber: string;
  renewalUrl?: string;
}

export interface Subscription {
  id: string;
  service: string;
  amount: number;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  nextBillingDate: Date;
  autoRenew: boolean;
  category: string;
}

export interface Appointment {
  id: string;
  title: string;
  provider: string;
  dateTime: Date;
  location: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}

export interface Memory {
  id: string;
  type: 'bill' | 'document' | 'subscription' | 'appointment' | 'preference' | 'task_history';
  content: any;
  embedding?: number[];
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  metadata: Record<string, any>;
}

export interface AgentState {
  agentId: string;
  status: 'idle' | 'running' | 'waiting' | 'error';
  currentTask?: Task;
  memorySnapshot: Memory[];
  lastUpdate: Date;
  metadata: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ObservabilityEvent {
  id: string;
  type: 'log' | 'trace' | 'metric';
  timestamp: Date;
  agentId: string;
  taskId?: string;
  data: any;
}

export interface MetricData {
  metricName: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: Date;
}
