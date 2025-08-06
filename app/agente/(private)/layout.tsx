import { cookies } from 'next/headers';
import { verifyToken } from '../_lib/actions/auth.actions';
import { redirect } from 'next/navigation';
import AgenteUILayout from "../components/AgenteUILayout";
// import Link from 'next/link';
// import { Button } from '@/app/components/ui/button';

export default async function AgenteLayout({ children }: { children: React.ReactNode }) {
    // console.log("--- [Layout Agente] Iniciando verificación de sesión ---");

    const tokenCookie = (await cookies()).get('auth_token');

    if (!tokenCookie) {
        console.log("--- [Layout Agente] ERROR: No se encontró la cookie 'auth_token'. Redirigiendo a login.");
        redirect('/agente/login');
    }

    // console.log("--- [Layout Agente] Cookie encontrada. Verificando token...");
    const verificationResult = await verifyToken(tokenCookie.value);

    // ESTE ES EL LOG MÁS IMPORTANTE
    // console.log("--- [Layout Agente] Resultado de la verificación:", JSON.stringify(verificationResult, null, 2));

    if (!verificationResult.success || !verificationResult.payload) {
        console.log("--- [Layout Agente] ERROR: Verificación de token fallida. Redirigiendo a login.");
        (await cookies()).delete('auth_token');
        redirect('/agente/login');
    }

    // console.log("--- [Layout Agente] Verificación exitosa. Renderizando UI.");
    const user = verificationResult.payload;

    return (
        <AgenteUILayout user={user}>
            {children}
        </AgenteUILayout>
    );
}