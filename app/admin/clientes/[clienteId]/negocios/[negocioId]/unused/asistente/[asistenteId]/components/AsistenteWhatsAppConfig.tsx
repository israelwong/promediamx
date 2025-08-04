// app/admin/clientes/[clienteId]/negocios/[negocioId]/asistente/[asistenteId]/components/AsistenteWhatsAppConfig.tsx
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation'; // Importar usePathname
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Phone, Zap, AlertTriangle, CheckCircle, PowerOff, Loader2, Copy, MessageSquare } from 'lucide-react';

import {
    iniciarProcesoConexionWhatsAppAction,
    desconectarWhatsAppAction
} from '@/app/admin/_lib/actions/asistenteVirtual/asistenteWhatsAppConfig.actions';
import { ActionResult } from '@/app/admin/_lib/types';
import { IniciarConexionWhatsAppOutput } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteWhatsAppConfig.schemas';

interface AsistenteConfigWhatsAppData {
    whatsappBusiness?: string | null;
    phoneNumberId?: string | null;
    whatsappDisplayName?: string | null;
    whatsappBusinessAccountId?: string | null;
    whatsappConnectionStatus?: string | null;
}

type AsistenteWhatsAppConfigProps = {
    clienteId: string;
    negocioId: string;
    asistenteId: string;
    asistenteConfig: AsistenteConfigWhatsAppData;
};

const formatPhoneNumberTo10Digits = (e164Number?: string | null): string => {
    if (!e164Number) return 'N/D';
    const cleaned = e164Number.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+521') && cleaned.length === 14) {
        return cleaned.substring(4);
    }
    if (cleaned.startsWith('+52') && cleaned.length === 13) {
        return cleaned.substring(3);
    }
    if (cleaned.replace('+', '').length > 10) {
        return cleaned.replace('+', '').slice(-10);
    }
    return cleaned.replace('+', '');
};

