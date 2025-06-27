'use client';

import React, { useEffect, useState, useCallback, useTransition, useOptimistic } from 'react';
import { toast } from 'react-hot-toast';

// --- Actions and Types ---
import {
    obtenerRedesSocialesNegocio,
    crearRedSocialNegocio,
    actualizarRedSocialNegocio,
    eliminarRedSocialNegocio,
    actualizarOrdenRedesSociales,
} from '@/app/admin/_lib/actions/negocio/redesNegocio.actions';
import type {
    NegocioRedSocialType,
    CrearRedSocialNegocioType,
    ActualizarRedSocialNegocioType
} from '@/app/admin/_lib/actions/negocio/redesNegocio.schemas';

// --- Icons and UI ---
import { Loader2, PlusIcon, PencilIcon, Trash2, Save, Link as LinkIconLucide, GripVertical, Facebook, Instagram, Linkedin, Youtube, Twitter, Globe, Mail, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

// --- DnD Imports ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- CORRECCIÓN: Tipo extendido para manejar el estado optimista ---
type OptimisticNegocioRedSocial = NegocioRedSocialType & { pending?: boolean };


interface Props {
    negocioId: string;
}

const IconMap: { [key: string]: React.ElementType } = {
    facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube,
    twitter: Twitter, x: Twitter, website: Globe, web: Globe, sitio: Globe,
    email: Mail, correo: Mail, whatsapp: MessageSquare, telefono: Phone, link: LinkIconLucide,
};

function SortableRedSocialItem({ redSocial, onEdit, onDelete }: { redSocial: OptimisticNegocioRedSocial; onEdit: () => void; onDelete: () => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: redSocial.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1 };
    const IconComponent = IconMap[redSocial.nombreRed.toLowerCase()] || LinkIconLucide;

    return (
        <li ref={setNodeRef} style={style} className={`flex items-center gap-3 py-2 px-2 border-b border-zinc-700 transition-opacity ${redSocial.pending ? 'opacity-50' : ''}`}>
            <button {...attributes} {...listeners} className="cursor-grab p-1 text-zinc-500 hover:text-zinc-300"><GripVertical size={18} /></button>
            <IconComponent size={18} className="text-zinc-400" />
            <div className="flex-grow overflow-hidden">
                <p className="text-sm font-medium text-zinc-200 truncate">{redSocial.nombreRed}</p>
                <a href={redSocial.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 truncate block">{redSocial.url}</a>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><PencilIcon size={14} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={onDelete}><Trash2 size={14} /></Button>
        </li>
    );
}

export default function NegocioRedes({ negocioId }: Props) {
    const [redes, setRedes] = useState<NegocioRedSocialType[]>([]);
    type OptimisticAction =
        | { action: 'add'; payload: OptimisticNegocioRedSocial }
        | { action: 'update'; payload: Partial<OptimisticNegocioRedSocial> & { id: string } }
        | { action: 'delete'; payload: { id: string } }
        | { action: 'reorder'; payload: OptimisticNegocioRedSocial[] };

    const [optimisticRedes, setOptimisticRedes] = useOptimistic(
        redes,
        (state: OptimisticNegocioRedSocial[], { action, payload }: OptimisticAction): OptimisticNegocioRedSocial[] => {
            switch (action) {
                case 'add':
                    return [...state, { ...payload, pending: true }];
                case 'update':
                    return state.map(r => r.id === payload.id ? { ...r, ...payload, pending: true } : r);
                case 'delete':
                    return state.filter(r => r.id !== payload.id);
                case 'reorder':
                    return payload;
                default:
                    return state;
            }
        }
    );
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRed, setEditingRed] = useState<NegocioRedSocialType | null>(null);

    const fetchRedes = useCallback(async () => {
        const result = await obtenerRedesSocialesNegocio(negocioId);
        if (result.success) {
            setRedes(result.data || []);
        } else {
            toast.error(result.error || "No se pudieron cargar las redes.");
        }
    }, [negocioId]);

    useEffect(() => {
        fetchRedes();
    }, [fetchRedes]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = redes.findIndex((r) => r.id === active.id);
            const newIndex = redes.findIndex((r) => r.id === over.id);
            const reordered = arrayMove(redes, oldIndex, newIndex).map((item, index) => ({ ...item, orden: index }));

            startTransition(async () => {
                setOptimisticRedes({ action: 'reorder', payload: reordered });
                const ordenData = reordered.map(({ id, orden }) => ({ id, orden: orden! }));
                await actualizarOrdenRedesSociales(ordenData);
                setRedes(reordered);
            });
        }
    };

    const handleOpenModal = (red?: NegocioRedSocialType) => {
        setEditingRed(red || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleSave = async (data: CrearRedSocialNegocioType | ActualizarRedSocialNegocioType) => {
        handleCloseModal();
        startTransition(async () => {
            if (editingRed) {
                setOptimisticRedes({ action: 'update', payload: { id: editingRed.id, ...data } });
                await actualizarRedSocialNegocio(editingRed.id, data as ActualizarRedSocialNegocioType);
            } else {
                const optimisticId = `optimistic-${Date.now()}`;
                setOptimisticRedes({
                    action: 'add',
                    payload: {
                        id: optimisticId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        orden: redes.length,
                        nombreRed: (data as CrearRedSocialNegocioType).nombreRed,
                        url: (data as CrearRedSocialNegocioType).url,
                        icono: (data as CrearRedSocialNegocioType).icono ?? null
                    }
                });
                await crearRedSocialNegocio(negocioId, data as CrearRedSocialNegocioType);
            }
            fetchRedes();
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar esta red social?")) return;
        startTransition(async () => {
            setOptimisticRedes({ action: 'delete', payload: { id } });
            await eliminarRedSocialNegocio(id);
            fetchRedes();
        });
    }

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    return (
        <div className="flex flex-col">
            <div className="flex-grow overflow-y-auto mb-3">
                {isPending && redes.length === 0 && <div className="text-center p-4"><Loader2 className="animate-spin" /></div>}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={optimisticRedes.map(r => r.id)} strategy={verticalListSortingStrategy}>
                        {optimisticRedes.length > 0 ? (
                            <ul>
                                {optimisticRedes.map((red) => (
                                    <SortableRedSocialItem
                                        key={red.id}
                                        redSocial={red}
                                        onEdit={() => handleOpenModal(red)}
                                        onDelete={() => handleDelete(red.id)}
                                    />
                                ))}
                            </ul>
                        ) : (
                            !isPending && <p className="text-sm text-center text-zinc-500 py-4">No hay redes sociales.</p>
                        )}
                    </SortableContext>
                </DndContext>
            </div>
            <Button variant="outline" onClick={() => handleOpenModal()}>
                <PlusIcon size={16} className="mr-2" /> Añadir Red Social
            </Button>

            {isModalOpen && (
                <RedSocialModal
                    redSocial={editingRed}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

// --- Componente Modal separado ---

interface ModalProps {
    redSocial: NegocioRedSocialType | null;
    onClose: () => void;
    onSave: (data: CrearRedSocialNegocioType | ActualizarRedSocialNegocioType) => void;
}

function RedSocialModal({ redSocial, onClose, onSave }: ModalProps) {
    const [isPending, startTransition] = useTransition();
    const isEditMode = !!redSocial;

    const [modalData, setModalData] = useState({
        nombreRed: redSocial?.nombreRed || '',
        url: redSocial?.url || '',
        icono: redSocial?.icono || ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setModalData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        startTransition(() => {
            onSave(modalData);
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
                <div>
                    <CardHeader>
                        <CardTitle>{isEditMode ? 'Editar Red Social' : 'Añadir Red Social'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="nombreRed">Nombre Red</Label>
                            <Input id="nombreRed" name="nombreRed" value={modalData.nombreRed} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <Label htmlFor="url">URL Completa</Label>
                            <Input id="url" name="url" type="url" value={modalData.url} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <Label htmlFor="icono">Icono (Opcional)</Label>
                            <Input id="icono" name="icono" value={modalData.icono ?? ''} onChange={handleInputChange} placeholder="Ej: facebook, twitter, link" />
                        </div>
                    </CardContent>
                    <div className="flex justify-end gap-3 p-4 border-t border-zinc-700">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
                        <Button type="button" onClick={handleSubmit} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : <Save />}
                            {isEditMode ? 'Guardar Cambios' : 'Añadir'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
