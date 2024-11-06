import React, { useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Usuario } from '../../../../_lib/Types';
import { useRouter } from 'next/navigation';
import { obtenerUlmaSesionUsuario, actualizarUsuario } from '../../../../_lib/Usuarios';
import { Sesion } from '../../../../_lib/Types';

interface UsuarioFichaProps {
    usuario: Usuario;
    onActualizar: () => void; // Nueva prop para la función de actualización
}

const UsuarioFicha: React.FC<UsuarioFichaProps> = ({ usuario, onActualizar }) => {
    const router = useRouter();
    const [ultimaSesion, setUltimaSesion] = React.useState<Sesion | null>(null);

    function handleEditar() {
        router.push(`/dashboard/administrar/usuarios/${usuario.id}`);
    }

    async function handleActualizar() {
        if (usuario.rol === 'admin') {
            alert('No puedes modificar este usuario');
            return;
        }

        if (confirm('¿Estás seguro de desactivar este usuario?')) {
            const nuevoStatus = usuario.status === 'activo' ? 'inactivo' : 'activo';
            usuario.status = nuevoStatus;
            const result = await actualizarUsuario(usuario);
            console.log('result', result);
            if (result.status === 'success') {
                console.log('Usuario actualizado');
                onActualizar();
            }
        }
    }

    useEffect(() => {
        async function fetchSesion() {
            if (usuario.id) {
                const sesion = await obtenerUlmaSesionUsuario(usuario.id);
                console.log('sesion', sesion?.createdAt);
                setUltimaSesion(sesion); // Estado con la sesión obtenida
            } else {
                console.error('Usuario ID is undefined');
            }
        }
        if (usuario.id) {
            fetchSesion();
        }
    }, [usuario.id]); // Agregar usuario.id como dependencia


    return (
        <div className='bg-zinc-950 border border-zinc-600 rounded-md'>
            <div className='wrap p-6 '>
                <div className='flex justify-between items-center mb-3'>
                    <h2 className='flex text-xl'>
                        <button onClick={handleEditar} className='flex items-center' aria-label='Editar usuario'>
                            <Pencil size={12} className='mr-2' />
                            <span>{usuario.username}</span>
                            <small
                                className='text-[11px] leading-tight bg-zinc-700 ml-3 p-1 rounded-md tracking-wider'>
                                {usuario.rol.toUpperCase()}
                            </small>
                        </button>
                    </h2>

                    <div className='flex space-x-2 text-sm gap-2'>
                        <button onClick={handleActualizar} className='text-red-600'>
                            {usuario.status === 'activo' ? (
                                <span className='text-green-600 border border-green-600 rounded-md py-1 px-1 leading-3'>
                                    {usuario.status}
                                </span>
                            ) : (
                                <span className='text-red-600 border border-red-600 rounded-md py-1 px-1 leading-3'>
                                    {usuario.status}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="usuario-ficha space-y-1">
                    <p><strong className='text-zinc-500'>ID:</strong> {usuario.id}</p>
                    <p><strong className='text-zinc-500'>Email:</strong> {usuario.email}</p>
                    <p><strong className='text-zinc-500'>Teléfono:</strong> {usuario.telefono}</p>
                    <p><strong className='text-zinc-500'>Dirección:</strong> {usuario.direccion}</p>
                    <p><strong className='text-zinc-500'>CLABE:</strong> {usuario.clabe}</p>
                    <p><strong className='text-zinc-500'>Creado:</strong> {usuario.createdAt ? new Date(usuario.createdAt).toLocaleDateString() : 'N/A'}</p>
                    <p><strong className='text-zinc-500'>Última sesión: </strong>
                        {ultimaSesion ? `${new Date(ultimaSesion.createdAt).toLocaleDateString()} ${new Date(ultimaSesion.createdAt).toLocaleTimeString()} / ${ultimaSesion.status}` : 'Sin sesión'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UsuarioFicha;