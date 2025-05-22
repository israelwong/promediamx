import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarAceptarOfertaAction espera.
// 'negocioId' y 'canalNombre' se añaden en el dispatcher,
// 'oferta_id' es lo que se espera que Gemini extraiga.
export const AceptarOfertaArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    oferta_id: z.string().min(1, "El ID o nombre de la oferta es requerido."), // Puede ser ID (cuid) o un nombre/identificador
    canalNombre: z.string().nullable().optional(),
});
export type AceptarOfertaArgs = z.infer<typeof AceptarOfertaArgsSchema>;

// Esquema para los datos que devuelve la acción ejecutarAceptarOfertaAction
export const AceptarOfertaDataSchema = z.object({
    nombreOferta: z.string(),
    linkDePago: z.string().url("El link de pago debe ser una URL válida.").nullable().optional(),
    mensajeSiguientePaso: z.string(),
});
export type AceptarOfertaData = z.infer<typeof AceptarOfertaDataSchema>;