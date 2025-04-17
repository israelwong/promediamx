import React, { useState, useEffect } from 'react';
import { obtenerAsistenteVirtual } from '@/app/admin/_lib/asistenteVirtuai.actions';
import { AsistenteVirtual } from '@/app/admin/_lib/types';

interface AsistenteFormEditarProps {
    asistenteId: string;
}

export default function AsistenteFormEditar({ asistenteId }: AsistenteFormEditarProps) {
    // Removed unused 'asistente' state
    const [formData, setFormData] = useState<AsistenteVirtual | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAsistente = async () => {
            try {
                const data = await obtenerAsistenteVirtual(asistenteId);
                // Removed setting 'asistente' as it is unused
                setFormData(data); // Inicializa formData con los datos del asistente
            } catch (err) {
                setError('Error al cargar el asistente virtual');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAsistente();
    }, [asistenteId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center w-full h-screen">
                <p>Cargando...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center w-full h-screen">
                <p>{error}</p>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="flex items-center justify-center w-full h-screen">
                <p>No se encontraron datos del asistente.</p>
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (!prev) {
                return null; // Si prev es nulo, no se puede modificar
            }
            return {
                ...prev,
                [name]: value,
            } as AsistenteVirtual; // Asegúrate de que el objeto resultante sea del tipo AsistenteVirtual
        });
    };

    const handleNestedChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof AsistenteVirtual) => {
        const { value } = e.target;
        setFormData((prev) => {
            if (!prev) {
                return null; // Si prev es nulo, no se puede modificar
            }
            return {
                ...prev,
                [key]: {
                    ...(typeof prev[key] === 'object' && prev[key] !== null ? prev[key] : {}),
                    numero: value,
                },
            } as AsistenteVirtual; // Asegúrate de que el objeto resultante sea del tipo AsistenteVirtual
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Formulario enviado:', formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            <div className="mb-8 flex justify-between items-center">

                <h1 className="text-2xl font-bold">Asistente Virtual {formData.nombre}</h1>

                <div className="flex items-center space-x-4">
                    {/* status */}
                    <div className="flex items-center space-x-2">
                        <label className="block text-sm font-medium text-zinc-200">Status:</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="status"
                                checked={formData.status === 'activo'}
                                onChange={(e) =>
                                    handleChange({
                                        target: {
                                            name: 'status',
                                            value: e.target.checked ? 'activo' : 'inactivo',
                                        },
                                    } as React.ChangeEvent<HTMLInputElement>)
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-zinc-600 peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-zinc-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        </label>
                    </div>

                    <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Actualizar Asistente
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Columna 1: Información General */}
                <div className="p-5 border border-zinc-800 bg-zinc-900/50 space-y-4 rounded-md mb-5">
                    <div className='p-5space-y-4 rounded-md mb-5 flex justify-center items-center'>
                        <div className="w-52 h-52 rounded-full bg-zinc-700 flex justify-center items-center">
                            Foto
                        </div>
                    </div>

                    {/* Datos del asistente virtual */}
                    <div className="grid grid-cols-3 gap-4 items-center mb-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-zinc-200">Nombre:</label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-zinc-200">Versión:</label>
                            <input
                                type="text"
                                name="version"
                                value={formData.version || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-200">Fecha de creación:</label>
                            <p className="italic mt-1 block w-full text-zinc-500 text-sm">
                                {formData.createdAt ? new Date(formData.createdAt).toISOString() : ''}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-200">Fecha de actualización:</label>
                            <p className="italic mt-1 block w-full text-zinc-500 text-sm">
                                {formData.updatedAt ? new Date(formData.updatedAt).toISOString() : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div>

                    <div className="p-5 border border-zinc-800 bg-zinc-900/50 space-y-4 rounded-md mb-5">
                        <h2 className="text-xl mb-2">Whatsapp Business API</h2>
                        <div>
                            <label className="block text-sm font-medium text-zinc-200">Número WhatsApp Business</label>
                            <input
                                type="text"
                                name="numeroWhatsappBusinessId"
                                value={formData.whatsappBusiness || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-200">Número WhatsApp Business:</label>
                            <input
                                type="text"
                                name="numeroWhatsappBusiness.numero"
                                value={formData.phoneNumberId || ''}
                                onChange={(e) => handleNestedChange(e, 'phoneNumberId')}
                                className="mt-1 block w-full bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md"
                            />
                        </div>
                        <div className='flex flex-grow justify-between items-end'>
                            <div className="flex-grow mr-4">
                                <label className="block text-sm font-medium text-zinc-200">Token:</label>
                                <input
                                    type="text"
                                    name="token"
                                    value={formData.token || ''} // Asegúrate de que formData tenga un campo 'token'
                                    onChange={handleChange}
                                    className="mt-1 block bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md w-full"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    console.log('Generar token');
                                }}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Generar Token
                            </button>
                        </div>
                        <p className="text-sm text-zinc-500">
                            <span className='underline'>Instrucciones</span>: Ingresa el token generado en Whatsapp Business API y presiona Generar token para la conversión a token de larga duración
                        </p>
                    </div>
                </div>

                <div className="p-5 border border-zinc-800 bg-zinc-900/50 space-y-4 rounded-md mb-5">
                    <h2 className="text-xl mb-2">Human in the loop</h2>
                    <p className='text-sm text-zinc-500'>¿Quién es el responsable de la gestión de la conversación cuando no hay respuesta definida?</p>
                    <div>
                        <label className="block text-sm font-medium text-zinc-200">Nonbre del responsable:</label>
                        <input
                            type="text"
                            name="whatsappHITL"
                            value={formData.nombreHITL || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-200">WhatsApp:</label>
                        <input
                            type="text"
                            name="whatsappHITL"
                            value={formData.whatsappHITL || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-200">Email:</label>
                        <input
                            type="email"
                            name="emailHITL"
                            value={formData.emailHITL || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-zinc-900 border border-zinc-700 p-2 text-zinc-300 rounded-md"
                        />
                    </div>
                </div>

            </div>

        </form>
    );
}