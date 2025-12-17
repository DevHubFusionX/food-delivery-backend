const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/restaurants
router.get('/', async (req, res) => {
  try {
    const { lat, lng, cuisine, q, page = 1, limit = 20 } = req.query;
    
    let query = { status: 'active' };
    
    if (cuisine) {
      query.cuisine = cuisine;
    }
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { cuisine: { $regex: q, $options: 'i' } }
      ];
    }

    console.log('Restaurant query:', query);
    
    const restaurants = await Restaurant.find(query)
      .select('-ownerId')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    console.log('Found restaurants:', restaurants.length);
    
    const total = await Restaurant.countDocuments(query);

    res.json({
      restaurants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Restaurant fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/restaurants/:id
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .select('-ownerId');

    if (!restaurant || restaurant.status !== 'active') {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Fetch menu items separately
    const menuItems = await MenuItem.find({ 
      restaurantId: req.params.id,
      isAvailable: true 
    });

    // Add menu items to restaurant object
    const restaurantWithMenu = {
      ...restaurant.toObject(),
      menu_items: menuItems
    };

    res.json(restaurantWithMenu);
  } catch (error) {
    console.error('Restaurant detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/restaurants (owner)
router.post('/', authMiddleware, requireRole(['restaurant_owner']), async (req, res) => {
  try {
    const restaurantData = {
      ...req.body,
      ownerId: req.user.userId
    };

    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();

    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/restaurants/:id/menu_items (owner)
router.post('/:id/menu_items', authMiddleware, requireRole(['restaurant_owner']), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurant.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const menuItem = new MenuItem({
      ...req.body,
      restaurantId: req.params.id,
      priceCents: Math.round(req.body.price * 100) // Convert to cents
    });

    await menuItem.save();

    // Add to restaurant's menu_items array
    restaurant.menu_items.push(menuItem._id);
    await restaurant.save();

    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/restaurants/:id/menu_items/:itemId (owner)
router.put('/:id/menu_items/:itemId', authMiddleware, requireRole(['restaurant_owner']), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant || restaurant.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updateData = { ...req.body };
    if (req.body.price) {
      updateData.priceCents = Math.round(req.body.price * 100);
    }

    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.itemId,
      updateData,
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;