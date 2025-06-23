const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Base de datos en memoria (temporal - para MVP)
let users = [];
let trackingEvents = [];
let trackingIdCounter = 1000;

// Middleware básico
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Función para generar tracking ID único
function generateTrackingId(email) {
  const timestamp = Date.now().toString().slice(-6);
  const emailPrefix = email.split('@')[0].slice(0, 4);
  return `${emailPrefix}-${timestamp}`;
}

// Ruta básica de salud
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Pixel Tracker API is running!',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// REGISTRO DE USUARIOS
app.post('/api/register', (req, res) => {
  const { email, name, website } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }
  
  // Verificar si el usuario ya existe
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  // Crear nuevo usuario
  const trackingId = generateTrackingId(email);
  const newUser = {
    id: users.length + 1,
    email,
    name,
    website: website || '',
    trackingId,
    createdAt: new Date().toISOString(),
    isActive: true
  };
  
  users.push(newUser);
  
  res.json({
    success: true,
    message: 'User registered successfully',
    trackingId,
    dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard/${trackingId}`
  });
});

// LOGIN DE USUARIOS (simple)
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    trackingId: user.trackingId,
    dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard/${user.trackingId}`
  });
});

// Endpoint de tracking (mejorado)
app.post('/api/track', (req, res) => {
  const { trackingId, event, url, userAgent, botDetected, botInfo } = req.body;
  
  if (!trackingId) {
    return res.status(400).json({ error: 'Tracking ID is required' });
  }
  
  // Verificar que el tracking ID existe
  const user = users.find(u => u.trackingId === trackingId);
  if (!user) {
    return res.status(404).json({ error: 'Invalid tracking ID' });
  }
  
  // Guardar evento
  const trackingEvent = {
    id: trackingEvents.length + 1,
    trackingId,
    event: event || 'page_view',
    url: url || 'unknown',
    userAgent: userAgent || 'unknown',
    botDetected: botDetected || false,
    botInfo: botInfo || null,
    timestamp: new Date().toISOString(),
    ip: req.ip
  };
  
  trackingEvents.push(trackingEvent);
  
  console.log(`📊 Event tracked for ${trackingId}:`, trackingEvent);
  
  res.json({ 
    success: true, 
    message: 'Event tracked successfully',
    eventId: trackingEvent.id
  });
});

