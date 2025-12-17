const express = require('express');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
// const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const { authMiddleware, requireRole } = require('../middleware/auth');
const { generateOrderNumber } = require('../utils/helpers');
const OrderController = require('../controllers/orderController');

const router = express.Router();

// POST /api/v1/orders - Place order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, address_id, items, coupon_code, payment_method, scheduled_time } = req.body;
    const userId = req.user.userId;

    // 1. Validate payload and check item availability
    const menuItemIds = items.map(item => item.menu_item_id);
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurantId: restaurant_id,
      isAvailable: true
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ error: 'Some menu items are not available' });
    }

    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant || restaurant.status !== 'active') {
      return res.status(400).json({ error: 'Restaurant not available' });
    }

    // 2. Calculate totals (in cents)
    let subtotal_cents = 0;
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(mi => mi._id.toString() === item.menu_item_id);
      const itemTotal = menuItem.priceCents * item.quantity;
      subtotal_cents += itemTotal;
      
      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        notes: item.notes || '',
        price_cents: menuItem.priceCents,
        total_cents: itemTotal
      };
    });

    let discount_cents = 0;
    let coupon = null;

    // 3. Apply coupon if valid
    if (coupon_code) {
      coupon = await Coupon.findOne({
        code: coupon_code,
        isActive: true,
        startsAt: { $lte: new Date() },
        expiresAt: { $gte: new Date() }
      });

      if (coupon && subtotal_cents >= (coupon.minOrderAmount || 0)) {
        if (coupon.discountType === 'percentage') {
          discount_cents = Math.round(subtotal_cents * coupon.discountValue / 100);
        } else {
          discount_cents = coupon.discountValue; // discountValue is already in cents for fixed type
        }
        discount_cents = Math.min(discount_cents, coupon.maxDiscountAmount || discount_cents);
      }
    }

    const delivery_fee_cents = restaurant.deliveryFee || 299; // $2.99 default
    const tax_cents = Math.round((subtotal_cents - discount_cents) * 0.08); // 8% tax
    const total_cents = subtotal_cents - discount_cents + delivery_fee_cents + tax_cents;

    // 4. Start DB transaction and create order
    const orderNumber = generateOrderNumber();
    
    // Create a temporary address if none provided (for demo purposes)
    let finalAddressId = address_id;
    if (!address_id) {
      // In a real app, you'd create an address record here
      // For now, we'll skip the addressId requirement
      finalAddressId = null;
    }

    const order = new Order({
      orderNumber: orderNumber,
      userId: userId,
      restaurantId: restaurant_id,
      ...(finalAddressId && { addressId: finalAddressId }),
      items: orderItems.map(item => ({
        menuItemId: item.menu_item_id,
        quantity: item.quantity,
        itemNotes: item.notes,
        priceCents: item.price_cents
      })),
      subtotalCents: subtotal_cents,
      discountCents: discount_cents,
      deliveryFeeCents: delivery_fee_cents,
      taxCents: tax_cents,
      totalCents: total_cents,
      couponCode: coupon?.code,
      scheduledTime: scheduled_time ? new Date(scheduled_time) : null,
      orderStatus: 'created'
    });

    await order.save();

    let payment_reference = null;

    // 5. Create Paystack transaction for payments
    if (payment_method === 'paystack') {
      // Paystack integration disabled for security
      payment_reference = null;

      // Create payment record only if Paystack succeeded
      if (payment_reference) {
        const payment = new Payment({
          orderId: order._id,
          provider: 'paystack',
          providerPaymentId: payment_reference,
          amountCents: total_cents,
          status: 'pending'
        });

        await payment.save();
      }
    }

    // Clear user's cart
    await Cart.findOneAndDelete({ user_id: userId });

    res.status(201).json({
      order_id: order._id,
      order_number: orderNumber,
      payment_reference,
      order_status: order.orderStatus,
      total_cents,
      estimated_delivery_time: order.estimatedDeliveryTime
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/orders/:id - Get order details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone')
      .populate('restaurantId', 'name address phone')
      .populate('riderId', 'firstName lastName phone')
      .populate('items.menuItemId', 'name description');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check authorization
    const canView = req.user.role === 'admin' ||
                   order.userId._id.toString() === req.user.userId ||
                   (req.user.role === 'restaurant_owner' && order.restaurantId.ownerId?.toString() === req.user.userId) ||
                   (req.user.role === 'rider' && order.riderId?._id.toString() === req.user.userId);

    if (!canView) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/orders - Get user order history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { userId: req.user.userId };
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('restaurantId', 'name image')
      .sort({ createdAt: -1 })
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
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/orders/:id/cancel - Cancel order
router.post('/:id/cancel', authMiddleware, OrderController.cancelOrder);

// POST /api/v1/orders/:id/status - Update order status
router.post('/:id/status', authMiddleware, OrderController.updateOrderStatus);

// GET /api/v1/orders/:id/status - Get order status
router.get('/:id/status', authMiddleware, OrderController.getOrderStatus);

// POST /api/v1/orders/:id/assign - Assign rider (admin/auto-assign)
router.post('/:id/assign', authMiddleware, requireRole(['admin', 'restaurant_owner']), async (req, res) => {
  try {
    const { rider_id } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.orderStatus !== 'ready_for_pickup') {
      return res.status(400).json({ error: 'Order not ready for pickup' });
    }

    order.riderId = rider_id;
    order.orderStatus = 'picked_up';
    await order.save();

    res.json({ message: 'Rider assigned successfully', order_id: order._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;