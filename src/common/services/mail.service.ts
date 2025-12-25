import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: this.configService.get('MAIL_ENCRYPTION') === 'ssl',
      auth: {
        user: this.configService.get('MAIL_USERNAME'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendMail(options: MailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `${this.configService.get('MAIL_FROM_NAME')} <${this.configService.get('MAIL_FROM_ADDRESS')}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  async sendTenantRegistrationEmail(
    email: string,
    firstName: string,
    lastName: string,
    tenantName: string,
    slug: string,
  ): Promise<void> {
    const subject = `Welcome to ${tenantName} - Registration Successful`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4F46E5; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Your New Workspace!</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName} ${lastName},</p>
              
              <p>Congratulations! Your tenant account has been successfully created.</p>
              
              <div class="info-box">
                <h3>📋 Your Account Details:</h3>
                <ul>
                  <li><strong>Organization:</strong> ${tenantName}</li>
                  <li><strong>Tenant Slug:</strong> ${slug}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Role:</strong> Admin</li>
                </ul>
              </div>
              
              <p>You now have full admin access to manage your organization's HR system.</p>
              
              <a href="${this.configService.get('APP_URL') || 'http://localhost:3000'}/login?tenant=${slug}" class="button">
                Login to Dashboard
              </a>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <div class="footer">
                <p>© 2025 HR App. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to ${tenantName}!
      
      Hi ${firstName} ${lastName},
      
      Your tenant account has been successfully created.
      
      Organization: ${tenantName}
      Tenant Slug: ${slug}
      Email: ${email}
      Role: Admin
      
      You now have full admin access to manage your organization's HR system.
      
      Best regards,
      HR App Team
    `;

    await this.sendMail({
      to: email,
      subject,
      html,
      text,
    });
  }
}
