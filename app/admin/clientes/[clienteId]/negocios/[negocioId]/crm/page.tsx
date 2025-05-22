// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'CRM',
}

export default function page() {
    redirect('./crm/conversaciones/')
}
