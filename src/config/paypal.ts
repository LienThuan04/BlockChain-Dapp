import * as paypal from '@paypal/checkout-server-sdk';
import 'dotenv/config';

const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID || '',
    process.env.PAYPAL_CLIENT_SECRET || ''
);
export const client = new paypal.core.PayPalHttpClient(environment);
