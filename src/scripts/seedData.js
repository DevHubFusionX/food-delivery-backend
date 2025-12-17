const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Coupon = require('../models/Coupon');

const { RESTAURANT_IMAGES, FOOD_IMAGES } = {
  RESTAURANT_IMAGES: {
    pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop&crop=center',
    burger: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=600&fit=crop&crop=center',
    sushi: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=600&fit=crop&crop=center',
    mexican: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=800&h=600&fit=crop&crop=center'
  },
  FOOD_IMAGES: {
    margherita: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop&crop=center',
    pepperoni: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop&crop=center',
    cheeseburger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&crop=center',
    bbqBurger: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400&h=300&fit=crop&crop=center',
    fries: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=300&fit=crop&crop=center',
    salmonRoll: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop&crop=center',
    tunaSashimi: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&h=300&fit=crop&crop=center',
    misoSoup: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop&crop=center',
    tacos: 'https://images.unsplash.com/photo-1565299585323-38174c4a6c18?w=400&h=300&fit=crop&crop=center',
    burrito: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop&crop=center',
    guacamole: 'https://images.unsplash.com/photo-1541544181051-e46607bc22a4?w=400&h=300&fit=crop&crop=center',
    caesarSalad: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop&crop=center'
  }
};

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    await Coupon.deleteMany({});

    // Create sample users
    const users = await User.create([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        passwordHash: 'password123',
        role: 'customer'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        passwordHash: 'password123',
        role: 'restaurant_owner'
      },
      {
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'mike@example.com',
        passwordHash: 'password123',
        role: 'rider'
      }
    ]);

    // Create sample restaurants
    const restaurants = await Restaurant.create([
      {
        name: 'Pizza Palace',
        description: 'Authentic Italian pizza with fresh ingredients',
        cuisine: 'Italian',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          lat: 40.7128,
          lng: -74.006
        },
        phone: '+1-555-0123',
        email: 'info@pizzapalace.com',
        openTime: '09:00',
        closeTime: '23:00',
        image: RESTAURANT_IMAGES.pizza,
        ownerId: users[1]._id,
        status: 'active',
        rating: 4.5,
        reviewCount: 128,
        deliveryFee: 299,
        minimumOrder: 1500,
        estimatedDeliveryTime: 30
      },
      {
        name: 'Burger Barn',
        description: 'Gourmet burgers and crispy fries',
        cuisine: 'American',
        address: {
          street: '456 Oak Ave',
          city: 'New York',
          state: 'NY',
          zipCode: '10002',
          lat: 40.7158,
          lng: -74.008
        },
        phone: '+1-555-0124',
        email: 'hello@burgerbarn.com',
        openTime: '10:00',
        closeTime: '22:00',
        image: RESTAURANT_IMAGES.burger,
        ownerId: users[1]._id,
        status: 'active',
        rating: 4.2,
        reviewCount: 89,
        deliveryFee: 199,
        minimumOrder: 1200,
        estimatedDeliveryTime: 25
      },
      {
        name: 'Sushi Zen',
        description: 'Fresh sushi and Japanese cuisine',
        cuisine: 'Japanese',
        address: {
          street: '789 Pine St',
          city: 'New York',
          state: 'NY',
          zipCode: '10003',
          lat: 40.7188,
          lng: -74.010
        },
        phone: '+1-555-0125',
        email: 'orders@sushizen.com',
        openTime: '11:00',
        closeTime: '23:30',
        image: RESTAURANT_IMAGES.sushi,
        ownerId: users[1]._id,
        status: 'active',
        rating: 4.7,
        reviewCount: 156,
        deliveryFee: 399,
        minimumOrder: 2000,
        estimatedDeliveryTime: 35
      },
      {
        name: 'Taco Fiesta',
        description: 'Authentic Mexican tacos and burritos',
        cuisine: 'Mexican',
        address: {
          street: '321 Elm St',
          city: 'New York',
          state: 'NY',
          zipCode: '10004',
          lat: 40.7218,
          lng: -74.012
        },
        phone: '+1-555-0126',
        email: 'info@tacofiesta.com',
        openTime: '08:00',
        closeTime: '22:30',
        image: RESTAURANT_IMAGES.mexican,
        ownerId: users[1]._id,
        status: 'active',
        rating: 4.3,
        reviewCount: 94,
        deliveryFee: 249,
        minimumOrder: 1000,
        estimatedDeliveryTime: 20
      }
    ]);

    // Create categories first
    const Category = mongoose.model('MenuCategory', new mongoose.Schema({ name: String }));
    const categories = await Category.create([
      { name: 'Pizza' },
      { name: 'Salads' },
      { name: 'Burgers' },
      { name: 'Sides' },
      { name: 'Rolls' },
      { name: 'Sashimi' },
      { name: 'Soup' },
      { name: 'Tacos' },
      { name: 'Burritos' },
      { name: 'Appetizers' }
    ]);

    // Pizza Palace menu
    const pizzaItems = await MenuItem.create([
      {
        restaurantId: restaurants[0]._id,
        categoryId: categories[0]._id,
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, tomato sauce, basil',
        priceCents: 1899,
        imageUrl: FOOD_IMAGES.margherita,
        isAvailable: true,
        preparationTime: 15
      },
      {
        restaurantId: restaurants[0]._id,
        categoryId: categories[0]._id,
        name: 'Pepperoni Pizza',
        description: 'Classic pepperoni with mozzarella cheese',
        priceCents: 2199,
        imageUrl: FOOD_IMAGES.pepperoni,
        isAvailable: true,
        preparationTime: 15
      },
      {
        restaurantId: restaurants[0]._id,
        categoryId: categories[1]._id,
        name: 'Caesar Salad',
        description: 'Crisp romaine, parmesan, croutons',
        priceCents: 1299,
        imageUrl: FOOD_IMAGES.caesarSalad,
        isAvailable: true,
        preparationTime: 10
      }
    ]);

    // Burger Barn menu
    const burgerItems = await MenuItem.create([
      {
        restaurantId: restaurants[1]._id,
        categoryId: categories[2]._id,
        name: 'Classic Cheeseburger',
        description: 'Beef patty, cheese, lettuce, tomato, onion',
        priceCents: 1599,
        imageUrl: FOOD_IMAGES.cheeseburger,
        isAvailable: true,
        preparationTime: 12
      },
      {
        restaurantId: restaurants[1]._id,
        categoryId: categories[2]._id,
        name: 'Bacon BBQ Burger',
        description: 'Beef patty, bacon, BBQ sauce, onion rings',
        priceCents: 1899,
        imageUrl: FOOD_IMAGES.bbqBurger,
        isAvailable: true,
        preparationTime: 15
      },
      {
        restaurantId: restaurants[1]._id,
        categoryId: categories[3]._id,
        name: 'Crispy Fries',
        description: 'Golden crispy french fries',
        priceCents: 699,
        imageUrl: FOOD_IMAGES.fries,
        isAvailable: true,
        preparationTime: 8
      }
    ]);

    // Sushi Zen menu
    const sushiItems = await MenuItem.create([
      {
        restaurantId: restaurants[2]._id,
        categoryId: categories[4]._id,
        name: 'Salmon Roll',
        description: 'Fresh salmon, avocado, cucumber',
        priceCents: 1499,
        imageUrl: FOOD_IMAGES.salmonRoll,
        isAvailable: true,
        preparationTime: 10
      },
      {
        restaurantId: restaurants[2]._id,
        categoryId: categories[5]._id,
        name: 'Tuna Sashimi',
        description: 'Fresh tuna slices (6 pieces)',
        priceCents: 1899,
        imageUrl: FOOD_IMAGES.tunaSashimi,
        isAvailable: true,
        preparationTime: 5
      },
      {
        restaurantId: restaurants[2]._id,
        categoryId: categories[6]._id,
        name: 'Miso Soup',
        description: 'Traditional soybean soup',
        priceCents: 599,
        imageUrl: FOOD_IMAGES.misoSoup,
        isAvailable: true,
        preparationTime: 5
      }
    ]);

    // Taco Fiesta menu
    const tacoItems = await MenuItem.create([
      {
        restaurantId: restaurants[3]._id,
        categoryId: categories[7]._id,
        name: 'Beef Tacos',
        description: 'Seasoned ground beef, lettuce, cheese (3 tacos)',
        priceCents: 1299,
        imageUrl: FOOD_IMAGES.tacos,
        isAvailable: true,
        preparationTime: 8
      },
      {
        restaurantId: restaurants[3]._id,
        categoryId: categories[8]._id,
        name: 'Chicken Burrito',
        description: 'Grilled chicken, rice, beans, cheese, salsa',
        priceCents: 1599,
        imageUrl: FOOD_IMAGES.burrito,
        isAvailable: true,
        preparationTime: 12
      },
      {
        restaurantId: restaurants[3]._id,
        categoryId: categories[9]._id,
        name: 'Guacamole & Chips',
        description: 'Fresh guacamole with tortilla chips',
        priceCents: 899,
        imageUrl: FOOD_IMAGES.guacamole,
        isAvailable: true,
        preparationTime: 5
      }
    ]);



    // Create sample coupons
    await Coupon.create([
      {
        name: 'Welcome Discount',
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 1500,
        maxDiscountAmount: 500,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        usageLimit: 1000,
        isActive: true,
        createdBy: users[1]._id
      },
      {
        name: 'Save $5',
        code: 'SAVE5',
        discountType: 'fixed',
        discountValue: 500,
        minOrderAmount: 2000,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        usageLimit: 500,
        isActive: true,
        createdBy: users[1]._id
      }
    ]);

    console.log('✅ Seed data created successfully!');
    console.log(`Created ${users.length} users`);
    console.log(`Created ${restaurants.length} restaurants`);
    console.log(`Created ${pizzaItems.length + burgerItems.length + sushiItems.length + tacoItems.length} menu items`);
    console.log('Created 2 coupons');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedData();