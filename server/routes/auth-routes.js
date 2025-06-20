const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateTrackingId } = require('../utils/database');
const { logger } = require('../utils/logger');
const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validación básica
        if (!email || !password || !name) {
            return res.status(400).json({ 
                error: 'Email, password and name are required' 
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'User with this email already exists' 
            });
        }

        // Hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generar primer tracking ID
        const firstTrackingId = generateTrackingId();

        // Crear nuevo usuario
        const user = new User({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            trackingIds: [{
                id: firstTrackingId,
                name: 'Default Site',
                domain: '',
                createdAt: new Date()
            }]
        });

        await user.save();

        // Generar JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                trackingIds: user.trackingIds,
                plan: user.plan
            },
            token,
            firstTrackingId
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Failed to create user' 
        });
    }
});

// Login de usuario
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }

        // Buscar usuario
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // Verificar si el usuario está activo
        if (!user.isActive) {
            return res.status(401).json({ 
                error: 'Account is deactivated' 
            });
        }

        // Generar JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                trackingIds: user.trackingIds,
                plan: user.plan,
                limits: user.limits,
                usage: user.usage
            },
            token
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed' 
        });
    }
});

// Crear nuevo tracking ID
router.post('/tracking-id', async (req, res) => {
    try {
        // Esta ruta necesitaría autenticación en producción
        const { name, domain } = req.body;

        const newTrackingId = generateTrackingId();

        res.json({
            success: true,
            trackingId: newTrackingId,
            name: name || 'Unnamed Site',
            domain: domain || '',
            createdAt: new Date()
        });

    } catch (error) {
        logger.error('Error creating tracking ID:', error);
        res.status(500).json({ 
            error: 'Failed to create tracking ID' 
        });
    }
});

module.exports = router;
