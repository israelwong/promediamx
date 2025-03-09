'use client';
import { obtenerRoles } from '@/app/admin/_lib/roles.actions';
import { Rol, Usuario } from '@/app/admin/_lib/types'; // Asumiendo que tienes un tipo User
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface Props {
    usuario: Usuario; // Recibe el objeto usuario
    onGuardar: (usuario: Usuario) => Promise<{ success: boolean; error?: string }>;
    onEliminar: () => Promise<{ success: boolean; error?: string }>;
}

export default function UsuarioFormEditar({ usuario, onGuardar, onEliminar }: Props) {
    const router = useRouter();
    const [roles, setRoles] = useState<Rol[]>([]);
    const [username, setUsername] = useState(usuario.username); // Inicializar con datos del usuario
    const [email, setEmail] = useState(usuario.email);
    const [telefono, setTelefono] = useState(usuario.telefono);
    const [rol, setRol] = useState(usuario.rol); // Usa rolId del usuario
    const [status, setStatus] = useState(usuario.status); // Add status state
    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [telefonoError, setTelefonoError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
    const [eliminando, setEliminando] = useState(false);

    const [respuestaSuccess, setRespuestaSuccess] = useState<boolean>(false);

    useEffect(() => {
        obtenerRoles()
            .then((roles) => {
                if (roles) {
                    setRoles(roles);
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

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setStatus(value);
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
        setErrorGuardar(null);

        const usuarioEditado: Usuario = {
            ...usuario, // Copiar los datos del usuario original
            username: username,
            email: email,
            telefono: telefono,
            rol: rol,
            status: status, // Add status to the edited user
        };

        onGuardar(usuarioEditado).then((result) => {
            setGuardando(false);
            if (!result.success) {
                setErrorGuardar(result.error ?? null);
            } else {
                setRespuestaSuccess(true);
                setTimeout(() => {
                    setRespuestaSuccess(false);
                }, 2000);
            }
        });
    };

    const handleEliminar = () => {

        console.log(rol)
        if (usuario.rol === 'admin') {
            alert('No se puede eliminar un usuario con rol de administrador.');
            return;
        }

        const confirmar = confirm('¿Estás seguro de eliminar este usuario?');
        if (!confirmar) return;
        setEliminando(true);
        onEliminar().then((result) => {
            setEliminando(false);
            if (result.success) {
                router.back();
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
                    <div className="mb-5 space-y-3">
                        <label htmlFor="status">Status:</label>
                        <select
                            id="status"
                            value={status}
                            onChange={handleStatusChange}
                            className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                        >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
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
                        <button
                            className="bg-red-700 border-red-600 text-zinc-100 rounded p-3 w-full"
                            onClick={() => router.back()}
                        >
                            Cancelar
                        </button>
                        {errorGuardar && <p className="text-red-500">{errorGuardar}</p>}
                    </div>

                    {respuestaSuccess && (
                        <div className='text-green-500 py-3 text-center'>
                            Usuario actualizado con éxito
                        </div>
                    )}

                </div>

            </div>

            <button className="text-red-800 rounded p-3 w-full mt-2 flex items-center justify-center space-x-2"
                onClick={() => handleEliminar()}
                disabled={eliminando}>
                <Trash2 size={16} />
                <span>
                    {eliminando ? 'Eliminando usario...' : 'Eliminar usuario'}
                </span>
            </button>

        </div>
    );
}