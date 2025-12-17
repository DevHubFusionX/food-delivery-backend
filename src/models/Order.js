const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  orderNumber: {
    type: String,
    required: true
  },
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: String,
    priceCents: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    itemNotes: String
  }],
  subtotalCents: {
    type: Number,
    required: true
  },
  deliveryFeeCents: {
    type: Number,
    required: true
  },
  taxCents: {
    type: Number,
    required: true
  },
  discountCents: {
    type: Number,
    default: 0
  },
  totalCents: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['created', 'accepted_by_restaurant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered', 'completed', 'cancelled', 'failed'],
    default: 'created'
  },
  deliveryInstructions: {
    type: String,
    trim: true
  },
  scheduledTime: {
    type: Date
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  couponCode: {
    type: String
  },
  paymentIntentId: {
    type: String
  },
  cancellationReason: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }]
}, {
  timestamps: true
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ riderId: 1, orderStatus: 1 });
orderSchema.index({ orderNumber: 1 });

orderSchema.virtual('subtotal').get(function() {
  return this.subtotalCents / 100;
});

orderSchema.virtual('total').get(function() {
  return this.totalCents / 100;
});

module.exports = mongoose.model('Order', orderSchema);