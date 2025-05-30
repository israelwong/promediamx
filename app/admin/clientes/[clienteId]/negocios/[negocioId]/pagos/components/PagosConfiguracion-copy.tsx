//ruta : app/admin/clientes/[clienteId]/negocios/[negocioId]/pagos/components/PagosConfiguracion.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { type NegocioConfiguracionPago } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.schemas';
import { iniciarConexionStripeAction } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.actions';

import { Button } from '@/app/components/ui/button'; // Correcta importación
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'; // Asumiendo que tienes Card
import { Switch } from '@/app/components/ui/switch'; // Asumiendo que tienes Switch
import { Label } from '@/app/components/ui/label';   // Asumiendo que tienes Label
import { Loader2, ExternalLink, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface PagosConfiguracionProps {
    configuracionInicial: (NegocioConfiguracionPago & { _esNuevaConfiguracion?: boolean }) | null;
    negocioId: string;
    // esNuevaConfiguracion ya está en configuracionInicial._esNuevaConfiguracion
}

export default function PagosConfiguracion({ configuracionInicial, negocioId }: PagosConfiguracionProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estado local para la configuración, inicializado con los props
    // Esto permite que la UI sea interactiva antes de guardar
    const [aceptaPagosOnline, setAceptaPagosOnline] = useState(configuracionInicial?.aceptaPagosOnline || false);
    const [aceptaMSI, setAceptaMSI] = useState(configuracionInicial?.aceptaMesesSinIntereses || false);
    // mesesPermitidosMSI necesitaría un input más complejo (ej. MultiSelect o chips)

    useEffect(() => {
        // Verificar si venimos de un retorno de Stripe Onboarding
        if (searchParams && searchParams.get('stripe_return') === 'true') {
            setSuccessMessage("¡Proceso de Stripe completado! Actualizando estado...");
            // Forzar una recarga de los datos del servidor para esta ruta
            window.history.replaceState(null, '', window.location.pathname);

            router.refresh();
            // Opcional: limpiar los query params de la URL
            // window.history.replaceState(null, '', window.location.pathname);
            // toast.success("Configuración de Stripe actualizada.");
        }
        if (searchParams && searchParams.get('stripe_refresh') === 'true') {
            // El usuario podría haber sido redirigido aquí si el link de onboarding expiró.
            setError("El enlace de configuración de Stripe expiró o fue inválido. Por favor, intenta conectar de nuevo.");
            // router.refresh();
            // Opcional: limpiar los query params
            // window.history.replaceState(null, '', window.location.pathname);
        }
    }, [searchParams, router]);


    const handleConectarStripe = () => {
        setError(null);
        setSuccessMessage(null);
        startTransition(async () => {
            const result = await iniciarConexionStripeAction({ negocioId });
            if (result.success && result.data?.onboardingUrl) {
                window.location.href = result.data.onboardingUrl;
            } else {
                setError(result.error || 'Ocurrió un error al conectar con Stripe.');
                // toast.error(result.error || 'Ocurrió un error al conectar con Stripe.');
            }
        });
    };

    if (!configuracionInicial) {
        return (
            <Card className="border-destructive">
                <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
                <CardContent>
                    <p>No se pudo cargar la configuración de pagos. Por favor, recarga la página.</p>
                    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                </CardContent>
            </Card>
        );
    }

    const stripeConectado = configuracionInicial.stripeAccountId && configuracionInicial.stripeOnboardingComplete;
    const stripePendiente = configuracionInicial.stripeAccountId && !configuracionInicial.stripeOnboardingComplete;
    const stripeCargosActivos = configuracionInicial.stripeChargesEnabled;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Pagos</CardTitle>
                <CardDescription>
                    Gestiona cómo tu negocio recibe pagos online.
                    {configuracionInicial._esNuevaConfiguracion && !configuracionInicial.stripeAccountId && (
                        <span className="block mt-1 text-xs text-blue-500">
                            ¡Bienvenido a la configuración de pagos! Conecta Stripe para empezar.
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {successMessage && (
                    <div className="flex items-center gap-2 p-3 text-sm rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                        <CheckCircle size={18} /> {successMessage}
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 p-3 text-sm rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {/* Sección de Conexión con Stripe */}
                <div className="p-4 space-y-3 border rounded-md bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-connect-status" className="text-base font-semibold">
                            Conexión con Stripe
                        </Label>
                        {!stripeConectado && !stripePendiente && (
                            <Button onClick={handleConectarStripe} disabled={isPending} size="sm">
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Conectar con Stripe
                            </Button>
                        )}
                        {stripePendiente && (
                            <Button onClick={handleConectarStripe} disabled={isPending} size="sm" variant="outline">
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Continuar Configuración <ExternalLink size={16} className="ml-2" />
                            </Button>
                        )}
                    </div>

                    {!configuracionInicial.stripeAccountId && (
                        <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                            <Info size={16} /> Stripe no ha sido configurado.
                        </p>
                    )}
                    {stripePendiente && (
                        <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={16} /> Configuración de Stripe iniciada, pero pendiente de completar.
                        </p>
                    )}
                    {stripeConectado && (
                        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle size={16} /> Stripe Conectado Exitosamente.
                            {configuracionInicial.stripeAccountId && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">(ID: {configuracionInicial.stripeAccountId})</span>
                            )}
                        </div>
                    )}
                    {configuracionInicial.stripeAccountId && (!stripeCargosActivos || !configuracionInicial.stripePayoutsEnabled) && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                            <AlertTriangle size={14} className="inline mr-1" />
                            Tu cuenta de Stripe está conectada pero podría no estar completamente activa para procesar cobros o recibir pagos.
                            Esto puede deberse a verificaciones pendientes por parte de Stripe.
                            <Button variant="link" size="sm" onClick={handleConectarStripe} disabled={isPending} className="p-0 ml-1 h-auto text-xs">
                                {isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                Revisar/Completar en Stripe <ExternalLink size={12} className="ml-1" />
                            </Button>
                        </p>
                    )}
                </div>

                {/* Sección de Configuración General de Pagos (solo si Stripe está OK) */}
                {stripeConectado && stripeCargosActivos && (
                    <div className="pt-6 space-y-6 border-t border-zinc-200 dark:border-zinc-700">
                        <div>
                            <Label htmlFor="aceptaPagosOnlineSwitch" className="text-base font-semibold">Habilitar Pagos Online</Label>
                            <div className="flex items-center mt-2 space-x-2">
                                <Switch
                                    id="aceptaPagosOnlineSwitch"
                                    checked={aceptaPagosOnline}
                                    onCheckedChange={setAceptaPagosOnline}
                                    disabled={isPending}
                                />
                                <Label htmlFor="aceptaPagosOnlineSwitch" className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {aceptaPagosOnline ? "Los pagos online están ACTIVADOS para este negocio." : "Los pagos online están DESACTIVADOS."}
                                </Label>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Permite que tu asistente genere links de pago y procese transacciones.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="aceptaMSISwitch" className="text-base font-semibold">Ofrecer Meses sin Intereses (MSI)</Label>
                            <div className="flex items-center mt-2 space-x-2">
                                <Switch
                                    id="aceptaMSISwitch"
                                    checked={aceptaMSI}
                                    onCheckedChange={setAceptaMSI}
                                    disabled={isPending}
                                />
                                <Label htmlFor="aceptaMSISwitch" className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {aceptaMSI ? "MSI están ACTIVADOS (si Stripe y la tarjeta del cliente lo permiten)." : "MSI están DESACTIVADOS."}
                                </Label>
                            </div>
                            {aceptaMSI && (
                                <div className="mt-2">
                                    <Label htmlFor="mesesPermitidosMSI" className="text-sm">Plazos de MSI Preferidos (opcional)</Label>
                                    {/* Aquí iría un MultiSelect o similar para los mesesPermitidosMSI */}
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Ej: 3, 6, 9, 12. Si se deja vacío, Stripe ofrecerá todos los planes disponibles. (Input pendiente de implementar)
                                    </p>
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                        Planes actuales: {configuracionInicial.mesesPermitidosMSI.join(', ') || 'Ninguno específico'}
                                    </p>
                                </div>
                            )}
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Permite a tus clientes pagar en cuotas. La disponibilidad final depende de Stripe y el banco del cliente.
                            </p>
                        </div>

                        {/* Botón de Guardar Configuración (necesitará su propia Server Action) */}
                        {/* <div className="flex justify-end">
                            <Button onClick={handleGuardarConfiguracion} disabled={isPending}>
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar Configuración
                            </Button>
                        </div> */}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}