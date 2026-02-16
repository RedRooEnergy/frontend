import { EMAIL_POLICY } from "./policies";
import type { EmailProvider, EmailSendPayload } from "./provider";

export class EmailQueue {
  constructor(private provider: EmailProvider) {}

  async send(payload: EmailSendPayload) {
    let attempt = 0;
    const { retry } = EMAIL_POLICY;
    while (attempt < retry.maxAttempts) {
      try {
        return await this.provider.send(payload);
      } catch (error) {
        attempt += 1;
        if (attempt >= retry.maxAttempts) throw error;
        const delay = Math.min(retry.baseDelayMs * attempt, retry.maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("EMAIL_QUEUE_UNREACHABLE");
  }
}
