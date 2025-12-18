const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const mongoose = require('mongoose')
require('dotenv').config()

// Configuration
const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery',
  allowedOrigins: [
    'http://localhost:5173',
    'https://food-delivery-two-gules.vercel.app',
    'https://food-delivery-qoymqi57r-franklin-s-projects-4f1f5f19.vercel.app'
  ]
}

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Rate Limiting Configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  skip: req => req.method === 'OPTIONS'
})

// Routes
const routes = {
  auth: require('./routes/auth'),
  restaurants: require('./routes/restaurants'),
  cart: require('./routes/cart'),
  orders: require('./routes/orders'),
  payments: require('./routes/payments'),
  riders: require('./routes/riders'),
  search: require('./routes/search'),
  admin: require('./routes/admin')
}

// Initialize Express App
const app = express()

// Middleware Setup
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(helmet())
app.use('/api/', rateLimiter)
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// API Routes
app.use('/api/v1/auth', routes.auth)
app.use('/api/v1/restaurants', routes.restaurants)
app.use('/api/v1/cart', routes.cart)
app.use('/api/v1/orders', routes.orders)
app.use('/api/v1/payments', routes.payments)
app.use('/api/v1/riders', routes.riders)
app.use('/api/v1/search', routes.search)
app.use('/api/v1/admin', routes.admin)

// Health Endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'Food Delivery API',
    version: '3.1.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  })
})

// Error Handlers
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((error, req, res, next) => {
  console.error('Error:', error.message)

  const errorMap = {
    ValidationError: { status: 400, message: 'Validation error' },
    CastError: { status: 400, message: 'Invalid ID format' },
    11000: { status: 400, message: 'Duplicate entry' }
  }

  const errorType = errorMap[error.name] || errorMap[error.code]
  if (errorType) {
    return res.status(errorType.status).json({ error: errorType.message })
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

// Database Connection
mongoose.connect(config.mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

// Start Server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app
