'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { Usuario } from '../../../../_lib/Types'
import { crearUsuario } from '../../../../_lib/Usuarios'
import { useRouter } from 'next/navigation'

function FormUsuario() {
    const [username, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [telefono, setTelefono] = useState('');
    const [direccion, setDireccion] = useState('');
    const [clabe, setclabe] = useState('');
    const [status, setstatus] = useState('');
    const [rol, setRol] = useState('');
    const [actionStatus, setActionStatus] = useState({} as { status: string, message: string });
    const [validando, setValidando] = useState(false);

    const router = useRouter();

    const [errors, setErrors] = useState({
        username: '',
        email: '',
        password: '',
        telefono: '',
        direccion: '',
        clabe: '',
        status: '',
        rol: ''
    });

    const validate = () => {
        const tempErrors = {
            username: '',
            email: '',
            password: '',
            telefono: '',
            direccion: '',
            clabe: '',
            status: '',
            rol: ''
        };
        let isValid = true;

        if (username.trim().length === 0) {
            tempErrors.username = 'El nombre es requerido';
            isValid = false;
        }

        if (email.trim().length === 0) {
            tempErrors.email = 'El email es requerido';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            tempErrors.email = 'El email no es válido';
            isValid = false;
        }

        if (password.trim().length === 0) {
            tempErrors.password = 'La contraseña es requerida';
            isValid = false;
        } else if (password.length < 6) {
            tempErrors.password = 'La contraseña debe tener al menos 6 caracteres';
            isValid = false;
        }

        if (telefono.trim().length === 0) {
            tempErrors.telefono = 'El teléfono es requerido';
            isValid = false;
        } else if (!/^\d{10}$/.test(telefono)) {
            tempErrors.telefono = 'El teléfono debe tener 10 dígitos';
            isValid = false;
        }

        if (rol.trim().length === 0) {
            tempErrors.rol = 'El rol es requerido';
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
            const usuario: Usuario = {
                username,
                email,
                password,
                telefono,
                direccion,
                clabe,
                status,
                rol
            };
            const response = await crearUsuario(usuario);
            if (response.status === 'error') {
                setActionStatus({ status: 'error', message: response.message });
            }
            if (response.status === 'success') {
                setActionStatus({ status: 'success', message: response.message });
                setTimeout(() => {
                    router.push('/dashboard/administrar/usuarios');
                }, 2000);
            }
            // console.log(response);
            setValidando(false);
        }
    };

    return (
        <div>
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex flex-col">
                    <label htmlFor="nombre" className="mb-2 text-sm font-medium text-gray-400">Username</label>
                    <input
                        type="text"
                        id="nombre"
                        name="username"
                        value={username}
                        onChange={(e) => setNombre(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    {errors.username && <span className="text-red-500 text-sm">{errors.username}</span>}
                </div>

                <div className="flex flex-col">
                    <label htmlFor="email" className="mb-2 text-sm font-medium text-gray-400">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
                </div>

                <div className="flex flex-col">
                    <label htmlFor="password" className="mb-2 text-sm font-medium text-gray-400">Contraseña</label>
                    <input
                        type="text"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    {errors.password && <span className="text-red-500 text-sm">{errors.password}</span>}
                </div>

                <div className="flex flex-col">
                    <label htmlFor="telefono" className="mb-2 text-sm font-medium text-gray-400">Teléfono</label>
                    <input
                        type="text"
                        id="telefono"
                        name="telefono"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                    {errors.telefono && <span className="text-red-500 text-sm">{errors.telefono}</span>}
                </div>

                <div className="flex flex-col">
                    <label htmlFor="direccion" className="mb-2 text-sm font-medium text-gray-400">Dirección</label>
                    <textarea
                        id="direccion"
                        name="direccion"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="clabe" className="mb-2 text-sm font-medium text-gray-400">Clabe Interbancaria</label>
                    <input
                        type="text"
                        id="clabe"
                        name="clabe"
                        value={clabe}
                        onChange={(e) => setclabe(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="status" className="mb-2 text-sm font-medium text-gray-400">status</label>
                    <select
                        id="status"
                        name="status"
                        value={status}
                        onChange={(e) => setstatus(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                        <option value="">Selecciona un status</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                    {errors.status && <span className="text-red-500 text-sm">{errors.status}</span>}
                </div>

                <div className="flex flex-col">
                    <label htmlFor="rol" className="mb-2 text-sm font-medium text-gray-400">Rol</label>
                    <select
                        id="rol"
                        name="rol"
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="px-3 text-gray-800 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                        <option value="">Selecciona un rol</option>
                        <option value="consultor">Consultor</option>
                        <option value="administrador">Administrador</option>
                    </select>
                    {errors.rol && <span className="text-red-500 text-sm">{errors.rol}</span>}
                </div>

                <div className=''>
                    {actionStatus.status === 'error' && <span className="text-red-500 text-sm">{actionStatus.message}</span>}

                    {actionStatus.status === 'success' && <span className="text-green-500 text-sm">{actionStatus.message}</span>}
                </div>

                <div className="flex space-x-4">

                    <button type="submit" className="flex-1 px-4 py-2 font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        disabled={validando}
                    >
                        Crear usuario
                    </button>

                    <Link
                        href={'/dashboard/administrar/usuarios'}
                        className={`text-center flex-1 px-4 py-2 font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${validando ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'}`}
                        onClick={(e) => validando && e.preventDefault()}
                    >
                        Cancelar
                    </Link>

                </div>
            </form>
        </div>
    )
}

export default FormUsuario;