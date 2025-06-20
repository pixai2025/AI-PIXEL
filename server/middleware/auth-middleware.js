const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { logger } = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).select('-password');

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid or inactive user' });
        }

        req.user = user;
        next();

    } catch (error) {
        logger.error('Authentication error:', error);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

const checkTrackingIdOwnership = async (req, res, next) => {
    try {
        const { trackingId } = req.params;
        const user = req.user;

        const ownsTrackingId = user.trackingIds.some(
            tracking => tracking.id === trackingId
        );

        if (!ownsTrackingId) {
            return res.status(403).json({ 
                error: 'You do not have access to this tracking ID' 
            });
        }

        next();

    } catch (error) {
        logger.error('Tracking ID ownership check error:', error);
        return res.status(500).json({ error: 'Authorization check failed' });
    }
};

module.exports = {
    authenticateToken,
    checkTrackingIdOwnership
};
