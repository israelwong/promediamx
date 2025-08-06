// app/admin/_lib/actions/canales/canales.schemas.ts
import { z } from 'zod';

export const CanalCRMSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    crmId: z.string().cuid(),
    status: z.string(),
});

export const UpsertCanalCRMSchema = CanalCRMSchema.omit({ id: true, status: true });