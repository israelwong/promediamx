'use server'
import prisma from './prismaClient'
import { Negocio } from './types'

export async function obtenerNegocios() {
    const negocios = await prisma.negocio.findMany({
        orderBy: {
            id: 'asc'
        }
    })
    return negocios
}

export async function obtenerNegocioCliente(clienteId: string) {
    const negocio = await prisma.negocio.findFirst({
        where: {
            clienteId: clienteId
        }
    })
    return negocio
}

export async function obtenerNegocio(negocioId: string) {
    const negocio = await prisma.negocio.findUnique({
        where: {
            id: negocioId
        }
    })
    return negocio
}


export async function actualizarNegocio(negocioId: string, negocio: Negocio) {

    const negocioActualizado = await prisma.negocio.update({
        where: {
            id: negocioId
        },
        data: {
            logo: negocio.logo,
            nombre: negocio.nombre,
            descripcion: negocio.descripcion,
            telefonoLlamadas: negocio.telefonoLlamadas,
            telefonoWhatsapp: negocio.telefonoWhatsapp,
            email: negocio.email,
            direccion: negocio.direccion,
            googleMaps: negocio.googleMaps,
            paginaWeb: negocio.paginaWeb,
            redesSociales: negocio.redesSociales,
            horarioAtencion: negocio.horarioAtencion,
            garantias: negocio.garantias,
            politicas: negocio.politicas,
            avisoPrivacidad: negocio.avisoPrivacidad,
            compentencia: negocio.compentencia,
            clienteIdeal: negocio.clienteIdeal,
            terminologia: negocio.terminologia,
            preguntasFrecuentes: negocio.preguntasFrecuentes,
            objeciones: negocio.objeciones,
            catalogoDescriptivo: negocio.catalogoDescriptivo,
            promocionesDescriptivas: negocio.promocionesDescriptivas,
            descuentosDescriptivos: negocio.descuentosDescriptivos,
            status: negocio.status
        }
    })
    return negocioActualizado
}

