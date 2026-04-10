# Análisis Completo de Promedia App

## 1. Arquitectura y Stack Tecnológico

### Framework Principal y Versiones

- **Frontend**:
  - Next.js 15.1.7 (Framework React)
  - TypeScript
  - Tailwind CSS para estilos
  - React 19.0.0

- **Backend**:
  - Node.js
  - Prisma 6.4.1 como ORM
  - PostgreSQL como base de datos

### Servicios Externos Integrados

- **Autenticación y Base de Datos**:
  - Supabase para autenticación y almacenamiento
  - NextAuth.js para manejo de sesiones

- **Procesamiento de Pagos**:
  - Stripe para pagos y suscripciones

- **Comunicaciones**:
  - WhatsApp Business API
  - Message Bird
  - Mailchimp para email marketing
  - ManyChat para automatización de chat

- **IA y Automatización**:
  - Google AI (@google/genai, @google/generative-ai)
  - Chrono-node para procesamiento de fechas

### Estructura de Carpetas

```
/app
  /(main) - Frontend principal
  /admin - Panel de administración
  /emails - Plantillas de email
/prisma
  /schema.prisma - Definición de modelos
/scripts
  /gemini - Integraciones con IA
```

### Patrones de Diseño

- Arquitectura basada en componentes React
- Patrón de repositorio con Prisma
- Sistema de orquestación para WhatsApp
- FSM (Finite State Machine) para manejo de conversaciones
- Event-driven para interacciones y notificaciones

## 2. Modelos de Datos Principales

### Modelos Core del Negocio

#### Usuario y Autenticación

- `Usuario`: Modelo base para autenticación
  - Atributos: username, email, teléfono, password
  - Relación con roles y sesiones
- `Cliente`: Entidad principal de negocio
  - Datos personales y fiscales
  - Relaciones con negocios y contratos
  - Integración con Stripe (stripeCustomerId)

#### Negocio y Catálogo

- `Negocio`: Entidad central para comercios
  - Información básica: nombre, contacto, ubicación
  - Configuraciones de agenda y pagos
  - Integración con WhatsApp Business
  - Sistema de conocimiento y respuestas automáticas

- `Catalogo` y `ItemCatalogo`:
  - Gestión de productos y servicios
  - Sistema de categorías y etiquetas
  - Precios y variantes
  - Galería de imágenes y videos

### Modelos de WhatsApp/Comunicaciones

- `AsistenteVirtual`:
  - Configuración de WhatsApp Business
  - Gestión de conocimiento y umbral de similitud
  - Integración con canales conversacionales

- `Conversacion` y `Interaccion`:
  - Historial de mensajes y estados
  - Análisis de intenciones y sentimientos
  - Integración con funciones y respuestas automáticas

### Modelos de CRM

- `CRM`:
  - Configuración por negocio
  - Integración con ManyChat
  - Campos personalizados

- `Lead`:
  - Gestión de prospectos
  - Seguimiento de pipeline
  - Etiquetas y canales de adquisición

- `Agente`:
  - Gestión de personal de ventas
  - Asignación de conversaciones
  - Seguimiento de interacciones

### Modelos de Facturación

- `Factura` y `FacturaItem`:
  - Integración con Stripe
  - Gestión de suscripciones
  - Items facturables

- `Contrato`:
  - Términos de servicio
  - Gestión de recurrencia
  - Estados y fechas

## 3. Funcionalidades Implementadas

### Gestión de Negocios

#### Creación y Configuración de Perfiles

- Registro de información básica del negocio
- Configuración de horarios de atención
- Gestión de excepciones y días festivos
- Configuración de medios de pago
- Integración con redes sociales

#### Gestión de Catálogos

- Creación y administración de productos/servicios
- Sistema de categorías y etiquetas
- Gestión de precios y variantes
- Galería de imágenes y videos por producto
- Sistema de paquetes y ofertas

#### Sistema de Landing Pages

- Ofertas personalizadas con vigencia
- Galerías multimedia
- Integración con sistema de citas
- Tracking de interacciones
- Documentos descargables

### Asistentes Virtuales

#### Configuración por Negocio

