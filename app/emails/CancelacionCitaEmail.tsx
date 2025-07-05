// /app/emails/CancelacionCitaEmail.tsx

import React from 'react';
import {
    Html, Body, Head, Heading, Container, Text, Section, Button, Hr, Preview
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface CancelacionCitaEmailProps {
    nombreDestinatario: string;
    nombreNegocio: string;
    nombreServicio: string;
    fechaHoraCitaOriginal: string;
    linkAgendarNuevaCita: string;
}

export const CancelacionCitaEmail: React.FC<CancelacionCitaEmailProps> = (props) => {
    const {
        nombreDestinatario,
        nombreNegocio,
        nombreServicio,
        fechaHoraCitaOriginal,
        linkAgendarNuevaCita,
    } = props;

    const previewText = `Confirmación de cancelación de tu cita en ${nombreNegocio}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-gray-100 font-sans">
                    <Container className="bg-white mx-auto my-10 p-8 rounded-lg shadow-md max-w-xl">
                        <Heading className="text-2xl font-semibold text-gray-800 text-center mt-6">
                            Cita Cancelada
                        </Heading>
                        <Text className="text-gray-600 text-base leading-relaxed mt-4">
                            Hola, {nombreDestinatario},
                        </Text>
                        <Text className="text-gray-600 text-base leading-relaxed">
                            Te confirmamos que tu cita de **{nombreServicio}** para el **{fechaHoraCitaOriginal}** ha sido cancelada exitosamente.
                        </Text>
                        <Text className="text-gray-600 text-base leading-relaxed">
                            Lamentamos que no puedas asistir y entendemos que surgen imprevistos. ¡No te preocupes! Estaremos encantados de recibirte en otra ocasión.
                        </Text>
                        <Section className="text-center my-8">
                            <Button href={linkAgendarNuevaCita} className="bg-green-600 text-white font-semibold px-6 py-4 rounded-md">
                                Agendar Nueva Cita
                            </Button>
                        </Section>
                        <Hr className="border-gray-200 my-8" />
                        <Text className="text-xs text-gray-400 text-center">
                            Si tienes alguna duda, por favor, contacta directamente con {nombreNegocio}.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default CancelacionCitaEmail;