import React from 'react'
import ListaAsistentePanel from './ListaAsistentePanel'
import ListaHabilidadesPanel from './ListaHabilidadesPanel'

export default function AIPanel() {
    return (
        <div>
            <div className='grid grid-cols-2 gap-4 p-4'>
                <div>
                    <ListaAsistentePanel />
                </div>
                <div>
                    <ListaHabilidadesPanel />
                </div>
            </div>
        </div>
    )
}
