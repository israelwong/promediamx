// @/app/admin/_lib/actions/catalogo/catalogoImagenPortada.schemas.ts
import { z } from 'zod';

// Esquema para la respuesta exitosa de actualizarImagenPortadaCatalogo
export const ActualizarImagenPortadaDataSchema = z.object({
    imageUrl: z.string().url({ message: "La URL de la imagen de portada no es válida." }),
    // Opcional: podríamos devolver el tamaño del archivo si es útil para el cliente
    // fileSize: z.number().int().positive().optional(),
});
export type ActualizarImagenPortadaData = z.infer<typeof ActualizarImagenPortadaDataSchema>;

// No se necesita un esquema de datos específico para la respuesta de
// eliminarImagenPortadaCatalogo si solo devuelve success/error en ActionResult<void>.
