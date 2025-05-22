import { Prisma } from '@prisma/client';
import {
    TareaCapacidadIA,
    ParametroParaIA,
} from '@/app/admin/_lib/ia/ia.schemas'; // Asegúrate de que la ruta sea correcta


export async function obtenerTareasCapacidadParaAsistente(
    asistenteId: string,
    tx: Prisma.TransactionClient // Prisma Client o Transaction Client
): Promise<TareaCapacidadIA[]> {
    const suscripcionesTareas = await tx.asistenteTareaSuscripcion.findMany({
        where: {
            asistenteVirtualId: asistenteId,
            status: 'activo',
            tarea: { status: 'activo' },
        },
        include: {
            tarea: {
                include: {
                    tareaFuncion: {
                        include: {
                            parametros: true, // <-- CAMBIO: Incluir la relación directa 'parametros'
                        },
                    },
                    // Mantener si TareaCampoPersonalizado sigue vigente y se usa:
                    camposPersonalizadosRequeridos: {
                        include: { crmCampoPersonalizado: true },
                    },
                },
            },
        },
    });

    const tareasCapacidad: TareaCapacidadIA[] = [];

    for (const suscripcion of suscripcionesTareas) {
        const tareaDb = suscripcion.tarea;
        if (!tareaDb) continue;

        let funcionHerramienta: TareaCapacidadIA['funcionHerramienta'] = null;
        if (tareaDb.tareaFuncion) {
            const tf = tareaDb.tareaFuncion; // Alias para TareaFuncion

            // Mapear los nuevos TareaFuncionParametro a ParametroParaIA
            const parametrosFuncion: ParametroParaIA[] = tf.parametros.map(p => {
                // 'p' aquí es un objeto TareaFuncionParametro
                return {
                    nombre: p.nombre, // Este es el nombre snake_case para la IA
                    tipo: p.tipoDato,
                    descripcion: p.descripcionParaIA, // Descripción específica para la IA
                    esObligatorio: p.esObligatorio,
                };
            });

            funcionHerramienta = {
                nombre: tf.nombre ?? '', // <-- CAMBIO: Usar el campo 'nombre' (camelCase) y asegurar que sea string
                descripcion: tf.descripcion, // Descripción interna del admin (usada como fallback en construirHerramientasParaGemini)
                parametros: parametrosFuncion,
            };
        }

        // Mapeo de campos personalizados (sin cambios si la lógica se mantiene)
        const camposPersonalizadosTarea: ParametroParaIA[] = tareaDb.camposPersonalizadosRequeridos
            .filter(cp => cp.crmCampoPersonalizado)
            .map(cp => {
                const nombreCampo = (cp.crmCampoPersonalizado.nombreCampo ?? cp.crmCampoPersonalizado.nombre) ?? '';
                if (nombreCampo === '') {
                    console.warn(`[obtenerTareasCapacidad] Campo Personalizado con ID ${cp.crmCampoPersonalizado.id} no tiene nombreCampo ni nombre.`);
                }
                return {
                    nombre: nombreCampo,
                    tipo: cp.crmCampoPersonalizado.tipo,
                    // Usar crmCampoPersonalizado.descripcionParaIA si existe, o crmCampoPersonalizado.nombre como fallback
                    descripcion: cp.crmCampoPersonalizado.descripcionParaIA || cp.crmCampoPersonalizado.nombre,
                    esObligatorio: cp.esRequerido,
                };
            });

        tareasCapacidad.push({
            id: tareaDb.id,
            nombre: tareaDb.nombre, // Nombre de la Tarea
            descripcionTool: tareaDb.descripcionTool, // <-- CAMBIO: Usar el campo Tarea.descripcionTool
            instruccionParaIA: tareaDb.instruccion, // <-- CAMBIO: Usar el campo Tarea.instruccion
            funcionHerramienta: funcionHerramienta,
            camposPersonalizadosRequeridos: camposPersonalizadosTarea.length > 0 ? camposPersonalizadosTarea : undefined,
        });
    }
    return tareasCapacidad;
}