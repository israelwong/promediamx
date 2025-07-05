import React from 'react';
import {
    Html,
    Body,
    Head,
    Heading,
    Container,
    Text,
    Section,
    Button,
    Hr,
    Img,
    Preview,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

// Las props coinciden 100% con nuestro schema final y el llamado desde el handler
interface ConfirmacionCitaEmailProps {
    nombreDestinatario: string;
    nombreNegocio: string;
    logoNegocioUrl?: string;
    nombreServicio: string;
    fechaHoraCita: Date;
    detallesAdicionales?: string; // Recibirá un string de HTML con los campos
    modalidadCita?: 'presencial' | 'virtual';
    ubicacionCita?: string;
    googleMapsUrl?: string;
    linkReunionVirtual?: string;
    linkCancelar?: string;
    linkReagendar?: string;
    duracionCitaMinutos?: number;
}

export const ConfirmacionCitaEmail: React.FC<ConfirmacionCitaEmailProps> = (props) => {
    const {
        nombreDestinatario,
        nombreNegocio,
        logoNegocioUrl,
        nombreServicio,
        fechaHoraCita,
        detallesAdicionales,
        modalidadCita,
        ubicacionCita,
        googleMapsUrl,
        linkReunionVirtual,
        linkCancelar,
        linkReagendar,
        duracionCitaMinutos,
    } = props;

    const fechaFormateada = new Date(fechaHoraCita).toLocaleString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Mexico_City', // Asegúrate que coincida con tu lógica de negocio
    });

    const previewText = `Confirmación de tu cita para ${nombreServicio} en ${nombreNegocio}`;

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
                            Te confirmamos que tu cita para **{nombreServicio}** en **{nombreNegocio}** ha sido agendada con éxito.
                        </Text>

                        <Section className="bg-gray-50 my-6 p-6 rounded-md border border-gray-200">
                            <Heading as="h2" className="text-lg font-medium text-gray-800 mt-0 mb-4">
                                Detalles de tu Cita:
                            </Heading>

                            <Text className="text-gray-800 m-0"><strong>Servicio:</strong> {nombreServicio}</Text>

                            {/* Renderiza los campos personalizados como HTML */}
                            {detallesAdicionales && (
                                <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: detallesAdicionales }} />
                            )}

                            <Hr className="border-gray-200 my-3" />
                            <Text className="text-gray-800 m-0"><strong>Fecha y Hora:</strong> {fechaFormateada}</Text>

                            {duracionCitaMinutos && (
                                <>
                                    <Hr className="border-gray-200 my-3" />
                                    <Text className="text-gray-800 m-0"><strong>Duración Estimada:</strong> {duracionCitaMinutos} minutos</Text>
                                </>
                            )}

                            {modalidadCita === 'presencial' && ubicacionCita && (
                                <>
                                    <Hr className="border-gray-200 my-3" />
                                    <Text className="text-gray-800 m-0"><strong>Ubicación:</strong> {ubicacionCita}</Text>
                                </>
                            )}

                            {modalidadCita === 'virtual' && (
                                <>
                                    <Hr className="border-gray-200 my-3" />
                                    <Text className="text-gray-800 m-0"><strong>Modalidad:</strong> Reunión Virtual</Text>
                                </>
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

                        <Text className="text-gray-600 text-base leading-relaxed text-center">
                            ¿Necesitas hacer cambios?
                        </Text>

                        <Section className="text-center">
                            {linkReagendar && (
                                <Button href={linkReagendar} className="bg-gray-500 text-white font-semibold px-5 py-2 rounded-md mr-2">
                                    Reagendar
                                </Button>
                            )}
                            {linkCancelar && (
                                <Button href={linkCancelar} className="bg-red-600 text-white font-semibold px-5 py-2 rounded-md">
                                    Cancelar Cita
                                </Button>
                            )}
                        </Section>

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

export default ConfirmacionCitaEmail;