import { Metadata } from 'next'
import ListaUsuarios from './_components/ListaUsuarios'

export const metadata: Metadata = {
    title: 'Usuarios'
}

function Page() {
    return (
        <div className='p-5'>
            <ListaUsuarios />
        </div>
    )
}

export default Page