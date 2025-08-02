// Ruta: app/admin/_lib/actions/availability/availability.schemas.ts
import { z } from 'zod';

// ✅ Esquema de entrada actualizado: ahora solo requiere el negocioId.
export const checkAvailabilityQuerySchema = z.object({
    negocioId: z.string().cuid("El ID del negocio es inválido."),
    diasAConsultar: z.coerce.number().int().positive().optional().default(7), // Consultar 7 días por defecto
});

// --- Tipos para la respuesta JSON estructurada ---

export type BloqueHorario = {
    hora: string; // ej. "09:00"
    fechaCompletaISO: string; // ej. "2025-08-01T09:00:00.000Z"
};

export type DiaDisponible = {
    fecha: string; // ej. "2025-08-01"
    nombreDia: string; // ej. "viernes"
    horarios: BloqueHorario[];
};

// ✅ Define la estructura final de la respuesta de la API, ahora centrada en las ofertas.
export type AvailabilityApiResponse = {
    message: string;
    data?: {
        negocio: {
            id: string;
            nombre: string;
        };
        // La respuesta ahora es un arreglo de ofertas
        ofertas: {
            id: string;
            nombre: string;
            // Cada oferta tiene sus propios tipos de cita con sus horarios
            tiposDeCita: {
                id: string;
                nombre: string;
                duracionMinutos: number | null;
                diasDisponibles: DiaDisponible[];
            }[];
        }[];
    };
    error?: string;
    details?: unknown;
};
