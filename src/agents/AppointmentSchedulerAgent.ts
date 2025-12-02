import { BaseAgent } from './BaseAgent.js';
import { Task, Appointment } from '../types/index.js';
import { EmailScannerTool } from '../tools/EmailScannerTool.js';
import { standardMetrics } from '../observability/metrics.js';

/**
 * Appointment Scheduler Agent
 * Manages appointment scheduling, rescheduling, and calendar sync
 */
export class AppointmentSchedulerAgent extends BaseAgent {
  private emailScanner: EmailScannerTool;

  constructor(memoryBank: any, sessionService: any) {
    super('appointment-agent', 'appointment', memoryBank, sessionService);
    this.emailScanner = new EmailScannerTool();
  }

  async execute(task: Task, sessionId: string): Promise<any> {
    this.log('info', 'Appointment Scheduler Agent executing', { taskId: task.id });

    switch (task.type) {
      case 'appointment_scheduling':
        return this.handleAppointmentScheduling(task, sessionId);
      default:
        return this.scanAndTrackAppointments(sessionId);
    }
  }

  private async scanAndTrackAppointments(sessionId: string): Promise<any> {
    const scanResult = await this.emailScanner.execute({ categories: ['appointments'] });

    if (!scanResult.success) {
      return { success: false, error: scanResult.error };
    }

    const appointments: Appointment[] = scanResult.data.appointmentReminders;
    this.log('info', 'Appointments scanned', { count: appointments.length });

    for (const appt of appointments) {
      await this.storeMemory('appointment', appt, { scannedAt: new Date() });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingAppointments = appointments.filter(a => a.dateTime <= sevenDaysFromNow);

    for (const appt of upcomingAppointments) {
      await this.sendMessage({
        type: 'ReminderSet',
        to: 'orchestrator',
        payload: { appointment: appt }
      });
    }

    standardMetrics.appointmentScheduled();

    return {
      success: true,
      appointmentsTracked: appointments.length,
      upcomingAppointments: upcomingAppointments.length
    };
  }

  private async handleAppointmentScheduling(task: Task, sessionId: string): Promise<any> {
    const { action, appointmentId } = task.metadata;

    // Mock Google Calendar API integration
    this.log('info', 'Managing appointment', { action, appointmentId });

    standardMetrics.appointmentSuccess();

    await this.sendMessage({
      type: 'TaskCompleted',
      to: 'orchestrator',
      payload: { taskId: task.id, action }
    });

    return { success: true, action };
  }
}
