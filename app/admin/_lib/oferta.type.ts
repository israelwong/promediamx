
import { Oferta } from '@prisma/client';
export type EditarOfertaInput = Partial<Pick<
    Oferta,
    'nombre' | 'descripcion' | 'tipoOferta' | 'valor' | 'codigo' | 'fechaInicio' | 'fechaFin' | 'status' | 'condiciones' | 'linkPago'
>>;

// Tipo para el estado del formulario (sin cambios)
export type OfertaEditFormData = Partial<Omit<Oferta, 'id' | 'negocioId' | 'createdAt' | 'updatedAt' | 'negocio' | 'ItemCatalogoOferta' | 'OfertaGaleria'>> & {
    fechaInicio?: string | Date | null; // Acepta string o null
    fechaFin?: string | Date | null; // Ensure fechaFin is a string
    linkPago?: string | null; // Acepta string o null
};
