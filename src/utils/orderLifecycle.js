const ORDER_STATES = {
  CREATED: 'created',
  ACCEPTED_BY_RESTAURANT: 'accepted_by_restaurant',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

const VALID_TRANSITIONS = {
  [ORDER_STATES.CREATED]: [
    ORDER_STATES.ACCEPTED_BY_RESTAURANT,
    ORDER_STATES.CANCELLED,
    ORDER_STATES.FAILED
  ],
  [ORDER_STATES.ACCEPTED_BY_RESTAURANT]: [
    ORDER_STATES.PREPARING,
    ORDER_STATES.CANCELLED
  ],
  [ORDER_STATES.PREPARING]: [
    ORDER_STATES.READY_FOR_PICKUP,
    ORDER_STATES.CANCELLED
  ],
  [ORDER_STATES.READY_FOR_PICKUP]: [
    ORDER_STATES.PICKED_UP,
    ORDER_STATES.CANCELLED
  ],
  [ORDER_STATES.PICKED_UP]: [
    ORDER_STATES.ON_THE_WAY,
    ORDER_STATES.FAILED
  ],
  [ORDER_STATES.ON_THE_WAY]: [
    ORDER_STATES.DELIVERED,
    ORDER_STATES.FAILED
  ],
  [ORDER_STATES.DELIVERED]: [
    ORDER_STATES.COMPLETED
  ],
  [ORDER_STATES.COMPLETED]: [], // Terminal state
  [ORDER_STATES.CANCELLED]: [], // Terminal state
  [ORDER_STATES.FAILED]: [] // Terminal state
};

const ROLE_PERMISSIONS = {
  [ORDER_STATES.CREATED]: ['customer', 'admin'],
  [ORDER_STATES.ACCEPTED_BY_RESTAURANT]: ['restaurant_owner', 'admin'],
  [ORDER_STATES.PREPARING]: ['restaurant_owner', 'admin'],
  [ORDER_STATES.READY_FOR_PICKUP]: ['restaurant_owner', 'admin'],
  [ORDER_STATES.PICKED_UP]: ['rider', 'admin'],
  [ORDER_STATES.ON_THE_WAY]: ['rider', 'admin'],
  [ORDER_STATES.DELIVERED]: ['rider', 'customer', 'admin'],
  [ORDER_STATES.COMPLETED]: ['customer', 'admin'],
  [ORDER_STATES.CANCELLED]: ['customer', 'restaurant_owner', 'admin'],
  [ORDER_STATES.FAILED]: ['rider', 'admin']
};

class OrderLifecycleManager {
  static isValidTransition(currentState, newState) {
    const validStates = VALID_TRANSITIONS[currentState];
    return validStates && validStates.includes(newState);
  }

  static canUserTransition(userRole, restaurantOwnerId, riderId, userId, targetState, order) {
    const allowedRoles = ROLE_PERMISSIONS[targetState];
    if (!allowedRoles) return false;

    // Admin can always transition
    if (userRole === 'admin') return true;

    // Check role-specific permissions
    if (allowedRoles.includes(userRole)) {
      switch (userRole) {
        case 'customer':
          return order.userId.toString() === userId.toString();
        case 'restaurant_owner':
          return order.restaurantId.toString() === restaurantOwnerId.toString();
        case 'rider':
          return order.riderId && order.riderId.toString() === riderId.toString();
        default:
          return true;
      }
    }

    return false;
  }

  static getNextValidStates(currentState) {
    return VALID_TRANSITIONS[currentState] || [];
  }

  static isTerminalState(state) {
    return [ORDER_STATES.COMPLETED, ORDER_STATES.CANCELLED, ORDER_STATES.FAILED].includes(state);
  }

  static getStateDescription(state) {
    const descriptions = {
      [ORDER_STATES.CREATED]: 'Order has been created and is waiting for restaurant confirmation',
      [ORDER_STATES.ACCEPTED_BY_RESTAURANT]: 'Restaurant has accepted the order',
      [ORDER_STATES.PREPARING]: 'Restaurant is preparing your order',
      [ORDER_STATES.READY_FOR_PICKUP]: 'Order is ready for pickup by delivery rider',
      [ORDER_STATES.PICKED_UP]: 'Order has been picked up by delivery rider',
      [ORDER_STATES.ON_THE_WAY]: 'Order is on the way to your location',
      [ORDER_STATES.DELIVERED]: 'Order has been delivered',
      [ORDER_STATES.COMPLETED]: 'Order is completed',
      [ORDER_STATES.CANCELLED]: 'Order has been cancelled',
      [ORDER_STATES.FAILED]: 'Order delivery failed'
    };
    return descriptions[state] || 'Unknown status';
  }

  static getEstimatedTime(state) {
    const estimatedMinutes = {
      [ORDER_STATES.CREATED]: 5,
      [ORDER_STATES.ACCEPTED_BY_RESTAURANT]: 2,
      [ORDER_STATES.PREPARING]: 20,
      [ORDER_STATES.READY_FOR_PICKUP]: 5,
      [ORDER_STATES.PICKED_UP]: 2,
      [ORDER_STATES.ON_THE_WAY]: 15,
      [ORDER_STATES.DELIVERED]: 0
    };
    return estimatedMinutes[state] || 0;
  }
}

module.exports = {
  ORDER_STATES,
  VALID_TRANSITIONS,
  ROLE_PERMISSIONS,
  OrderLifecycleManager
};