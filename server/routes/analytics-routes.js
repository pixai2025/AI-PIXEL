const express = require('express');
const { Event, Stats } = require('../models');
const { logger } = require('../utils/logger');
const router = express.Router();

// Dashboard principal - resumen de métricas
router.get('/dashboard/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { period = '7d' } = req.query;

        // Calcular fecha de inicio basada en el período
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        // Consultas agregadas
        const [
            totalEvents,
            aiBotsDetected,
            uniqueSessions,
            topPages,
            topBots,
            recentActivity
        ] = await Promise.all([
            // Total de eventos
            Event.countDocuments({
                trackingId,
                timestamp: { $gte: startDate, $lte: endDate }
            }),

            // Bots de IA detectados
            Event.countDocuments({
                trackingId,
                type: 'ai_bot_detected',
                timestamp: { $gte: startDate, $lte: endDate }
            }),

            // Sesiones únicas
            Event.distinct('sessionId', {
                trackingId,
                timestamp: { $gte: startDate, $lte: endDate }
            }).then(sessions => sessions.length),

            // Top páginas
            Event.aggregate([
                {
                    $match: {
                        trackingId,
                        type: 'page_view',
                        timestamp: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: '$url',
                        views: { $sum: 1 }
                    }
                },
                { $sort: { views: -1 } },
                { $limit: 10 }
            ]),

            // Top bots de IA
            Event.aggregate([
                {
                    $match: {
                        trackingId,
                        type: 'ai_bot_detected',
                        timestamp: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            name: '$data.name',
                            description: '$data.description'
                        },
                        count: { $sum: 1 },
                        lastSeen: { $max: '$timestamp' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            // Actividad reciente
            Event.find({
                trackingId,
                timestamp: { $gte: startDate, $lte: endDate }
            })
            .sort({ timestamp: -1 })
            .limit(50)
            .select('type timestamp url data.name data.description')
            .lean()
        ]);

        res.json({
            success: true,
            period,
            dateRange: { startDate, endDate },
            metrics: {
                totalEvents,
                aiBotsDetected,
                uniqueSessions,
                topPages: topPages.map(page => ({
                    url: page._id,
                    views: page.views
                })),
                topBots: topBots.map(bot => ({
                    name: bot._id.name,
                    description: bot._id.description,
                    count: bot.count,
                    lastSeen: bot.lastSeen
                })),
                recentActivity
            }
        });

    } catch (error) {
        logger.error('Error fetching dashboard data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch dashboard data' 
        });
    }
});

// Datos en tiempo real para el dashboard
router.get('/realtime/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);

        const realtimeData = await Event.find({
            trackingId,
            timestamp: { $gte: lastHour }
        })
        .sort({ timestamp: -1 })
        .limit(20)
        .select('type timestamp url data sessionId')
        .lean();

        const aiBotsInLastHour = realtimeData.filter(event => 
            event.type === 'ai_bot_detected'
        ).length;

        res.json({
            success: true,
            data: realtimeData,
            summary: {
                totalEventsLastHour: realtimeData.length,
                aiBotsDetectedLastHour: aiBotsInLastHour,
                isActive: realtimeData.length > 0
            }
        });

    } catch (error) {
        logger.error('Error fetching realtime data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch realtime data' 
        });
    }
});

// Tendencias por períodos de tiempo
router.get('/trends/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { period = 'daily', days = 30 } = req.query;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        let groupBy;
        switch (period) {
            case 'hourly':
                groupBy = {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' },
                    hour: { $hour: '$timestamp' }
                };
                break;
            case 'daily':
                groupBy = {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' }
                };
                break;
            default:
                groupBy = {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' }
                };
        }

        const trends = await Event.aggregate([
            {
                $match: {
                    trackingId,
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    totalEvents: { $sum: 1 },
                    pageViews: {
                        $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] }
                    },
                    aiBotsDetected: {
                        $sum: { $cond: [{ $eq: ['$type', 'ai_bot_detected'] }, 1, 0] }
                    },
                    uniqueSessions: { $addToSet: '$sessionId' }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalEvents: 1,
                    pageViews: 1,
                    aiBotsDetected: 1,
                    uniqueSessions: { $size: '$uniqueSessions' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
        ]);

        res.json({
            success: true,
            period,
            dateRange: { startDate, endDate },
            trends
        });

    } catch (error) {
        logger.error('Error fetching trends data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch trends data' 
        });
    }
});

module.exports = router;
