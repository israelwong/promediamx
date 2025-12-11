//ruta : app/admin/clientes/[clienteId]/negocios/[negocioId]/pagos/components/PagosConfiguracion.tsx
'use client';

import React, { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import { type NegocioConfiguracionPago } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.schemas';
import { iniciarConexionStripeAction } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.actions';
// Necesitaremos una nueva action para guardar la configuración de OXXO/MSI en el futuro
import { actualizarOpcionesPagoAction } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.actions';


import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox'; // Asumiendo que tienes Checkbox
import { Loader2, ExternalLink, CheckCircle, AlertTriangle, Info, CreditCard } from 'lucide-react';

interface PagosConfiguracionProps {
    configuracionInicial: (NegocioConfiguracionPago & { _esNuevaConfiguracion?: boolean }) | null;
    negocioId: string;
}

const PLAZOS_MSI_DISPONIBLES = [3, 6, 9, 12, 18, 24]; // Plazos comunes que podrías ofrecer

export default function PagosConfiguracion({ configuracionInicial, negocioId }: PagosConfiguracionProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isConnectingStripe, startConnectingStripeTransition] = useTransition();
    const [isSavingConfig, startSavingConfigTransition] = useTransition(); // Para el futuro botón de guardar

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [feedbackTimeoutId, setFeedbackTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // Estados para las opciones de pago
    const [aceptaPagosOnline, setAceptaPagosOnline] = useState(configuracionInicial?.aceptaPagosOnline || false);
    const [aceptaMSI, setAceptaMSI] = useState(configuracionInicial?.aceptaMesesSinIntereses || false);
    const [mesesSeleccionadosMSI, setMesesSeleccionadosMSI] = useState<number[]>(configuracionInicial?.mesesPermitidosMSI || []);
    const [aceptaOxxoPay, setAceptaOxxoPay] = useState(configuracionInicial?.aceptaOxxoPay || false); // Asumiendo que añades 'aceptaOxxoPay' a tu schema y modelo

    const clearFeedback = useCallback(() => {
        if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId);
        setSuccessMessage(null); setError(null); setFeedbackTimeoutId(null);
    }, [feedbackTimeoutId]);

    useEffect(() => {
        const stripeReturn = searchParams?.get('stripe_return');
        const stripeRefresh = searchParams?.get('stripe_refresh');
        const paramsAlreadyProcessed = searchParams?.get('params_stripe_processed');

        let needsUrlUpdate = false;
        let messageToShow: { type: 'success' | 'error'; text: string } | null = null;

        if (paramsAlreadyProcessed !== 'true') {
            if (stripeReturn === 'true') {
                messageToShow = { type: 'success', text: "¡Proceso de Stripe completado! Refrescando datos..." };
                router.refresh();
                needsUrlUpdate = true;
            } else if (stripeRefresh === 'true') {
                messageToShow = { type: 'error', text: "El enlace de configuración de Stripe expiró o fue inválido. Por favor, intenta conectar de nuevo." };
                needsUrlUpdate = true;
            }
        }

        if (messageToShow) {
            clearFeedback();
            if (messageToShow.type === 'success') setSuccessMessage(messageToShow.text);
            else setError(messageToShow.text);
            const newTimeout = setTimeout(clearFeedback, 5000);
            setFeedbackTimeoutId(newTimeout);
        }

        if (needsUrlUpdate) {
            const newUrlParams = new URLSearchParams(Array.from((searchParams ?? new URLSearchParams()).entries()));
            newUrlParams.delete('stripe_return'); newUrlParams.delete('stripe_refresh');
            newUrlParams.set('params_stripe_processed', 'true');
            router.replace(`${pathname}?${newUrlParams.toString()}`, { scroll: false });
        }
        return () => { if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, pathname, router, clearFeedback]);

    const handleConectarStripe = () => {
        clearFeedback();
        startConnectingStripeTransition(async () => {
            const result = await iniciarConexionStripeAction({ negocioId });
            if (result.success && result.data?.onboardingUrl) {
                window.location.href = result.data.onboardingUrl;
            } else {
                setError(result.error || 'Ocurrió un error al conectar con Stripe.');
            }
        });
    };

    const handleToggleMSI = (checked: boolean) => {
        setAceptaMSI(checked);
        if (!checked) {
            setMesesSeleccionadosMSI([]); // Limpiar selección si se desactiva MSI
        }
    };

    const handleMesMSIChange = (mes: number) => {
        setMesesSeleccionadosMSI(prev =>
            prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes].sort((a, b) => a - b)
        );
    };

    const handleGuardarConfiguracionPagos = () => {
        clearFeedback();
        startSavingConfigTransition(async () => {
            const result = await actualizarOpcionesPagoAction({
                negocioId,
                aceptaPagosOnline,
                aceptaOxxoPay,
                aceptaMesesSinIntereses: aceptaMSI,
                mesesPermitidosMSI: mesesSeleccionadosMSI,
            });
            if (result.success) {
                setSuccessMessage("Configuración de pagos guardada.");
                router.refresh(); // Para obtener la configuracionInicial actualizada
            } else {
                setError(result.error || "Error al guardar configuración.");
            }
            const newTimeout = setTimeout(clearFeedback, 3000);
            setFeedbackTimeoutId(newTimeout);
            console.log("Guardando config:", { aceptaPagosOnline, aceptaOxxoPay, aceptaMSI, mesesSeleccionadosMSI });
            // Simulación
            // setSuccessMessage("Configuración guardada (simulación).");
            // const newTimeout = setTimeout(clearFeedback, 3000);
            // setFeedbackTimeoutId(newTimeout);
        });
    };


    if (!configuracionInicial) { /* ... (código de error si no hay configuracionInicial) ... */
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
                    {/* ... (mensaje de bienvenida) ... */}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {successMessage && ( /* ... (mensaje de éxito) ... */
                    <div className="flex items-center gap-2 p-3 text-sm rounded-md bg-green-500/10 text-green-700 dark:text-green-300 border border-green-700/30">
                        <CheckCircle size={18} /> {successMessage}
                    </div>
                )}
                {error && ( /* ... (mensaje de error) ... */
                    <div className="flex items-center gap-2 p-3 text-sm rounded-md bg-red-500/10 text-red-700 dark:text-red-300 border border-red-700/30">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {/* Sección de Conexión con Stripe (sin cambios mayores) */}
                <div className="p-4 space-y-3 border rounded-md bg-zinc-800/30 border-zinc-700">
                    {/* ... (contenido de conexión Stripe como lo tenías) ... */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-connect-status" className="text-base font-semibold text-zinc-100">
                            Conexión con Stripe
                        </Label>
                        {!stripeConectado && !stripePendiente && (
                            <Button onClick={handleConectarStripe} disabled={isConnectingStripe} size="sm">
                                {isConnectingStripe && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Conectar con Stripe
                            </Button>
                        )}
                        {stripePendiente && (
                            <Button onClick={handleConectarStripe} disabled={isConnectingStripe} size="sm" variant="outline">
                                {isConnectingStripe && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Continuar Configuración <ExternalLink size={16} className="ml-2" />
                            </Button>
                        )}
                    </div>

                    {!configuracionInicial.stripeAccountId && (
                        <p className="flex items-center gap-2 text-sm text-amber-500">
                            <Info size={16} /> Stripe no ha sido configurado.
                        </p>
                    )}
                    {stripePendiente && (
                        <p className="flex items-center gap-2 text-sm text-amber-500">
                            <AlertTriangle size={16} /> Configuración de Stripe iniciada, pero pendiente de completar.
                        </p>
                    )}
                    {stripeConectado && (
                        <div className="flex items-center gap-2 text-sm text-green-400">
                            <CheckCircle size={16} /> Stripe Conectado Exitosamente.
                            {configuracionInicial.stripeAccountId && (
                                <span className="text-xs text-zinc-400">(ID: {configuracionInicial.stripeAccountId})</span>
                            )}
                        </div>
                    )}
                    {configuracionInicial.stripeAccountId && (!stripeCargosActivos || !configuracionInicial.stripePayoutsEnabled) && (
                        <p className="mt-2 text-xs text-amber-500">
                            <AlertTriangle size={14} className="inline mr-1" />
                            Tu cuenta de Stripe está conectada pero podría no estar completamente activa.
                            <Button variant="link" size="sm" onClick={handleConectarStripe} disabled={isConnectingStripe} className="p-0 ml-1 h-auto text-xs text-blue-400 hover:text-blue-300">
                                {isConnectingStripe ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                Revisar/Completar en Stripe <ExternalLink size={12} className="ml-1" />
                            </Button>
                        </p>
                    )}
                </div>

                {/* Sección de Configuración General de Pagos */}
                {stripeConectado && stripeCargosActivos && (
                    <div className="pt-6 space-y-6 border-t border-zinc-700">
                        {/* Habilitar Pagos Online (como estaba) */}
                        <div>
                            <Label htmlFor="aceptaPagosOnlineSwitch" className="text-base font-semibold text-zinc-100">Habilitar Pagos Online</Label>
                            {/* ... (Switch y descripción como lo tenías) ... */}
                            <div className="flex items-center mt-2 space-x-2">
                                <Switch id="aceptaPagosOnlineSwitch" checked={aceptaPagosOnline} onCheckedChange={setAceptaPagosOnline} />
                                <Label htmlFor="aceptaPagosOnlineSwitch" className="text-sm text-zinc-400">
                                    {aceptaPagosOnline ? "Pagos online ACTIVADOS" : "Pagos online DESACTIVADOS"}
                                </Label>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Permite que tu asistente genere links de pago y procese transacciones.</p>
                        </div>

                        {/* NUEVO: OXXO Pay */}
                        <div>
                            <Label htmlFor="aceptaOxxoPaySwitch" className="text-base font-semibold text-zinc-100 flex items-center">
                                <Image
                                    src="https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/pasarela/oxxo.svg"
                                    alt="OXXO Pay"
                                    width={24}
                                    height={20}
                                    className="h-5 w-auto mr-2"
                                    unoptimized
                                />
                                Aceptar Pagos con OXXO Pay
                            </Label>
                            <div className="flex items-center mt-2 space-x-2">
                                <Switch
                                    id="aceptaOxxoPaySwitch"
                                    checked={aceptaOxxoPay}
                                    onCheckedChange={setAceptaOxxoPay}
                                // disabled={isSavingConfig}
                                />
                                <Label htmlFor="aceptaOxxoPaySwitch" className="text-sm text-zinc-400">
                                    {aceptaOxxoPay ? "OXXO Pay está ACTIVADO." : "OXXO Pay está DESACTIVADO."}
                                </Label>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                                Permite a tus clientes pagar en efectivo en tiendas OXXO.
                                <span className="block mt-1 text-amber-500">
                                    <Info size={12} className="inline mr-1" />
                                    Comisión de Stripe para OXXO Pay: ~3.9% + IVA (aprox.). Comisión ProMedia: 3%. Total aprox: ~6.9% + IVA.
                                </span>
                            </p>
                        </div>

                        {/* NUEVO: Meses sin Intereses (MSI) */}
                        <div>
                            <Label htmlFor="aceptaMSISwitch" className="text-base font-semibold text-zinc-100 flex items-center">
                                <CreditCard size={20} className="mr-2 text-blue-400" />
                                Ofrecer Meses sin Intereses (MSI)
                            </Label>
                            <div className="flex items-center mt-2 space-x-2">
                                <Switch
                                    id="aceptaMSISwitch"
                                    checked={aceptaMSI}
                                    onCheckedChange={handleToggleMSI}
                                // disabled={isSavingConfig}
                                />
                                <Label htmlFor="aceptaMSISwitch" className="text-sm text-zinc-400">
                                    {aceptaMSI ? "MSI están ACTIVADOS." : "MSI están DESACTIVADOS."}
                                </Label>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                                La disponibilidad final depende de Stripe, el banco del cliente y el monto de la compra.
                                <span className="block mt-1 text-amber-500">
                                    <Info size={12} className="inline mr-1" />
                                    Stripe cobra comisiones adicionales por cada plazo de MSI (ej. 3 meses: +4.99%, 12 meses: +12.99%, etc., más IVA aprox.). Comisión ProMedia: 3%.
                                </span>
                            </p>

                            {aceptaMSI && (
                                <div className="mt-4 pl-4 border-l-2 border-zinc-700">
                                    <Label className="text-sm font-medium text-zinc-200">Seleccionar Plazos de MSI Disponibles:</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                        {PLAZOS_MSI_DISPONIBLES.map(mes => (
                                            <div key={mes} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`msi-${mes}`}
                                                    checked={mesesSeleccionadosMSI.includes(mes)}
                                                    onCheckedChange={() => handleMesMSIChange(mes)}
                                                // disabled={isSavingConfig}
                                                />
                                                <Label htmlFor={`msi-${mes}`} className="text-sm font-normal text-zinc-300">
                                                    {mes} meses
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-zinc-500">
                                        Selecciona los plazos que quieres ofrecer a tus clientes.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Botón de Guardar Configuración (descomentar cuando la action esté lista) */}
                        <div className="flex justify-end pt-6 border-t border-zinc-700">
                            <Button
                                onClick={handleGuardarConfiguracionPagos}
                                disabled={isSavingConfig || isConnectingStripe}
                                // disabled={true} // Deshabilitado hasta que se implemente la action
                                variant="default" // O la variante primaria que uses
                            >
                                {isSavingConfig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar Configuración de Pagos
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

