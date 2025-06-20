const mongoose = require('mongoose');
const { logger } = require('./logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-pixel-tracker', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error('Database connection failed:', error);
        process.exit(1);
    }
};

// Función para generar tracking ID único
const generateTrackingId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `aip_${timestamp}_${random}`;
};

// Función para limpiar datos antiguos
const cleanOldData = async (daysToKeep = 90) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await mongoose.model('Event').deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        logger.info(`Cleaned ${result.deletedCount} old events`);
        return result.deletedCount;
    } catch (error) {
        logger.error('Error cleaning old data:', error);
        throw error;
    }
};

module.exports = {
    connectDB,
    generateTrackingId,
    cleanOldData
};
