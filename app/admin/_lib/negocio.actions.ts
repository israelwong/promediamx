'use server'
import prisma from './prismaClient'
import { Negocio, AsistenteVirtual } from './types'; // Ajusta ruta a tus tipos
import { Prisma } from '@prisma/client';

interface AsistenteTareaSuscripcion {
    montoSuscripcion: number;
    status: 'activo' | 'inactivo';
}

// Tipo para los datos de entrada de la acción
type CrearNegocioData = Pick<Negocio, 'nombre'> & {
    clienteId: string;
    descripcion?: string | null;
};

// --- Acción para Crear Negocio y su CRM inicial ---
export async function crearNegocio(
    data: CrearNegocioData
): Promise<{ success: boolean; data?: Negocio; error?: string }> {

    if (!data.clienteId) {
        return { success: false, error: "El ID del cliente es obligatorio." };
    }
    if (!data.nombre?.trim()) {
        return { success: false, error: "El nombre del negocio es obligatorio." };
    }

    try {
        // Usar una transacción para asegurar que todo se cree o nada
        const nuevoNegocioConCRM = await prisma.$transaction(async (tx) => {
            // 1. Crear el Negocio
            const nuevoNegocio = await tx.negocio.create({
                data: {
                    clienteId: data.clienteId,
                    nombre: data.nombre.trim(),
                    descripcion: data.descripcion?.trim() || null,
                    status: 'activo', // Status inicial por defecto
                    // Otros campos con valores por defecto si los tienes
                },
            });

            // 2. Crear el CRM asociado al nuevo Negocio
            const nuevoCRM = await tx.cRM.create({
                data: {
                    negocioId: nuevoNegocio.id, // Usar el ID del negocio recién creado
                    status: 'activo',
                },
            });

            // 3. Poblar Canales por defecto para el nuevo CRM
            const canalesDefault = [
                { nombre: 'WhatsApp', orden: 1 },
                { nombre: 'Facebook Lead Form', orden: 2 },
                { nombre: 'Instagram', orden: 3 },
                { nombre: 'Landing Page Form', orden: 4 },
                { nombre: 'Directo', orden: 5 },
                { nombre: 'Referido', orden: 6 },
            ];
            await tx.canalCRM.createMany({
                data: canalesDefault.map(c => ({ ...c, crmId: nuevoCRM.id })),
            });

            // 4. Poblar Pipeline por defecto para el nuevo CRM
            const pipelineDefault = [
                { nombre: 'Nuevo', orden: 1 },
                { nombre: 'Seguimiento', orden: 2 },
                { nombre: 'Propuesta', orden: 3 }, // Añadir más etapas si quieres
                { nombre: 'Negociación', orden: 4 },
                { nombre: 'Ganado', orden: 5 },
                { nombre: 'Perdido', orden: 6 },
            ];
            await tx.pipelineCRM.createMany({
                data: pipelineDefault.map(p => ({ ...p, crmId: nuevoCRM.id })),
            });

            // 5. Poblar Etiquetas por defecto para el nuevo CRM
            const etiquetasDefault = [
                { nombre: 'Muy Interesado', color: '#10b981', orden: 1 }, // Emerald-500
                { nombre: 'Interesado', color: '#3b82f6', orden: 2 }, // Blue-500
                { nombre: 'Poco Interesado', color: '#f97316', orden: 3 }, // Orange-500
                { nombre: 'No Interesado', color: '#64748b', orden: 4 }, // Slate-500
                { nombre: 'Seguimiento Posterior', color: '#a855f7', orden: 5 }, // Purple-500
            ];
            await tx.etiquetaCRM.createMany({
                data: etiquetasDefault.map(e => ({ ...e, crmId: nuevoCRM.id })),
            });

            // Devolver el negocio creado (sin relaciones complejas si no se necesitan aquí)
            return nuevoNegocio;
        });

        return { success: true, data: nuevoNegocioConCRM as Negocio };

    } catch (error: unknown) {
        console.error('Error creating negocio and initial CRM setup:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Podría ser un nombre de negocio duplicado si tienes esa restricción
            return { success: false, error: `Ya existe un registro con un valor único proporcionado.` };
        }
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred during creation' };
    }
}

export async function obtenerNegocios() {
    const negocios = await prisma.negocio.findMany({
        orderBy: {
            id: 'asc'
        },
        include: {
            cliente: {
                select: {
                    nombre: true
                }
            },
            AsistenteVirtual: {
                select: {
                    id: true,
                    nombre: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    phoneNumberId: true,
                    version: true,
                }
            }
        }
    })
    return negocios
}

export async function obtenerNegociosPorClienteId(clienteId: string) {
    const negocios = await prisma.negocio.findMany({
        where: {
            clienteId: clienteId
        },
        orderBy: {
            id: 'asc'
        },
        include: {
            cliente: {
                select: {
                    id: true,
                    nombre: true,
                    email: true, // Hacer opcional y único
                    telefono: true, // Hacer opcional
                    rfc: true,
                    curp: true,
                    razonSocial: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    stripeCustomerId: true // ID de Cliente en Stripe
                }
            },
            AsistenteVirtual: {
                select: {
                    id: true,
                    nombre: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    phoneNumberId: true,
                    version: true,
                }
            },
            Catalogo: {
                select: {
                    id: true,
                    descripcion: true,
                    precio: true
                }
            }
        }
    })
    return negocios
}

