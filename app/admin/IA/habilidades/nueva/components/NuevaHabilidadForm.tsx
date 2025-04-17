'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Importar useRouter
import { crearHabilidad } from '@/app/admin/_lib/habilidades.actions';


// Tipo simplificado para los datos de ESTE formulario
type HabilidadSimplifiedFormData = {
    nombre: string;
    descripcion?: string | null;
    origen?: string | null;
    version: number;
    status: string;
};

// Tipo para los errores del formulario
type FormErrors = Partial<Record<keyof HabilidadSimplifiedFormData, string>>;

// Estado inicial para el formulario simplificado
const initialState: HabilidadSimplifiedFormData = {
    nombre: '',
    descripcion: '',
    origen: 'sistema',
    version: 1,
    status: 'activo',
};

export default function NuevaHabilidadForm() {
    // Estado para manejar los datos del formulario
    const [formData, setFormData] = useState<HabilidadSimplifiedFormData>(initialState);
    // Estado para manejar los errores de validación
    const [errors, setErrors] = useState<FormErrors>({});
    // Inicializar el router
    const router = useRouter();

    // Manejador genérico para cambios en los inputs, selects y textareas
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? parseInt(value, 10) || 0 : value;

        setFormData(prevState => ({
            ...prevState,
            [name]: value === '' && name !== 'nombre' && type !== 'number' ? null : finalValue,
        }));

        if (errors[name as keyof HabilidadSimplifiedFormData]) {
            setErrors(prevErrors => ({
                ...prevErrors,
                [name]: undefined,
            }));
        }
    };

    // Función de validación
    const validateForm = (): FormErrors => {
        const newErrors: FormErrors = {};
        if (!formData.nombre || formData.nombre.trim() === '') {
            newErrors.nombre = 'El nombre es obligatorio.';
        }
        if (!formData.status) {
            newErrors.status = 'El status es obligatorio.';
        }
        if (formData.version < 1) {
            newErrors.version = 'La versión debe ser al menos 1.';
        }
        return newErrors;
    };

    // Manejador para el envío del formulario
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const validationErrors = validateForm();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length === 0) {
            console.log('Datos del formulario válidos:', formData);
            await crearHabilidad(formData)
                .then((result) => {
                    console.log('Habilidad creada con éxito');
                    router.push(`/admin/IA/habilidades/${result.id}`); // Redirigir a la lista de habilidades
                })
                .catch((error) => {
                    console.error('Error al crear la habilidad:', error);
                    setErrors({ nombre: 'Error al crear la habilidad. Inténtalo de nuevo.' });
                });
            // Opcional: Resetear formulario después de enviar
            // setFormData(initialState);
        } else {
            console.log('Errores de validación:', validationErrors);
        }
    };

    // Manejador para el botón Cancelar
    const handleCancel = () => {
        router.back(); // Navega a la página anterior
    };

    // Clases comunes para los inputs/selects/textarea según lo solicitado
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500";
    const labelBaseClasses = "text-zinc-300 block mb-1"; // Clase para labels
    const errorTextClasses = "text-red-500 text-sm mt-1"; // Clase para texto de error
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out";


    return (
        <div className="p-4 max-w-2xl mx-auto bg-zinc-800 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-white mb-4">Crear Nueva Habilidad (Simplificado)</h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Campo Nombre (Obligatorio) */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>
                        Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className={`${inputBaseClasses} ${errors.nombre ? 'border-red-500' : 'border-zinc-700'}`}
                        required
                        aria-describedby={errors.nombre ? "nombre-error" : undefined}
                    />
                    {errors.nombre && <p id="nombre-error" className={errorTextClasses} role="alert">{errors.nombre}</p>}
                </div>

                {/* Campo Descripción (Opcional) */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>
                        Descripción
                    </label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={`${inputBaseClasses} h-24`}
                    />
                </div>

                {/* Campo Origen (Opcional) */}
                <div>
                    <label htmlFor="origen" className={labelBaseClasses}>
                        Origen
                    </label>
                    <select
                        id="origen"
                        name="origen"
                        value={formData.origen || ''}
                        onChange={handleChange}
                        className={inputBaseClasses}
                    >
                        <option value="">Selecciona un origen</option>
                        <option value="sistema">Sistema</option>
                        <option value="cliente">Cliente</option>
                    </select>
                </div>

                {/* Campo Versión (Obligatorio) */}
                <div>
                    <label htmlFor="version" className={labelBaseClasses}>
                        Versión <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="version"
                        name="version"
                        value={formData.version}
                        onChange={handleChange}
                        className={`${inputBaseClasses} ${errors.version ? 'border-red-500' : 'border-zinc-700'}`}
                        required
                        min="1"
                        step="1"
                        aria-describedby={errors.version ? "version-error" : undefined}
                    />
                    {errors.version && <p id="version-error" className={errorTextClasses} role="alert">{errors.version}</p>}
                </div>

                {/* Campo Status (Obligatorio) */}
                <div>
                    <label htmlFor="status" className={labelBaseClasses}>
                        Status <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className={`${inputBaseClasses} ${errors.status ? 'border-red-500' : 'border-zinc-700'}`}
                        required
                        aria-describedby={errors.status ? "status-error" : undefined}
                    >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                        <option value="borrador">Borrador</option>
                    </select>
                    {errors.status && <p id="status-error" className={errorTextClasses} role="alert">{errors.status}</p>}
                </div>

                {/* Botones de Acción */}
                <div className="pt-4 space-y-2"> {/* Agrupador para botones con espacio */}
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                    >
                        Crear Habilidad
                    </button>
                    <button
                        type="button" // Importante para no enviar el formulario
                        onClick={handleCancel}
                        className={`${buttonBaseClasses} bg-red-600 hover:bg-red-700 focus:ring-red-500`}
                    >
                        Cancelar
                    </button>
                </div>

            </form>
        </div>
    );
}
