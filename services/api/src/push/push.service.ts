import { Injectable, Logger } from "@nestjs/common";

/**
 * Sends push notifications via the Expo push service (APNs/FCM under the hood).
 * No-ops cleanly when given no device token. The Expo access token is optional
 * (only needed for enhanced security on the push endpoint).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly accessToken = process.env.EXPO_ACCESS_TOKEN;

  async notifyScam(deviceToken: string, reportId: string): Promise<boolean> {
    if (!deviceToken) return false;
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: JSON.stringify({
        to: deviceToken,
        title: "ScamShield",
        body: "A scam you reported has been confirmed. Thanks for helping keep others safe.",
        data: { reportId },
      }),
    });
    if (!res.ok) {
      this.logger.warn(`push send failed: ${res.status}`);
    }
    return res.ok;
  }
}
