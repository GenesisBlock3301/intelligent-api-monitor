import nodemailer from "nodemailer";
import type { Logger } from "pino";

import type { Incident } from "../domain/contracts.js";
import type { SettingsRepository } from "../repositories/settings.repository.js";

export class EmailService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly logger?: Logger,
  ) {}

  async sendIncidentAlert(incident: Incident): Promise<boolean> {
    const settings = await this.settingsRepository.getAll();

    if (settings.email_enabled !== "true") {
      this.logger?.info({ event: "email_skip", reason: "email_not_enabled" });
      return false;
    }

    const { email_from, email_password, email_to } = settings;
    if (!email_from || !email_password || !email_to) {
      this.logger?.warn({ event: "email_skip", reason: "email_incomplete_config" });
      return false;
    }

    const subject = `[${incident.severity}] ${incident.api_name} — API Sentinel Alert`;
    const html = buildEmailHtml(incident);

    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: email_from, pass: email_password },
      });

      await transporter.sendMail({
        from: `"API Sentinel" <${email_from}>`,
        to: email_to,
        subject,
        html,
      });

      this.logger?.info({ event: "email_sent", to: email_to, subject, incident_id: incident.id });
      return true;
    } catch (error) {
      this.logger?.error({ err: error, event: "email_failed", incident_id: incident.id }, "Failed to send email notification");
      return false;
    }
  }
}

function buildEmailHtml(incident: Incident): string {
  const severityColors: Record<string, string> = {
    CRITICAL: "#dc2626",
    HIGH: "#d97706",
    MEDIUM: "#ca8a04",
  };
  const color = severityColors[incident.severity] ?? "#64748b";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: ${color}; padding: 16px 20px; color: #fff;">
          <h2 style="margin: 0; font-size: 18px;">${incident.severity} — ${incident.api_name}</h2>
        </div>
        <div style="padding: 20px;">
          <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">${incident.alert_message}</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #64748b;">Anomaly types</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${incident.anomaly_types.join(", ")}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">HTTP status</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${incident.status_code}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Response time</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${incident.response_time_ms.toLocaleString()} ms</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Records returned</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${incident.records_returned}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Alert source</td><td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">${incident.alert_source}</td></tr>
          </table>
        </div>
        <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
          Sent by API Sentinel at ${new Date().toISOString()}
        </div>
      </div>
    </div>`;
}
