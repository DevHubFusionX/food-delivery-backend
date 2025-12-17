const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  notes: {
    type: String,
    default: ''
  },
  price_cents: {
    type: Number,
    required: true
  },
  total_cents: {
    type: Number,
    required: true
  }
});

const cartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  subtotal_cents: {
    type: Number,
    required: true,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
cartSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient user lookups
cartSchema.index({ user_id: 1 });

// TTL index to auto-delete old carts after 7 days
cartSchema.index({ updated_at: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Cart', cartSchema);