import React, { useState } from 'react';

interface LeadFormProps {
    titulo: string;
    descripcion: string;
    telefono: string;
    email: string;
}

const LeadForm: React.FC<LeadFormProps> = ({ titulo, descripcion }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        correo: '',
        asunto: '',
    });

    const [errors, setErrors] = useState({
        nombre: '',
        telefono: '',
        correo: '',
        asunto: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'telefono') {
            if (value.length !== 10) {
                setErrors({ ...errors, telefono: 'El teléfono debe tener 10 caracteres.' });
            } else {
                setErrors({ ...errors, telefono: '' });
            }
        } else {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let isValid = true;
        const newErrors = { ...errors };

        if (!formData.nombre) {
            newErrors.nombre = 'El nombre es obligatorio.';
            isValid = false;
        }
        if (!formData.telefono) {
            newErrors.telefono = 'El teléfono es obligatorio.';
            isValid = false;
        } else if (formData.telefono.length !== 10) {
            newErrors.telefono = 'El teléfono debe tener 10 caracteres.';
            isValid = false;
        }
        if (!formData.correo) {
            newErrors.correo = 'El correo es obligatorio.';
            isValid = false;
        }
        if (!formData.asunto) {
            newErrors.asunto = 'El asunto es obligatorio.';
            isValid = false;
        }

        setErrors(newErrors);

        if (isValid) {
            console.log(formData);
        }
    };

    return (
        <div className="bg-zinc-800 p-5 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-3">{titulo}</h2>
            <p className="text-gray-400 mb-4 text-sm">{descripcion}</p>

            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="nombre" className="block text-gray-300 mb-1 text-sm">
                        Nombre
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        placeholder='Nombre'
                        value={formData.nombre}
                        onChange={handleChange}
                        className="bg-zinc-900 border border-zinc-800 p-3 rounded-md w-full text-white text-sm"
                    />
                    {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                </div>

                <div className="mb-3">
                    <label htmlFor="telefono" className="block text-gray-300 mb-1 text-sm">
                        Teléfono
                    </label>
                    <input
                        type="number"
                        id="telefono"
                        name="telefono"
                        placeholder='Teléfono'
                        value={formData.telefono}
                        onChange={handleChange}
                        className="bg-zinc-900 border border-zinc-800 p-3 rounded-md w-full text-white text-sm"
                    />
                    {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
                </div>

                <div className="mb-3">
                    <label htmlFor="correo" className="block text-gray-300 mb-1 text-sm">
                        Correo
                    </label>
                    <input
                        type="email"
                        id="correo"
                        name="correo"
                        placeholder='Correo'
                        value={formData.correo}
                        onChange={handleChange}
                        className="bg-zinc-900 border border-zinc-800 p-3 rounded-md w-full text-white text-sm"
                    />
                    {errors.correo && <p className="text-red-500 text-xs mt-1">{errors.correo}</p>}
                </div>

                <div className="mb-3">
                    <label htmlFor="asunto" className="block text-gray-300 mb-1 text-sm">
                        Asunto
                    </label>
                    <textarea
                        id="asunto"
                        name="asunto"
                        value={formData.asunto}
                        onChange={handleChange}
                        className="bg-zinc-900 border border-zinc-800 p-3 rounded-md w-full text-white text-sm"
                    ></textarea>
                    {errors.asunto && <p className="text-red-500 text-xs mt-1">{errors.asunto}</p>}
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md w-full text-sm"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
};

export default LeadForm;