export async function generarPrompt(negocioId: string, palabrasClave: string) {
    const negocio = await prisma.negocio.findUnique({
        where: {
            id: negocioId
        }
    });
    if (!negocio) {
        throw new Error('Negocio no encontrado');
    }

    const keywords = palabrasClave
        ? palabrasClave.toLowerCase().split(',').map(k => k.trim())
        : null;
    const sections = [];

    if (!keywords || (keywords.includes('informacion_negocio'))) {
        sections.push(`Nombre del negocio: ${negocio.nombre}`);
        sections.push(`${negocio.descripcion}`);
    }

    const contacto = [];
    if (!keywords || (keywords.includes('contacto_negocio') || keywords.includes('contacto'))) {
        if (negocio.telefonoLlamadas && negocio.telefonoLlamadas.trim() !== '') {
            contacto.push(`- **Teléfono de Llamadas:** ${negocio.telefonoLlamadas}`);
        }
        if (negocio.telefonoWhatsapp && negocio.telefonoWhatsapp.trim() !== '') {
            contacto.push(`- **Teléfono de WhatsApp:** ${negocio.telefonoWhatsapp}`);
        }
        if (negocio.email && negocio.email.trim() !== '') {
            contacto.push(`- **Email:** ${negocio.email}`);
        }
        if (negocio.horarioAtencion && negocio.horarioAtencion.trim() !== '') {
            contacto.push(`- **Horario de Atención:**\n${negocio.horarioAtencion}`);
        }
        if (negocio.direccion && negocio.direccion.trim() !== '') {
            contacto.push(`- **Dirección:** ${negocio.direccion}`);
        }
        if (negocio.googleMaps && negocio.googleMaps.trim() !== '') {
            contacto.push(`- **Google Maps:** ${negocio.googleMaps}`);
        }
    }
    if (contacto.length > 0) {
        sections.push(`## Contacto\n${contacto.join('\n')}`);
    }

    const presenciaEnLinea = [];
    if (!keywords || (negocio.paginaWeb && (keywords.includes('pagina_web') || keywords.includes('pagina') || keywords.includes('web') || keywords.includes('sitio web') || keywords.includes('internet')))) {
        presenciaEnLinea.push(`- **Página Web:** ${negocio.paginaWeb}`);
    }
    if (!keywords || (negocio.redesSociales && (keywords.includes('redes_sociales') || keywords.includes('facebook') || keywords.includes('instagram') || keywords.includes('linkedin') || keywords.includes('youtube') || keywords.includes('tiktok')))) {
        presenciaEnLinea.push(`- **Redes Sociales:** ${negocio.redesSociales}`);
    }
    if (presenciaEnLinea.length > 0) {
        sections.push(`## Presencia en Línea\n${presenciaEnLinea.join('\n')}`);
    }

    const informacionAdicional = [];
    if (!keywords || (negocio.garantias && (keywords.includes('garantias') || keywords.includes('garantia')))) {
        if (negocio.garantias && negocio.garantias.trim() !== '') {
            informacionAdicional.push(`- **Garantías:** ${negocio.garantias}`);
        }
    }
    if (!keywords || (negocio.politicas && (keywords.includes('politicas') || keywords.includes('política') || keywords.includes('devolucion')))) {
        if (negocio.politicas && negocio.politicas.trim() !== '') {
            informacionAdicional.push(`- **Políticas:** ${negocio.politicas}`);
        }
    }
    if (!keywords || (negocio.catalogoDescriptivo && (keywords.includes('catalogo_descriptivo') || keywords.includes('catálogo') || keywords.includes('descriptivo')))) {
        if (negocio.catalogoDescriptivo && negocio.catalogoDescriptivo.trim() !== '') {
            informacionAdicional.push(`- **Catálogo Descriptivo:** ${negocio.catalogoDescriptivo}`);
        }
    }
    if (!keywords || (negocio.promocionesDescriptivas && (keywords.includes('informacion_promocion') || keywords.includes('promociones') || keywords.includes('descriptivas')))) {
        if (negocio.promocionesDescriptivas && negocio.promocionesDescriptivas.trim() !== '') {
            informacionAdicional.push(`- **Promociones Descriptivas:** ${negocio.promocionesDescriptivas}`);
        }
    }
    if (!keywords || (negocio.descuentosDescriptivos && (keywords.includes('informacion_descuentos') || keywords.includes('descuentos') || keywords.includes('descriptivos')))) {
        if (negocio.descuentosDescriptivos && negocio.descuentosDescriptivos.trim() !== '') {
            informacionAdicional.push(`- **Descuentos Descriptivos:** ${negocio.descuentosDescriptivos}`);
        }
    }
    if (informacionAdicional.length > 0) {
        sections.push(`## Información Adicional\n${informacionAdicional.join('\n')}`);
    }

    const analisisEstrategia = [];
    if (!keywords || (negocio.compentencia && (keywords.includes('competencia') || keywords.includes('comparación') || keywords.includes('comparativa')))) {
        analisisEstrategia.push(`- **Competencia:** ${negocio.compentencia}`);
    }
    if (negocio.clienteIdeal && negocio.clienteIdeal.trim() !== '') {
        analisisEstrategia.push(`- **Cliente Ideal:** ${negocio.clienteIdeal}`);
    }

    if (negocio.terminologia && negocio.terminologia.trim() !== '') {
        analisisEstrategia.push(`- **Terminología Especializada:** ${negocio.terminologia}`);
    }

    if (!keywords || (negocio.preguntasFrecuentes && keywords.includes('preguntas_frecuentes'))) {
        analisisEstrategia.push(`- **Preguntas Frecuentes:** ${negocio.preguntasFrecuentes}`);
    }
    if (!keywords || (negocio.objeciones && (keywords.includes('objeciones') || keywords.includes('queja')))) {
        analisisEstrategia.push(`- **Objeciones Comunes:** ${negocio.objeciones}`);
    }
    if (analisisEstrategia.length > 0) {
        sections.push(`## Análisis y Estrategia\n${analisisEstrategia.join('\n')}`);
    }

    sections.push(`## Palabras Clave Mapeadas\n${keywords ? keywords.join(', ') : 'No se proporcionaron palabras clave'}`);

    return sections.join('\n\n');
}