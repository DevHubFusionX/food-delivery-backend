const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const router = express.Router();

// GET /api/v1/search
router.get('/', async (req, res) => {
  try {
    const { 
      q, 
      cuisine, 
      price_range, 
      lat, 
      lng, 
      rating_min,
      delivery_time_max,
      page = 1, 
      limit = 20 
    } = req.query;

    let restaurantQuery = { is_active: true };
    let menuQuery = { is_available: true };

    // Text search
    if (q) {
      const searchRegex = { $regex: q, $options: 'i' };
      restaurantQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { cuisine_types: { $in: [searchRegex] } }
      ];
      
      menuQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }

    // Cuisine filter
    if (cuisine) {
      restaurantQuery.cuisine_types = { $in: [cuisine] };
    }

    // Rating filter
    if (rating_min) {
      restaurantQuery.average_rating = { $gte: parseFloat(rating_min) };
    }

    // Delivery time filter
    if (delivery_time_max) {
      restaurantQuery.estimated_delivery_time_minutes = { $lte: parseInt(delivery_time_max) };
    }

    // Price range filter for menu items
    if (price_range) {
      const [min, max] = price_range.split('-').map(p => parseInt(p) * 100); // Convert to cents
      menuQuery.price_cents = { $gte: min, $lte: max };
    }

    let restaurants;
    let menuItems = [];

    // Search restaurants
    if (lat && lng) {
      // Geo-spatial search
      restaurants = await Restaurant.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            distanceField: 'distance',
            maxDistance: 50000, // 50km
            spherical: true,
            query: restaurantQuery
          }
        },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'menuitems',
            localField: '_id',
            foreignField: 'restaurant_id',
            as: 'menu_items'
          }
        }
      ]);
    } else {
      restaurants = await Restaurant.find(restaurantQuery)
        .populate('menu_items')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ average_rating: -1, name: 1 });
    }

    // Search menu items if text query provided
    if (q) {
      const restaurantIds = restaurants.map(r => r._id);
      menuQuery.restaurant_id = { $in: restaurantIds };
      
      menuItems = await MenuItem.find(menuQuery)
        .populate('restaurant_id', 'name cuisine_types average_rating')
        .limit(50); // Limit menu item results
    }

    // Get total count for pagination
    const totalRestaurants = await Restaurant.countDocuments(restaurantQuery);

    // Group results
    const results = {
      restaurants: restaurants.map(restaurant => ({
        ...restaurant.toObject ? restaurant.toObject() : restaurant,
        type: 'restaurant'
      })),
      menu_items: menuItems.map(item => ({
        ...item.toObject(),
        type: 'menu_item'
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRestaurants,
        pages: Math.ceil(totalRestaurants / limit)
      }
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/search/suggestions - Search suggestions/autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchRegex = { $regex: q, $options: 'i' };

    // Get restaurant suggestions
    const restaurantSuggestions = await Restaurant.find(
      { 
        name: searchRegex, 
        is_active: true 
      },
      { name: 1, cuisine_types: 1 }
    ).limit(5);

    // Get cuisine suggestions
    const cuisineSuggestions = await Restaurant.distinct('cuisine_types', {
      cuisine_types: searchRegex,
      is_active: true
    });

    // Get menu item suggestions
    const menuSuggestions = await MenuItem.find(
      { 
        name: searchRegex, 
        is_available: true 
      },
      { name: 1, category: 1 }
    ).limit(5);

    const suggestions = [
      ...restaurantSuggestions.map(r => ({ 
        text: r.name, 
        type: 'restaurant',
        id: r._id 
      })),
      ...cuisineSuggestions.slice(0, 3).map(c => ({ 
        text: c, 
        type: 'cuisine' 
      })),
      ...menuSuggestions.map(m => ({ 
        text: m.name, 
        type: 'menu_item',
        id: m._id 
      }))
    ];

    res.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;