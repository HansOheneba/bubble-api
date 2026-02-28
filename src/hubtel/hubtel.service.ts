import { Injectable, BadGatewayException, Logger } from '@nestjs/common';

export interface HubtelCheckoutPayload {
  totalAmount: number;
  description: string;
  clientReference: string;
  callbackUrl: string;
  returnUrl: string;
  cancellationUrl: string;
  merchantAccountNumber: string;
  payeeName?: string;
  payeeMobileNumber?: string;
  payeeEmail?: string;
}

export interface HubtelCheckoutResult {
  checkoutUrl: string;
  checkoutId: string;
  clientReference: string;
  checkoutDirectUrl: string;
}

@Injectable()
export class HubtelService {
  private readonly logger = new Logger(HubtelService.name);

  private readonly checkoutUrl = 'https://payproxyapi.hubtel.com/items/initiate';
  private readonly smsUrl = 'https://smsc.hubtel.com/v1/messages/send';

  // Checkout uses HUBTEL_API_ID + HUBTEL_API_KEY
  private get checkoutAuthHeader(): string {
    const encoded = Buffer.from(
      `${process.env.HUBTEL_API_ID}:${process.env.HUBTEL_API_KEY}`,
    ).toString('base64');
    return `Basic ${encoded}`;
  }

  // SMS uses HUBTEL_CLIENT_ID + HUBTEL_CLIENT_SECRET
  private get smsAuthHeader(): string {
    const encoded = Buffer.from(
      `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`,
    ).toString('base64');
    return `Basic ${encoded}`;
  }

  // ─── Checkout ────────────────────────────────────────────────────────────

  async initiateCheckout(
    payload: HubtelCheckoutPayload,
  ): Promise<HubtelCheckoutResult> {
    const body = {
      totalAmount: payload.totalAmount,
      description: payload.description,
      callbackUrl: payload.callbackUrl,
      returnUrl: payload.returnUrl,
      merchantAccountNumber: payload.merchantAccountNumber,
      cancellationUrl: payload.cancellationUrl,
      clientReference: payload.clientReference,
      ...(payload.payeeName && { payeeName: payload.payeeName }),
      ...(payload.payeeMobileNumber && {
        payeeMobileNumber: payload.payeeMobileNumber,
      }),
      ...(payload.payeeEmail && { payeeEmail: payload.payeeEmail }),
    };

    this.logger.log(
      `Initiating Hubtel checkout for ref: ${payload.clientReference}`,
    );
    this.logger.debug(`Hubtel request body: ${JSON.stringify(body)}`);

    let response: Response;
    try {
      response = await fetch(this.checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.checkoutAuthHeader,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error('Hubtel API unreachable', err);
      throw new BadGatewayException(
        'Could not reach payment provider. Please try again.',
      );
    }

    const text = await response.text();
    this.logger.debug(`Hubtel raw response (${response.status}): ${text}`);

    if (!response.ok || !text) {
      this.logger.error(
        `Hubtel initiate failed — HTTP ${response.status}: ${text}`,
      );
      throw new BadGatewayException(
        `Payment provider error (HTTP ${response.status}). Please try again.`,
      );
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      this.logger.error(`Hubtel returned non-JSON response: ${text}`);
      throw new BadGatewayException(
        'Unexpected response from payment provider. Please try again.',
      );
    }

    if (json.responseCode !== '0000') {
      this.logger.error('Hubtel initiate rejected', json);
      throw new BadGatewayException(
        'Payment provider rejected the request. Please try again.',
      );
    }

    return {
      checkoutUrl: json.data.checkoutUrl,
      checkoutId: json.data.checkoutId,
      clientReference: json.data.clientReference,
      checkoutDirectUrl: json.data.checkoutDirectUrl,
    };
  }

  // ─── SMS ─────────────────────────────────────────────────────────────────

  async sendSms(to: string, message: string): Promise<void> {
    // Normalize phone: strip leading 0 and prepend 233 if needed
    let normalizedTo = to.replace(/\s+/g, '');
    if (normalizedTo.startsWith('0')) {
      normalizedTo = '233' + normalizedTo.slice(1);
    }
    if (!normalizedTo.startsWith('233')) {
      normalizedTo = '233' + normalizedTo;
    }

    const from = process.env.HUBTEL_SENDER_ID ?? 'BubbleBliss';

    const url = new URL(this.smsUrl);
    url.searchParams.set('clientid', process.env.HUBTEL_CLIENT_ID ?? '');
    url.searchParams.set('clientsecret', process.env.HUBTEL_CLIENT_SECRET ?? '');
    url.searchParams.set('from', from);
    url.searchParams.set('to', normalizedTo);
    url.searchParams.set('content', message);
    url.searchParams.set('registeredDelivery', 'true');

    this.logger.log(`Sending SMS to ${normalizedTo}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: this.smsAuthHeader },
      });

      const text = await response.text();
      this.logger.debug(`SMS response (${response.status}): ${text}`);

      if (!response.ok) {
        this.logger.error(`SMS send failed — HTTP ${response.status}: ${text}`);
      } else {
        this.logger.log(`SMS sent successfully to ${normalizedTo}`);
      }
    } catch (err) {
      // Don't throw — a failed SMS should never break the order flow
      this.logger.error(`SMS send error for ${normalizedTo}`, err);
    }
  }
}
