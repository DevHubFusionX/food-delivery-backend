const express = require('express');
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/payments/paystack-init
router.post('/paystack-init', authMiddleware, async (req, res) => {
  try {
    const { amount_cents, order_id } = req.body;

    if (!amount_cents || amount_cents < 100) { // Minimum ₦1.00
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const transaction = await paystack.transaction.initialize({
      amount: amount_cents,
      email: req.user.email || 'customer@example.com',
      reference: `order_${order_id}_${Date.now()}`,
      metadata: {
        order_id: order_id || '',
        user_id: req.user.userId
      }
    });

    // Create payment record if order_id provided
    if (order_id) {
      const payment = new Payment({
        orderId: order_id,
        provider: 'paystack',
        providerPaymentId: transaction.data.reference,
        amountCents: amount_cents,
        status: 'pending'
      });

      await payment.save();
    }

    res.json({
      authorization_url: transaction.data.authorization_url,
      reference: transaction.data.reference
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/webhooks/stripe - Stripe webhook
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update payment status
        const payment = await Payment.findOne({
          stripe_payment_intent_id: paymentIntent.id
        });

        if (payment) {
          payment.status = 'completed';
          payment.completed_at = new Date();
          await payment.save();

          // Update order status
          const order = await Order.findById(payment.order_id);
          if (order && order.order_status === 'created') {
            order.order_status = 'accepted_by_restaurant';
            order.payment_status = 'paid';
            await order.save();
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        
        const failedPaymentRecord = await Payment.findOne({
          stripe_payment_intent_id: failedPayment.id
        });

        if (failedPaymentRecord) {
          failedPaymentRecord.status = 'failed';
          failedPaymentRecord.failure_reason = failedPayment.last_payment_error?.message;
          await failedPaymentRecord.save();

          // Update order status
          const order = await Order.findById(failedPaymentRecord.order_id);
          if (order) {
            order.order_status = 'failed';
            order.payment_status = 'failed';
            await order.save();
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;