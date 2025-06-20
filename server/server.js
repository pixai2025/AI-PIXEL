const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware básico
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por ventana
});
app.use(limiter);

// Ruta básica de salud
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Pixel Tracker API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Endpoint básico de tracking (temporal)
app.post('/api/track', (req, res) => {
  console.log('Tracking event received:', req.body);
  res.json({ 
    success: true, 
    message: 'Event tracked successfully',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para servir el tracker JS
app.get('/client/ai-pixel-tracker.js', (req, res) => {
  res.sendFile(__dirname + '/../client/ai-pixel-tracker.js');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 AI Pixel Tracker API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

