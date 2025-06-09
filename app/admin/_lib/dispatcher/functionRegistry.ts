// Propuesta para: app/admin/_lib/dispatcher/functionRegistry.ts
import type { FunctionExecutor } from './dispatcher.types'; // Asegúrate que la ruta a tus tipos sea correcta

// --- Funciones de Ofertas ---
import { ejecutarMostrarOfertasAction } from '../funciones/ofertas/mostrarOfertas/mostrarOfertas.actions';
import { ejecutarMostrarDetalleOfertaAction } from '../funciones/ofertas/mostrarDetalleOferta/mostrarDetalleOferta.actions';
import { ejecutarAceptarOfertaAction } from '../funciones/ofertas/aceptarOferta/aceptarOferta.actions';
import { ejecutarResponderPreguntaSobreOfertaAction } from '../funciones/ofertas/responderPreguntaSobreOferta/responderPreguntaSobreOferta.actions';

// --- Funciones de Pagos ---
import { ejecutarProcesarPagoConStripeAction } from '../funciones/pagos/procesarPagoConStripe/procesarPagoConStripe.actions';

// --- Funciones de Citas ---
import { ejecutarAgendarCitaActionV3 } from '../funciones/citas/agendarCita/agendarCita.actions';
import { ejecutarConfirmarCitaAction } from '../funciones/citas/confirmarCita/confirmarCita.actions';
import { ejecutarCancelarCitaAction } from '../funciones/citas/cancelarCita/cancelarCita.actions';
import { ejecutarConfirmarCancelacionCitaAction } from '../funciones/citas/confirmarCancelacionCita/confirmarCancelacionCita.actions';
// import { ejecutarCancelarCitaAction } from '../funciones/citas/cancelarCita/cancelarCita.actions';
// import { ejecutarListarHorariosDisponiblesAction } from '../funciones/citas/listarHorariosDisponiblesAgenda/listarHorariosDisponiblesAgenda.actions';

// import { ejecutarListarServiciosAgendaAction } from '../funciones/citas/listarServiciosAgenda/listarServiciosAgenda.actions';
// import { ejecutarReagendarCitaAction } from '../funciones/citas/reagendarCita/reagendarCita.actions';

// --- Funciones de Informes ---
// import { ejecutarBrindarInfoNegocioAction } from '../funciones/informes/brindarInformacionDelNegocio/brindarInformacionDelNegocio.actions';
// import { ejecutarDarDireccionAction } from '../funciones/informes/darDireccionYUbicacion/darDireccionYUbicacion.actions';
// import { ejecutarInformarHorarioAction } from '../funciones/informes/informarHorarioDeAtencion/informarHorarioDeAtencion.actions';

export const functionRegistry: Record<string, FunctionExecutor> = {
    // --- Ofertas ---
    'mostrarOfertas': ejecutarMostrarOfertasAction,
    'mostrarDetalleOferta': ejecutarMostrarDetalleOfertaAction,
    'aceptarOferta': ejecutarAceptarOfertaAction,
    'responderPreguntaSobreOferta': ejecutarResponderPreguntaSobreOfertaAction,

    // --- Pagos ---
    'procesarPagoConStripe': ejecutarProcesarPagoConStripeAction,

    // --- Citas ---
    'agendarCita': ejecutarAgendarCitaActionV3,
    'confirmarCita': ejecutarConfirmarCitaAction,
    'cancelarCita': ejecutarCancelarCitaAction,
    'confirmarCancelacionCita': ejecutarConfirmarCancelacionCitaAction,
    // 'listarHorariosDisponiblesAgenda': ejecutarListarHorariosDisponiblesAction,
    // 'cancelarCita': ejecutarCancelarCitaAction,
    // 'listarServiciosAgenda': ejecutarListarServiciosAgendaAction,
    // 'reagendarCita': ejecutarReagendarCitaAction,

    // --- Informes ---
    // 'brindarInformacionDelNegocio': ejecutarBrindarInfoNegocioAction,
    // 'darDireccionYUbicacion': ejecutarDarDireccionAction,
    // 'informarHorarioDeAtencion': ejecutarInformarHorarioAction,


    // ...Añade aquí cualquier otra función a medida que la implementes o refactorices...
};