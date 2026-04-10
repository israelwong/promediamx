// Ruta actual del archivo: app/admin/_lib/agente.types.ts

import { Agente } from '@prisma/client'; // Asegúrate de que Prisma esté configurado correctamente


export type AgenteBasico = {
    id: string;
    nombre: string | null; // El nombre es opcional en el schema de Agente
    // email?: string; // Podrías añadir email si es útil para mostrar
};


// --- Tipo de Retorno para obtenerAgentesCRM ---
export interface ObtenerAgentesResult {
    success: boolean;
    data?: {
        crmId: string | null; // Devolvemos el crmId encontrado
        agentes: Agente[]; // Lista de agentes (sin password)
    } | null;
    error?: string;
}
