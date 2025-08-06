import { Lead } from '@prisma/client';
import Link from 'next/link';
import QRCodeDisplay from './QRCodeDisplay'; // Nuestro Client Component
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { MessageSquare } from 'lucide-react'; // <-- CORRECCIÓN: Se eliminó 'QrCode' de aquí


const whatsappIcon = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
    >
        <circle cx="12" cy="12" r="11" fill="#25D366" />
        <path
            d="M16.276 13.921c-.134-.067-.787-.387-.91-.433-.124-.047-.214-.07-.304.07-.09.14-.349.434-.426.524-.078.09-.155.101-.289.033-.134-.067-.568-.209-1.082-.665-.4-.36-.671-.6-.895-.98-.224-.379-.024-.35.155-.529.14-.14.304-.387.439-.582.134-.194.067-.365-.033-.51-.1-.14-.895-2.162-1.226-2.955-.329-.793-.66-.684-.91-.696-.23-.008-.49-.009-.75-.009-.258 0-.671.09-.91.304-.23.21-.873.858-.873 2.083 0 1.225.895 2.41 1.018 2.571.124.16.23.242 2.128 3.321 2.378 1.488 2.876 1.295 3.389 1.206.514-.09.787-.359.895-.583.108-.224.108-.415.07-.764-.033-.35-.124-.582-.258-.753z"
            fill="#FFFFFF"
        />
        <path
            d="M12.04 2.3c-5.2 0-9.4 4.2-9.4 9.4 0 1.7.5 3.3 1.3 4.8l-1.4 4.5 4.7-1.3c1.4.8 3 1.2 4.8 1.2 5.2 0 9.4-4.2 9.4-9.4 0-5.2-4.2-9.4-9.4-9.4z"
            stroke="#FFFFFF"
            strokeWidth="1.5"
        />
    </svg>
);

// Función para limpiar y formatear el teléfono
function formatPhoneNumber(phone: string): string | null {
    const digits = phone.replace(/\D/g, ''); // Quita todo lo que no sea número
    if (digits.length === 10) {
        return `521${digits}`; // Formato para celular en México
    }
    // Añadir más lógica si manejas otros formatos
    return null;
}

export function WhatsAppContactCard({ lead }: { lead: Lead }) {
    if (!lead.telefono) {
        return (
            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-400">
                        {whatsappIcon}  Contactar por WhatsApp
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-zinc-500">Este lead no tiene un número de teléfono registrado.</p>
                </CardContent>
            </Card>
        );
    }

    const formattedPhone = formatPhoneNumber(lead.telefono);
    if (!formattedPhone) {
        return (
            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-400">
                        {whatsappIcon} Contactar por WhatsApp
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-zinc-500">El número de teléfono registrado ({lead.telefono}) no es válido.</p>
                </CardContent>
            </Card>
        );
    }

    const messageTemplate = `¡Hola ${lead.nombre}! Te contacto para dar seguimiento a tu solicitud de información.`;
    const encodedMessage = encodeURIComponent(messageTemplate);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    return (
        <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {whatsappIcon} Contactar por WhatsApp
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                <div className="p-4 bg-zinc-900 rounded-md inline-block">
                    <QRCodeDisplay url={whatsappUrl} />
                </div>
                <Button variant='green' className="w-full" asChild>
                    <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Enviar mensaje
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}