// Endpoint para servir el tracker JS
app.get('/client/ai-pixel-tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  'use strict';
  
  const AI_BOTS = {
    'GPTBot': 'OpenAI Training',
    'ChatGPT-User': 'OpenAI Real-time',
    'OAI-SearchBot': 'OpenAI Search',
    'ClaudeBot': 'Anthropic Claude',
    'PerplexityBot': 'Perplexity AI',
    'Google-Extended': 'Google Gemini',
    'BingBot': 'Microsoft Bing',
    'Amazonbot': 'Amazon Alexa',
    'anthropic-ai': 'Anthropic Research',
    'cohere-ai': 'Cohere AI',
    'AI2Bot': 'Allen Institute',
    'CCBot': 'Common Crawl',
    'Bytespider': 'ByteDance TikTok'
  };
  
  function detectAIBot() {
    const userAgent = navigator.userAgent;
    for (const [botName, description] of Object.entries(AI_BOTS)) {
      if (userAgent.includes(botName)) {
        return { detected: true, bot: botName, description };
      }
    }
    return { detected: false };
  }
  
  function sendEvent(eventData) {
    const trackingId = document.currentScript?.getAttribute('data-tracking-id') || 
                      document.querySelector('[data-tracking-id]')?.getAttribute('data-tracking-id');
    
    if (!trackingId) {
      console.warn('AI Pixel: No tracking ID found');
      return;
    }
    
    const payload = {
      trackingId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      ...eventData
    };
    
    const endpoint = '${req.protocol}://${req.get('host')}/api/track';
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(payload));
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(e => console.log('AI Pixel tracking failed:', e));
    }
  }
  
  function init() {
    const botDetection = detectAIBot();
    
    sendEvent({
      event: 'page_view',
      botDetected: botDetection.detected,
      botInfo: botDetection
    });
    
    if (botDetection.detected) {
      sendEvent({
        event: 'ai_bot_detected',
        botName: botDetection.bot,
        botDescription: botDetection.description
      });
      console.log('🤖 AI Bot detected:', botDetection);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
  `);
});

// DASHBOARD INDIVIDUAL POR TRACKING ID
app.get('/dashboard/:trackingId', (req, res) => {
  const trackingId = req.params.trackingId;
  
  // Verificar que el tracking ID existe
  const user = users.find(u => u.trackingId === trackingId);
  if (!user) {
    return res.status(404).send(`
      <h1>❌ Tracking ID not found</h1>
      <p>Please check your tracking ID or <a href="/register">register here</a></p>
    `);
  }
  
  // Obtener eventos específicos de este tracking ID
  const userEvents = trackingEvents.filter(e => e.trackingId === trackingId);
  const totalEvents = userEvents.length;
  const botEvents = userEvents.filter(e => e.botDetected);
  const totalBotDetections = botEvents.length;
  
  // Estadísticas
  const uniqueUrls = [...new Set(userEvents.map(e => e.url))].length;
  const mostActiveBot = botEvents.length > 0 
    ? botEvents.reduce((acc, event) => {
        const bot = event.botInfo?.bot || 'Unknown';
        acc[bot] = (acc[bot] || 0) + 1;
        return acc;
      }, {})
    : {};
  
  const topBot = Object.keys(mostActiveBot).length > 0 
    ? Object.keys(mostActiveBot).reduce((a, b) => mostActiveBot[a] > mostActiveBot[b] ? a : b)
    : 'None detected';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>AI Pixel Dashboard - ${user.name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 30px; }
            .header h1 { color: #1a202c; font-size: 28px; margin-bottom: 10px; }
            .header p { color: #718096; font-size: 16px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .metric { font-size: 32px; font-weight: bold; color: #3182ce; margin-bottom: 5px; }
            .metric-label { color: #718096; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .bot-event { background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #3182ce; }
            .bot-event strong { color: #3182ce; }
            .install-code { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Monaco', 'Courier New', monospace; font-size: 14px; overflow-x: auto; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status-active { background: #c6f6d5; color: #22543d; }
            .btn { background: #3182ce; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; }
            .btn:hover { background: #2c5aa0; }
            .timestamp { color: #a0aec0; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 AI Pixel Dashboard</h1>
                <p>Welcome back, <strong>${user.name}</strong> • Tracking ID: <code>${trackingId}</code> • <span class="status-badge status-active">Active</span></p>
                <p>Website: ${user.website || 'Not specified'} • Member since: ${new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div class="grid">
                <div class="card">
                    <div class="metric">${totalEvents}</div>
                    <div class="metric-label">Total Page Views</div>
                </div>
                <div class="card">
                    <div class="metric">${totalBotDetections}</div>
                    <div class="metric-label">AI Bot Visits</div>
                </div>
                <div class="card">
                    <div class="metric">${uniqueUrls}</div>
                    <div class="metric-label">Unique Pages</div>
                </div>
                <div class="card">
                    <div class="metric">${topBot}</div>
                    <div class="metric-label">Most Active Bot</div>
                </div>
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3 style="margin-bottom: 20px; color: #2d3748;">📦 Installation Code</h3>
                    <p style="margin-bottom: 15px; color: #718096;">Copy this code and paste it in your website's HTML:</p>
                    <div class="install-code">&lt;script src="${req.protocol}://${req.get('host')}/client/ai-pixel-tracker.js" data-tracking-id="${trackingId}"&gt;&lt;/script&gt;</div>
                </div>
                
                <div class="card">
                    <h3 style="margin-bottom: 20px; color: #2d3748;">🔗 Quick Links</h3>
                    <p><a href="/client/ai-pixel-tracker.js" target="_blank" class="btn">📄 View Tracker Script</a></p>
                    <p style="margin-top: 15px;"><a href="/register" class="btn">👥 Register New Account</a></p>
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 20px; color: #2d3748;">🤖 Recent AI Bot Activity</h3>
                ${botEvents.length > 0 
                  ? botEvents.slice(-10).reverse().map(event => `
                    <div class="bot-event">
                        <strong>${event.botInfo?.bot || 'Unknown Bot'}</strong> detected
                        <br><small>URL: ${event.url}</small>
                        <br><span class="timestamp">${new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  `).join('')
                  : '<p style="color: #718096; font-style: italic;">No AI bot activity detected yet. Make sure the tracking code is installed on your website.</p>'
                }
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 20px; color: #2d3748;">📊 All Recent Activity</h3>
                ${userEvents.length > 0 
                  ? userEvents.slice(-20).reverse().map(event => `
                    <div style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                        <strong>${event.event}</strong> ${event.botDetected ? '🤖' : '👤'}
                        <br><small>URL: ${event.url}</small>
                        <br><span class="timestamp">${new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  `).join('')
                  : '<p style="color: #718096; font-style: italic;">No activity recorded yet.</p>'
                }
            </div>
        </div>
        
        <script>
            // Auto-refresh every 30 seconds
            setTimeout(() => {
                window.location.reload();
            }, 30000);
        </script>
    </body>
    </html>
  `);
});

// PÁGINA DE REGISTRO
app.get('/register', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Register - AI Pixel Tracker</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; width: 100%; }
            h1 { color: #1a202c; margin-bottom: 30px; text-align: center; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; color: #2d3748; font-weight: 500; }
            input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 16px; }
            input:focus { outline: none; border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1); }
            .btn { width: 100%; background: #3182ce; color: white; padding: 12px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
            .btn:hover { background: #2c5aa0; }
            .result { margin-top: 20px; padding: 15px; border-radius: 8px; }
            .success { background: #c6f6d5; color: #22543d; }
            .error { background: #fed7d7; color: #c53030; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 AI Pixel Tracker</h1>
            <form id="registerForm">
                <div class="form-group">
                    <label for="name">Name *</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="website">Website (optional)</label>
                    <input type="url" id="website" name="website" placeholder="https://your-website.com">
                </div>
                <button type="submit" class="btn">Get My Tracking Code</button>
            </form>
            <div id="result"></div>
        </div>
        
        <script>
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                try {
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        document.getElementById('result').innerHTML = \`
                            <div class="result success">
                                <h3>✅ Success!</h3>
                                <p><strong>Your Tracking ID:</strong> \${result.trackingId}</p>
                                <p><a href="\${result.dashboardUrl}" target="_blank">🔗 Open Your Dashboard</a></p>
                            </div>
                        \`;
                        e.target.reset();
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    document.getElementById('result').innerHTML = \`
                        <div class="result error">
                            <h3>❌ Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            });
        </script>
    </body>
    </html>
  `);
});

// PÁGINA DE LOGIN
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login - AI Pixel Tracker</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; width: 100%; }
            h1 { color: #1a202c; margin-bottom: 30px; text-align: center; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; color: #2d3748; font-weight: 500; }
            input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 16px; }
            input:focus { outline: none; border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1); }
            .btn { width: 100%; background: #3182ce; color: white; padding: 12px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 15px; }
            .btn:hover { background: #2c5aa0; }
            .btn-secondary { background: #e2e8f0; color: #2d3748; }
            .btn-secondary:hover { background: #cbd5e0; }
            .result { margin-top: 20px; padding: 15px; border-radius: 8px; }
            .success { background: #c6f6d5; color: #22543d; }
            .error { background: #fed7d7; color: #c53030; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Login to Dashboard</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <button type="submit" class="btn">Access My Dashboard</button>
                <a href="/register" class="btn btn-secondary" style="text-decoration: none; display: block; text-align: center;">Create New Account</a>
            </form>
            <div id="result"></div>
        </div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        window.location.href = result.dashboardUrl;
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    document.getElementById('result').innerHTML = \`
                        <div class="result error">
                            <h3>❌ Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            });
        </script>
    </body>
    </html>
  `);
});

// DASHBOARD PRINCIPAL (redirige a registro)
app.get('/dashboard', (req, res) => {
  res.redirect('/register');
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
  console.log(`👥 Users: ${users.length}`);
  console.log(`📊 Events: ${trackingEvents.length}`);
});

module.exports = app;
