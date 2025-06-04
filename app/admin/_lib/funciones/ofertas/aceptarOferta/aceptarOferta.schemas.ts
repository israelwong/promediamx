// Ruta: app/admin/_lib/funciones/ofertas/aceptarOferta/aceptarOferta.schemas.ts
import { z } from 'zod';
// No es necesario importar PrismaObjetivoOfertaEnum aquí si no se usa en los schemas Zod directamente.

// Esquema para los parámetros que la IA debe proporcionar.
// Normaliza 'oferta_id' (snake_case) o 'ofertaId' (camelCase) a 'ofertaIdNormalizado'.
export const AceptarOfertaArgsSchema = z.object({
    ofertaId: z.string().cuid("ID de oferta (ofertaId) inválido. Debe ser un CUID.").optional(),
    oferta_id: z.string().cuid("ID de oferta (oferta_id) inválido. Debe ser un CUID.").optional(),
    nombre_de_la_oferta: z.string().min(1, "Nombre de la oferta es requerido.").optional(),
    // Podríamos añadir un campo de confirmación si la IA pregunta "¿Confirmas aceptar X?"
    // y queremos que la IA pase esa confirmación explícitamente.
    // confirmacion_aceptar: z.boolean().optional(),
})
    .transform((data) => {
        const idNormalizado = data.ofertaId || data.oferta_id;
        return {
            // ofertaIdNormalizado será el campo que use la lógica de la acción.
            ofertaIdNormalizado: idNormalizado,
            nombre_de_la_oferta: data.nombre_de_la_oferta,
            // Pasar otros campos si se añaden arriba
        };
    })
    .refine(data => data.ofertaIdNormalizado || data.nombre_de_la_oferta, {
        message: "Se requiere el ID o el nombre de la oferta para aceptarla (ya sea como 'ofertaId', 'oferta_id' o 'nombre_de_la_oferta').",
        // Path podría referirse a uno de los campos originales o un path genérico si la validación es sobre el objeto transformado.
        // Dado que 'ofertaIdNormalizado' es el campo clave después de la transformación, podemos apuntar a él si está vacío.
        path: ["ofertaIdNormalizado"],
    });
export type AceptarOfertaArgs = z.infer<typeof AceptarOfertaArgsSchema>;

// Interfaces para el uiComponentPayload (para WebChat)
export interface ActionButtonPayload {
    label: string;
    actionType: "CALL_FUNCTION" | "USER_INPUT_EXPECTED" | "OPEN_URL"; // Tipos de acción que el frontend puede manejar
    actionName?: string; // Nombre de la función IA a llamar si actionType es CALL_FUNCTION
    payload?: Record<string, unknown>; // Argumentos para la función IA o datos para el frontend
    url?: string; // URL a abrir si actionType es OPEN_URL
    style?: 'primary' | 'secondary' | 'destructive' | 'outline'; // Estilo opcional del botón
}

export interface ActionPromptPayloadData {
    message: string; // Mensaje principal a mostrar junto a los botones
    actions: ActionButtonPayload[];
}

export interface UiComponentPayloadActionPrompt {
    componentType: 'ActionPrompt'; // Identificador del componente UI
    data: ActionPromptPayloadData;
}

// El schema PrepararAceptarOfertaDataSchema ya no es necesario,
// la acción construirá directamente el FunctionResponsePayload.
