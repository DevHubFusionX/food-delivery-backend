const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing test user
    await User.deleteOne({ email: 'test@example.com' });

    // Create test user
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      passwordHash: 'password123',
      role: 'customer'
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('Email: test@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createTestUser();