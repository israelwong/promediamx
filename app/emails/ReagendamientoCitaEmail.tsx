// /app/emails/ReagendamientoCitaEmail.tsx

import React from 'react';
import {
    Html, Body, Head, Heading, Container, Text, Section, Button, Preview
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface ReagendamientoCitaEmailProps {
    nombreDestinatario: string;
    nombreNegocio: string;
    nombreServicio: string;
    fechaHoraOriginal: Date;
    fechaHoraNueva: Date;
    linkCancelar?: string;
    linkReagendar?: string;
}

export const ReagendamientoCitaEmail: React.FC<ReagendamientoCitaEmailProps> = (props) => {
    const { /* ... (extracción de props) ... */ } = props;

    const formatearFecha = (fecha: Date) => {
        return new Date(fecha).toLocaleString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City'
        });
    };

    return (
        <Html>
            <Head />
            <Preview>Tu cita en {props.nombreNegocio} ha sido reagendada</Preview>
            <Tailwind>
                <Body className="bg-gray-100 font-sans">
                    <Container className="bg-white mx-auto my-10 p-8 rounded-lg shadow-md max-w-xl">
                        <Heading className="text-2xl font-semibold text-gray-800 text-center mt-6">
                            Cita Reagendada
                        </Heading>
                        <Text className="text-gray-600 text-base leading-relaxed mt-4">
                            Hola, {props.nombreDestinatario},
                        </Text>
                        <Text className="text-gray-600 text-base leading-relaxed">
                            Te confirmamos que tu cita de **{props.nombreServicio}** ha sido modificada con éxito.
                        </Text>
                        <Section className="bg-gray-50 my-6 p-6 rounded-md border border-gray-200">
                            <Text className="text-gray-500 text-sm line-through m-0">
                                Fecha Anterior: {formatearFecha(props.fechaHoraOriginal)}
                            </Text>
                            <Text className="text-green-600 font-bold text-lg m-0 mt-2">
                                Nueva Fecha: {formatearFecha(props.fechaHoraNueva)}
                            </Text>
                        </Section>
                        <Text className="text-gray-600 text-base leading-relaxed text-center">
                            ¿Necesitas hacer otro cambio?
                        </Text>
                        <Section className="text-center">
                            {props.linkReagendar && (
                                <Button href={props.linkReagendar} className="bg-gray-500 text-white font-semibold px-5 py-2 rounded-md mr-2">
                                    Reagendar de Nuevo
                                </Button>
                            )}
                            {props.linkCancelar && (
                                <Button href={props.linkCancelar} className="bg-red-600 text-white font-semibold px-5 py-2 rounded-md">
                                    Cancelar Cita
                                </Button>
                            )}
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default ReagendamientoCitaEmail;