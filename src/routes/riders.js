const express = require('express');
const Rider = require('../models/Rider');
const Order = require('../models/Order');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/riders/:id/location - Update rider location
router.post('/:id/location', authMiddleware, requireRole(['rider']), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const riderId = req.params.id;

    // Verify rider can update this location
    if (req.user.userId !== riderId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    // Update location
    rider.current_location = {
      type: 'Point',
      coordinates: [lng, lat]
    };
    rider.last_location_update = new Date();
    rider.is_online = true;

    await rider.save();

    // TODO: Update Redis for real-time tracking
    // await redisClient.setex(`rider:${riderId}:location`, 300, JSON.stringify({ lat, lng, timestamp: Date.now() }));

    // Update active orders with rider location
    await Order.updateMany(
      { 
        rider_id: riderId, 
        order_status: { $in: ['picked_up', 'on_the_way'] }
      },
      { 
        $set: { 
          'tracking.current_location': {
            type: 'Point',
            coordinates: [lng, lat]
          },
          'tracking.last_update': new Date()
        }
      }
    );

    res.json({ 
      message: 'Location updated successfully',
      location: { lat, lng },
      timestamp: rider.last_location_update
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/riders/:id/orders - Get rider's assigned orders
router.get('/:id/orders', authMiddleware, requireRole(['rider', 'admin']), async (req, res) => {
  try {
    const riderId = req.params.id;
    const { status, page = 1, limit = 10 } = req.query;

    // Verify rider can access these orders
    if (req.user.userId !== riderId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let query = { rider_id: riderId };
    if (status) {
      query.order_status = status;
    }

    const orders = await Order.find(query)
      .populate('restaurant_id', 'name address phone')
      .populate('user_id', 'first_name last_name phone')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
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

// POST /api/v1/riders/:id/status - Update rider availability
router.post('/:id/status', authMiddleware, requireRole(['rider']), async (req, res) => {
  try {
    const { is_online, is_available } = req.body;
    const riderId = req.params.id;

    if (req.user.userId !== riderId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    if (is_online !== undefined) {
      rider.is_online = is_online;
    }
    if (is_available !== undefined) {
      rider.is_available = is_available;
    }

    await rider.save();

    res.json({
      message: 'Status updated successfully',
      rider: {
        id: rider._id,
        is_online: rider.is_online,
        is_available: rider.is_available
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;