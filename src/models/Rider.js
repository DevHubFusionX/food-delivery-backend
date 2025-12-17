const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currentLat: {
    type: Number
  },
  currentLng: {
    type: Number
  },
  status: {
    type: String,
    enum: ['available', 'on_delivery', 'offline'],
    default: 'offline'
  },
  vehicleType: {
    type: String,
    enum: ['bicycle', 'motorcycle', 'car'],
    required: true
  },
  licenseNumber: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  currentOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  maxOrders: {
    type: Number,
    default: 3
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  documents: {
    driverLicense: String,
    vehicleRegistration: String,
    insurance: String
  },
  earnings: {
    today: { type: Number, default: 0 },
    thisWeek: { type: Number, default: 0 },
    thisMonth: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

riderSchema.index({ userId: 1 });
riderSchema.index({ currentLat: 1, currentLng: 1 });
riderSchema.index({ status: 1 });

module.exports = mongoose.model('Rider', riderSchema);