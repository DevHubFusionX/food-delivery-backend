const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const createTestOrder = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('❌ Test user not found. Run createTestUser.js first');
      return;
    }

    // Get first restaurant and menu items
    const restaurant = await Restaurant.findOne();
    const menuItems = await MenuItem.find({ restaurantId: restaurant._id }).limit(2);

    if (!restaurant || menuItems.length === 0) {
      console.log('❌ No restaurant or menu items found. Run seedData.js first');
      return;
    }

    // Create test order
    const testOrder = new Order({
      orderNumber: `ORD${Date.now()}`,
      userId: user._id,
      restaurantId: restaurant._id,
      items: menuItems.map(item => ({
        menuItemId: item._id,
        quantity: 2,
        itemNotes: 'Test order item',
        priceCents: item.priceCents
      })),
      subtotalCents: menuItems.reduce((sum, item) => sum + (item.priceCents * 2), 0),
      deliveryFeeCents: 299,
      taxCents: 200,
      totalCents: menuItems.reduce((sum, item) => sum + (item.priceCents * 2), 0) + 299 + 200,
      orderStatus: 'delivered'
    });

    await testOrder.save();
    console.log('✅ Test order created successfully!');
    console.log('Order ID:', testOrder._id);

  } catch (error) {
    console.error('❌ Error creating test order:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createTestOrder();