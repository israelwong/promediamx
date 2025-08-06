import { redirect } from 'next/navigation';

export default function AgenteDashboardRedirectPage() {
    // Redirige permanentemente a la vista del kanban, que es ahora la principal.
    redirect('/agente/kanban');
}