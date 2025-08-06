import { cookies } from 'next/headers';
import { verifyToken } from '@/app/agente/_lib/actions/auth.actions';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/app/admin/_lib/prismaClient';
import LeadForm from './components/LeadForm';
import { Metadata } from 'next';
import type { Lead, Agenda, CanalAdquisicion } from '@prisma/client';
import { obtenerHistorialLeadAction } from '@/app/admin/_lib/actions/bitacora/bitacora.actions';
import { obtenerCanalesPorCrmAction } from '@/app/admin/_lib/actions/canales/canales.actions';
import { obtenerConfiguracionAgendaAction } from '@/app/admin/_lib/actions/agendaConfiguracion/agendaConfiguracion.actions';
import { HistorialItem } from './components/HistorialYNotas';

interface EditLeadPageProps {
    leadId: string;
}

export const metadata: Metadata = {
    title: 'Editar/Crear Prospecto',
    description: 'Formulario para editar o crear un prospecto',
};

// --- CORRECCIÓN 1: Tipar `params` como una Promesa ---
export default async function PaginaEditarCrearProspectoAgente({ params }: { params: Promise<EditLeadPageProps> }) {

    // --- CORRECCIÓN 2: Resolver la promesa `params` con `await` ---
    const resolvedParams = await params;

    // Ahora usamos resolvedParams.leadId en todo el componente
    const isNewLead = resolvedParams.leadId === 'nuevo';

    // 1. Verificar sesión del agente
    const tokenCookie = (await cookies()).get('auth_token');
    if (!tokenCookie) { redirect('/agente/login'); }

    const verificationResult = await verifyToken(tokenCookie.value);
    if (!verificationResult.success || !verificationResult.payload) { redirect('/agente/login'); }

    const agenteSession = verificationResult.payload;

    // 2. Obtener los datos de contexto
    const agenteCompleto = await prisma.agente.findUnique({
        where: { id: agenteSession.id },
        include: {
            crm: {
                include: {
                    negocio: { select: { clienteId: true, agendaTipoCita: { where: { activo: true }, orderBy: { orden: 'asc' } } } },
                    Pipeline: { orderBy: { orden: 'asc' } },
                    Etiqueta: { orderBy: { orden: 'asc' } },
                }
            },
            ofertasAsignadas: { select: { oferta: { select: { nombre: true } } } }
        }
    });

    if (!agenteCompleto?.crm || !agenteCompleto.crm.negocio?.clienteId) {
        return notFound();
    }

    const ofertasDisponiblesParaAgente = agenteCompleto.ofertasAsignadas.map(oa => oa.oferta.nombre);

    const crmData = agenteCompleto.crm;
    const [canalesResult, configAgendaResult] = await Promise.all([
        obtenerCanalesPorCrmAction(crmData.id),
        obtenerConfiguracionAgendaAction(crmData.negocioId)
    ]);

    const canalesDeAdquisicion = canalesResult.success ? (canalesResult.data as CanalAdquisicion[]) : [];
    const configuracionAgenda = configAgendaResult.success ? configAgendaResult.data : { horarios: [], excepciones: [] };

    // 3. Obtener datos específicos del Lead si estamos en modo "Editar"
    let leadData: (Lead & { Agenda: Agenda[], Etiquetas: { etiquetaId: string }[] }) | null = null;
    let historialItems: HistorialItem[] = [];

    if (!isNewLead) {
        const [leadResult, historialResult] = await Promise.all([
            prisma.lead.findUnique({
                // --- CORRECCIÓN 3: Usar el parámetro resuelto ---
                where: { id: resolvedParams.leadId },
                include: {
                    Agenda: { where: { status: 'PENDIENTE' } },
                    Etiquetas: { select: { etiquetaId: true } }
                }
            }),
            // --- CORRECCIÓN 4: Usar el parámetro resuelto ---
            obtenerHistorialLeadAction({ leadId: resolvedParams.leadId })
        ]);

        if (!leadResult) return notFound();
        leadData = leadResult;
        historialItems = historialResult.success ? (historialResult.data as HistorialItem[]) : [];

        // Chequeo de seguridad
        const leadColegio = (leadData.jsonParams as { colegio?: string })?.colegio;
        const ofertasDelAgente = new Set(agenteCompleto.ofertasAsignadas.map(oa => oa.oferta.nombre));
        if (!leadColegio || !ofertasDelAgente.has(leadColegio)) {
            return <div className="p-8 text-center"><h1 className="text-2xl font-bold text-red-500">Acceso Denegado</h1><p className="text-zinc-400 mt-2">No tienes permiso para ver este prospecto.</p></div>;
        }
    }

    const safeHistorialItems = historialItems.map(item => ({
        ...item,
        agente: {
            nombre: item.agente?.nombre ?? 'Desconocido'
        }
    }));

    return (
        <LeadForm
            clienteId={crmData.negocio.clienteId ?? ''}
            negocioId={crmData.negocioId}
            crmId={crmData.id}
            initialLeadData={leadData || undefined}
            etapasPipeline={crmData.Pipeline}
            etiquetasDisponibles={crmData.Etiqueta}
            tiposDeCita={crmData.negocio.agendaTipoCita}
            agenteId={agenteSession.id}
            canalesDeAdquisicion={canalesDeAdquisicion}
            historialItems={safeHistorialItems}
            configuracionAgenda={configuracionAgenda}
            ofertasDisponiblesParaAgente={ofertasDisponiblesParaAgente}
        />
    );
}