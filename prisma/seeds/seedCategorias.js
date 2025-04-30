// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

// Inicializar Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // --- Seed Categorías de Tareas ---
  const categoriasData = [
    {
      nombre: "⚙️ Tareas Base / Incluidas",
      descripcion: "Funciones básicas incluidas en el plan base del asistente.",
      orden: 1,
    },
    {
      nombre: "💬 Comunicación y Atención",
      descripcion:
        "Gestión de chats, respuestas a preguntas frecuentes, saludos/despedidas.",
      orden: 2,
    },
    {
      nombre: "📊 Gestión de CRM/Leads",
      descripcion:
        "Creación de leads, actualización de pipeline, asignación de etiquetas CRM.",
      orden: 3,
    },
    {
      nombre: "📅 Agendamiento y Recordatorios",
      descripcion:
        "Agendar citas, confirmar asistencias, enviar recordatorios.",
      orden: 4,
    },
    {
      nombre: "📦 Gestión de Catálogo/Pedidos",
      descripcion:
        "Consultar productos, verificar stock, tomar pedidos simples.",
      orden: 5,
    },
    {
      nombre: "🔗 Integraciones y Automatización",
      descripcion:
        "Conexión con APIs externas, generación de reportes, automatización de procesos.",
      orden: 6,
    },
    {
      nombre: "🧠 Inteligencia y Análisis",
      descripcion:
        "Resumen de conversaciones, análisis de sentimiento, identificación de intención avanzada.",
      orden: 7,
    },
    {
      nombre: "🛠️ Soporte y HITL",
      descripcion:
        "Escalar conversación a un agente humano, solicitar ayuda específica.",
      orden: 8,
    },
  ];

  console.log(`Seeding ${categoriasData.length} CategoriaTarea...`);
  // Usar createMany para eficiencia y skipDuplicates para evitar errores si ya existen (basado en el @unique de 'nombre')
  const createdCategorias = await prisma.categoriaTarea.createMany({
    data: categoriasData,
    skipDuplicates: true, // Importante si el campo 'nombre' es único
  });
  console.log(`Seeded ${createdCategorias.count} new CategoriaTarea.`);

  // --- Seed Etiquetas de Tareas ---
  const etiquetasData = [
    // Canales
    { nombre: "WhatsApp", descripcion: "Funciona principalmente en WhatsApp." },
    {
      nombre: "Facebook Messenger",
      descripcion: "Integración con Facebook Messenger.",
    }, // Futuro
    {
      nombre: "Instagram DM",
      descripcion: "Integración con Instagram Direct Messages.",
    }, // Futuro
    { nombre: "Web Chat", descripcion: "Para usar en un chat web." }, // Futuro

    // Funcionalidad Principal
    {
      nombre: "Respuestas FAQ",
      descripcion: "Responde preguntas frecuentes predefinidas.",
    },
    {
      nombre: "Captura de Lead",
      descripcion: "Obtiene datos de contacto de prospectos.",
    },
    {
      nombre: "Agendamiento",
      descripcion: "Permite agendar citas o reuniones.",
    },
    {
      nombre: "Consulta Catálogo",
      descripcion: "Busca y muestra información de productos/servicios.",
    },
    { nombre: "Toma de Pedido", descripcion: "Registra pedidos simples." },
    {
      nombre: "Seguimiento",
      descripcion: "Realiza acciones de seguimiento a leads.",
    },
    {
      nombre: "Recordatorio",
      descripcion: "Envía recordatorios de citas o eventos.",
    },
    {
      nombre: "Soporte Básico",
      descripcion: "Ofrece respuestas a problemas comunes.",
    },
    { nombre: "Generación Reporte", descripcion: "Crea reportes básicos." },

    // Nivel de IA / Complejidad
    {
      nombre: "Básica",
      descripcion: "Funcionalidad simple, basada en reglas.",
    },
    { nombre: "Intermedia", descripcion: "Combina reglas con algo de IA." },
    {
      nombre: "Avanzada",
      descripcion: "Uso intensivo de IA para comprensión o generación.",
    },
    {
      nombre: "Con IA Generativa",
      descripcion: "Utiliza modelos generativos para crear respuestas.",
    },

    // Requiere Configuración
    {
      nombre: "Configuración Rápida",
      descripcion: "Lista para usar casi de inmediato.",
    },
    {
      nombre: "Requiere Datos Negocio",
      descripcion:
        "Necesita información específica del negocio para funcionar.",
    },
    {
      nombre: "Requiere API Externa",
      descripcion:
        "Necesita configuración de credenciales para API de terceros.",
    },

    // Beneficio Clave
    { nombre: "Ahorro Tiempo", descripcion: "Automatiza tareas repetitivas." },
    {
      nombre: "Mejora Ventas",
      descripcion: "Ayuda en el proceso de conversión.",
    },
    {
      nombre: "Atención 24/7",
      descripcion: "Proporciona respuestas fuera de horario comercial.",
    },
    {
      nombre: "Automatización",
      descripcion: "Realiza procesos sin intervención humana.",
    },
    {
      nombre: "Experiencia Cliente",
      descripcion: "Mejora la interacción con el cliente.",
    },

    // Integración
    { nombre: "CRM Integrado", descripcion: "Interactúa con el módulo CRM." },
    {
      nombre: "Calendario",
      descripcion: "Se conecta con sistemas de calendario.",
    },
    // { nombre: 'API Externa', descripcion: 'Se conecta con otras APIs.' }, // Ya cubierta arriba?
  ];

  // Asignar orden secuencial a las etiquetas
  const etiquetasDataConOrden = etiquetasData.map((et, index) => ({
    ...et,
    orden: index + 1,
    // status: 'activo' // Añadir si tienes campo status
    // color: '#...' // Añadir si tienes campo color
  }));

  console.log(`Seeding ${etiquetasDataConOrden.length} EtiquetaTarea...`);
  const createdEtiquetas = await prisma.etiquetaTarea.createMany({
    data: etiquetasDataConOrden,
    skipDuplicates: true, // Importante si el campo 'nombre' es único
  });
  console.log(`Seeded ${createdEtiquetas.count} new EtiquetaTarea.`);

  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
