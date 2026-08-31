import { Router, Request, Response } from 'express';

import Stripe from 'stripe';

import { prisma } from '../../lib/prisma';

import { confirmOrderPayment } from '../../lib/order-payment';

import { getStripe, isStripeConfigured } from '../../lib/stripe';



const router = Router();



async function markOrderPaymentFailed(

  paymentIntentId: string,

  note: string

): Promise<void> {

  const order = await prisma.order.findFirst({

    where: { stripePaymentIntent: paymentIntentId },

  });



  if (!order || order.paymentStatus === 'PAID') {

    return;

  }



  await prisma.order.update({

    where: { id: order.id },

    data: {

      paymentStatus: 'FAILED',

      statusHistory: {

        create: { status: 'PENDING', note },

      },

    },

  });

}



async function findOrderForPaymentIntent(paymentIntentId: string) {

  return prisma.order.findFirst({

    where: { stripePaymentIntent: paymentIntentId },

  });

}



async function findOrderForCheckoutSession(session: Stripe.Checkout.Session) {

  const paymentIntentId =

    typeof session.payment_intent === 'string'

      ? session.payment_intent

      : session.payment_intent?.id;



  if (paymentIntentId) {

    const byIntent = await findOrderForPaymentIntent(paymentIntentId);

    if (byIntent) return byIntent;

  }



  const orderNumber = session.metadata?.orderNumber;

  if (orderNumber) {

    return prisma.order.findFirst({ where: { orderNumber } });

  }



  return null;

}



async function confirmFromCheckoutSession(

  session: Stripe.Checkout.Session,

  note: string

): Promise<void> {

  if (session.payment_status !== 'paid') {

    return;

  }



  const order = await findOrderForCheckoutSession(session);

  if (order) {

    await confirmOrderPayment(order.id, note);

  }

}



router.post('/stripe', async (req: Request, res: Response) => {

  if (!isStripeConfigured()) {

    if (process.env.NODE_ENV === 'production') {

      return res.status(503).json({ error: 'Stripe webhook is not configured.' });

    }

    console.warn('[WARN] Stripe webhook received but not configured — ignoring event.');

    return res.status(503).json({ error: 'Stripe webhook is not configured in this environment.' });

  }



  const stripe = getStripe()!;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;



  const sig = req.headers['stripe-signature'];

  if (!sig || typeof sig !== 'string') {

    return res.status(400).json({ error: 'Missing stripe-signature' });

  }



  let event: Stripe.Event;

  try {

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  } catch (err: unknown) {

    console.error('Stripe webhook signature verification failed:', err);

    return res.status(400).json({ error: 'Invalid webhook signature' });

  }



  try {

    switch (event.type) {

      case 'checkout.session.completed': {

        const session = event.data.object as Stripe.Checkout.Session;

        await confirmFromCheckoutSession(session, 'Payment confirmed via Stripe Checkout session (webhook)');

        break;

      }

      case 'checkout.session.async_payment_failed': {

        const session = event.data.object as Stripe.Checkout.Session;

        const paymentIntentId =

          typeof session.payment_intent === 'string'

            ? session.payment_intent

            : session.payment_intent?.id;

        if (paymentIntentId) {

          await markOrderPaymentFailed(

            paymentIntentId,

            'Async payment failed via Stripe Checkout session webhook'

          );

        }

        break;

      }

      case 'payment_intent.succeeded': {

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const order = await findOrderForPaymentIntent(paymentIntent.id);

        if (order) {

          await confirmOrderPayment(order.id, 'Payment confirmed via Stripe payment_intent webhook');

        }

        break;

      }

      case 'payment_intent.payment_failed': {

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const reason =

          paymentIntent.last_payment_error?.message || 'Payment failed without details';

        await markOrderPaymentFailed(

          paymentIntent.id,

          `Payment failed via Stripe webhook: ${reason}`

        );

        break;

      }

      case 'payment_intent.canceled': {

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await markOrderPaymentFailed(

          paymentIntent.id,

          'Payment intent canceled via Stripe webhook'

        );

        break;

      }

      default:

        break;

    }

  } catch (err) {

    console.error('Stripe webhook handler error:', err);

    return res.status(500).json({ error: 'Webhook handler failed' });

  }



  res.json({ received: true });

});



export default router;

