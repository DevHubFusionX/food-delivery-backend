const express = require('express');
const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/cart
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user.userId;

    // Validate menu items exist and are available
    const menuItemIds = items.map(item => item.menu_item_id);
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      isAvailable: true
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ error: 'Some menu items are not available' });
    }

    // Calculate totals
    let subtotal_cents = 0;
    const validatedItems = items.map(item => {
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

    // Update or create cart using findOneAndUpdate
    const cart = await Cart.findOneAndUpdate(
      { user_id: userId },
      {
        items: validatedItems,
        subtotal_cents,
        updated_at: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    await cart.populate('items.menu_item_id', 'name priceCents restaurantId');

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/cart
router.get('/', authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user_id: req.user.userId })
      .populate('items.menu_item_id', 'name priceCents restaurantId');

    if (!cart) {
      return res.json({ items: [], subtotal_cents: 0 });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/v1/cart
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user_id: req.user.userId });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;