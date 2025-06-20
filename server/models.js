const mongoose = require('mongoose');

// Schema para eventos de tracking
const eventSchema = new mongoose.Schema({
    trackingId: {
        type: String,
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['page_view', 'ai_bot_detected', 'link_click', 'page_unload', 'custom']
    },
    url: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    clientInfo: {
        language: String,
        platform: String,
        cookieEnabled: Boolean,
        onLine: Boolean
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    ip: String,
    country: String,
    city: String
}, {
    timestamps: true
});

// Índices compuestos para consultas rápidas
eventSchema.index({ trackingId: 1, timestamp: -1 });
eventSchema.index({ trackingId: 1, type: 1, timestamp: -1 });
eventSchema.index({ 'data.name': 1, timestamp: -1 }); // Para bots de IA

const Event = mongoose.model('Event', eventSchema);

// Schema para usuarios/cuentas
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    trackingIds: [{
        id: String,
        name: String,
        domain: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free'
    },
    limits: {
        eventsPerMonth: {
            type: Number,
            default: 1000
        },
        sitesAllowed: {
            type: Number,
            default: 1
        }
    },
    usage: {
        eventsThisMonth: {
            type: Number,
            default: 0
        },
        lastReset: {
            type: Date,
            default: Date.now
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

// Schema para estadísticas agregadas (para consultas rápidas)
const statsSchema = new mongoose.Schema({
    trackingId: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    period: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly'],
        required: true
    },
    metrics: {
        totalEvents: { type: Number, default: 0 },
        pageViews: { type: Number, default: 0 },
        aiBotsDetected: { type: Number, default: 0 },
        uniqueSessions: { type: Number, default: 0 },
        topPages: [{
            url: String,
            views: Number
        }],
        topBots: [{
            name: String,
            description: String,
            count: Number
        }],
        topCountries: [{
            country: String,
            count: Number
        }]
    }
}, {
    timestamps: true
});

// Índice compuesto único para evitar duplicados
statsSchema.index({ trackingId: 1, date: 1, period: 1 }, { unique: true });

const Stats = mongoose.model('Stats', statsSchema);

module.exports = {
    Event,
    User,
    Stats
};
