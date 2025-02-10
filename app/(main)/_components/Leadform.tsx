'use client'
import React from 'react'
import { useState } from 'react';

export default function Leadform() {

    const [formData, setFormData] = useState({
        nombrePersona: '',
        nombreEmpresa: '',
        asunto: '',
        telefono: ''
    });

    const [errors, setErrors] = useState({
        nombrePersona: '',
        nombreEmpresa: '',
        asunto: '',
        telefono: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const validate = () => {
        let valid = true;
        const errors = {
            nombrePersona: '',
            nombreEmpresa: '',
            asunto: '',
            telefono: ''
        };

        if (!formData.nombrePersona) {
            errors.nombrePersona = 'El nombre de la persona es requerido';
            valid = false;
        }
        if (!formData.nombreEmpresa) {
            errors.nombreEmpresa = 'El nombre de la empresa es requerido';
            valid = false;
        }
        if (!formData.asunto) {
            errors.asunto = 'El asunto es requerido';
            valid = false;
        }
        if (!formData.telefono) {
            errors.telefono = 'El teléfono es requerido';
            valid = false;
        } else if (!/^\d+$/.test(formData.telefono)) {
            errors.telefono = 'El teléfono no es válido';
            valid = false;
        }

        setErrors(errors);
        return valid;
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (validate()) {
            // Submit form
            console.log('Form submitted', formData);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>

            <div className='bg-zinc-900 text-zinc-300 p-5 rounded-md w-full m-5 max-w-md border border-zinc-800'>
                <div className='mt-3'>
                    <h2 className='text-2xl mb-5 font-FunnelSans-Medium'>Enviar mensaje</h2>
                </div>

                <form onSubmit={handleSubmit} className='font-FunnelSans-Medium'>
                    <div className='mb-5'>
                        <p className='text-zinc-500 mb-1'>
                            Nombre del interesado
                        </p>
                        <input
                            type="text"
                            name="nombrePersona"
                            value={formData.nombrePersona}
                            onChange={handleChange}
                            className='border border-zinc-800 rounded-md bg-zinc-900 text-zinc-300 w-full py-2'
                        />
                        {errors.nombrePersona && <span>{errors.nombrePersona}</span>}
                    </div>

                    <div className='mb-5'>
                        <p className='text-zinc-500 mb-1'>
                            Nombre del negocio
                        </p>
                        <input
                            type="text"
                            name="nombreEmpresa"
                            value={formData.nombreEmpresa}
                            onChange={handleChange}
                            className='border border-zinc-800 rounded-md bg-zinc-900 text-zinc-300 w-full py-2'
                        />
                        {errors.nombreEmpresa && <span>{errors.nombreEmpresa}</span>}
                    </div>

                    <div className='mb-5'>
                        <p className='text-zinc-500 mb-1'>
                            Asunto
                        </p>
                        <textarea
                            name="asunto"
                            value={formData.asunto}
                            onChange={handleChange}
                            className='border border-zinc-800 rounded-md bg-zinc-900 text-zinc-300 w-full py-2'
                        />
                        {errors.nombreEmpresa && <span>{errors.nombreEmpresa}</span>}
                    </div>

                    <div className='mb-5'>
                        <p className='text-zinc-500 mb-1'>
                            Teléfono
                        </p>
                        <input
                            type="text"
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleChange}
                            className='border border-zinc-800 rounded-md bg-zinc-900 text-zinc-300 w-full py-2'
                        />
                        {errors.telefono && <span>{errors.telefono}</span>}
                    </div>

                    <div className='mt-5 space-y-2'>

                        <button
                            type="submit"
                            className='bg-green-700 text-green-100 border border-green-600 rounded-md w-full py-2'
                        >
                            Enviar mensaje
                        </button>
                        <button
                            type="button"
                            className='bg-red-700 text-red-100 border border-red-600 rounded-md w-full py-2'
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

}
