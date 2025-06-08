import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Heading,
    Font,
    Link,
} from '@react-email/components';
import * as React from 'react';

// Define las props que el componente recibirá para personalizar el correo.
interface CancelacionCitaEmailProps {
    nombreDestinatario?: string | null;
    nombreNegocio: string;
    logoNegocioUrl?: string | null;
    nombreServicio: string;
    fechaHoraCitaOriginal: string; // Recibe la fecha ya formateada
}

// Estilos consistentes con tus otros correos para mantener la identidad visual.
const main = {
    backgroundColor: '#18181b', // zinc-900
    fontFamily: 'Inter, -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};
const container = {
    margin: '15px auto',
    padding: '10px 20px 48px',
    width: '580px',
    maxWidth: '100%',
    backgroundColor: '#27272a', // zinc-800
    borderRadius: '8px',
    border: '1px solid #3f3f46', // zinc-700
};
const heading = {
    color: '#f4f4f5', // zinc-100
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'left' as const,
    margin: '30px 0',
};
const paragraph = {
    color: '#d4d4d8', // zinc-300
    fontSize: '16px',
    lineHeight: '26px',
    margin: '16px 0',
};
const section = {
    padding: '0 24px',
};
const logoContainer = {
    textAlign: 'center' as const,
    margin: '20px 20px 0',
};
const businessLogo = {
    maxWidth: '200px',
    maxHeight: '70px',
    objectFit: 'contain' as const,
};
const hr = {
    borderColor: '#3f3f46', // zinc-700
    margin: '28px 0',
};
const footerText = {
    color: '#71717a', // zinc-500
    fontSize: '12px',
    lineHeight: '1.5',
    textAlign: 'center' as const,
    padding: '0 20px'
};

/**
 * Plantilla de correo electrónico para notificar al usuario
 * que su cita ha sido cancelada exitosamente.
 */
export const CancelacionCitaEmail: React.FC<Readonly<CancelacionCitaEmailProps>> = ({
    nombreDestinatario,
    nombreNegocio,
    logoNegocioUrl,
    nombreServicio,
    fechaHoraCitaOriginal,
}) => {

    const nombrePlataforma = 'ProMedia México';
    const urlPlataforma = process.env.NEXT_PUBLIC_APP_URL || 'https://promedia.mx';
    const emailSoportePlataforma = 'soporte.citas@promedia.mx';

    return (
        <Html>
            <Head>
                <Font
                    fontFamily="Inter"
                    fallbackFontFamily="Verdana"
                    webFont={{
                        url: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2',
                        format: 'woff2',
                    }}
                    fontWeight={400}
                    fontStyle="normal"
                />
            </Head>
            <Preview>Cancelación de tu cita en {nombreNegocio}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {logoNegocioUrl && (
                        <Section style={logoContainer}>
                            <Img src={logoNegocioUrl} alt={`Logo de ${nombreNegocio}`} style={businessLogo} />
                        </Section>
                    )}
                    <Section style={section}>
                        <Heading style={heading}>Cita Cancelada</Heading>
                        <Text style={paragraph}>
                            Hola {nombreDestinatario || 'Cliente'},
                        </Text>
                        <Text style={paragraph}>
                            Te confirmamos que tu cita para el servicio &quot;<strong>{nombreServicio}</strong>&quot;
                            que tenías programada para el <strong>{fechaHoraCitaOriginal}</strong> ha sido cancelada exitosamente.
                        </Text>
                        <Text style={paragraph}>
                            Si has cancelado esta cita por error o deseas agendar una nueva, no dudes en volver a contactarnos.
                            ¡Estamos para ayudarte!
                        </Text>
                        <Hr style={hr} />
                        <Text style={footerText}>
                            Este servicio es facilitado por {nombrePlataforma}.<br />
                            {urlPlataforma && <Link href={urlPlataforma} target="_blank" style={{ color: '#a1a1aa', textDecoration: 'underline' }}>{urlPlataforma}</Link>}
                            <br />
                            Si necesitas ayuda con la plataforma, contacta a <Link href={`mailto:${emailSoportePlataforma}`} style={{ color: '#a1a1aa', textDecoration: 'underline' }}>{emailSoportePlataforma}</Link>.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default CancelacionCitaEmail;