// 'use server';

// import { PrismaClient } from '@prisma/client';
// import { ActionResult } from '@/app/admin/_lib/types'; // Asumiendo que ActionResult está aquí

// // Es importante instanciar PrismaClient aquí,
// // o importarlo desde tu archivo prismaClient.ts si ya tienes uno centralizado.
// const prisma = new PrismaClient();

// // IDs que ya tienes de tu CRM y Asistente Virtual existentes
// const EXISTING_CRM_ID = 'cm9x2nnb80001gupd0536gg5h';
// const EXISTING_ASISTENTE_VIRTUAL_ID = 'cma4f5zho0009guj0fnv019t1';

// interface SeedResult {
//     message: string;
//     leadsCreados?: { id: string; nombre: string }[];
//     conversacionesCreadas?: { id: string; leadNombre: string | null }[];
// }

// export async function ejecutarSembradoManual(): Promise<ActionResult<SeedResult>> {
//     console.log(`Iniciando sembrado manual de conversaciones...`);

//     // Verificar que DATABASE_URL esté accesible (Prisma lo maneja si se ejecuta en el contexto de la app)
//     // El hecho de que esta acción se ejecute como parte de tu app Next.js debería asegurar
//     // que las variables de entorno de .env están cargadas correctamente.
//     if (!process.env.DATABASE_URL) {
//         console.error("CRITICAL ERROR: DATABASE_URL no está disponible en el entorno.");
//         return { success: false, error: "DATABASE_URL no configurada." };
//     }

//     if (!EXISTING_CRM_ID || !EXISTING_ASISTENTE_VIRTUAL_ID) {
//         const errorMsg = 'Error de configuración: CRM_ID y ASISTENTE_VIRTUAL_ID deben estar definidos en manualSeed.actions.ts.';
//         console.error(errorMsg);
//         return { success: false, error: errorMsg };
//     }

//     try {
//         console.log(`Verificando CRM con ID: ${EXISTING_CRM_ID}`);
//         const crmExists = await prisma.cRM.findUnique({ where: { id: EXISTING_CRM_ID } });
//         if (!crmExists) {
//             const errorMsg = `Error: CRM con ID ${EXISTING_CRM_ID} no encontrado.`;
//             console.error(errorMsg);
//             return { success: false, error: errorMsg };
//         }
//         console.log(`CRM ${EXISTING_CRM_ID} encontrado.`);

//         console.log(`Verificando AsistenteVirtual con ID: ${EXISTING_ASISTENTE_VIRTUAL_ID}`);
//         const asistenteExists = await prisma.asistenteVirtual.findUnique({ where: { id: EXISTING_ASISTENTE_VIRTUAL_ID } });
//         if (!asistenteExists) {
//             const errorMsg = `Error: AsistenteVirtual con ID ${EXISTING_ASISTENTE_VIRTUAL_ID} no encontrado.`;
//             console.error(errorMsg);
//             return { success: false, error: errorMsg };
//         }
//         console.log(`AsistenteVirtual ${EXISTING_ASISTENTE_VIRTUAL_ID} encontrado.`);

//         // 1. Crear Leads
//         console.log('Creando lead Ana Pérez...');
//         const leadAna = await prisma.lead.create({
//             data: {
//                 crmId: EXISTING_CRM_ID,
//                 nombre: 'Ana Pérez (Seed Manual)',
//                 email: 'ana.perez.manual@example.com',
//                 telefono: '5522334455',
//                 status: 'nuevo',
//             },
//         });
//         console.log(`Lead Ana Pérez (Manual) creado con id: ${leadAna.id}`);

//         console.log('Creando lead Luis García...');
//         const leadLuis = await prisma.lead.create({
//             data: {
//                 crmId: EXISTING_CRM_ID,
//                 nombre: 'Luis García (Manual)',
//                 email: 'luis.garcia.manual@example.com',
//                 telefono: '5566778899',
//                 status: 'contactado',
//             },
//         });
//         console.log(`Lead Luis García (Manual) creado con id: ${leadLuis.id}`);

