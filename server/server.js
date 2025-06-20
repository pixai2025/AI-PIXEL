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
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  'use strict';
  
  // AI Bot Detection Dictionary
  const AI_BOTS = {
    'GPTBot': 'OpenAI Training',
    'ChatGPT-User': 'OpenAI Real-time',
    'OAI-SearchBot': 'OpenAI Search',
    'ClaudeBot': 'Anthropic Claude',
    'PerplexityBot': 'Perplexity AI',
    'Google-Extended': 'Google Gemini',
    'BingBot': 'Microsoft Bing',
    'Amazonbot': 'Amazon Alexa'
  };
  
  // Detect if current visitor is an AI bot
  function detectAIBot() {
    const userAgent = navigator.userAgent;
    for (const [botName, description] of Object.entries(AI_BOTS)) {
      if (userAgent.includes(botName)) {
        return { detected: true, bot: botName, description };
      }
    }
    return { detected: false };
  }
  
  // Send tracking event
  function sendEvent(eventData) {
    const trackingId = document.currentScript?.getAttribute('data-tracking-id') || 'unknown';
    
    const payload = {
      trackingId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...eventData
    };
    
    // Use sendBeacon if available, fallback to fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon('${process.env.RAILWAY_STATIC_URL || ''}/api/track', JSON.stringify(payload));
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(e => console.log('AI Pixel tracking failed:', e));
    }
  }
  
  // Initialize tracking
  function init() {
    const botDetection = detectAIBot();
    
    // Send page view event
    sendEvent({
      event: 'page_view',
      botDetected: botDetection.detected,
      botInfo: botDetection
    });
    
    // If AI bot detected, send special event
    if (botDetection.detected) {
      sendEvent({
        event: 'ai_bot_detected',
        botName: botDetection.bot,
        botDescription: botDetection.description
      });
      console.log('🤖 AI Bot detected:', botDetection);
    }
  }
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
  `);
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

