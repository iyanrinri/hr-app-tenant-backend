import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '@/common/services/mail.service';

interface LeaveNotificationData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  emergencyContact?: string;
  handoverNotes?: string;
}

@Injectable()
export class LeaveEmailService {
  private readonly logger = new Logger(LeaveEmailService.name);

  constructor(private mailService: MailService) {
    this.logger.log('Leave email service initialized');
  }

  async sendLeaveRequestToManager(
    managerEmail: string,
    managerName: string,
    leaveData: LeaveNotificationData
  ): Promise<void> {
    try {
      const subject = `Leave Request - ${leaveData.employeeName} (${leaveData.leaveType})`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Leave Request Approval Required</h2>
          
          <p>Dear ${managerName},</p>
          
          <p>A new leave request has been submitted by <strong>${leaveData.employeeName}</strong> and requires your approval.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Leave Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Employee:</strong> ${leaveData.employeeName}</li>
              <li><strong>Leave Type:</strong> ${leaveData.leaveType}</li>
              <li><strong>Start Date:</strong> ${leaveData.startDate}</li>
              <li><strong>End Date:</strong> ${leaveData.endDate}</li>
              <li><strong>Total Days:</strong> ${leaveData.totalDays} day(s)</li>
              <li><strong>Reason:</strong> ${leaveData.reason}</li>
              ${leaveData.emergencyContact ? `<li><strong>Emergency Contact:</strong> ${leaveData.emergencyContact}</li>` : ''}
              ${leaveData.handoverNotes ? `<li><strong>Handover Notes:</strong> ${leaveData.handoverNotes}</li>` : ''}
            </ul>
          </div>
          
          <p>Please review and approve/reject this request through the HR system.</p>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <p style="font-size: 12px; color: #6c757d;">
              This is an automated email from the HR Management System.
            </p>
          </div>
        </div>
      `;

      await this.mailService.sendMail({
        to: managerEmail,
        subject,
        html,
      });
      this.logger.log(`Leave request email sent to manager: ${managerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email to manager: ${error.message}`);
      // Don't throw error to avoid blocking the leave request process
    }
  }

  async sendLeaveRequestToHR(
    hrEmail: string,
    leaveData: LeaveNotificationData
  ): Promise<void> {
    try {
      const subject = `Leave Request - ${leaveData.employeeName} (${leaveData.leaveType})`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Leave Request Submitted</h2>
          
          <p>Dear HR Team,</p>
          
          <p>A new leave request has been submitted by <strong>${leaveData.employeeName}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Leave Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Employee:</strong> ${leaveData.employeeName}</li>
              <li><strong>Leave Type:</strong> ${leaveData.leaveType}</li>
              <li><strong>Start Date:</strong> ${leaveData.startDate}</li>
              <li><strong>End Date:</strong> ${leaveData.endDate}</li>
              <li><strong>Total Days:</strong> ${leaveData.totalDays} day(s)</li>
              <li><strong>Reason:</strong> ${leaveData.reason}</li>
              ${leaveData.emergencyContact ? `<li><strong>Emergency Contact:</strong> ${leaveData.emergencyContact}</li>` : ''}
              ${leaveData.handoverNotes ? `<li><strong>Handover Notes:</strong> ${leaveData.handoverNotes}</li>` : ''}
            </ul>
          </div>
          
          <p>Please review this request in the HR system.</p>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <p style="font-size: 12px; color: #6c757d;">
              This is an automated email from the HR Management System.
            </p>
          </div>
        </div>
      `;

      await this.mailService.sendMail({
        to: hrEmail,
        subject,
        html,
      });
      this.logger.log(`Leave request email sent to HR: ${hrEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email to HR: ${error.message}`);
      // Don't throw error to avoid blocking the leave request process
    }
  }

  async sendLeaveApprovalNotification(
    employeeEmail: string,
    employeeName: string,
    approverName: string,
    approverType: string,
    leaveData: LeaveNotificationData,
    isApproved: boolean,
    comments?: string
  ): Promise<void> {
    try {
      const status = isApproved ? 'Approved' : 'Rejected';
      const statusColor = isApproved ? '#28a745' : '#dc3545';
      
      const subject = `Leave Request ${status} - ${leaveData.leaveType}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Leave Request ${status}</h2>
          
          <p>Dear ${employeeName},</p>
          
          <p>Your leave request has been <strong style="color: ${statusColor};">${status.toLowerCase()}</strong> by ${approverName} (${approverType}).</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Leave Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Leave Type:</strong> ${leaveData.leaveType}</li>
              <li><strong>Start Date:</strong> ${leaveData.startDate}</li>
              <li><strong>End Date:</strong> ${leaveData.endDate}</li>
              <li><strong>Total Days:</strong> ${leaveData.totalDays} day(s)</li>
              <li><strong>Status:</strong> <span style="color: ${statusColor};">${status}</span></li>
              ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <p style="font-size: 12px; color: #6c757d;">
              This is an automated email from the HR Management System.
            </p>
          </div>
        </div>
      `;

      await this.mailService.sendMail({
        to: employeeEmail,
        subject,
        html,
      });
      this.logger.log(`Leave ${status.toLowerCase()} notification sent to employee: ${employeeEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send leave ${status.toLowerCase()} email: ${error.message}`);
    }
  }

  async notifyLeaveSubmission(
    leaveRequest: any,
    managerEmail?: string,
    hrEmail?: string
  ): Promise<void> {
    const leaveData: LeaveNotificationData = {
      employeeName: `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`,
      leaveType: leaveRequest.leaveTypeConfig.name,
      startDate: leaveRequest.startDate.toISOString().split('T')[0],
      endDate: leaveRequest.endDate.toISOString().split('T')[0],
      totalDays: leaveRequest.totalDays,
      reason: leaveRequest.reason,
      emergencyContact: leaveRequest.emergencyContact,
      handoverNotes: leaveRequest.handoverNotes,
    };

    // Send to manager if email provided
    if (managerEmail) {
      await this.sendLeaveRequestToManager(
        managerEmail,
        'Manager', // You can pass actual manager name if available
        leaveData
      );
    }

    // Send to HR if email provided
    if (hrEmail) {
      await this.sendLeaveRequestToHR(hrEmail, leaveData);
    }
  }

  async notifyLeaveApproval(
    leaveRequest: any,
    approver: any,
    isApproved: boolean,
    comments?: string
  ): Promise<void> {
    const employeeEmail = leaveRequest.employee.email; // Assuming employee has email
    if (!employeeEmail) return;

    const leaveData: LeaveNotificationData = {
      employeeName: `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`,
      leaveType: leaveRequest.leaveTypeConfig.name,
      startDate: leaveRequest.startDate.toISOString().split('T')[0],
      endDate: leaveRequest.endDate.toISOString().split('T')[0],
      totalDays: leaveRequest.totalDays,
      reason: leaveRequest.reason,
    };

    await this.sendLeaveApprovalNotification(
      employeeEmail,
      leaveData.employeeName,
      `${approver.firstName} ${approver.lastName}`,
      approver.position || 'Manager',
      leaveData,
      isApproved,
      comments
    );
  }
}