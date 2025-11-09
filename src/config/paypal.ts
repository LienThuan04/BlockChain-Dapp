import * as paypal from '@paypal/checkout-server-sdk';
import 'dotenv/config';

function cleanEnvValue(v?: string) {
    if (!v) return '';
    // Trim whitespace
    let s = v.trim();
    // Remove surrounding single or double quotes if present
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1);
    }
    return s;
}

const clientId = cleanEnvValue(process.env.PAYPAL_CLIENT_ID);
const clientSecret = cleanEnvValue(process.env.PAYPAL_CLIENT_SECRET);

if (!clientId || !clientSecret) {
    console.warn('PayPal client id/secret missing or empty. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env');
}

const environment = new paypal.core.SandboxEnvironment(
    clientId,
    clientSecret
);
export const client = new paypal.core.PayPalHttpClient(environment);