- Personalización de nombre y avatar
- Configuración de WhatsApp Business
- Ajuste de umbral de similitud para respuestas
- Base de conocimiento personalizada

#### Integración WhatsApp Business API

- Conexión con WhatsApp Business API
- Gestión de tokens y estados de conexión
- Monitoreo de calidad del servicio
- Manejo de múltiples números

#### Gestión de Conversaciones

- Sistema de intenciones y entidades
- Análisis de sentimiento
- Orquestación de respuestas
- Transferencia a agentes humanos
- Historial y seguimiento

#### Tareas Disponibles

- Sistema de suscripción a tareas
- Ejecución y monitoreo
- Parámetros personalizables
- Categorización y etiquetado
- Galería de ejemplos

### CRM

#### Gestión de Leads

- Captura automática desde conversaciones
- Datos personalizados por negocio
- Seguimiento de interacciones
- Historial de comunicaciones
- Integración con ManyChat

#### Pipelines y Etapas

- Configuración flexible de pipelines
- Estados personalizables
- Seguimiento de progreso
- Valoración de oportunidades

#### Agentes y Asignaciones

- Gestión de equipo de ventas
- Asignación automática/manual
- Seguimiento de desempeño
- Notificaciones y alertas

#### Sistema de Etiquetas

- Etiquetado flexible de leads
- Categorización por fuente
- Seguimiento por canal
- Automatización de etiquetado

### Comunicaciones

#### Estado WhatsApp

- Conexión con API oficial
- Monitoreo de calidad
- Gestión de tokens
- Estados de conexión

#### Sistema de Conversaciones

- Análisis de intenciones
- Procesamiento de multimedia
- Respuestas automáticas
- Transferencia a agentes

#### Interacciones

- Tracking de interacciones
- Análisis de sentimiento
- Registro de multimedia
- Métricas de engagement

### Facturación

#### Sistema de Suscripciones

- Planes recurrentes
- Gestión de contratos
- Facturación automática
- Historial de pagos

#### Integración Stripe

- Procesamiento de pagos
- Manejo de suscripciones
- Gestión de reembolsos
- Webhooks automáticos

#### Gestión de Facturas

- Generación automática
- Items detallados
- Estados de pago
- Historial de transacciones

## 4. APIs y Webhooks Existentes

### Endpoints WhatsApp

- Webhook de recepción de mensajes
- API de envío de mensajes
- Gestión de estados de conexión
- Manejo de multimedia
- Verificación de tokens

### Webhooks Configurados

- Stripe para procesamiento de pagos
- ManyChat para automatización
- WhatsApp Business API
- Notificaciones de sistema

### Integraciones de Terceros

- Google AI para procesamiento de lenguaje
- Stripe para pagos
- Supabase para almacenamiento
- Message Bird para comunicaciones
- ManyChat para automatización

## 5. Sistema de Autenticación y Permisos

### Modelo de Usuarios

- **Usuario Base**
  - Autenticación principal
  - Gestión de sesiones
  - Roles asignables

- **Cliente**
  - Perfil de negocio
  - Acceso a funcionalidades premium
  - Gestión de suscripciones

- **Agente**
  - Acceso al CRM
  - Gestión de leads
  - Manejo de conversaciones

### Sistema de Roles

- Roles configurables
- Permisos granulares
- Jerarquía de accesos
- Restricciones por módulo

### Middleware de Autenticación

- NextAuth.js para sesiones
- JWT para APIs
- Supabase como proveedor
- Protección de rutas

## 6. Infraestructura Actual

### Hosting y Deployment

- **Frontend**: Vercel (Next.js)
- **Backend**: Vercel Serverless Functions
- **Control de Versiones**: GitHub

### Base de Datos

- PostgreSQL vía Supabase
- Prisma como ORM
- Vectores para búsqueda semántica
- Índices optimizados

### Storage de Archivos

- Supabase Storage para archivos
- Gestión de multimedia
- Sistema de galerías
- Control de tamaños

### Variables de Entorno Críticas

- Tokens de WhatsApp Business
- Claves de Stripe
- Credenciales de Supabase
- Tokens de servicios externos

## 7. Gaps y Oportunidades

### Funcionalidades Planificadas No Implementadas

