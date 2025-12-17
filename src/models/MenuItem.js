const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuCategory',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priceCents: {
    type: Number,
    required: true,
    min: 0
  },
  imageUrl: {
    type: String
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  allergens: [{
    type: String,
    trim: true
  }],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

menuItemSchema.index({ restaurantId: 1, categoryId: 1 });
menuItemSchema.index({ isAvailable: 1 });

menuItemSchema.virtual('price').get(function() {
  return this.priceCents / 100;
});

module.exports = mongoose.model('MenuItem', menuItemSchema);