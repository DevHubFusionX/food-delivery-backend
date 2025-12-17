const express = require('express');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Rider = require('../models/Rider');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/admin/orders - Get all orders
router.get('/orders', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      status, 
      restaurant_id, 
      rider_id, 
      date_from, 
      date_to,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    if (status) {
      query.order_status = status;
    }
    if (restaurant_id) {
      query.restaurant_id = restaurant_id;
    }
    if (rider_id) {
      query.rider_id = rider_id;
    }
    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) query.created_at.$gte = new Date(date_from);
      if (date_to) query.created_at.$lte = new Date(date_to);
    }

    const orders = await Order.find(query)
      .populate('user_id', 'first_name last_name email')
      .populate('restaurant_id', 'name')
      .populate('rider_id', 'first_name last_name')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Get order statistics
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$order_status',
          count: { $sum: 1 },
          total_value: { $sum: '$total_cents' }
        }
      }
    ]);

    res.json({
      orders,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/v1/admin/restaurants/:id/approve - Approve restaurant
router.patch('/restaurants/:id/approve', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { is_approved, approval_notes } = req.body;

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    restaurant.is_approved = is_approved;
    restaurant.is_active = is_approved; // Auto-activate when approved
    restaurant.approval_notes = approval_notes;
    restaurant.approved_at = is_approved ? new Date() : null;
    restaurant.approved_by = req.user.userId;

    await restaurant.save();

    res.json({
      message: `Restaurant ${is_approved ? 'approved' : 'rejected'} successfully`,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        is_approved: restaurant.is_approved,
        is_active: restaurant.is_active
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/admin/restaurants - Get all restaurants for admin
router.get('/restaurants', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      status, 
      is_approved, 
      cuisine,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    if (status) {
      query.is_active = status === 'active';
    }
    if (is_approved !== undefined) {
      query.is_approved = is_approved === 'true';
    }
    if (cuisine) {
      query.cuisine_types = { $in: [cuisine] };
    }

    const restaurants = await Restaurant.find(query)
      .populate('owner_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

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
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/admin/users - Get all users
router.get('/users', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      role, 
      is_active,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    if (role) {
      query.role = role;
    }
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const users = await User.find(query)
      .select('-password -refresh_tokens')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/admin/riders - Get all riders
router.get('/riders', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { 
      is_active, 
      is_online,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }
    if (is_online !== undefined) {
      query.is_online = is_online === 'true';
    }

    const riders = await Rider.find(query)
      .populate('user_id', 'first_name last_name email phone')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Rider.countDocuments(query);

    res.json({
      riders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/admin/dashboard - Admin dashboard stats
router.get('/dashboard', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Order statistics
    const orderStats = await Order.aggregate([
      {
        $facet: {
          today: [
            { $match: { created_at: { $gte: startOfDay } } },
            { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total_cents' } } }
          ],
          week: [
            { $match: { created_at: { $gte: startOfWeek } } },
            { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total_cents' } } }
          ],
          month: [
            { $match: { created_at: { $gte: startOfMonth } } },
            { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total_cents' } } }
          ],
          byStatus: [
            { $group: { _id: '$order_status', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // User counts
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Restaurant counts
    const restaurantStats = await Restaurant.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$is_active', 1, 0] } },
          approved: { $sum: { $cond: ['$is_approved', 1, 0] } }
        }
      }
    ]);

    // Rider stats
    const riderStats = await Rider.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          online: { $sum: { $cond: ['$is_online', 1, 0] } },
          available: { $sum: { $cond: ['$is_available', 1, 0] } }
        }
      }
    ]);

    res.json({
      orders: orderStats[0],
      users: userCounts,
      restaurants: restaurantStats[0] || { total: 0, active: 0, approved: 0 },
      riders: riderStats[0] || { total: 0, online: 0, available: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;