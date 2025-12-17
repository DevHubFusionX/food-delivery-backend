const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  provider: {
    type: String,
    enum: ['stripe', 'paypal', 'cash'],
    required: true
  },
  providerPaymentId: {
    type: String,
    required: true
  },
  amountCents: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_account', 'digital_wallet', 'cash']
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  failureReason: {
    type: String
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  processingFee: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ providerPaymentId: 1 });
paymentSchema.index({ status: 1 });

paymentSchema.virtual('amount').get(function() {
  return this.amountCents / 100;
});

module.exports = mongoose.model('Payment', paymentSchema);