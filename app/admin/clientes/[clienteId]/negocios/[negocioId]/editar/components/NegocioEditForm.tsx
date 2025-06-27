'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import slugify from 'slugify';

// --- Acciones y Esquemas ---
import {
    getNegocioProfileForEdit,
    updateNegocioProfile,
    verifySlugUniqueness
} from '@/app/admin/_lib/actions/negocio/negocio.actions';
import {
    UpdateNegocioProfileInputSchema
} from '@/app/admin/_lib/actions/negocio/negocio.schemas';
import type {
    UpdateNegocioProfileInputType
} from '@/app/admin/_lib/actions/negocio/negocio.schemas';

// --- Sub-components y UI ---
import NegocioImagenLogo from './NegocioImagenLogo';
import NegocioRedes from './NegocioRedes';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Loader2, Save, Building, Phone, Link as LinkIcon } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string;
}

export default function NegocioEditForm({ negocioId }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [slugStatus, setSlugStatus] = useState<{ isLoading: boolean; isUnique: boolean | null; message: string | null }>({ isLoading: false, isUnique: null, message: null });

    const {
        control,
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<UpdateNegocioProfileInputType>({
        // Se elimina el 'resolver' para evitar la dependencia y el error.
    });

    const watchNombre = watch('nombre');
    const watchSlug = watch('slug');

    const fetchProfile = useCallback(() => {
        startTransition(async () => {
            const result = await getNegocioProfileForEdit(negocioId);
            if (result.success && result.data) {
                reset(result.data);
            } else {
                setError(result.error ?? null);
            }
        });
    }, [negocioId, reset]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (watchNombre) {
            const slugSugerido = slugify(watchNombre, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
            if (watchSlug !== slugSugerido) {
                setValue('slug', slugSugerido, { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [watchNombre, setValue, watchSlug]);

    const handleVerifySlug = async () => {
        const slug = watch('slug');
        if (!slug) return;
        setSlugStatus({ isLoading: true, isUnique: null, message: null });
        const result = await verifySlugUniqueness({ slug, negocioIdActual: negocioId });
        if (result.success && result.data) {
            setSlugStatus({ isLoading: false, isUnique: result.data.isUnique, message: result.data.isUnique ? 'Slug disponible' : `No disponible. Sugerencia: ${result.data.suggestion}` });
        } else {
            setSlugStatus({ isLoading: false, isUnique: false, message: result.error ?? null });
        }
    };

    const onSubmit: SubmitHandler<UpdateNegocioProfileInputType> = (data) => {
        const validationResult = UpdateNegocioProfileInputSchema.safeParse(data);

        if (!validationResult.success) {
            toast.error("Hay errores en el formulario. Por favor, revísalo.");
            console.error("Errores de validación:", validationResult.error.flatten().fieldErrors);
            return;
        }

        startTransition(async () => {
            const result = await updateNegocioProfile(negocioId, validationResult.data);
            if (result.success && result.data) {
                reset(result.data);
                toast.success("Perfil del negocio actualizado.");
            } else {
                toast.error(result.error || "No se pudo actualizar el perfil.");
            }
        });
    };

    if (isPending && !isDirty) {
        return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex justify-end mb-4">
                <Button type="submit" disabled={isSubmitting || isPending || !isDirty}>
                    {isSubmitting || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Building />Identidad del Negocio</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <NegocioImagenLogo negocioId={negocioId} initialLogoUrl={watch('logo')} />

                            <div>
                                <Label htmlFor="nombre">Nombre del Negocio</Label>
                                <Input id="nombre" {...register("nombre")} />
                                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
                            </div>

                            <div>
                                <Label htmlFor="slug">URL Amigable (Slug)</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="slug" {...register("slug")} />
                                    <Button type="button" variant="outline" onClick={handleVerifySlug} disabled={slugStatus.isLoading}>
                                        {slugStatus.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
                                    </Button>
                                </div>
                                {slugStatus.message && <p className={`text-xs mt-1 ${slugStatus.isUnique ? 'text-green-500' : 'text-red-500'}`}>{slugStatus.message}</p>}
                            </div>

                            <div>
                                <Label htmlFor="slogan">Slogan</Label>
                                <Input id="slogan" {...register("slogan")} />
                            </div>
                            <div>
                                <Label htmlFor="paginaWeb">Página Web</Label>
                                <Input id="paginaWeb" {...register("paginaWeb")} placeholder="https://..." />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Phone />Información de Contacto</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="telefonoLlamadas">Teléfono (Llamadas)</Label>
                                <Input id="telefonoLlamadas" {...register("telefonoLlamadas")} />
                            </div>
                            <div>
                                <Label htmlFor="telefonoWhatsapp">Teléfono (WhatsApp)</Label>
                                <Input id="telefonoWhatsapp" {...register("telefonoWhatsapp")} />
                            </div>
                            <div>
                                <Label htmlFor="email">Email Principal</Label>
                                <Input id="email" type="email" {...register("email")} />
                            </div>
                            <div>
                                <Label htmlFor="direccion">Dirección Física</Label>
                                <Textarea id="direccion" {...register("direccion")} />
                            </div>
                            <div>
                                <Label htmlFor="googleMaps">Enlace Google Maps</Label>
                                <Input id="googleMaps" {...register("googleMaps")} placeholder="https://..." />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon />Redes Sociales</CardTitle></CardHeader>
                        <CardContent>
                            <NegocioRedes negocioId={negocioId} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Estado</CardTitle></CardHeader>
                        <CardContent>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="status-switch"
                                            checked={field.value === 'activo'}
                                            onCheckedChange={(checked) => field.onChange(checked ? 'activo' : 'inactivo')}
                                        />
                                        <Label htmlFor="status-switch" className="capitalize">{field.value}</Label>
                                    </div>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </form>
    );
}
