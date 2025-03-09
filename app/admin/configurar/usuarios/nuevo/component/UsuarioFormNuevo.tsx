'use client';
import { obtenerRoles } from '@/app/admin/_lib/roles.actions';
import { Rol } from '@/app/admin/_lib/types';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    onGuardar: (
        username: string,
        email: string,
        telefono: string,
        rol: string
    ) => Promise<{ success: boolean; error?: string }>;
}

export default function UsuarioFormNuevo({ onGuardar }: Props) {

    const router = useRouter();
    const [roles, setRoles] = useState<Rol[]>([]);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [rol, setRol] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [telefonoError, setTelefonoError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

    useEffect(() => {
        obtenerRoles()
            .then((roles) => {
                if (roles) {
                    setRoles(roles);
                    if (roles.length > 0) {
                        setRol(roles[0].id); // Establecer el primer rol como valor predeterminado
                    }
                }
            })
            .catch((error) => {
                console.error('Error fetching roles:', error);
            });
    }, []);

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUsername(value);
        setUsernameError(value ? '' : 'El nombre de usuario es obligatorio.');
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        setEmailError(value ? '' : 'El correo electrónico es obligatorio.');
    };

    const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTelefono(value);
        setTelefonoError(value ? '' : 'El teléfono es obligatorio.');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !email || !telefono || !rol) {
            setUsernameError(username ? '' : 'El nombre de usuario es obligatorio.');
            setEmailError(email ? '' : 'El correo electrónico es obligatorio.');
            setTelefonoError(telefono ? '' : 'El teléfono es obligatorio.');
            return;
        }

        setGuardando(true);
        setErrorGuardar(null); // Limpiar errores anteriores
        onGuardar(username, email, telefono, rol).then((result) => {
            setGuardando(false);
            if (!result.success) {
                setErrorGuardar(result.error ?? null);
            }
        });


    };

    return (
        <div className="max-w-screen-sm mx-auto">
            <div className="border bg-zinc-900 border-zinc-800 rounded-lg p-5 text-zinc-200">
                <div>
                    <div className="mb-5 space-y-3">
                        <label htmlFor="username">Nombre de usuario*:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={handleUsernameChange}
                            className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                        />
                        {usernameError && <p className="text-red-500">{usernameError}</p>}
                    </div>
                    <div className="mb-5 space-y-3">
                        <label htmlFor="email">Correo electrónico*:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={handleEmailChange}
                            className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                        />
                        {emailError && <p className="text-red-500">{emailError}</p>}
                    </div>
                    <div className="mb-5 space-y-3">
                        <label htmlFor="telefono">Teléfono*:</label>
                        <input
                            type="tel"
                            id="telefono"
                            value={telefono}
                            onChange={handleTelefonoChange}
                            className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                        />
                        {telefonoError && <p className="text-red-500">{telefonoError}</p>}
                    </div>
                    <div className="mb-5 space-y-3">
                        <label htmlFor="rol">Rol*:</label>
                        <select
                            id="rol"
                            value={rol}
                            onChange={(e) => setRol(e.target.value)}
                            className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                        >
                            {roles.map((rolItem) => (
                                <option key={rolItem.id} value={rolItem.nombre}>
                                    {rolItem.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="">
                        <button
                            onClick={handleSubmit}
                            className={`bg-green-800 border-green-600 text-zinc-100 rounded p-3 w-full mb-2 ${guardando ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            disabled={guardando}
                        >
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </button>

                        <button className='bg-red-700 border-red-600 text-zinc-100 rounded p-3 w-full'
                            onClick={() => router.back()}>
                            Cancelar
                        </button>

                        {errorGuardar && <p className="text-red-500">{errorGuardar}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}