//         // 2. Crear Conversaciones e Interacciones
//         console.log(`Creando conversación para Ana Pérez...`);
//         const conversacionAna = await prisma.conversacion.create({
//             data: {
//                 leadId: leadAna.id,
//                 asistenteVirtualId: EXISTING_ASISTENTE_VIRTUAL_ID,
//                 status: 'abierta',
//                 intencion: 'Consulta de producto (Manual)',
//             },
//         });
//         console.log(`Conversación para Ana (Manual) creada con id: ${conversacionAna.id}`);

//         await prisma.interaccion.createMany({
//             data: [
//                 { conversacionId: conversacionAna.id, role: 'user', mensaje: 'Hola, ¿info del plan premium? (Manual)', createdAt: new Date(Date.now() - 10 * 60 * 1000) },
//                 { conversacionId: conversacionAna.id, role: 'assistant', mensaje: '¡Hola Ana! El plan premium ofrece... (Manual)', createdAt: new Date(Date.now() - 9 * 60 * 1000) },
//                 { conversacionId: conversacionAna.id, role: 'user', mensaje: '¿Costo y cómo me suscribo? (Manual)', createdAt: new Date(Date.now() - 8 * 60 * 1000) },
//                 { conversacionId: conversacionAna.id, role: 'agent', mensaje: 'Ana, soy David. El costo es $X. (Manual)', createdAt: new Date(Date.now() - 7 * 60 * 1000) },
//             ],
//         });
//         console.log(`Interacciones para Ana (Manual) creadas.`);

//         console.log(`Creando conversación para Luis García...`);
//         const conversacionLuis = await prisma.conversacion.create({
//             data: {
//                 leadId: leadLuis.id,
//                 asistenteVirtualId: EXISTING_ASISTENTE_VIRTUAL_ID,
//                 status: 'en_espera_agente',
//                 intencion: 'Soporte técnico (Manual)',
//             },
//         });
//         console.log(`Conversación para Luis (Manual) creada con id: ${conversacionLuis.id}`);

//         await prisma.interaccion.createMany({
//             data: [
//                 { conversacionId: conversacionLuis.id, role: 'user', mensaje: 'Problema con mi config. (Manual)', createdAt: new Date(Date.now() - 5 * 60 * 1000) },
//                 { conversacionId: conversacionLuis.id, role: 'assistant', mensaje: 'Entendido Luis, ¿puedes detallar? (Manual)', createdAt: new Date(Date.now() - 4 * 60 * 1000) },
//                 { conversacionId: conversacionLuis.id, role: 'user', mensaje: 'No guarda tarea X. (Manual)', createdAt: new Date(Date.now() - 3 * 60 * 1000) },
//                 { conversacionId: conversacionLuis.id, role: 'assistant', mensaje: 'Un momento, te conecto con un agente. (Manual)', createdAt: new Date(Date.now() - 2 * 60 * 1000) },
//             ],
//         });
//         console.log(`Interacciones para Luis (Manual) creadas.`);

//         const resultado: SeedResult = {
//             message: "Sembrado manual completado exitosamente.",
//             leadsCreados: [
//                 { id: leadAna.id, nombre: leadAna.nombre },
//                 { id: leadLuis.id, nombre: leadLuis.nombre },
//             ],
//             conversacionesCreadas: [
//                 { id: conversacionAna.id, leadNombre: leadAna.nombre },
//                 { id: conversacionLuis.id, leadNombre: leadLuis.nombre },
//             ],
//         };
//         console.log(resultado.message);
//         return { success: true, data: resultado };

//     } catch (error) {
//         console.error('Error durante el sembrado manual:', error);
//         let errorMessage = 'Ocurrió un error durante el sembrado.';
//         if (error instanceof Error) {
//             errorMessage = error.message;
//         }
//         return { success: false, error: errorMessage };
//     } finally {
//         // Es importante desconectar Prisma si la instancia se crea dentro de la función.
//         // Si usas una instancia global de Prisma, la desconexión se maneja de otra forma.
//         await prisma.$disconnect();
//         console.log('Cliente Prisma desconectado del sembrado manual.');
//     }
// }
