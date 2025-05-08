import { Metadata } from 'next'
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Configuración',
}

export default function page() {
    redirect('./crm/conversaciones/')
}
