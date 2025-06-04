import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarBrindarInfoNegocioAction espera.
// La función 'brindarInformacionDelNegocio' según tus logs de Gemini no tiene parámetros definidos
// para que Gemini los extraiga. El 'negocioId' se añade en el dispatcher desde el contexto.
// El campo 'tema' en tu tipo TypeScript 'BrindarInfoArgs' es opcional y no se usa actualmente
// en la lógica de la acción que me pasaste. Si en el futuro Gemini va a extraer un 'tema',
// se añadiría aquí. Por ahora, solo validamos 'negocioId'.
export const BrindarInfoArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    tema: z.string().min(1, "El tema no puede estar vacío si se proporciona.").max(100, "Tema demasiado largo.").nullable().optional(), // Mantenido opcional como en tu tipo
});
export type BrindarInfoArgs = z.infer<typeof BrindarInfoArgsSchema>;

// Esquema para los datos que devuelve la acción ejecutarBrindarInfoNegocioAction
export const BrindarInfoDataSchema = z.object({
    informacionEncontrada: z.string(),
});
export type BrindarInfoData = z.infer<typeof BrindarInfoDataSchema>;