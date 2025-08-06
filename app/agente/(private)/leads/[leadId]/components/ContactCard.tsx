import Link from 'next/link';
import QRCodeDisplay from '@/app/admin/components/QRCodeDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"; // Importa Tabs
import { MessageSquare, Phone } from 'lucide-react';

// Función para limpiar y formatear el teléfono
function formatPhoneNumber(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return digits;
    }
    return null;
}

interface LeadContactInfo {
    nombre: string;
    telefono: string | null;
}

export function ContactCard({ lead }: { lead: LeadContactInfo }) {
    if (!lead.telefono) {
        return null; // No mostrar nada si no hay teléfono
    }

    const formattedPhone = formatPhoneNumber(lead.telefono);
    if (!formattedPhone) {
        // Podríamos mostrar un estado de error si el teléfono es inválido
        return null;
    }

    // URL para WhatsApp
    const messageTemplate = `¡Hola, ${lead.nombre}!`;
    const encodedMessage = encodeURIComponent(messageTemplate);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // URL para Llamada Telefónica
    const phoneUrl = `tel:${formattedPhone}`;

    return (
        <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Phone className="text-sky-400" /> Opciones de Contacto
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="whatsapp" className="w-full">
                    {/* --- Selector de Pestañas --- */}
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="whatsapp">
                            <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                        </TabsTrigger>
                        <TabsTrigger value="llamar">
                            <Phone className="mr-2 h-4 w-4" /> Llamar
                        </TabsTrigger>
                    </TabsList>

                    {/* --- Contenido de la Pestaña de WhatsApp --- */}
                    <TabsContent value="whatsapp" className="mt-4 space-y-4 text-center">
                        <div className="p-4 bg-white rounded-md inline-block">
                            <QRCodeDisplay url={whatsappUrl} />
                        </div>
                        <p className="text-xs text-zinc-400">Escanea para enviar un mensaje desde tu teléfono.</p>
                        <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                            <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                Abrir Chat en WhatsApp
                            </Link>
                        </Button>
                    </TabsContent>

                    {/* --- Contenido de la Pestaña de Llamada --- */}
                    <TabsContent value="llamar" className="mt-4 space-y-4 text-center">
                        <div className="p-4 bg-white rounded-md inline-block">
                            <QRCodeDisplay url={phoneUrl} />
                        </div>
                        <p className="text-xs text-zinc-400">Escanea para marcar el número en tu teléfono.</p>
                        <Button asChild className="w-full">
                            <Link href={phoneUrl}>
                                Llamar Ahora ({lead.telefono})
                            </Link>
                        </Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}