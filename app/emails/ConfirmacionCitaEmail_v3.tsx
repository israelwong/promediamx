// app/emails/ConfirmacionCitaEmail_v3.tsx

import React from 'react';
import {
    Html, Body, Head, Heading, Container, Text, Section, Button, Hr, Img, Preview,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

// ✅ Props para la plantilla v3, sin los links de reagendar/cancelar
interface ConfirmacionCitaEmail_v3_Props {
    nombreDestinatario: string;
    nombreNegocio: string;
    logoNegocioUrl?: string;
    nombreServicio: string;
    nombreOferta: string;
    fechaHoraCita: Date;
    detallesAdicionales?: string;
    modalidadCita?: 'presencial' | 'virtual';
    ubicacionCita?: string | null;
    googleMapsUrl?: string | null;
    linkReunionVirtual?: string | null;
    duracionCitaMinutos?: number | null;
    nombrePersonaContacto?: string | null;
    telefonoContacto?: string | null;
    emailCopia?: string | null;
}

// ✅ Helper para formatear el número de teléfono
const formatPhoneNumber = (phone: string | null | undefined): string | null => {
    if (!phone) return null;
    const cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.length === 10) {
        const match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
    }
    return phone;
};


export const ConfirmacionCitaEmail_v3: React.FC<ConfirmacionCitaEmail_v3_Props> = (props) => {
    const {
        nombreDestinatario,
        nombreNegocio,
        logoNegocioUrl,
        nombreServicio,
        nombreOferta,
        fechaHoraCita,
        detallesAdicionales,
        modalidadCita,
        ubicacionCita,
        googleMapsUrl,
        linkReunionVirtual,
        duracionCitaMinutos,
        nombrePersonaContacto,
        telefonoContacto,
    } = props;

    const fechaFormateada = new Date(fechaHoraCita).toLocaleString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: 'America/Mexico_City',
    });

    const telefonoFormateado = formatPhoneNumber(telefonoContacto);
    const previewText = `Cita confirmada para ${nombreDestinatario} en ${nombreOferta}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-gray-100 font-sans">
                    <Container className="bg-white mx-auto my-10 p-8 rounded-lg shadow-md max-w-xl border border-gray-200">

                        {logoNegocioUrl && (
                            <Section className="text-center">
                                <Img src={logoNegocioUrl} alt={`Logo de ${nombreNegocio}`} width="120" className="mx-auto" />
                            </Section>
                        )}

                        <Heading className="text-2xl font-bold text-gray-800 text-center mt-6">
                            ¡Tu Cita está Confirmada!
                        </Heading>

                        <Text className="text-gray-700 text-base leading-relaxed mt-4">
                            Hola, {nombreDestinatario},
                        </Text>
                        <Text className="text-gray-700 text-base leading-relaxed">
                            Te confirmamos que tu cita para **{nombreServicio}** (parte de la oferta **{nombreOferta}**) en **{nombreNegocio}** ha sido agendada con éxito.
                        </Text>

                        <Section className="bg-gray-50 my-6 p-6 rounded-md border border-gray-200">
                            <Heading as="h2" className="text-lg font-medium text-gray-800 mt-0 mb-4">
                                Detalles de tu Cita:
                            </Heading>

                            <Text className="text-gray-800 m-0"><strong>Servicio:</strong> {nombreServicio}</Text>

                            {detallesAdicionales && (
                                <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: detallesAdicionales }} />
                            )}

                            <Hr className="border-gray-200 my-3" />
                            <Text className="text-gray-800 m-0"><strong>Fecha y Hora:</strong> {fechaFormateada}</Text>

                            {duracionCitaMinutos && (
                                <><Hr className="border-gray-200 my-3" /><Text className="text-gray-800 m-0"><strong>Duración Estimada:</strong> {duracionCitaMinutos} minutos</Text></>
                            )}

                            {nombrePersonaContacto && (
                                <><Hr className="border-gray-200 my-3" /><Text className="text-gray-800 m-0"><strong>Te atenderá:</strong> {nombrePersonaContacto}</Text></>
                            )}

                            {telefonoFormateado && (
                                <><Hr className="border-gray-200 my-3" /><Text className="text-gray-800 m-0"><strong>Teléfono de Contacto:</strong> {telefonoFormateado}</Text></>
                            )}

                            {modalidadCita === 'presencial' && ubicacionCita && (
                                <><Hr className="border-gray-200 my-3" /><Text className="text-gray-800 m-0"><strong>Ubicación:</strong> {ubicacionCita}</Text></>
                            )}
                            {modalidadCita === 'virtual' && (
                                <><Hr className="border-gray-200 my-3" /><Text className="text-gray-800 m-0"><strong>Modalidad:</strong> Reunión Virtual</Text></>
                            )}
                        </Section>

                        <Section className="text-center mt-8 mb-4">
                            {modalidadCita === 'virtual' && linkReunionVirtual && (
                                <Button href={linkReunionVirtual} className="bg-green-600 text-white font-semibold px-6 py-3 rounded-md mr-2">
                                    Unirse a la Reunión
                                </Button>
                            )}
                            {modalidadCita === 'presencial' && googleMapsUrl && (
                                <Button href={googleMapsUrl} className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-md mr-2">
                                    Ver en Mapa
                                </Button>
                            )}
                        </Section>

                        {/* ❌ SECCIÓN DE BOTONES DE CAMBIOS ELIMINADA */}

                        <Hr className="border-gray-200 my-8" />

                        <Text className="text-xs text-gray-400 text-center">
                            Este es un correo automático. Si tienes alguna duda, por favor, contacta directamente con {nombreNegocio}.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default ConfirmacionCitaEmail_v3;