- Sistema de campañas masivas WhatsApp
- Landing pages dinámicas personalizadas
- Integración profunda con ManyChat
- Sistema de reportes avanzados

### Integraciones Pendientes

- ManyChat: Sincronización bidireccional
- Sistemas de email marketing
- CRMs externos populares
- Plataformas de e-commerce

### Áreas que Necesitan Refactorización

- Sistema de conversaciones (separar lógica)
- Manejo de estados en tareas
- Optimización de queries
- Gestión de caché

### Deuda Técnica Identificable

- Manejo de errores consistente
- Tests automatizados
- Documentación de APIs
- Optimización de performance

## 8. Capacidades Reutilizables para Nueva Funcionalidad

### Envío Masivo de Mensajes WhatsApp

✅ **Existente y Reutilizable**:

- Integración con WhatsApp Business API
- Sistema de plantillas de mensajes
- Manejo de estados de envío
- Tracking de interacciones
- Sistema de respuestas automáticas

⚠️ **Necesita Adaptación**:

- Lógica de campañas masivas
- Sistema de listas de distribución
- Control de velocidad de envío
- Métricas de campañas
- Gestión de opt-out

❌ **Crear desde Cero**:

- Interface de diseño de campañas
- Segmentación avanzada
- Reportes de campañas
- A/B testing
- Sistema de programación

### Landing Pages Personalizadas

✅ **Existente y Reutilizable**:

- Sistema de ofertas
- Gestión de multimedia
- Integración con pagos
- Sistema de formularios
- Tracking de visitas

⚠️ **Necesita Adaptación**:

- Templates dinámicos
- Sistema de personalización
- Integración con campañas
- Analytics avanzados
- SEO dinámico

❌ **Crear desde Cero**:

- Editor visual de páginas
- Sistema de temas
- Personalización por usuario
- Split testing
- Optimización de conversión

### Tracking de Interacciones

✅ **Existente y Reutilizable**:

- Modelo de interacciones
- Sistema de eventos
- Tracking de conversaciones
- Análisis de sentimiento
- Registro de multimedia

⚠️ **Necesita Adaptación**:

- Métricas de campañas
- Atribución de conversiones
- Segmentación de usuarios
- Análisis de comportamiento
- Reportes personalizados

❌ **Crear desde Cero**:

- Dashboard de analytics
- Funnel de conversión
- Predicción de comportamiento
- Exportación de reportes
- Integración con GA4

### Importación Masiva de Datos

✅ **Existente y Reutilizable**:

- Modelos de datos flexibles
- Sistema de validación
- Procesamiento asíncrono
- Manejo de errores
- Logs de operaciones

⚠️ **Necesita Adaptación**:

- Mapeo de campos Excel
- Validación personalizada
- Transformación de datos
- Gestión de duplicados
- Rollback de operaciones

❌ **Crear desde Cero**:

- Interface de importación
- Templates de importación
- Previsualización de datos
- Corrección de errores
- Historial de importaciones

### Sistema de Campañas

✅ **Existente y Reutilizable**:

- Modelo de ofertas
- Sistema de etiquetas
- Gestión de leads
- Tracking de interacciones
- Integración WhatsApp

⚠️ **Necesita Adaptación**:

- Flujos de campaña
- Segmentación
- Automatización
- Métricas y KPIs
- Gestión de contenido

❌ **Crear desde Cero**:

- Diseñador de campañas
- Sistema de triggers
- Reglas de automatización
- Dashboard de campañas
- Sistema de notificaciones

### Conclusión para Implementación de Módulo de Campañas

Basado en el análisis, se recomienda **extender la aplicación actual** en lugar de crear una nueva por las siguientes razones:

1. **Infraestructura Existente**:
   - Integración WhatsApp ya implementada
   - Sistema de tracking robusto
   - Gestión de leads y CRM
   - Base de datos optimizada

2. **Ventajas de Integración**:
   - Reutilización de modelos core
   - Consistencia de datos
   - Experiencia unificada
   - Menor tiempo de desarrollo

3. **Plan de Implementación**:
   1. Extender modelos existentes
   2. Desarrollar módulo de campañas
   3. Implementar sistema de landing pages
   4. Integrar analytics avanzado
   5. Desarrollar reportes y dashboards
