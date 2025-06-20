const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./database');
const { logger } = require('./utils/logger');
const { authenticateToken } = require('./middleware/auth');

// Importar rutas
const trackingRoutes = require('./routes/tracking');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 requests por ventana de tiempo
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// CORS configuración
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message) } }));

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/track', trackingRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/auth', authRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Iniciar servidor
async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            logger.info(`AI Pixel Tracker Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
