# AI Pixel Tracker - Guía de Instalación y Uso

## 🎯 ¿Qué es AI Pixel Tracker?

AI Pixel Tracker es la primera herramienta que te permite detectar y medir cuando los bots de Inteligencia Artificial (como ChatGPT, Claude, Perplexity, etc.) acceden a tu contenido web.

**¿Por qué lo necesitas?**
- Las IAs consumen tu contenido sin generar tráfico visible
- No sabes qué páginas están siendo "aspiradas" por bots de IA
- Necesitas métricas para optimizar tu contenido para IA
- Quieres estar un paso adelante de tu competencia

## 🚀 Instalación Súper Simple (Como el Pixel de Facebook)

### Paso 1: Obtén tu Tracking ID

```bash
# Crear nuevo tracking ID (solo una vez)
curl -X POST https://api.ai-pixel.com/auth/tracking-id \
  -H "Content-Type: application/json" \
  -d '{"name": "Mi Sitio Web", "domain": "misitio.com"}'
```

**Respuesta:**
```json
{
  "success": true,
  "trackingId": "aip_1j9k8l7m6n5_1234567890",
  "name": "Mi Sitio Web",
  "domain": "misitio.com"
}
```

### Paso 2: Instala el Código en tu Sitio

**Copia y pega este código en el `<head>` de tu sitio web:**

```html
<!-- AI Pixel Tracker -->
<script>
  window.aiPixelConfig = {
    trackingId: 'TU_TRACKING_ID_AQUI', // Reemplaza con tu ID
    debug: false // Cambia a true para ver logs en consola
  };
</script>
<script src="https://cdn.ai-pixel.com/tracker.js" async></script>
<!-- Fin AI Pixel Tracker -->
```

### Paso 3: ¡Listo! Ya Estás Trackeando

- Los bots de IA serán detectados automáticamente
- Los datos aparecerán en tu dashboard en tiempo real
- No necesitas configuración adicional

## 📊 Accede a tu Dashboard

Visita: `https://dashboard.ai-pixel.com/your-tracking-id`

## 🔧 Configuración Avanzada

### Para Sitios WordPress
```php
// Agrega a functions.php de tu tema
function add_ai_pixel_tracker() {
    ?>
    <script>
      window.aiPixelConfig = {
        trackingId: '<?php echo get_option('ai_pixel_tracking_id'); ?>',
        debug: <?php echo is_admin() ? 'true' : 'false'; ?>
      };
    </script>
    <script src="https://cdn.ai-pixel.com/tracker.js" async></script>
    <?php
}
add_action('wp_head', 'add_ai_pixel_tracker');
```

### Para Google Tag Manager
```javascript
// Variable personalizada en GTM
// Nombre: AI Pixel Tracking ID
// Tipo: Constante
// Valor: tu_tracking_id_aqui

// Tag HTML personalizado
<script>
  window.aiPixelConfig = {
    trackingId: '{{AI Pixel Tracking ID}}',
    debug: false
  };
</script>
<script src="https://cdn.ai-pixel.com/tracker.js" async></script>
```

### Para Shopify
```liquid
<!-- En theme.liquid, antes de </head> -->
<script>
  window.aiPixelConfig = {
    trackingId: '{{ settings.ai_pixel_tracking_id }}',
    debug: false
  };
</script>
<script src="https://cdn.ai-pixel.com/tracker.js" async></script>
```

## 📈 ¿Qué Datos Obtienes?

### Métricas Principales
- **Bots de IA Detectados**: Cuántos y cuáles bots accedieron
- **Páginas Más Crawleadas**: Tu contenido más "aspirado"
- **Tendencias Temporales**: Patrones de actividad de bots
- **Tipos de Bots**: GPTBot, ClaudeBot, PerplexityBot, etc.

### Detección Automática de:
- **OpenAI**: GPTBot, OAI-SearchBot, ChatGPT-User
- **Anthropic**: ClaudeBot, anthropic-ai, claude-web
- **Perplexity**: PerplexityBot, Perplexity-User
- **Google**: Google-Extended (Gemini)
- **Microsoft**: BingBot (Copilot)
- **Meta**: FacebookBot, meta-externalagent
- **Y 20+ bots más...**

## 🎛️ API para Desarrolladores

### Obtener Datos del Dashboard
```javascript
// Métricas generales
fetch('/api/analytics/dashboard/your-tracking-id?period=7d')
  .then(response => response.json())
  .then(data => console.log(data));

// Datos en tiempo real
fetch('/api/analytics/realtime/your-tracking-id')
  .then(response => response.json())
  .then(data => console.log(data));

// Tendencias
fetch('/api/analytics/trends/your-tracking-id?period=daily&days=30')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Tracking Manual de Eventos
```javascript
// Trackear evento personalizado
if (window.aiPixel) {
  aiPixel.track('custom_event', {
    action: 'download',
    file: 'ebook.pdf',
    value: 'lead_magnet'
  });
}
```

## 🔒 Privacidad y Cumplimiento

- **GDPR Compliant**: No almacenamos datos personales
- **Anónimo**: Solo IPs hasheadas y user agents
- **Opt-out**: Respeta Do Not Track y preferencias de cookies
- **Seguro**: Datos encriptados en tránsito y reposo

## 🛠️ Solución de Problemas

### No Veo Datos en el Dashboard
1. Verifica que el tracking ID sea correcto
2. Revisa la consola del navegador (F12) con `debug: true`
3. Confirma que el script se carga sin errores
4. Espera algunas horas para los primeros datos

### Configuración de Debug
```javascript
window.aiPixelConfig = {
  trackingId: 'tu-id',
  debug: true, // Activar logs
  endpoint: 'https://api.ai-pixel.com/track' // Personalizar endpoint
};
```

### Testing Local
```bash
# Servidor de desarrollo local
npm install -g ai-pixel-server
ai-pixel-server --port 3000 --mongodb mongodb://localhost:27017
```

## 📞 Soporte

- **Email**: support@ai-pixel.com
- **Discord**: [Comunidad AI Pixel](https://discord.gg/ai-pixel)
- **Docs**: https://docs.ai-pixel.com
- **GitHub**: https://github.com/ai-pixel/tracker

## 🚀 Próximas Funcionalidades

- [ ] Alertas automáticas por email/Slack
- [ ] Integración con Google Analytics
- [ ] Predicciones de visibilidad en IA
- [ ] API de competitive intelligence
- [ ] Plugin nativo para WordPress
- [ ] Extensión para Chrome/Firefox

---

**¿Listo para ver qué IAs están "vampirizando" tu contenido?**

Instala AI Pixel Tracker en 2 minutos y descubre el tráfico invisible de tu sitio web.

*La primera herramienta que te muestra el lado oculto del SEO en la era de la IA.*
