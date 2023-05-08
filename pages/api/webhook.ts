import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { addUserCredits, getUserIdByEmail } from '../../utils/helper';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export const config = {
  api: {
    bodyParser: false,
  },
};

const buffer = async (req: NextApiRequest): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
};

const webhookHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method === 'POST') {
    const sig = req.headers['stripe-signature']!;

    let event: Stripe.Event;

    try {
      const rawBody = await buffer(req);
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.log(`❌ Error message: ${errorMessage}`);
      res.status(400).send(`Webhook Error: ${errorMessage}`);
      return;
    }

    console.log('✅ Success:', event.id);

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(
        `❌ Payment failed: ${paymentIntent.last_payment_error?.message}`
      );
    } else if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      console.log(`💵 Charge id: ${charge.id}`);

      const userEmail = charge.billing_details.email;
      console.log(userEmail);
      let creditAmount = 0;

      console.log('Charge: ' + charge.amount);

      // @ts-ignore
      switch (charge.amount) {
        case 500:
          creditAmount = 20;
          break;
        case 2000:
          creditAmount = 100;
          break;
        case 3500:
          creditAmount = 250;
          break;
        case 8000:
          creditAmount = 750;
          break;
      }

      console.log('Credits: ' + creditAmount);

      const row_id = await getUserIdByEmail(userEmail);
      console.log(row_id);
      // Update user_credits in users table after purchase
      addUserCredits(row_id, creditAmount);

      const createdAt = new Date(charge.created * 1000).toISOString();
      // Insert purchase record in Supabase
      await supabase.from('purchases').insert([
        {
          id: uuidv4(),
          user_id: row_id,
          credit_amount: creditAmount,
          created_at: createdAt,
          status: charge.status,
        },
      ]);
    } else {
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

export default webhookHandler;
