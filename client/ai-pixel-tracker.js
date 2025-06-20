/**
 * AI Pixel Tracker - JavaScript SDK
 * Detecta y rastrea bots de IA que acceden a tu contenido
 */

(function(window, document) {
    'use strict';

    // Lista de User Agents de bots de IA conocidos
    const AI_BOTS = {
        'GPTBot': 'OpenAI Training',
        'OAI-SearchBot': 'OpenAI Search', 
        'ChatGPT-User': 'ChatGPT Real-time',
        'ClaudeBot': 'Anthropic Claude',
        'anthropic-ai': 'Anthropic AI',
        'claude-web': 'Claude Web',
        'PerplexityBot': 'Perplexity',
        'Perplexity-User': 'Perplexity User',
        'Google-Extended': 'Google Gemini',
        'BingBot': 'Microsoft Bing',
        'Amazonbot': 'Amazon',
        'Applebot': 'Apple',
        'Applebot-Extended': 'Apple Extended',
        'FacebookBot': 'Meta Facebook',
        'meta-externalagent': 'Meta External',
        'LinkedInBot': 'LinkedIn',
        'Bytespider': 'ByteDance TikTok',
        'DuckAssistBot': 'DuckDuckGo',
        'cohere-ai': 'Cohere',
        'AI2Bot': 'Allen Institute',
        'CCBot': 'Common Crawl',
        'Diffbot': 'Diffbot',
        'omgili': 'Omgili',
        'TimpiBot': 'Timpi',
        'YouBot': 'You.com',
        'MistralAI-User': 'Mistral AI'
    };

    class AIPixelTracker {
        constructor(config) {
            this.config = {
                trackingId: config.trackingId || null,
                endpoint: config.endpoint || 'https://api.ai-pixel.com/track',
                debug: config.debug || false,
                autoStart: config.autoStart !== false,
                ...config
            };

            this.sessionId = this.generateSessionId();
            this.pageLoadTime = Date.now();
            this.events = [];

            if (this.config.autoStart) {
                this.init();
            }
        }

        init() {
            if (!this.config.trackingId) {
                console.error('AI Pixel Tracker: trackingId is required');
                return;
            }

            this.detectAIBot();
            this.setupEventListeners();
            this.trackPageView();
        }

        generateSessionId() {
            return 'aip_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }

        detectAIBot() {
            const userAgent = navigator.userAgent;
            let detectedBot = null;

            // Buscar patrones de bots de IA en el user agent
            for (const [botName, botDescription] of Object.entries(AI_BOTS)) {
                if (userAgent.includes(botName)) {
                    detectedBot = {
                        name: botName,
                        description: botDescription,
                        userAgent: userAgent,
                        detected: true
                    };
                    break;
                }
            }

            // También detectar por otros patrones comunes
            if (!detectedBot) {
                const aiPatterns = [
                    /bot/i,
                    /crawler/i,
                    /spider/i,
                    /scraper/i,
                    /ai-agent/i,
                    /llm/i
                ];

                for (const pattern of aiPatterns) {
                    if (pattern.test(userAgent)) {
                        detectedBot = {
                            name: 'Unknown AI Bot',
                            description: 'Potential AI Bot',
                            userAgent: userAgent,
                            detected: true,
                            pattern: pattern.toString()
                        };
                        break;
                    }
                }
            }

            if (detectedBot) {
                this.trackEvent('ai_bot_detected', detectedBot);

                if (this.config.debug) {
                    console.log('AI Bot Detected:', detectedBot);
                }
            }

            return detectedBot;
        }

        trackPageView() {
            const pageData = {
                url: window.location.href,
                title: document.title,
                referrer: document.referrer,
                timestamp: new Date().toISOString(),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                screen: {
                    width: screen.width,
                    height: screen.height
                }
            };

            this.trackEvent('page_view', pageData);
        }

        trackEvent(eventType, data = {}) {
            const event = {
                type: eventType,
                trackingId: this.config.trackingId,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                data: data,
                clientInfo: {
                    language: navigator.language,
                    platform: navigator.platform,
                    cookieEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine
                }
            };

            this.events.push(event);
            this.sendEvent(event);
        }

        sendEvent(event) {
            if (this.config.debug) {
                console.log('Sending event:', event);
            }

            // Usar sendBeacon si está disponible (más confiable)
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(event)], {
                    type: 'application/json'
                });
                navigator.sendBeacon(this.config.endpoint, blob);
            } else {
                // Fallback a fetch
                fetch(this.config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(event),
                    keepalive: true
                }).catch(error => {
                    if (this.config.debug) {
                        console.error('Failed to send event:', error);
                    }
                });
            }
        }

        setupEventListeners() {
            // Rastrear tiempo en página
            window.addEventListener('beforeunload', () => {
                const timeOnPage = Date.now() - this.pageLoadTime;
                this.trackEvent('page_unload', {
                    timeOnPage: timeOnPage,
                    scrollDepth: this.getScrollDepth()
                });
            });

            // Rastrear clicks en enlaces
            document.addEventListener('click', (event) => {
                if (event.target.tagName === 'A') {
                    this.trackEvent('link_click', {
                        href: event.target.href,
                        text: event.target.textContent.trim(),
                        position: {
                            x: event.clientX,
                            y: event.clientY
                        }
                    });
                }
            });
        }

        getScrollDepth() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            return Math.round((scrollTop / docHeight) * 100);
        }

        // API pública
        track(eventType, data) {
            this.trackEvent(eventType, data);
        }

        getSessionId() {
            return this.sessionId;
        }

        getEvents() {
            return this.events;
        }
    }

    // Exponer globalmente
    window.AIPixelTracker = AIPixelTracker;

    // Auto-inicialización si hay configuración global
    if (window.aiPixelConfig) {
        window.aiPixel = new AIPixelTracker(window.aiPixelConfig);
    }

})(window, document);

// Snippet de instalación simple
(function() {
    // Este es el código que los usuarios copiarán y pegarán
    window.aiPixelConfig = window.aiPixelConfig || {};

    if (!window.aiPixel && window.aiPixelConfig.trackingId) {
        var script = document.createElement('script');
        script.src = 'https://cdn.ai-pixel.com/tracker.js';
        script.async = true;
        document.head.appendChild(script);
    }
})();
