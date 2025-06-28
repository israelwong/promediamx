// /actions/whatsapp/whatsapp.actions.ts
// Este archivo ahora actúa como el único punto de entrada para las acciones de WhatsApp.
// Su única responsabilidad es importar y re-exportar el orquestador principal.
// Toda la lógica compleja ahora vive en los directorios /core, /tasks y /helpers.

'use server';

// 1. Importamos la única función que necesita ser pública.
import { procesarMensajeWhatsAppEntranteAction } from './core/orchestrator';

// 2. La exportamos para que el webhook (u otras partes de la app) puedan llamarla.
export { procesarMensajeWhatsAppEntranteAction };