const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-pixel-tracker';

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('✅ Conectado a MongoDB');
    db = client.db();
  })
  .catch(error => console.error('❌ Error MongoDB:', error));

// Función para generar Site ID único
function generateSiteId() {
  return 'px_' + crypto.randomBytes(16).toString('hex');
}

// Función para detectar bot de IA
function detectAIBot(userAgent) {
  const aiBots = [
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'SearchGPT',
    'ClaudeBot', 'Claude-Web', 'Anthropic-AI',
    'PerplexityBot', 'Perplexity',
    'Google-Extended', 'GoogleOther', 'Bard',
    'YouBot', 'You.com-bot',
    'BingBot', 'bingbot', 'Bing',
    'FacebookBot', 'facebookexternalhit',
    'Applebot', 'AppleBot',
    'ia_archiver', 'Internet Archive Bot',
    'Wayback', 'archive.org_bot',
    'SemrushBot', 'AhrefsBot', 'MJ12bot',
    'DotBot', 'Screaming Frog',
    'OpenAI', 'AI2Bot', 'AI-Bot'
  ];
  
  if (!userAgent) return null;
  
  for (const bot of aiBots) {
    if (userAgent.toLowerCase().includes(bot.toLowerCase())) {
      return bot;
    }
  }
  return null;
}

// RUTAS PRINCIPALES

// 1. Landing page
app.get('/', (req, res) => {
  res.send(`
    
    
    
      AI Pixel Tracker
      
      
      
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: white; }
        .container { text-align: center; }
        .btn { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px; }
        .btn:hover { background: #45a049; }
        .feature { background: #2a2a2a; padding: 20px; margin: 10px 0; border-radius: 5px; }
      
    
    
      
        🤖 AI Pixel Tracker
        El primer tracker que detecta cuando las IAs consumen tu contenido
        
        
          ✨ Detecta 25+ Bots de IA
          GPTBot, ClaudeBot, PerplexityBot, Google-Extended y más
        
        
        
          📊 Dashboard en Tiempo Real
          Ve qué IAs visitan tu sitio y cuándo
        
        
        
          💰 Modelo Freemium
          1K pageviews gratis, luego $29/mes por sitio
        
        
        Empezar Gratis
        Iniciar Sesión
      
    
    
  `);
});

