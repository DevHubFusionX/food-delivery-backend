const Order = require('../models/Order');
const { OrderLifecycleManager, ORDER_STATES } = require('../utils/orderLifecycle');
const { generateOrderNumber } = require('../utils/helpers');

class OrderController {
  // Update order status with lifecycle validation
  static async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;
      const { user } = req;

      const order = await Order.findById(orderId)
        .populate('restaurantId', 'ownerId')
        .populate('riderId', '_id');

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if transition is valid
      if (!OrderLifecycleManager.isValidTransition(order.orderStatus, status)) {
        return res.status(400).json({
          message: `Invalid status transition from ${order.orderStatus} to ${status}`,
          validTransitions: OrderLifecycleManager.getNextValidStates(order.orderStatus)
        });
      }

      // Check user permissions
      const restaurantOwnerId = order.restaurantId?.ownerId;
      const riderId = order.riderId?._id;
      
      if (!OrderLifecycleManager.canUserTransition(
        user.role,
        restaurantOwnerId,
        riderId,
        user._id,
        status,
        order
      )) {
        return res.status(403).json({ message: 'Not authorized to update this order status' });
      }

      // Update order status
      order.orderStatus = status;
      
      // Set timestamps for specific states
      switch (status) {
        case ORDER_STATES.DELIVERED:
          order.actualDeliveryTime = new Date();
          break;
        case ORDER_STATES.PICKED_UP:
          if (!order.estimatedDeliveryTime) {
            const estimatedMinutes = OrderLifecycleManager.getEstimatedTime(ORDER_STATES.ON_THE_WAY);
            order.estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000);
          }
          break;
      }

      await order.save();

      // TODO: Send real-time notifications to relevant parties
      // await NotificationService.sendOrderStatusUpdate(order);

      res.json({
        message: 'Order status updated successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          statusDescription: OrderLifecycleManager.getStateDescription(order.orderStatus),
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          actualDeliveryTime: order.actualDeliveryTime
        }
      });

    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Get order status history and next valid transitions
  static async getOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { user } = req;

      const order = await Order.findById(orderId)
        .populate('restaurantId', 'name ownerId')
        .populate('riderId', 'firstName lastName')
        .populate('userId', 'firstName lastName');

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user can view this order
      const canView = user.role === 'admin' ||
                     order.userId.toString() === user._id.toString() ||
                     (user.role === 'restaurant_owner' && order.restaurantId.ownerId.toString() === user._id.toString()) ||
                     (user.role === 'rider' && order.riderId && order.riderId._id.toString() === user._id.toString());

      if (!canView) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }

      const nextValidStates = OrderLifecycleManager.getNextValidStates(order.orderStatus);
      const isTerminal = OrderLifecycleManager.isTerminalState(order.orderStatus);

      res.json({
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          currentStatus: order.orderStatus,
          statusDescription: OrderLifecycleManager.getStateDescription(order.orderStatus),
          isTerminal,
          nextValidStates,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          actualDeliveryTime: order.actualDeliveryTime,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }
      });

    } catch (error) {
      console.error('Get order status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Cancel order (with validation)
  static async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const { user } = req;

      const order = await Order.findById(orderId)
        .populate('restaurantId', 'ownerId');

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if order can be cancelled
      if (!OrderLifecycleManager.isValidTransition(order.orderStatus, ORDER_STATES.CANCELLED)) {
        return res.status(400).json({
          message: 'Order cannot be cancelled at this stage',
          currentStatus: order.orderStatus
        });
      }

      // Check cancellation permissions
      const canCancel = user.role === 'admin' ||
                       order.userId.toString() === user._id.toString() ||
                       (user.role === 'restaurant_owner' && order.restaurantId.ownerId.toString() === user._id.toString());

      if (!canCancel) {
        return res.status(403).json({ message: 'Not authorized to cancel this order' });
      }

      order.orderStatus = ORDER_STATES.CANCELLED;
      order.cancellationReason = reason;
      order.cancelledAt = new Date();
      order.cancelledBy = user._id;

      await order.save();

      // TODO: Process refund if payment was made
      // TODO: Notify all parties about cancellation

      res.json({
        message: 'Order cancelled successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          cancelledAt: order.cancelledAt
        }
      });

    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = OrderController;