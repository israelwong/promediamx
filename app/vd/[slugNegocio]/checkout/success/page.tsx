// // app/vd/[slugNegocio]/checkout/success/page.tsx
import React from 'react'

export default function page() {
    return (
        <div>
            Pago exitoso
        </div>
    )
}


// import prisma from '@/app/admin/_lib/prismaClient';
// import { notFound } from 'next/navigation';
// import Link from 'next/link';

// // ✅ SOLUCIÓN DEFINITIVA: Esta es la forma que tu proyecto espera.
// // Declaramos la función para que acepte los props como promesas.
// export default async function CheckoutSuccessPage({
//     params,
//     searchParams
// }: {
//     params: Promise<{ slugNegocio: string }>;
//     searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
// }) {

//     // 1. Resolvemos AMBAS promesas para obtener los valores.
//     const resolvedParams = await params;
//     const resolvedSearchParams = await searchParams;

//     // 2. Usamos los valores resueltos en el resto del código.
//     const negocio = await prisma.negocio.findUnique({
//         where: { slug: resolvedParams.slugNegocio },
//         select: {
//             nombre: true,
//             id: true,
//             slug: true
//         }
//     });

//     if (!negocio) {
//         notFound();
//     }

//     const stripeSessionId = resolvedSearchParams?.session_id as string;

//     return (
//         <div className="text-center py-10 px-4">
//             <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//             <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">¡Pago Exitoso!</h1>
//             <p className="mt-4 text-lg text-zinc-300">Gracias por tu compra en **{negocio.nombre}**.</p>

//             {stripeSessionId && (
//                 <p className="text-sm text-zinc-500 mt-2">
//                     Referencia de tu pago: <span className="font-mono">{stripeSessionId.substring(0, 15)}...</span>
//                 </p>
//             )}

//             <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
//                 <Link
//                     href={`/vd/${negocio.slug}`}
//                     className="inline-block rounded-md bg-blue-600 px-4 py-2 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
//                 >
//                     Volver a la vitrina de {negocio.nombre}
//                 </Link>
//                 <Link
//                     href="/"
//                     className="text-blue-400 hover:text-blue-300 underline"
//                 >
//                     Ir a la página principal
//                 </Link>
//             </div>
//         </div>
//     );
// }
