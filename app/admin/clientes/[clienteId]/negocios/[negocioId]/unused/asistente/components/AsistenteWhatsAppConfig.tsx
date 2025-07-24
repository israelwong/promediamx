'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Phone, Zap, CheckCircle, PowerOff, Loader2, Copy, MessageSquare } from 'lucide-react';

import {
    iniciarProcesoConexionWhatsAppAction,
    desconectarWhatsAppAction
} from '@/app/admin/_lib/actions/asistente/asistenteWhatsAppConfig.actions';
import { AsistenteConfigWhatsAppData } from '@/app/admin/_lib/actions/asistente/asistenteWhatsAppConfig.schemas';

type AsistenteWhatsAppConfigProps = {
    clienteId: string;
    negocioId: string;
    asistenteId: string;
    asistenteConfig: AsistenteConfigWhatsAppData;
};

const formatPhoneNumberTo10Digits = (e164Number?: string | null): string => {
    if (!e164Number) return 'N/D';
    const cleaned = e164Number.replace(/\D/g, '');
    return cleaned.slice(-10);
};

const getWaMeNumber = (e164Number?: string | null): string => {
    if (!e164Number) return '';
    return e164Number.replace(/\D/g, '');
}

export function AsistenteWhatsAppConfig({
    clienteId,
    negocioId,
    asistenteId,
    asistenteConfig,
}: AsistenteWhatsAppConfigProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isPendingTransition, startTransition] = useTransition();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        // Lógica para manejar mensajes de éxito/error desde la URL de callback de OAuth
        const whatsappStatus = searchParams?.get('whatsapp_status');
        if (whatsappStatus) {
            if (whatsappStatus === 'success') {
                setSuccessMessage(searchParams?.get('message') || 'Conexión exitosa.');
            } else {
                setError(searchParams?.get('whatsapp_error_description') || 'Ocurrió un error en la conexión.');
            }
            // Limpia la URL para evitar que el mensaje aparezca al recargar
            router.replace(pathname ?? '/', { scroll: false });
        }
    }, [searchParams, pathname, router]);


    const handleConnect = () => {
        setError(null);
        setSuccessMessage(null);
        setIsConnecting(true);
        startTransition(async () => {
            const oauthCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`;
            const result = await iniciarProcesoConexionWhatsAppAction({
                asistenteId, negocioId, clienteId, oauthRedirectUri: oauthCallbackUrl,
            });
            if (result.success && result.data?.metaOAuthUrl) {
                window.location.href = result.data.metaOAuthUrl;
            } else {
                setError(result.error || "No se pudo iniciar la conexión.");
                setIsConnecting(false);
            }
        });
    };

    const handleDisconnect = () => {
        if (!window.confirm("¿Estás seguro de que deseas desconectar WhatsApp?")) return;
        setIsDisconnecting(true);
        startTransition(async () => {
            const result = await desconectarWhatsAppAction({ asistenteId });
            if (result.success) {
                setSuccessMessage("WhatsApp desconectado exitosamente.");
                router.refresh(); // Actualiza los datos del servidor para reflejar el estado desconectado
            } else {
                setError(result.error || "No se pudo desconectar.");
            }
            setIsDisconnecting(false);
        });
    };

    // Funciones helper para copiar al portapapeles y abrir chat
    const handleCopyToClipboard = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Podrías mostrar una notificación temporal de "copiado"
        }).catch(err => console.error('Error al copiar:', err));
    };

    const handleOpenWaMe = (e164Number?: string | null) => {
        const waNumber = getWaMeNumber(e164Number);
        if (waNumber) {
            window.open(`https://wa.me/${waNumber}`, '_blank', 'noopener,noreferrer');
        }
    };


    const isConnected = asistenteConfig.whatsappConnectionStatus === 'CONECTADO';
    const isLoading = isConnecting || isDisconnecting || isPendingTransition;

    return (
        <Card className="bg-zinc-800 border-zinc-700 shadow-md">
            <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center text-lg font-semibold">
                    <Zap className="w-5 h-5 mr-2 text-blue-400" />
                    Conexión WhatsApp Business
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-md text-sm">{error}</div>}
                {successMessage && <div className="bg-green-500/10 text-green-300 p-3 rounded-md text-sm">{successMessage}</div>}

                {isConnected ? (
                    <div className="space-y-4">
                        <div className="text-green-300 flex items-center gap-2 font-medium">
                            <CheckCircle className="w-5 h-5" />
                            Asistente conectado
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <Label className="text-zinc-400">Nombre Público</Label>
                                <p className="text-zinc-100 font-medium">{asistenteConfig.whatsappDisplayName || 'N/D'}</p>
                            </div>
                            <div>
                                <Label className="text-zinc-400">Número Conectado</Label>
                                <div className="flex items-center gap-2">
                                    <p className="text-zinc-100 font-medium">{formatPhoneNumberTo10Digits(asistenteConfig.whatsappBusiness)}</p>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => handleCopyToClipboard(formatPhoneNumberTo10Digits(asistenteConfig.whatsappBusiness))}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => handleOpenWaMe(asistenteConfig.whatsappBusiness)}>
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Button type="button" variant="destructive" onClick={handleDisconnect} disabled={isLoading} className="w-full sm:w-auto mt-4">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PowerOff className="w-4 h-4 mr-1" />}
                            Desconectar WhatsApp
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-sm text-zinc-300">
                            Para habilitar las conversaciones por WhatsApp, conecta este asistente a tu cuenta de WhatsApp Business.
                            Serás redirigido a Facebook para completar el proceso de autorización.
                        </p>
                        <Button
                            type="button"
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-1" />}
                            Conectar con WhatsApp
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