export async function obtenerNegocioPorId(negocioId: string) {

    const crmExistente = await prisma.cRM.findFirst({
        where: {
            negocioId: negocioId
        }
    });

    if (!crmExistente) {
        await prisma.cRM.create({
            data: {
                negocioId: negocioId
            }
        });
    }

    const negocio = await prisma.negocio.findUnique({
        where: {
            id: negocioId
        },
        include: {
            cliente: {
                select: {
                    id: true,
                    nombre: true
                }
            },
            AsistenteVirtual: {
                select: {
                    id: true,
                    nombre: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    phoneNumberId: true,
                    version: true,
                }
            },
            CRM: {
                select: {
                    id: true
                }
            },
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
            status: negocio.status ?? undefined,
            clienteId: negocio.clienteId,
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

export async function eliminarNegocio(negocioId: string) {
    const negocioEliminado = await prisma.negocio.delete({
        where: {
            id: negocioId
        }
    });
    return negocioEliminado;
}

// Interfaz extendida para el resultado de la acción
export interface NegocioHeaderData extends Omit<Negocio, 'AsistenteVirtual'> {
    // Campos adicionales que podrías añadir al modelo Negocio
    suscripcionStatus?: 'activa' | 'inactiva' | 'prueba' | 'cancelada' | null;
    estadoPago?: 'pagado' | 'pendiente' | 'vencido' | null;
    fechaProximoPago?: Date | null;
    // Incluir asistentes con datos necesarios para cálculo
    AsistenteVirtual?: (Pick<AsistenteVirtual, 'id' | 'precioBase' | 'nombre' | 'version'> & {
        AsistenteTareaSuscripcion?: Pick<AsistenteTareaSuscripcion, 'montoSuscripcion' | 'status'>[];
    })[];
}

export async function obtenerDatosHeaderNegocio(negocioId: string): Promise<NegocioHeaderData | null> {
    if (!negocioId) return null;
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            include: {
                // Incluir asistentes
                AsistenteVirtual: {
                    select: {
                        id: true,
                        precioBase: true, // Asegúrate que este campo exista
                        nombre: true, // Include 'nombre' to match NegocioHeaderData
                        version: true, // Include 'version' to match NegocioHeaderData
                        // Incluir solo suscripciones activas y con monto para cálculo
                        AsistenteTareaSuscripcion: {
                            where: {
                                status: 'activo', // Solo suscripciones activas
                                montoSuscripcion: {
                                    gt: 0 // Solo las que tienen costo > 0
                                }
                            },
                            select: {
                                montoSuscripcion: true,
                                status: true, // Necesario para el where, aunque se filtre
                            }
                        }
                    }
                },
                // Incluir cliente si necesitas mostrar el nombre
                cliente: {
                    select: { nombre: true }
                }
                // Seleccionar los nuevos campos de suscripción/pago
                // Ejemplo: Asegúrate que estos campos existan en tu schema Negocio
                // suscripcionStatus: true,
                // estadoPago: true,
                // fechaProximoPago: true,
            }
        });

        // Simular campos de suscripción si no existen en el modelo aún
        (negocio as unknown as NegocioHeaderData).estadoPago = 'pagado'; // Placeholder ('vencido' para probar botón)
        (negocio as NegocioHeaderData).suscripcionStatus = 'activa'; // Placeholder
        (negocio as NegocioHeaderData).estadoPago = 'pagado'; // Placeholder ('vencido' para probar botón)
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        (negocio as NegocioHeaderData).fechaProximoPago = nextMonth; // Placeholder

        return negocio as NegocioHeaderData;

    } catch (error) {
        console.error(`Error fetching header data for negocio ${negocioId}:`, error);
        throw new Error("Error al obtener datos de la cabecera del negocio.");
    }
}

// Interfaz extendida para el resultado
export interface NegocioConDetalles extends Negocio {
    _count?: {
        AsistenteVirtual?: number;
        Catalogo?: number;
    };
    // Incluir asistentes con datos para cálculo de precio
    AsistenteVirtual?: (AsistenteVirtual & {
        precioBase?: number | null;
        AsistenteTareaSuscripcion?: Pick<AsistenteTareaSuscripcion, 'montoSuscripcion' | 'status'>[];
    })[];
}

export async function obtenerNegociosPorClienteIdConDetalles(clienteId: string): Promise<NegocioConDetalles[]> {
    if (!clienteId) return [];
    try {
        const negocios = await prisma.negocio.findMany({
            where: { clienteId: clienteId },
            orderBy: { nombre: 'asc' },
            select: {
                id: true,
                nombre: true,
                status: true, // Incluir status del negocio si quieres mostrarlo
                // Conteo de relaciones
                _count: {
                    select: {
                        AsistenteVirtual: true, // Contar asistentes
                        Catalogo: true,         // Contar catálogos
                    },
                },
                // Datos necesarios para calcular precio total del negocio
                AsistenteVirtual: {
                    where: { status: 'activo' }, // O considerar todos los asistentes?
                    select: {
                        id: true,
                        precioBase: true, // ¡Necesario!
                        status: true,
                        AsistenteTareaSuscripcion: {
                            where: { status: 'activo' }, // Solo suscripciones activas
                            select: {
                                montoSuscripcion: true, // ¡Necesario!
                                status: true,
                            }
                        }
                    }
                }
            }
        });
        return negocios as NegocioConDetalles[];
    } catch (error) {
        console.error(`Error fetching negocios for cliente ${clienteId}:`, error);
        throw new Error("Error al obtener los negocios del cliente.");
    }
}