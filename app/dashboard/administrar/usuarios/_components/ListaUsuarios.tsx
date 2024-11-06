'use client'
import React, { useState, useEffect } from 'react'
import { obtenerUsuarios } from '../../../../_lib/Usuarios'
import { Usuario } from '../../../../_lib/Types'
import UsuarioFicha from './UsuarioFicha'
import SearchInput from '../../_components/SearchInput'
import Link from 'next/link'

function ListaUsuarios() {

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);


    async function fetchUsuarios() {
        const usuarios = await obtenerUsuarios();
        setUsuarios(usuarios);
    }

    useEffect(() => {
        fetchUsuarios();
    }, []);

    //searchTerm es el estado que guarda el valor del input de búsqueda
    const [searchTerm, setSearchTerm] = useState('')
    const usuariosFiltrados = usuarios.filter(usuario =>
        usuario.username.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (

        <div>

            <div className='
            flex justify-between items-center pb-5'>
                <div className='flex-grow'>
                    <h1 className='text-2xl'>Usuarios registrados</h1>
                </div>
                <div className='flex-grow text-right'>
                    <SearchInput onSearchTermChange={setSearchTerm} />
                    <Link href='/dashboard/administrar/usuarios/nuevo'
                        className='bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded'
                    >
                        Nuevo usuario
                    </Link>
                </div>
            </div>


            <div className="lista-usuarios grid grid-cols-3 gap-4">

                {usuariosFiltrados.map((usuario) => (
                    <UsuarioFicha key={usuario.id} usuario={usuario} onActualizar={fetchUsuarios} />
                ))}
            </div>
        </div>
    )
}

export default ListaUsuarios