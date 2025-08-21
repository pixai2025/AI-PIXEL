const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://aipixeltracker.lat', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-pixel-tracker';

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Conectado a MongoDB');
    db = client.db('ai-pixel-tracker');
  })
  .catch(error => {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  });

// Generar Site ID único
function generateSiteId() {
  return 'px_' + crypto.randomBytes(16).toString('hex');
}

// Ruta principal
app.get('/', (req, res) => {
  res.send('AI Pixel Tracker API - Funcionando OK');
});

// Registro de usuarios
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, domain } = req.body;
    
    if (!email || !password || !domain) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password y domain son requeridos' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const siteId = generateSiteId();
    
    const user = {
      email: email.toLowerCase(),
      password: hashedPassword,
      domain,
      siteId,
      plan: 'free',
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(user);
    
    res.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      siteId: siteId,
      userId: result.insertedId
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Login de usuarios
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase() 
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    res.json({
      success: true,
      message: 'Login exitoso',
      userId: user._id,
      siteId: user.siteId
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Recibir eventos de tracking
app.post('/api/track', async (req, res) => {
  try {
    const { siteId, botType, domain, userAgent, pageUrl } = req.body;
    
    if (!siteId || !botType) {
      return res.status(400).json({ 
        success: false, 
        message: 'siteId y botType son requeridos' 
      });
    }

    const trackingEvent = {
      siteId,
      botType,
      domain: domain || '',
      userAgent: userAgent || '',
      pageUrl: pageUrl || '',
      timestamp: new Date()
    };

    await db.collection('tracking_events').insertOne(trackingEvent);
    
    res.json({ 
      success: true, 
      message: 'Evento registrado exitosamente' 
    });
  } catch (error) {
    console.error('Error en tracking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Dashboard básico
app.get('/dashboard', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Pixel Tracker - Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .code-box { background: #2d2d2d; color: #fff; padding: 15px; border-radius: 5px; font-family: monospace; }
        button { background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        button:hover { background: #005a87; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 AI Pixel Tracker Dashboard</h1>
        <p>Bienvenido al primer tracker de bots de IA del mundo.</p>
        
        <h3>Tu Código de Tracking</h3>
        <div class="code-box" id="trackingCode">
&lt;script&gt;
(function() {
  const tracker = document.createElement('script');
  tracker.src = 'https://tu-app.railway.app/ai-pixel-tracker.js';
  tracker.setAttribute('data-site-id', 'px_ejemplo123');
  document.head.appendChild(tracker);
})();
&lt;/script&gt;
        </div>
        <br>
        <button onclick="copyCode()">📋 Copiar Código</button>
        
        <h3>Estadísticas</h3>
        <p>🤖 Bots detectados: <span id="botCount">Conectando...</span></p>
        <p>📊 Eventos registrados: <span id="eventCount">Conectando...</span></p>
    </div>
    
    <script>
        function copyCode() {
            const code = document.getElementById('trackingCode').textContent;
            navigator.clipboard.writeText(code);
            alert('Código copiado al portapapeles');
        }
    </script>
</body>
</html>`;
  
  res.send(html);
});

// Stats por usuario
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    const events = await db.collection('tracking_events')
      .find({ siteId: user.siteId })
      .toArray();

    const stats = {
      totalEvents: events.length,
      uniqueBots: [...new Set(events.map(e => e.botType))].length,
      siteId: user.siteId,
      domain: user.domain
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Beta signup endpoint
app.post('/api/beta-signup', async (req, res) => {
  try {
    const { email, website, pageviews, language } = req.body;
    
    if (!email || !website) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and website are required' 
      });
    }

    // Verificar si ya existe
    const existingUser = await db.collection('beta_signups').findOne({ 
      email: email.toLowerCase() 
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already registered for beta' 
      });
    }

    // Contar beta users actuales
    const betaCount = await db.collection('beta_signups').countDocuments();
    
    if (betaCount >= 50) {
      return res.json({
        success: false,
        message: 'Beta spots are full. Join our waitlist!',
        status: 'waitlist_full'
      });
    }

    // Crear beta user
    const betaUser = {
      email: email.toLowerCase(),
      website,
      pageviews: pageviews || '',
      language: language || 'en',
      status: 'beta',
      signupDate: new Date()
    };

    await db.collection('beta_signups').insertOne(betaUser);
    
    res.json({
      success: true,
      message: 'Beta access granted!',
      status: 'beta'
    });
    
  } catch (error) {
    console.error('Error in beta signup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Servir el SDK de tracking
app.get('/ai-pixel-tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
// AI Pixel Tracker SDK
(function() {
    const script = document.currentScript || document.querySelector('script[data-site-id]');
    const siteId = script ? script.getAttribute('data-site-id') : null;
    
    if (!siteId) {
        console.warn('AI Pixel Tracker: No site-id found');
        return;
    }
    
    const aiUserAgents = [
        'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web',
        'PerplexityBot', 'Perplexity', 'Google-Extended', 'GoogleOther',
        'BingBot', 'Slurp', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot'
    ];
    
    function detectAIBot() {
        const userAgent = navigator.userAgent;
        for (let bot of aiUserAgents) {
            if (userAgent.includes(bot)) {
                return bot;
            }
        }
        return null;
    }
    
    const detectedBot = detectAIBot();
    if (detectedBot) {
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteId: siteId,
                botType: detectedBot,
                domain: window.location.hostname,
                userAgent: navigator.userAgent,
                pageUrl: window.location.href
            })
        }).catch(err => console.warn('AI Pixel Tracker: Error sending data', err));
    }
})();
`);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('AI Pixel Tracker funcionando en puerto ' + PORT);
});
