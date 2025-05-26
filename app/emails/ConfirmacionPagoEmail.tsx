// app/emails/ConfirmacionPagoEmail.tsx
// app/emails/ConfirmacionPagoEmail.tsx
import {
    Body,
    Button,
    Container,
    Head,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Row,
    Column,
    Heading,
    Font,
    Link, // Asegúrate de importar Link si lo usas para URLs
} from '@react-email/components';
import * as React from 'react';

interface ConfirmacionPagoEmailProps {
    nombreComprador?: string | null;
    nombreNegocio: string;
    logoNegocioUrl?: string | null;
    conceptoPrincipal: string;
    montoPagado: number;
    moneda: string;
    idTransaccionStripe?: string;
    linkDetallesPedidoEnVitrina?: string | null;
    nombrePlataforma?: string;
    urlPlataforma?: string;
    emailSoportePlataforma?: string;
}

// --- ESTILOS (como los tenías) ---
const main = {
    backgroundColor: '#18181b', // zinc-900
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
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
    maxWidth: '200px', // Aumentado un poco para mejor visualización
    maxHeight: '70px',
    objectFit: 'contain' as const, // Para que el logo no se deforme
};
const transactionDetails = {
    backgroundColor: '#1f1f23', // Un zinc un poco más claro que el fondo del contenedor
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #3f3f46', // zinc-700
    color: '#a1a1aa', // zinc-400
    margin: '20px 0', // Añadido margen
};
const transactionRow = {
    margin: '8px 0',
};
const transactionLabel = {
    ...paragraph, margin: '0', color: '#d4d4d8', fontSize: '14px' /* zinc-300 */
};
const transactionValue = {
    ...paragraph, margin: '0', color: '#f4f4f5', fontSize: '14px', textAlign: 'right' as const /* zinc-100 */
};

const button = {
    backgroundColor: '#2563eb', // blue-600
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold', // Añadido
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px', // Ajustado padding
    margin: '20px auto', // Centrar botón si la sección es text-align: center
};
const hr = {
    borderColor: '#3f3f46', // zinc-700
    margin: '28px 0', // Aumentado margen
};
const footerText = {
    color: '#71717a', // zinc-500
    fontSize: '12px',
    lineHeight: '1.5',
    textAlign: 'center' as const,
    padding: '0 20px'
};
// --- FIN ESTILOS ---

export const ConfirmacionPagoEmail: React.FC<Readonly<ConfirmacionPagoEmailProps>> = (propsIn) => {
    // const props = { ...defaultProps, ...propsIn };

    // Desestructurar desde las props finales
    const {
        nombreComprador,
        nombreNegocio: nombreNegocioProp,
        logoNegocioUrl,
        conceptoPrincipal,
        montoPagado,
        moneda,
        idTransaccionStripe,
        linkDetallesPedidoEnVitrina,
        emailSoportePlataforma
    } = propsIn;

    const nombreNegocio = nombreNegocioProp || 'Tu Negocio'; // Default si no se pasa
    const urlPlataforma = process.env.NEXT_PUBLIC_APP_URL || 'https://promedia.mx'; // URL base de tu app
    const nombrePlataforma = 'ProMedia México'; // Default si no se pasa

    return (
        <Html>
            <Head>
                <Font
                    fontFamily="Inter" // Cambiado a Inter si la tienes globalmente, sino Roboto está bien
                    fallbackFontFamily="Verdana"
                    webFont={{
                        url: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2', // Inter Regular
                        format: 'woff2',
                    }}
                    fontWeight={400}
                    fontStyle="normal"
                />
            </Head>
            <Preview>Confirmación de tu pago en {nombreNegocio}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {logoNegocioUrl && (
                        <Section style={logoContainer}>
                            <Img src={logoNegocioUrl} alt={`Logo de ${nombreNegocio}`} style={businessLogo} />
                        </Section>
                    )}
                    <Section style={section}>
                        <Heading style={heading}>¡Gracias por tu Compra!</Heading>
                        <Text style={paragraph}>
                            Hola {nombreComprador || 'Cliente'},
                        </Text>
                        <Text style={paragraph}>
                            Este es un correo para confirmar que hemos recibido tu pago en <strong>{nombreNegocio}</strong>.
                            A continuación, encontrarás los detalles de tu transacción:
                        </Text>
                        <Section style={transactionDetails}>
                            <Row style={transactionRow}>
                                <Column><Text style={transactionLabel}>Concepto:</Text></Column>
                                <Column align="right"><Text style={transactionValue}>{conceptoPrincipal}</Text></Column>
                            </Row>
                            <Row style={transactionRow}>
                                <Column><Text style={transactionLabel}>Monto Pagado:</Text></Column>
                                <Column align="right"><Text style={transactionValue}>{(montoPagado || 0).toLocaleString('es-MX', { style: 'currency', currency: moneda || 'MXN' })}</Text></Column>
                            </Row>
                            {idTransaccionStripe && (
                                <Row style={transactionRow}>
                                    <Column><Text style={{ ...transactionLabel, fontSize: '12px' }}>Referencia Transacción:</Text></Column>
                                    <Column align="right"><Text style={{ ...transactionValue, fontSize: '12px' }}>{idTransaccionStripe}</Text></Column>
                                </Row>
                            )}
                        </Section>

                        {linkDetallesPedidoEnVitrina && (
                            <Section style={{ textAlign: 'center' as const, marginTop: '26px', marginBottom: '26px' }}>
                                <Button href={linkDetallesPedidoEnVitrina} style={button}>
                                    Ver Detalles de mi Pedido
                                </Button>
                            </Section>
                        )}

                        <Text style={paragraph}>
                            Si tienes alguna pregunta sobre tu pedido, por favor contacta directamente a {nombreNegocio}.
                            Si tienes alguna pregunta sobre el proceso de pago o la plataforma, puedes contactarnos.
                        </Text>
                        <Hr style={hr} />
                        <Text style={footerText}>
                            Este servicio es facilitado por {nombrePlataforma}.<br />
                            {urlPlataforma && <Link href={urlPlataforma} target="_blank" style={{ color: '#a1a1aa' /* zinc-400 */, textDecoration: 'underline' }}>{urlPlataforma}</Link>}
                            <br />
                            Si necesitas ayuda, contacta a <Link href={`mailto:${emailSoportePlataforma}`} style={{ color: '#a1a1aa', textDecoration: 'underline' }}>{emailSoportePlataforma}</Link>.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
};

export default ConfirmacionPagoEmail;
