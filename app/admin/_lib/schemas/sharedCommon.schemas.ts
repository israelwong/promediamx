// Sugerencia de ruta: @/app/admin/_lib/schemas/sharedCommon.schemas.ts
import { z } from 'zod';

// Si AgenteBasico no está definido globalmente, puedes poner un placeholder o un schema más simple aquí
// SOLO para ChatMessageItemSchema si no lo necesitas completamente detallado para el ChatTestPanel.
// Por ejemplo:
export const AgenteBasicoPlaceholderSchema = z.object({
    id: z.string(),
    nombre: z.string().nullable().optional(),
    // userId: z.string().nullable().optional(), // Si lo tienes
}).nullable().optional();

export const SharedTipoVideoEnumSchema = z.enum(['SUBIDO', 'YOUTUBE', 'VIMEO', 'OTRO_URL']);
export type SharedTipoVideoType = z.infer<typeof SharedTipoVideoEnumSchema>;

import type { AgenteBasico } from '@/app/admin/_lib/agente.types';
import { InteraccionParteTipo } from '@prisma/client'; // Importar el enum de Prisma

// Esquema para un ChatMessageItem (lo que el frontend renderiza)
// y lo que obtenerUltimosMensajesAction devuelve.
export const ChatMessageItemSchema = z.object({
    id: z.string().cuid(),
    conversacionId: z.string().cuid(),
    role: z.string(), // roles: user, assistant, agent, system, function
    // Campo principal para el contenido textual visible
    mensajeTexto: z.string().nullable().optional(),
    // Campos estructurales de IA (opcionales para la UI, pero presentes en los datos)
    parteTipo: z.nativeEnum(InteraccionParteTipo).default('TEXT').nullable().optional(),
    functionCallNombre: z.string().nullable().optional(),
    functionCallArgs: z.record(z.any()).nullable().optional(), // Almacenado como JSON, parseado a objeto
    // functionResponseNombre: z.string().nullable().optional(), // Es el functionCallNombre cuando parteTipo es FUNCTION_RESPONSE
    functionResponseData: z.record(z.any()).nullable().optional(), // Almacenado como JSON, parseado a objeto
    // Campos existentes
    mediaUrl: z.string().url().nullable().optional(),
    mediaType: z.string().nullable().optional(),
    createdAt: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    nombreRemitente: z.string().nullable().optional(),
    agenteCrm: z.custom<AgenteBasico>().nullable().optional(),
    uiComponentPayload: z.record(z.any()).nullable().optional(), // Payload para componentes UI personalizados
    canalInteraccion: z.string().nullable().optional(),

});
export type ChatMessageItem = z.infer<typeof ChatMessageItemSchema>;
