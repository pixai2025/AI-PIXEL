const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
require('dotenv').config();

// Configuración de email (con try-catch)
let emailTransporter = null;
try {
  const nodemailer = require('nodemailer');
  emailTransporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} catch (error) {
  console.log('⚠️ Nodemailer not available, emails disabled');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Base de datos en memoria
let users = [];
let trackingEvents = [];

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

// Función para enviar emails (con fallback)
async function sendConfirmationEmail(email, name, trackingId, confirmationToken) {
  if (!emailTransporter) {
    console.log('📧 Email would be sent to:', email);
    return { success: false, error: 'Email service not configured' };
  }
  
  const confirmationUrl = `${process.env.RAILWAY_STATIC_URL || 'http://localhost:3001'}/confirm/${confirmationToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px; }
            .content { padding: 30px; background: #f9fafb; border-radius: 8px; margin: 20px 0; }
            .button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
            .code { background: #1f2937; color: #10b981; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 16px; text-align: center; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🤖 Welcome to AI Pixel Tracker!</h1>
        </div>
        
        <div class="content">
            <h2>Hi ${name}!</h2>
            <p>Thanks for signing up for AI Pixel Tracker - the first tool to detect when AI bots visit your website.</p>
            
            <p><strong>Please confirm your email address by clicking the button below:</strong></p>
            <p style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Confirm Email & Access Dashboard</a>
            </p>
            
            <hr style="margin: 30px 0;">
            
            <h3>Your Tracking Details:</h3>
            <p><strong>Tracking ID:</strong></p>
            <div class="code">${trackingId}</div>
            
            <p><strong>Installation Code:</strong></p>
            <div class="code">&lt;script src="${process.env.RAILWAY_STATIC_URL || 'http://localhost:3001'}/client/ai-pixel-tracker.js" data-tracking-id="${trackingId}"&gt;&lt;/script&gt;</div>
            
            <h3>What's Next?</h3>
            <ol>
                <li>Confirm your email (click button above)</li>
                <li>Add the tracking code to your website</li>
                <li>Monitor AI bot visits in your dashboard</li>
            </ol>
            
            <p>If the button doesn't work, copy this link: <br>
            <a href="${confirmationUrl}">${confirmationUrl}</a></p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
            <p>AI Pixel Tracker - Detecting AI bot visits worldwide</p>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'AI Pixel Tracker <noreply@ai-pixel.com>',
    to: email,
    subject: '🤖 Confirm your AI Pixel Tracker account',
    html: htmlContent
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
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
app.post('/api/register', async (req, res) => {
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
  const confirmationToken = crypto.randomBytes(32).toString('hex');
  
  const newUser = {
    id: users.length + 1,
    email,
    name,
    website: website ? (website.startsWith('http') ? website : `https://${website}`) : '',
    trackingId,
    confirmationToken,
    isConfirmed: true, // Auto-confirmar por ahora
    isActive: true,
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  // Intentar enviar email (pero continuar si falla)
  try {
    const emailResult = await sendConfirmationEmail(email, name, trackingId, confirmationToken);
    console.log('📧 Email result:', emailResult);
  } catch (error) {
    console.log('📧 Email failed:', error.message);
  }
  
  res.json({
    success: true,
    message: 'Registration successful! You can access your dashboard immediately.',
    trackingId,
    dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard/${trackingId}`
  });
});

// LOGIN DE USUARIOS
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'Email not found. Please register first.' });
  }
  
  res.json({
    success: true,
    trackingId: user.trackingId,
    dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard/${user.trackingId}`,
    message: 'Login successful!'
  });
});

// CONFIRMACIÓN DE EMAIL
app.get('/confirm/:token', (req, res) => {
  const confirmationToken = req.params.token;
  
  const user = users.find(u => u.confirmationToken === confirmationToken);
  
  if (!user) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Invalid Confirmation</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 500px; margin: 100px auto; padding: 40px; text-align: center; }
              .error { color: #dc2626; }
          </style>
      </head>
      <body>
          <h1 class="error">❌ Invalid Confirmation Link</h1>
          <p>This confirmation link is invalid or has already been used.</p>
          <a href="/register">Register Again</a>
      </body>
      </html>
    `);
  }
  
  if (user.isConfirmed) {
    return res.redirect(`/dashboard/${user.trackingId}?welcome=true`);
  }
  
  // Confirmar usuario
  user.isConfirmed = true;
  user.confirmedAt = new Date().toISOString();
  delete user.confirmationToken;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Confirmed!</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; }
            .success { color: #059669; }
            .button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px; }
            .code { background: #1f2937; color: #10b981; padding: 15px; border-radius: 6px; font-family: monospace; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1 class="success">✅ Email Confirmed!</h1>
        <p>Welcome to AI Pixel Tracker, <strong>${user.name}</strong>!</p>
        
        <a href="/dashboard/${user.trackingId}" class="button">🚀 Access Your Dashboard</a>
        
        <h3>Your Tracking Code:</h3>
        <div class="code">&lt;script src="${req.protocol}://${req.get('host')}/client/ai-pixel-tracker.js" data-tracking-id="${user.trackingId}"&gt;&lt;/script&gt;</div>
        
        <p>Add this code to your website to start tracking AI bot visits!</p>
    </body>
    </html>
  `);
});

// Endpoint de tracking
app.post('/api/track', (req, res) => {
  const { trackingId, event, url, userAgent, botDetected, botInfo } = req.body;
  
  if (!trackingId) {
    return res.status(400).json({ error: 'Tracking ID is required' });
  }
  
  const user = users.find(u => u.trackingId === trackingId);
  if (!user) {
    return res.status(404).json({ error: 'Invalid tracking ID' });
  }
  
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

// DASHBOARD INDIVIDUAL
app.get('/dashboard/:trackingId', (req, res) => {
  const trackingId = req.params.trackingId;
  
  const user = users.find(u => u.trackingId === trackingId);
  if (!user) {
    return res.status(404).send(`
      <h1>❌ Tracking ID not found</h1>
      <p>Please check your tracking ID or <a href="/register">register here</a></p>
    `);
  }
  
  const userEvents = trackingEvents.filter(e => e.trackingId === trackingId);
  const totalEvents = userEvents.length;
  const botEvents = userEvents.filter(e => e.botDetected);
  const totalBotDetections = botEvents.length;
  
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
            .install-code { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Monaco', 'Courier New', monospace; font-size: 14px; overflow-x: auto; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #c6f6d5; color: #22543d; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 AI Pixel Dashboard</h1>
                <p>Welcome back, <strong>${user.name}</strong> • Tracking ID: <code>${trackingId}</code> • <span class="status-badge">Active</span></p>
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
            
            <div class="card">
                <h3 style="margin-bottom: 20px; color: #2d3748;">📦 Installation Code</h3>
                <p style="margin-bottom: 15px; color: #718096;">Copy this code and paste it in your website's HTML:</p>
                <div class="install-code">&lt;script src="${req.protocol}://${req.get('host')}/client/ai-pixel-tracker.js" data-tracking-id="${trackingId}"&gt;&lt;/script&gt;</div>
            </div>
        </div>
        
        <script>
            setTimeout(() => window.location.reload(), 30000);
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
                    <input type="text" id="website" name="website" placeholder="your-website.com">
                    <small style="color: #718096; font-size: 12px;">Don't include http:// or https://</small>
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

// LOGIN página
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

// Dashboard principal
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
  console.log(`📊 Events: ${track
