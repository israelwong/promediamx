// app/admin/clientes/[clienteId]/negocios/[negocioId]/asistente/[asistenteId]/components/AsistenteWhatsAppConfig.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Phone, Zap, AlertTriangle, CheckCircle, PowerOff, Loader2 } from 'lucide-react';

// Importar la server action
import {
    iniciarProcesoConexionWhatsAppAction,
    desconectarWhatsAppAction
} from '@/app/admin/_lib/actions/asistenteVirtual/asistenteWhatsAppConfig.actions';
import { ActionResult } from '@/app/admin/_lib/types'; // Asumiendo tu tipo ActionResult
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

export function AsistenteWhatsAppConfig({
    clienteId,
    negocioId,
    asistenteId,
    asistenteConfig,
}: AsistenteWhatsAppConfigProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [telefonoParaConectar, setTelefonoParaConectar] = useState(asistenteConfig.whatsappBusiness || '');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleConnect = async () => {
        // LEER LA URL BASE DESDE LA VARIABLE DE ENTORNO
        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!appBaseUrl) {
            setError("Error de configuración: NEXT_PUBLIC_APP_URL no está definida. Contacte al administrador.");
            console.error("Error: NEXT_PUBLIC_APP_URL no está definida en las variables de entorno del cliente.");
            return;
        }

        const oauthCallbackUrl = `${appBaseUrl}/api/oauth/whatsapp/callback`; // USAR appBaseUrl

        const result: ActionResult<IniciarConexionWhatsAppOutput> = await iniciarProcesoConexionWhatsAppAction({
            asistenteId,
            negocioId,
            clienteId,
            telefonoWhatsAppBusiness: telefonoParaConectar.trim() || undefined,
            oauthRedirectUri: oauthCallbackUrl, // Se pasa la URL construida con NEXT_PUBLIC_APP_URL
        });

        if (result.success && result.data?.metaOAuthUrl) {
            window.location.href = result.data.metaOAuthUrl;
        } else {
            setError(result.error || "No se pudo iniciar la conexión con WhatsApp.");
        }
    };

    const handleDisconnect = () => {
        setError(null);
        setSuccessMessage(null);
        if (!window.confirm("¿Estás seguro de que deseas desconectar WhatsApp de este asistente? Esto interrumpirá la comunicación por este canal.")) {
            return;
        }

        startTransition(async () => {
            const result: ActionResult<null> = await desconectarWhatsAppAction({ asistenteId });
            if (result.success) {
                setSuccessMessage("WhatsApp desconectado exitosamente. La página se refrescará en unos segundos.");
                setTimeout(() => router.refresh(), 2500);
            } else {
                setError(result.error || "No se pudo desconectar WhatsApp.");
            }
        });
    };

    const isConnected = asistenteConfig.whatsappConnectionStatus === 'CONECTADO';

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
                                <p className="text-zinc-100 font-medium mt-0.5">{asistenteConfig.whatsappBusiness || 'No disponible'}</p>
                            </div>
                            <div>
                                <Label className="text-zinc-400 font-normal text-xs">Phone Number ID:</Label>
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
                            disabled={isPending}
                            className="w-full mt-5"
                        >
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {!isPending && <PowerOff className="w-4 h-4 mr-1" />}
                            {isPending ? 'Desconectando...' : 'Desconectar WhatsApp'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <Label htmlFor="whatsapp-phone-connect" className="text-zinc-300 font-medium">
                                Número de WhatsApp Business de referencia
                            </Label>
                            <Input
                                id="whatsapp-phone-connect"
                                type="tel"
                                value={telefonoParaConectar}
                                onChange={(e) => setTelefonoParaConectar(e.target.value)}
                                placeholder="Ej: +525512345678 (incluye código de país)"
                                disabled={isPending}
                                className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                Este número es solo una referencia inicial. Podrás seleccionar o confirmar el número final durante el proceso de conexión con Meta.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleConnect}
                            disabled={isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {!isPending && <Phone className="w-4 h-4 mr-1" />}
                            {isPending ? 'Procesando...' : 'Conectar con WhatsApp'}
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
