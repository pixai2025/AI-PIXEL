# 🤖 AI Pixel Tracker - El Primer Pixel para Bots de IA

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%2B-green)](https://www.mongodb.com/)

> **La primera herramienta que te permite ver el "tráfico invisible" de tu sitio web: cuando los bots de IA consumen tu contenido.**

## 🎯 El Problema que Resuelve

Las Inteligencias Artificiales como ChatGPT, Claude, Perplexity y Gemini están "vampirizando" tu contenido sin que puedas medirlo:

- ❌ **Sin visibilidad**: No sabes cuándo los bots de IA acceden a tu sitio
- ❌ **Sin métricas**: Google Analytics no detecta este tráfico
- ❌ **Sin optimización**: No puedes mejorar tu contenido para IA
- ❌ **Sin ventaja competitiva**: Tu competencia podría estar adelantándose

## ✅ La Solución: AI Pixel Tracker

**Como el Pixel de Facebook, pero para Bots de IA**

- 🔍 **Detecta 25+ bots de IA** automáticamente
- 📊 **Dashboard en tiempo real** con métricas avanzadas
- 🎯 **Instalación en 2 minutos** (copy/paste)
- 📈 **API completa** para integraciones
- 🔒 **Privacidad first** (GDPR compliant)

## 🚀 Instalación Súper Rápida

### 1. Obtén tu Tracking ID
```bash
curl -X POST https://api.ai-pixel.com/auth/tracking-id \
  -H "Content-Type: application/json" \
  -d '{"name": "Mi Sitio", "domain": "misitio.com"}'
```

### 2. Instala en tu sitio
```html
<!-- Copia y pega en el <head> de tu sitio -->
<script>
  window.aiPixelConfig = {
    trackingId: 'aip_tu_id_aqui'
  };
</script>
<script src="https://cdn.ai-pixel.com/tracker.js" async></script>
```

### 3. ¡Ver datos en tiempo real!
Visita: `https://dashboard.ai-pixel.com/tu-tracking-id`

## 🎛️ Dashboard de Lujo

![Dashboard Preview](https://ai-pixel.com/dashboard-preview.png)

**Métricas que obtienes:**
- 🤖 Bots de IA detectados por tipo
- 📄 Páginas más "aspiradas" por IA
- 📅 Tendencias temporales de actividad
- ⚡ Actividad en tiempo real
- 🌍 Geolocalización de bots
- 📊 Comparativas vs tráfico humano

## 🔍 Bots que Detecta

| Bot | Empresa | Propósito | Detección |
|-----|---------|-----------|-----------|
| GPTBot | OpenAI | Entrenamiento ChatGPT | ✅ |
| OAI-SearchBot | OpenAI | ChatGPT Search | ✅ |
| ChatGPT-User | OpenAI | Requests tiempo real | ✅ |
| ClaudeBot | Anthropic | Claude AI | ✅ |
| PerplexityBot | Perplexity | Perplexity Search | ✅ |
| Google-Extended | Google | Gemini AI | ✅ |
| BingBot | Microsoft | Copilot | ✅ |
| **+20 bots más** | | | ✅ |

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   JavaScript    │───▶│   Node.js API    │───▶│   MongoDB       │
│   SDK (Client)  │    │   (Express)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         └─────────────▶│  React Dashboard │◀────────────┘
                        │  (Next.js)       │
                        └─────────────────┘
```

## 🔧 Stack Tecnológico

**Backend:**
- Node.js + Express.js
- MongoDB (base de datos)
- Redis (cache)
- JWT (autenticación)
- Winston (logging)

**Frontend:**
- React + Next.js
- Chart.js (gráficos)
- Tailwind CSS (diseño)
- Heroicons (iconos)

**DevOps:**
- Docker + Docker Compose
- Nginx (proxy reverso)
- GitHub Actions (CI/CD)

## 📁 Estructura del Proyecto

```
ai-pixel-tracker/
├── client/              # JavaScript SDK
│   └── src/
│       └── tracker.js   # Código principal del pixel
├── server/              # Backend API
│   ├── src/
│   │   ├── models/      # Modelos de datos
│   │   ├── routes/      # Rutas de la API
│   │   ├── middleware/  # Middleware personalizado
│   │   └── utils/       # Utilidades
│   └── package.json
├── dashboard/           # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas Next.js
│   │   └── styles/      # Estilos CSS
│   └── package.json
├── docs/               # Documentación
├── docker-compose.yml  # Configuración Docker
└── README.md          # Este archivo
```

## 🚀 Desarrollo Local

### Prerrequisitos
- Node.js 18+
- MongoDB 7.0+
- Redis (opcional)

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/ai-pixel/tracker.git
cd ai-pixel-tracker

# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del dashboard
cd ../dashboard
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración

# Iniciar con Docker Compose (recomendado)
docker-compose up -d

# O iniciar manualmente
npm run dev:server  # Puerto 3000
npm run dev:dashboard  # Puerto 3001
```

### Testing
```bash
# Tests del servidor
cd server
npm test

# Tests del cliente
cd client
npm test

# Tests de integración
npm run test:integration
```

## 📊 API Reference

### Tracking Events
```bash
POST /api/track
Content-Type: application/json

{
  "trackingId": "aip_your_id",
  "type": "ai_bot_detected",
  "url": "https://yoursite.com/page",
  "userAgent": "GPTBot/1.1",
  "data": {
    "name": "GPTBot",
    "description": "OpenAI Training"
  }
}
```

### Analytics Dashboard
```bash
GET /api/analytics/dashboard/{trackingId}?period=7d
Authorization: Bearer your-jwt-token

Response:
{
  "success": true,
  "metrics": {
    "totalEvents": 1250,
    "aiBotsDetected": 45,
    "uniqueSessions": 320,
    "topPages": [...],
    "topBots": [...]
  }
}
```

### Real-time Data
```bash
GET /api/analytics/realtime/{trackingId}
Authorization: Bearer your-jwt-token

Response:
{
  "success": true,
  "data": [...recent events...],
  "summary": {
    "totalEventsLastHour": 12,
    "aiBotsDetectedLastHour": 3,
    "isActive": true
  }
}
```

## 🔒 Privacidad y Seguridad

- **🔐 GDPR Compliant**: No almacenamos datos personales
- **🛡️ Datos Anónimos**: Solo user agents e IPs hasheadas
- **🚫 Opt-out**: Respeta Do Not Track y preferencias
- **🔒 Encriptación**: Datos seguros en tránsito y reposo
- **⚡ Rate Limiting**: Protección contra abuso
- **🔑 JWT Auth**: Autenticación segura para APIs

## 🎯 Casos de Uso

### Para Marketers de Contenido
- Descubrir qué contenido es más "aspirado" por IA
- Optimizar títulos y estructura para mejor visibilidad
- Monitorear competencia en el espacio de IA

### Para SEO Specialists
- Nueva dimensión de análisis: "AI SEO"
- Correlación entre crawling de IA y rankings
- Identificar oportunidades de contenido

### Para Desarrolladores
- API completa para integraciones
- Webhook para automatizaciones
- SDKs para múltiples plataformas

### Para Empresas
- Proteger propiedad intelectual
- Monitorear uso de contenido por IA
- Analytics de nueva generación

## 🛣️ Roadmap

### Q1 2025 ✅
- [x] MVP funcional completo
- [x] JavaScript SDK
- [x] Backend API
- [x] Dashboard React
- [x] Detección de 25+ bots

### Q2 2025 🔄
- [ ] Plugin WordPress oficial
- [ ] Integración Google Analytics
- [ ] Alertas por email/Slack
- [ ] API de competitive intelligence
- [ ] Mobile SDK (iOS/Android)

### Q3 2025 📋
- [ ] Predicciones de visibilidad IA
- [ ] A/B testing para IA optimization
- [ ] Chrome/Firefox extensions
- [ ] Integración con CMS populares
- [ ] White-label solutions

### Q4 2025 🚀
- [ ] Machine Learning predictions
- [ ] Enterprise features
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Marketplace de templates

## 🤝 Contribuir

¡Contribuciones bienvenidas! Ver [CONTRIBUTING.md](CONTRIBUTING.md)

### Quick Start para Contribuidores
```bash
# Fork del repositorio
git clone https://github.com/tu-usuario/ai-pixel-tracker.git

# Crear branch para tu feature
git checkout -b feature/amazing-feature

# Hacer commits descriptivos
git commit -m "Add: amazing feature that does X"

# Push y crear Pull Request
git push origin feature/amazing-feature
```

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- **OpenAI, Anthropic, Perplexity** por hacer posible la era de la IA
- **Vercel** por la inspiración en analytics de bots
- **Comunidad open source** por las herramientas increíbles

## 📞 Soporte y Comunidad

- 🌐 **Website**: https://ai-pixel.com
- 📧 **Email**: support@ai-pixel.com
- 💬 **Discord**: [Únete a la comunidad](https://discord.gg/ai-pixel)
- 🐦 **Twitter**: [@AiPixelTracker](https://twitter.com/AiPixelTracker)
- 📚 **Docs**: https://docs.ai-pixel.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/ai-pixel/tracker/issues)

---

**⭐ Si te gusta el proyecto, danos una estrella en GitHub!**

**🚀 ¿Listo para descubrir el tráfico invisible de tu sitio web?**

[Instalar AI Pixel Tracker](https://ai-pixel.com/install) | [Ver Demo](https://demo.ai-pixel.com) | [Documentación](https://docs.ai-pixel.com)

---

*Hecho con ❤️ para la comunidad de creadores de contenido en la era de la IA.*
