// app/emails/ConfirmacionCitaEmail.tsx
import {
    Body, Button, Container, Head, Hr, Html, Img, Preview, Section, Text, Row, Column, Heading, Font, Link,
} from '@react-email/components';
import * as React from 'react';

// Define las props que el componente recibirá
interface ConfirmacionCitaEmailProps {
    nombreDestinatario?: string | null;
    nombreNegocio: string;
    logoNegocioUrl?: string | null;
    nombreServicio: string;
    fechaHoraCita: Date;
    modalidadCita: 'presencial' | 'virtual';
    direccionNegocio?: string | null;
    meetingUrl?: string | null;
    emailSoportePlataforma?: string;
}

// Reutilizamos los mismos estilos que ya definiste para consistencia visual
const main = { backgroundColor: '#18181b', fontFamily: 'Inter, "Helvetica Neue", sans-serif' };
const container = { margin: '15px auto', padding: '10px 20px 48px', width: '580px', maxWidth: '100%', backgroundColor: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' };
const heading = { color: '#f4f4f5', fontSize: '28px', fontWeight: 'bold', textAlign: 'left' as const, margin: '30px 0' };
const paragraph = { color: '#d4d4d8', fontSize: '16px', lineHeight: '26px', margin: '16px 0' };
const section = { padding: '0 24px' };
const logoContainer = { textAlign: 'center' as const, margin: '20px 20px 0' };
const businessLogo = { maxWidth: '200px', maxHeight: '70px', objectFit: 'contain' as const };
const detailsSection = { backgroundColor: '#1f1f23', padding: '16px', borderRadius: '6px', border: '1px solid #3f3f46', color: '#a1a1aa', margin: '20px 0' };
const detailsRow = { margin: '8px 0' };
const detailsLabel = { ...paragraph, margin: '0', color: '#d4d4d8', fontSize: '14px' };
const detailsValue = { ...paragraph, margin: '0', color: '#f4f4f5', fontSize: '14px', textAlign: 'right' as const };
const button = { backgroundColor: '#2563eb', borderRadius: '6px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, display: 'inline-block', padding: '12px 24px', margin: '20px auto' };
const hr = { borderColor: '#3f3f46', margin: '28px 0' };
const footerText = { color: '#71717a', fontSize: '12px', lineHeight: '1.5', textAlign: 'center' as const, padding: '0 20px' };


export const ConfirmacionCitaEmail: React.FC<Readonly<ConfirmacionCitaEmailProps>> = ({
    nombreDestinatario,
    nombreNegocio,
    logoNegocioUrl,
    nombreServicio,
    fechaHoraCita,
    modalidadCita,
    direccionNegocio,
    meetingUrl,
}) => {

    const fechaFormateada = fechaHoraCita.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaFormateada = fechaHoraCita.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

    const nombrePlataforma = 'ProMedia México';
    const urlPlataforma = process.env.NEXT_PUBLIC_APP_URL || 'https://promedia.mx';
    const emailSoportePlataforma = 'soporte.citas@promedia.mx';

    return (
        <Html>
            <Head>
                <Font fontFamily="Inter" fallbackFontFamily="Verdana" webFont={{ url: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2', format: 'woff2' }} fontWeight={400} fontStyle="normal" />
            </Head>
            <Preview>Tu cita en {nombreNegocio} ha sido confirmada</Preview>
            <Body style={main}>
                <Container style={container}>
                    {logoNegocioUrl && (
                        <Section style={logoContainer}>
                            <Img src={logoNegocioUrl} alt={`Logo de ${nombreNegocio}`} style={businessLogo} />
                        </Section>
                    )}
                    <Section style={section}>
                        <Heading style={heading}>¡Cita Confirmada!</Heading>
                        <Text style={paragraph}>
                            Hola {nombreDestinatario || 'Cliente'},
                        </Text>
                        <Text style={paragraph}>
                            Tu cita con <strong>{nombreNegocio}</strong> ha sido agendada exitosamente.
                            Aquí tienes los detalles:
                        </Text>
                        <Section style={detailsSection}>
                            <Row style={detailsRow}><Column><Text style={detailsLabel}>Servicio:</Text></Column><Column align="right"><Text style={detailsValue}>{nombreServicio}</Text></Column></Row>
                            <Row style={detailsRow}><Column><Text style={detailsLabel}>Fecha:</Text></Column><Column align="right"><Text style={detailsValue}>{fechaFormateada}</Text></Column></Row>
                            <Row style={detailsRow}><Column><Text style={detailsLabel}>Hora:</Text></Column><Column align="right"><Text style={detailsValue}>{horaFormateada}</Text></Column></Row>
                            <Row style={detailsRow}><Column><Text style={detailsLabel}>Modalidad:</Text></Column><Column align="right"><Text style={{ ...detailsValue, textTransform: 'capitalize' }}>{modalidadCita}</Text></Column></Row>
                            {modalidadCita === 'presencial' && direccionNegocio && (
                                <Row style={detailsRow}><Column><Text style={detailsLabel}>Ubicación:</Text></Column><Column align="right"><Text style={detailsValue}>{direccionNegocio}</Text></Column></Row>
                            )}
                        </Section>

                        {modalidadCita === 'virtual' && meetingUrl && (
                            <Section style={{ textAlign: 'center' as const, marginTop: '26px', marginBottom: '26px' }}>
                                <Button href={meetingUrl} style={button}>
                                    Unirse a la Reunión Virtual
                                </Button>
                            </Section>
                        )}

                        <Text style={paragraph}>
                            Si necesitas reagendar o cancelar tu cita, por favor contacta a {nombreNegocio}.
                        </Text>
                        <Hr style={hr} />
                        <Text style={footerText}>
                            Servicio de agendamiento por {nombrePlataforma}.<br />
                            <Link href={urlPlataforma} target="_blank" style={{ color: '#a1a1aa', textDecoration: 'underline' }}>{urlPlataforma}</Link><br />
                            Si necesitas ayuda, contacta a <Link href={`mailto:${emailSoportePlataforma}`} style={{ color: '#a1a1aa', textDecoration: 'underline' }}>{emailSoportePlataforma}</Link>.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default ConfirmacionCitaEmail;