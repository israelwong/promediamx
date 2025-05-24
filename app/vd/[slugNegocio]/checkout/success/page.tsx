// app/vd/[slugNegocio]/checkout/success/page.tsx
import prisma from '@/app/admin/_lib/prismaClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
// ...

interface SuccessPageProps {
    params: { slugNegocio: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CheckoutSuccessPage({ params, searchParams }: SuccessPageProps) {
    const negocio = await prisma.negocio.findUnique({
        where: { slug: params.slugNegocio },
        select: { nombre: true, id: true /* y el slug para construir el link de regreso */, slug: true }
    });

    if (!negocio) {
        notFound();
    }

    const stripeSessionId = searchParams?.session_id as string;
    // Aquí podrías llamar a una Server Action para obtener detalles de la sesión de Stripe
    // y/o de la transacción guardada en tu DB usando stripeSessionId o una referencia interna.

    return (
        <div className="text-center py-10">
            <h1 className="text-3xl font-bold text-green-500">¡Pago Exitoso!</h1>
            <p className="mt-4 text-lg text-zinc-300">Gracias por tu compra en {negocio.nombre}.</p>
            {stripeSessionId && <p className="text-sm text-zinc-500 mt-2">Referencia de tu pago: {stripeSessionId.substring(0, 15)}...</p>}
            <p className="mt-6">
                <Link href={`/vd/${negocio.slug}`} className="text-blue-400 hover:text-blue-300 underline">
                    Volver a la vitrina de {negocio.nombre}
                </Link>
                {' | '}
                <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
                    Ir a la página principal
                </Link>
            </p>
        </div>
    );
}