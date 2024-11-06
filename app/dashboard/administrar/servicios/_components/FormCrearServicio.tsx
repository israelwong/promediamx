'use client'
import React, { useState } from 'react'
import { Servicio } from '../../../../_lib/Types'
import { crearServicio } from '../../../../_lib/Servicios'
import { useRouter } from 'next/navigation'

function FormCrearServicio() {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState('');
    const [cuota_mensual, setCuotaMensual] = useState('');
    const [cuota_anual, setCuotaAnual] = useState('');
    const [status, setStatus] = useState('');
    const [errors, setErrors] = useState({ nombre: '', status: '' });
    const [actionStatus, setActionStatus] = useState({ status: '', message: '' });
    const [validando, setValidando] = useState(false);
    const router = useRouter();

    const validate = () => {
        const tempErrors = { nombre: '', precio: '', unidad: '', status: '' };
        let isValid = true;

        if (nombre.trim().length === 0) {
            tempErrors.nombre = 'El nombre es requerido';
            isValid = false;
        }

        if (status.trim().length === 0) {
            tempErrors.status = 'El status es requerido';
            isValid = false;
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setValidando(true);
            const nuevoServicio: Servicio = {
                nombre,
                descripcion,
                precio: parseFloat(precio),
                cuota_mensual: parseFloat(cuota_mensual),
                cuota_anual: parseFloat(cuota_anual),
                status
            };

            const response = await crearServicio(nuevoServicio);
            if (!response.success) {
                setActionStatus({ status: 'error', message: response.message });
            }
            if (response.success) {
                setActionStatus({ status: 'success', message: response.message });
                setTimeout(() => {
                    router.push('/dashboard/administrar/servicios');
                }, 2000);
            }
            setValidando(false);
        }
    };

    return (
        <div className="max-w-sm p-5">
            <h1 className="text-3xl mb-5">Crear servicio</h1>
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex flex-col">
                    <label htmlFor="nombre" className="mb-2 text-sm font-medium text-gray-400">Nombre</label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    {errors.nombre && <span className="text-red-500 text-sm">{errors.nombre}</span>}
                </div>

                <div className="flex flex-col">
                    <label htmlFor="descripcion" className="mb-2 text-sm font-medium text-gray-400">Descripción</label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="precio" className="mb-2 text-sm font-medium text-gray-400">Precio</label>
                    <input
                        type="text"
                        id="precio"
                        name="precio"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="cuota_mensual" className="mb-2 text-sm font-medium text-gray-400">Cuota mensual</label>
                    <input
                        type="text"
                        id="cuota_mensual"
                        name="cuota_mensual"
                        value={cuota_mensual}
                        onChange={(e) => setCuotaMensual(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="cuota_anual" className="mb-2 text-sm font-medium text-gray-400">Cuota anual</label>
                    <input
                        type="text"
                        id="cuota_anual"
                        name="cuota_anual"
                        value={cuota_anual}
                        onChange={(e) => setCuotaAnual(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="status" className="mb-2 text-sm font-medium text-gray-400">Status</label>
                    <select
                        id="status"
                        name="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                        <option value="">Selecciona un status</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                    {errors.status && <span className="text-red-500 text-sm">{errors.status}</span>}
                </div>

                <div className=''>
                    {actionStatus.status === 'error' && <span className="text-red-500 text-sm">{actionStatus.message}</span>}
                    {actionStatus.status === 'success' && <span className="text-green-500 text-sm">{actionStatus.message}</span>}
                </div>

                <div className="flex space-x-4">
                    <button type="button" className="flex-1 px-4 py-2 font-medium text-white bg-gray-600 rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        onClick={() => router.back()}
                    >
                        Cancelar
                    </button>

                    <button type="submit" className="flex-1 px-4 py-2 font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        disabled={validando}
                    >
                        Crear servicio
                    </button>

                </div>
            </form>
        </div>
    )
}

export default FormCrearServicio