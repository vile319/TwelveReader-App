import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
    }

    try {
        // 1. Verify token with Google and get email securely on the backend
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!googleRes.ok) {
            return res.status(401).json({ error: 'Invalid Google access token' });
        }

        const userData = await googleRes.json();
        const email = userData.email;

        if (!email) {
            return res.status(400).json({ error: 'Could not extract email from token' });
        }

        // 2. Check Stripe for this email
        if (!process.env.STRIPE_SECRET_KEY) {
            console.warn('STRIPE_SECRET_KEY is not set. Defaulting to free tier.');
            return res.status(200).json({ isPremium: false, email });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-02-24.acacia' as any,
        });

        // Find customer by exactly matching email
        const customers = await stripe.customers.list({
            email: email,
            limit: 10,
        });

        let isPremium = false;

        // For a one-time lifetime purchase, check if any of these matching customers have a successful payment
        for (const customer of customers.data) {
            // Check Payment Intents (Standard Checkout)
            const paymentIntents = await stripe.paymentIntents.list({
                customer: customer.id,
                limit: 10,
            });

            const hasPaidIntent = paymentIntents.data.some(pi => pi.status === 'succeeded');
            if (hasPaidIntent) {
                isPremium = true;
                break;
            }

            // Check Checkout Sessions (Payment Links often use this)
            const sessions = await stripe.checkout.sessions.list({
                customer: customer.id,
                limit: 10,
            });

            const hasPaidSession = sessions.data.some(session => session.payment_status === 'paid');
            if (hasPaidSession) {
                isPremium = true;
                break;
            }
        }

        return res.status(200).json({ isPremium, email });

    } catch (error) {
        console.error('Premium check error:', error);
        return res.status(500).json({ error: 'Internal server error while verifying premium status' });
    }
}
