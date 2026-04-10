// Ruta actual: app/admin/tareas/page.tsx
import { Metadata } from 'next'
import ListaTareas from './components/ListaTareas'

export const metadata: Metadata = {
    title: 'Tareas'
}

export default function page() {
    return <ListaTareas />
}
