'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation'; // Importa useSearchParams
import { useRouter } from 'next/navigation';
import Header from './Header';
import Footer from '../../components/Footer';


export default function Leadform() {
    const searchParams = useSearchParams();
    const promoid = searchParams ? searchParams.get('promoid') : null;
    const router = useRouter();
    console.log(promoid);

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
        <div className="container mx-auto">

            <div className="mb-5">
                <Header
                    nombre='Prosocial'
                    slogan="Momentos para toda la vida"
                    url_image="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia//favicon_fullcolor.svg"
                    web="https://www.prosocial.mx"
                />
            </div>

            <div className='px-5 py-1'>
                <p className='text-zinc-300 font-FunnelSans-Medium text-2xl mb-2'>
                    ¡Contactanos hoy mismo!
                </p>
                <p className='text-zinc-400 font-FunnelSans-Light'>
                    Estamos entusiasmados por trabajar contigo. Llena el siguiente formulario y nos pondremos en contacto contigo a la brevedad.
                </p>
            </div>

            <div className='p-5 max-w-md w-full mb-3'>
                <div>
                    <div>
                        <div className="mb-3">
                            <label htmlFor="nombre" className="block text-gray-300 mb-1 text-sm">
                                Nombre
                            </label>
                            <input
                                type="text"
                                id="nombre"
                                name="nombre"
                                placeholder='Ingressa tu nombre'
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
                                placeholder='Ingresa tu teléfono a 10 dígitos'
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
                                placeholder='Ingresa tu correo'
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
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md w-full text-sm"
                            onClick={handleSubmit}
                        >
                            Enviar
                        </button>
                        <button className='bg-red-900 hover:bg-zinc-800 text-white font-semibold py-3 px-4 rounded-md w-full text-sm mt-2'
                            onClick={() => router.back()}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div >

            <Footer />

        </div >
    );
};
