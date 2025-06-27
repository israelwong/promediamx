import { Body, Container, Head, Html, Preview, Section, Text, Row, Column } from '@react-email/components';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as React from 'react';

interface ReagendamientoCitaEmailProps {
    nombreUsuario?: string | null;
    nombreNegocio?: string;
    nombreServicio?: string;
    fechaHoraAnterior?: Date;
    fechaHoraNueva?: Date;
}

export const ReagendamientoCitaEmail = ({
    nombreUsuario,
    nombreNegocio,
    nombreServicio,
    fechaHoraAnterior,
    fechaHoraNueva,
}: ReagendamientoCitaEmailProps) => (
    <Html>
        <Head />
        <Preview>Confirmación de Reagendamiento - Tu cita con {nombreNegocio || ''}</Preview>
        <Body style={main}>
            <Container style={container}>
                <Text style={paragraph}>¡Hola {nombreUsuario || 'Cliente'},</Text>
                <Text style={paragraph}>
                    Te confirmamos que tu cita ha sido reagendada con éxito.
                </Text>
                <Section style={detailsSection}>
                    <Text style={detailsTitle}>Detalles de tu cita actualizada:</Text>
                    <Row>
                        <Column style={label}>Servicio:</Column>
                        <Column style={value}>{nombreServicio}</Column>
                    </Row>
                    <Row>
                        <Column style={label}>Nueva Fecha y Hora:</Column>
                        <Column style={value}>
                            {fechaHoraNueva ? format(fechaHoraNueva, "EEEE, d 'de' MMMM 'de' yyyy 'a las' h:mm aa", { locale: es }) : 'N/A'}
                        </Column>
                    </Row>
                    <Row style={oldDateRow}>
                        <Column style={oldDateLabel}>(Esta cita reemplaza a la del {fechaHoraAnterior ? format(fechaHoraAnterior, "EEEE d 'a las' h:mm aa", { locale: es }) : 'N/A'})</Column>
                    </Row>
                </Section>
                <Text style={paragraph}>
                    Si necesitas hacer más cambios, por favor, responde a este correo o contáctanos directamente.
                </Text>
                <Text style={paragraph}>
                    ¡Te esperamos!
                    <br />
                    El equipo de {nombreNegocio}
                </Text>
            </Container>
        </Body>
    </Html>
);

export default ReagendamientoCitaEmail;

// --- Estilos ---
const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' };
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px', border: '1px solid #f0f0f0', borderRadius: '4px' };
const paragraph = { fontSize: '16px', lineHeight: '26px', padding: '0 20px' };
const detailsSection = { margin: '24px 0', padding: '12px 20px', backgroundColor: '#f2f3f3', borderRadius: '4px' };
const detailsTitle = { fontSize: '18px', fontWeight: 'bold' as const, marginBottom: '16px' };
const label = { fontSize: '14px', color: '#525f7f', width: '120px' };
const value = { fontSize: '14px', color: '#000000', fontWeight: 'bold' as const };
const oldDateRow = { paddingTop: '10px' };
const oldDateLabel = { fontSize: '12px', color: '#8898aa', fontStyle: 'italic' };