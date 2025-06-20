const express = require('express');
const { Event } = require('../models');
const { logger } = require('../utils/logger');
const router = express.Router();

// Middleware para extraer IP y geolocalización básica
const extractClientInfo = (req, res, next) => {
    req.clientInfo = {
        ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
    };
    next();
};

// Endpoint principal para recibir eventos de tracking
router.post('/', extractClientInfo, async (req, res) => {
    try {
        const eventData = req.body;

        // Validación básica
        if (!eventData.trackingId || !eventData.type) {
            return res.status(400).json({ 
                error: 'Missing required fields: trackingId and type' 
            });
        }

        // Agregar información del servidor
        eventData.ip = req.clientInfo.ip;
        eventData.serverTimestamp = new Date();

        // Crear evento en la base de datos
        const event = new Event(eventData);
        await event.save();

        // Log para debugging
        if (eventData.type === 'ai_bot_detected') {
            logger.info(`AI Bot detected: ${eventData.data?.name || 'Unknown'} on ${eventData.url}`);
        }

        res.status(200).json({ 
            success: true, 
            eventId: event._id,
            timestamp: event.timestamp
        });

    } catch (error) {
        logger.error('Error processing tracking event:', error);
        res.status(500).json({ 
            error: 'Failed to process event' 
        });
    }
});

// Endpoint para batch de eventos (múltiples eventos a la vez)
router.post('/batch', extractClientInfo, async (req, res) => {
    try {
        const { events } = req.body;

        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ 
                error: 'Events array is required and must not be empty' 
            });
        }

        // Procesar eventos en lote
        const processedEvents = events.map(eventData => ({
            ...eventData,
            ip: req.clientInfo.ip,
            serverTimestamp: new Date()
        }));

        const savedEvents = await Event.insertMany(processedEvents);

        res.status(200).json({ 
            success: true, 
            processedCount: savedEvents.length,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Error processing batch events:', error);
        res.status(500).json({ 
            error: 'Failed to process batch events' 
        });
    }
});

// Endpoint para validar tracking ID
router.get('/validate/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;

        const eventCount = await Event.countDocuments({ trackingId });

        res.json({
            valid: true,
            trackingId,
            eventCount,
            lastActivity: eventCount > 0 ? await Event.findOne({ trackingId })
                .sort({ timestamp: -1 })
                .select('timestamp')
                .lean() : null
        });

    } catch (error) {
        logger.error('Error validating tracking ID:', error);
        res.status(500).json({ 
            error: 'Failed to validate tracking ID' 
        });
    }
});

module.exports = router;