// 2. API de registro
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, domain } = req.body;
    
    if (!email || !password || !domain) {
      return res.status(400).json({ error: 'Email, password y domain son requeridos' });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    
    // Hash de la password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generar Site ID único
    const siteId = generateSiteId();
    
    // Crear usuario
    const newUser = {
      email,
      password: hashedPassword,
      domain,
      siteId,
      plan: 'free',
      pageviews: 0,
      maxPageviews: 1000,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    res.json({ 
      success: true, 
      userId: result.insertedId,
      siteId: siteId,
      message: 'Usuario registrado exitosamente'
    });
    
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3. API de login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }
    
    // Buscar usuario
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Password incorrecta' });
    }
    
    // Actualizar último login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );
    
    res.json({ 
      success: true, 
      userId: user._id,
      siteId: user.siteId,
      email: user.email,
      domain: user.domain,
      plan: user.plan
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 4. API de tracking
app.post('/api/track', async (req, res) => {
  try {
    const { siteId, userAgent, url, referrer, timestamp } = req.body;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID es requerido' });
    }
    
    // Detectar si es un bot de IA
    const botType = detectAIBot(userAgent);
    
    if (botType) {
      // Buscar usuario por siteId
      const user = await db.collection('users').findOne({ siteId });
      if (!user) {
        return res.status(404).json({ error: 'Site ID no válido' });
      }
      
      // Verificar límite de pageviews para usuarios free
      if (user.plan === 'free' && user.pageviews >= user.maxPageviews) {
        return res.status(403).json({ error: 'Límite de pageviews alcanzado' });
      }
      
      // Guardar evento de tracking
      const trackingEvent = {
        siteId,
        userId: user._id,
        domain: user.domain,
        botType,
        userAgent,
        url: url || 'unknown',
        referrer: referrer || 'direct',
        timestamp: new Date(timestamp) || new Date(),
        ip: req.ip || req.connection.remoteAddress
      };
      
      await db.collection('tracking_events').insertOne(trackingEvent);
      
      // Incrementar contador de pageviews
      await db.collection('users').updateOne(
        { _id: user._id },
        { $inc: { pageviews: 1 } }
      );
      
      console.log(`🤖 Bot detectado: ${botType} en ${user.domain}`);
    }
    
    res.json({ 
      success: true, 
      botDetected: !!botType,
      botType: botType || null
    });
    
  } catch (error) {
    console.error('Error en tracking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 5. Dashboard principal
app.get('/dashboard', (req, res) => {
  res.send(`
    
    
    
      Dashboard - AI Pixel Tracker
      
      
      
        body { font-family: Arial, sans-serif; margin: 0; background: #1a1a1a; color: white; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #2a2a2a; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: #2a2a2a; padding: 20px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #4CAF50; }
        .code-section { background: #2a2a2a; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .code-box { background: #1a1a1a; padding: 15px; border-radius: 3px; font-family: monospace; font-size: 12px; overflow-x: auto; }
        .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
        .btn:hover { background: #45a049; }
        .events-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .events-table th, .events-table td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        .events-table th { background: #333; }
        .login-form { max-width: 400px; margin: 50px auto; background: #2a2a2a; padding: 30px; border-radius: 5px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #333; border-radius: 3px; background: #1a1a1a; color: white; }
      
    
    
      
        
          Iniciar Sesión
          
            Email:
            
          
          
            Password:
            
          
          Iniciar Sesión
        
        
        
          
            🤖 AI Pixel Tracker Dashboard
            Dominio:  | Plan: 
            Cerrar Sesión
          
          
          
            
              0
              Bots Detectados
            
            
              0
              Pageviews Usadas
            
            
              0
              Tipos de Bots
            
          
          
          
            📋 Tu Código de Tracking
            Copia y pega este código en el <head> de tu sitio web:
            
              
            
            Copiar Código
          
          
          
            📊 Eventos Recientes
            
              
                
                  Fecha
                  Bot Detectado
                  URL
                  User Agent
                
              
              
              
            
          
        
      
      
      
        let currentUser = null;
        
        async function login() {
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          
          try {
            const response = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
              currentUser = data;
              document.getElementById('loginSection').style.display = 'none';
              document.getElementById('dashboardSection').style.display = 'block';
              loadDashboard();
            } else {
              alert('Error: ' + data.error);
            }
          } catch (error) {
            alert('Error de conexión');
          }
        }
        
        function logout() {
          currentUser = null;
          document.getElementById('loginSection').style.display = 'block';
          document.getElementById('dashboardSection').style.display = 'none';
        }
        
        async function loadDashboard() {
          if (!currentUser) return;
          
          // Actualizar información del usuario
          document.getElementById('userDomain').textContent = currentUser.domain;
          document.getElementById('userPlan').textContent = currentUser.plan.toUpperCase();
          
          // Generar código de tracking
          const trackingCode = \`<script>
(function() {
  const tracker = document.createElement('script');
  tracker.src = 'https://\${window.location.hostname}/ai-pixel-tracker.js';
  tracker.setAttribute('data-site-id', '\${currentUser.siteId}');
  document.head.appendChild(tracker);
})();
\`;
          
          document.getElementById('trackingCode').textContent = trackingCode;
          
          // Cargar estadísticas
          loadStats();
          loadEvents();
        }
        
        async function loadStats() {
          try {
            const response = await fetch(\`/api/stats/\${currentUser.userId}\`);
            const stats = await response.json();
            
            document.getElementById('totalBots').textContent = stats.totalEvents || 0;
            document.getElementById('totalPageviews').textContent = stats.pageviews || 0;
            document.getElementById('uniqueBots').textContent = stats.uniqueBots || 0;
          } catch (error) {
            console.error('Error cargando stats:', error);
          }
        }
        
        async function loadEvents() {
          try {
            const response = await fetch(\`/api/events/\${currentUser.userId}\`);
            const events = await response.json();
            
            const tbody = document.getElementById('eventsBody');
            tbody.innerHTML = '';
            
            events.forEach(event => {
              const row = tbody.insertRow();
              row.insertCell(0).textContent = new Date(event.timestamp).toLocaleString();
              row.insertCell(1).textContent = event.botType;
              row.insertCell(2).textContent = event.url;
              row.insertCell(3).textContent = event.userAgent.substring(0, 50) + '...';
            });
          } catch (error) {
            console.error('Error cargando eventos:', error);
          }
        }
        
        function copyCode() {
          const codeElement = document.getElementById('trackingCode');
          navigator.clipboard.writeText(codeElement.textContent);
          alert('¡Código copiado al portapapeles!');
        }
        
        // Auto-refresh cada 30 segundos
        setInterval(() => {
          if (currentUser) {
            loadStats();
            loadEvents();
          }
        }, 30000);
      
    
    
  `);
});

// 6. API de estadísticas por usuario
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Buscar usuario
    const user = await db.collection('users').findOne({ _id: require('mongodb').ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Contar eventos de tracking
    const totalEvents = await db.collection('tracking_events').countDocuments({ userId: user._id });
    
    // Contar tipos únicos de bots
    const uniqueBots = await db.collection('tracking_events').distinct('botType', { userId: user._id });
    
    res.json({
      totalEvents,
      pageviews: user.pageviews,
      maxPageviews: user.maxPageviews,
      uniqueBots: uniqueBots.length,
      plan: user.plan,
      domain: user.domain
    });
    
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 7. API de eventos por usuario
app.get('/api/events/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Buscar eventos recientes del usuario
    const events = await db.collection('tracking_events')
      .find({ userId: require('mongodb').ObjectId(userId) })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    res.json(events);
    
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 8. Servir el SDK de tracking
app.get('/ai-pixel-tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
// AI Pixel Tracker SDK v1.0
(function() {
  'use strict';
  
  // Obtener Site ID del script tag
  const scripts = document.getElementsByTagName('script');
  let siteId = null;
  
  for (let script of scripts) {
    if (script.src && script.src.includes('ai-pixel-tracker.js')) {
      siteId = script.getAttribute('data-site-id');
      break;
    }
  }
  
  if (!siteId) {
    console.error('AI Pixel Tracker: Site ID no encontrado');
    return;
  }
  
  // Función para enviar evento de tracking
  function trackEvent() {
    const data = {
      siteId: siteId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };
    
    fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      mode: 'cors'
    }).then(response => response.json())
      .then(result => {
        if (result.botDetected) {
          console.log('🤖 AI Bot detectado:', result.botType);
        }
      })
      .catch(error => {
        console.error('Error en tracking:', error);
      });
  }
  
  // Enviar evento inmediatamente
  trackEvent();
  
  // También enviar en page visibility change (útil para SPAs)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      trackEvent();
    }
  });
  
})();
  `);
});

// 9. Páginas estáticas adicionales
app.get('/register.html', (req, res) => {
  res.send(`
    
    
    
      Registro - AI Pixel Tracker
      
      
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; background: #1a1a1a; color: white; }
        .form-container { background: #2a2a2a; padding: 30px; border-radius: 5px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #333; border-radius: 3px; background: #1a1a1a; color: white; }
        .btn { width: 100%; background: #4CAF50; color: white; padding: 12px; border: none; border-radius: 3px; cursor: pointer; font-size: 16px; }
        .btn:hover { background: #45a049; }
        .success { background: #4CAF50; color: white; padding: 15px; border-radius: 3px; margin-bottom: 20px; }
        .error { background: #f44336; color: white; padding: 15px; border-radius: 3px; margin-bottom: 20px; }
      
    
    
      
        🤖 Registro - AI Pixel Tracker
        
        
        
          
            Email:
            
          
          
            Password:
            
          
          
            Dominio de tu sitio:
            
          
          Registrarse Gratis
        
        
        
          ¿Ya tienes cuenta? Iniciar sesión
        
      
      
      
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          const domain = document.getElementById('domain').value;
          
          try {
            const response = await fetch('/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, domain })
            });
            
            const data = await response.json();
            const messageDiv = document.getElementById('message');
            
            if (data.success) {
              messageDiv.innerHTML = '<div class="success">¡Registro exitoso! Tu Site ID: ' + data.siteId + '<br>Redirigiendo al dashboard...</div>';
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 3000);
            } else {
              messageDiv.innerHTML = '<div class="error">Error: ' + data.error + '</div>';
            }
          } catch (error) {
            document.getElementById('message').innerHTML = '<div class="error">Error de conexión</div>';
          }
        });
      
    
    
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(\`🚀 AI Pixel Tracker funcionando en puerto \${PORT}\`);
  console.log(\`📊 Dashboard disponible en: http://localhost:\${PORT}/dashboard\`);
  console.log(\`🤖 SDK disponible en: http://localhost:\${PORT}/ai-pixel-tracker.js\`);
});

module.exports = app;