const getWaMeNumber = (e164Number?: string | null): string => {
    if (!e164Number) return '';
    return e164Number.replace(/[^0-9]/g, '');
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

    // Corregir la obtención de startTransition
    const [isPendingTransition, startTransition] = useTransition();
    // Mantendremos isConnecting e isDisconnecting para controlar el estado específico de cada botón,
    // pero isPendingTransition podría usarse si se prefiere un indicador de carga global para las transiciones.

    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [feedbackTimeoutId, setFeedbackTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const [isCopied, setIsCopied] = useState(false);
    const [copiedTimeoutId, setCopiedTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const isConnected = asistenteConfig.whatsappConnectionStatus === 'CONECTADO';

    const clearFeedback = useCallback(() => {
        if (feedbackTimeoutId) {
            clearTimeout(feedbackTimeoutId);
        }
        setFeedbackTimeoutId(null);
    }, [feedbackTimeoutId]);

    useEffect(() => {
        const whatsappStatus = searchParams?.get('whatsapp_status');
        const errorDetail = searchParams?.get('whatsapp_error_description');
        const successMsgFromUrl = searchParams?.get('message');
        const paramsProcessed = searchParams?.get('params_processed');

        if ((whatsappStatus || errorDetail || successMsgFromUrl) && paramsProcessed !== 'true') {
            clearFeedback();

            if (whatsappStatus === 'success' && successMsgFromUrl) {
                setSuccessMessage(successMsgFromUrl);
                setError(null);
            } else if (whatsappStatus && whatsappStatus.startsWith('error') && errorDetail) {
                setError(errorDetail);
                setSuccessMessage(null);
            }

            if (searchParams) {
                const newUrlParams = new URLSearchParams(Array.from(searchParams.entries()));
                newUrlParams.delete('whatsapp_status');
                newUrlParams.delete('whatsapp_error_description');
                newUrlParams.delete('message');
                newUrlParams.set('params_processed', 'true');
                router.replace(`${pathname}?${newUrlParams.toString()}`, { scroll: false });
            }
        }
        return () => clearFeedback();
    }, [searchParams, pathname, clearFeedback, router]);


    const handleConnect = () => {
        clearFeedback();
        setError(null);
        setSuccessMessage(null);
        setIsConnecting(true);

        startTransition(async () => {
            try {
                const oauthCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`;

                if (!process.env.NEXT_PUBLIC_APP_URL) {
                    setError("Error de configuración: NEXT_PUBLIC_APP_URL no está definida. Contacte al administrador.");
                    console.error("Error: NEXT_PUBLIC_APP_URL no está definida en las variables de entorno del cliente.");
                    setIsConnecting(false);
                    return;
                }

                const result: ActionResult<IniciarConexionWhatsAppOutput> = await iniciarProcesoConexionWhatsAppAction({
                    asistenteId,
                    negocioId,
                    clienteId,
                    oauthRedirectUri: oauthCallbackUrl,
                });

                if (result.success && result.data?.metaOAuthUrl) {
                    window.location.href = result.data.metaOAuthUrl;
                    // No se resetea isConnecting aquí porque la página redirigirá
                } else {
                    setError(result.error || "No se pudo iniciar la conexión con WhatsApp.");
                    setIsConnecting(false);
                }
            } catch (e) {
                console.error("Error inesperado en handleConnect:", e);
                setError("Ocurrió un error inesperado al intentar conectar.");
                setIsConnecting(false);
            }
        });
    };

    const handleDisconnect = () => {
        clearFeedback();
        setError(null);
        setSuccessMessage(null);
        setIsDisconnecting(true);

        if (!window.confirm("¿Estás seguro de que deseas desconectar WhatsApp de este asistente? Esto interrumpirá la comunicación por este canal.")) {
            setIsDisconnecting(false);
            return;
        }

        startTransition(async () => {
            try {
                const result: ActionResult<null> = await desconectarWhatsAppAction({ asistenteId });
                if (result.success) {
                    setSuccessMessage("WhatsApp desconectado exitosamente.");
                    const newTimeout = setTimeout(() => {
                        setSuccessMessage(null);
                    }, 3000);
                    setFeedbackTimeoutId(newTimeout);
                    router.refresh();
                } else {
                    setError(result.error || "No se pudo desconectar WhatsApp.");
                }
            } catch (e) {
                console.error("Error inesperado en handleDisconnect:", e);
                setError("Ocurrió un error inesperado al intentar desconectar.");
            } finally {
                setIsDisconnecting(false);
            }
        });
    };

    const handleCopyToClipboard = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                setIsCopied(true);
                if (copiedTimeoutId) clearTimeout(copiedTimeoutId);
                const newTimeoutId = setTimeout(() => setIsCopied(false), 2000);
                setCopiedTimeoutId(newTimeoutId);
            })
            .catch(err => {
                console.error('Error al copiar al portapapeles:', err);
                setError('No se pudo copiar el número.');
            });
    };

    const handleOpenWaMe = (e164Number?: string | null) => {
        const waNumber = getWaMeNumber(e164Number);
        if (waNumber) {
            window.open(`https://wa.me/${waNumber}`, '_blank', 'noopener,noreferrer');
        } else {
            setError("No hay un número de WhatsApp válido para abrir el chat.");
        }
    };

    const formattedConnectedNumber10Digits = formatPhoneNumberTo10Digits(asistenteConfig.whatsappBusiness);

    // Determinar el estado de carga general para los botones
    const isLoading = isConnecting || isDisconnecting || isPendingTransition;

    return (
        <Card className="bg-zinc-800 border-zinc-700 shadow-md">
            <CardHeader className="border-b border-zinc-700 px-4 py-3 md:px-6 md:py-4">
                <CardTitle className="text-zinc-100 flex items-center text-base md:text-lg font-semibold">
                    <Zap className="w-5 h-5 mr-2 text-blue-400" />
                    Conexión WhatsApp Business
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs md:text-sm mt-1">
                    {isConnected
                        ? "Gestiona la conexión de tu asistente con la API de WhatsApp Business."
                        : "Conecta tu asistente a la API de WhatsApp Business para automatizar conversaciones."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}
                {successMessage && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-300 p-3 rounded-md flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>{successMessage}</p>
                    </div>
                )}

                {isConnected ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-300 bg-zinc-700/50 p-3 rounded-md border border-green-500/30">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <p className="font-medium text-sm text-zinc-100">Asistente conectado a WhatsApp</p>
                        </div>

                        <div className="grid grid-cols-1 gap-y-3 gap-x-4 text-sm mt-3">
                            <div>
                                <Label className="text-zinc-400 font-normal text-xs">Nombre Público (WhatsApp):</Label>
                                <p className="text-zinc-100 font-medium mt-0.5">{asistenteConfig.whatsappDisplayName || 'No disponible'}</p>
                            </div>

                            <div>
                                <Label className="text-zinc-400 font-normal text-xs">Número Conectado:</Label>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-zinc-100 font-medium">{formattedConnectedNumber10Digits}</p>
                                    {asistenteConfig.whatsappBusiness && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-500"
                                                onClick={() => handleCopyToClipboard(formattedConnectedNumber10Digits)}
                                                title="Copiar número (10 dígitos)"
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-500"
                                                onClick={() => handleOpenWaMe(asistenteConfig.whatsappBusiness)}
                                                title="Abrir chat en WhatsApp"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {isCopied && <p className="text-xs text-blue-400 mt-1">¡Número copiado!</p>}
                            </div>

                            <div>
                                <Label className="text-zinc-400 font-normal text-xs">Phone Number ID (API):</Label>
                                <p className="font-mono text-zinc-300 text-xs mt-0.5">{asistenteConfig.phoneNumberId || 'No disponible'}</p>
                            </div>
                            <div>
                                <Label className="text-zinc-400 font-normal text-xs">WhatsApp Business Account ID (WABA ID):</Label>
                                <p className="font-mono text-zinc-300 text-xs mt-0.5">{asistenteConfig.whatsappBusinessAccountId || 'No disponible'}</p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDisconnect}
                            disabled={isLoading || isDisconnecting}
                            className="w-full mt-5"
                        >
                            {(isLoading || isDisconnecting) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {!(isLoading || isDisconnecting) && <PowerOff className="w-4 h-4 mr-1" />}
                            {(isLoading || isDisconnecting) ? 'Desconectando...' : 'Desconectar WhatsApp'}
                        </Button>
                    </div>
                ) : (
                    // Estado NO CONECTADO
                    <div className="space-y-6">
                        <p className="text-sm text-zinc-300">
                            Para habilitar las conversaciones por WhatsApp, conecta este asistente a tu cuenta de WhatsApp Business.
                            Serás redirigido a Facebook para completar el proceso de autorización.
                        </p>
                        <Button
                            type="button"
                            onClick={handleConnect}
                            disabled={isLoading || isConnecting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {(isLoading || isConnecting) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {!(isLoading || isConnecting) && <Phone className="w-4 h-4 mr-1" />}
                            {(isLoading || isConnecting) ? 'Procesando...' : 'Conectar con WhatsApp'}
                        </Button>
                        {(asistenteConfig.whatsappConnectionStatus === 'ERROR_CONFIGURACION' ||
                            asistenteConfig.whatsappConnectionStatus === 'REQUIERE_REAUTENTICACION') && (
                                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-md flex items-start gap-2 text-sm">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p>
                                        {asistenteConfig.whatsappConnectionStatus === 'ERROR_CONFIGURACION'
                                            ? "Hubo un error en la configuración previa o la conexión se perdió."
                                            : "La conexión con WhatsApp requiere reautenticación."
                                        }
                                        {" "}Por favor, intenta conectar de nuevo.
                                    </p>
                                </div>
                            )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
