const crypto = require('crypto');

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${timestamp}-${randomStr}`;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Calculate delivery fee based on distance
const calculateDeliveryFee = (distance, baseFeeCents = 299) => {
  if (distance <= 2) return baseFeeCents;
  if (distance <= 5) return baseFeeCents + 100;
  return baseFeeCents + 200;
};

// Calculate tax
const calculateTax = (subtotalCents, taxRate = 0.08) => {
  return Math.round(subtotalCents * taxRate);
};

// Format price from cents to dollars
const formatPrice = (cents) => {
  return (cents / 100).toFixed(2);
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate random verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  generateOrderNumber,
  calculateDistance,
  calculateDeliveryFee,
  calculateTax,
  formatPrice,
  isValidEmail,
  generateVerificationCode,
  sanitizeInput
};