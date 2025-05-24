// app/vd/[slugNegocio]/page.tsx
import { notFound } from 'next/navigation';
import prisma from '@/app/admin/_lib/prismaClient';
import Link from 'next/link';
import type { Metadata } from 'next';

// --- Estructura esperada para los parámetros resueltos ---
interface PageResolvedParams {
    slugNegocio: string;
}

// --- Función para obtener datos del negocio (reutilizable) ---
async function getNegocioPorSlug(slug: string) {
    if (!slug) return null;
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { slug: slug },
            select: {
                id: true,
                nombre: true,
                slogan: true,
                descripcion: true,
                logo: true,
                email: true,
                telefonoLlamadas: true,
                telefonoWhatsapp: true,
                direccion: true,
                googleMaps: true,
                paginaWeb: true,
                slug: true,
            }
        });
        return negocio;
    } catch (error) {
        console.error(`Error fetching negocio con slug ${slug} para metadata o página:`, error);
        return null;
    }
}

// --- Props para la página y para generateMetadata, asumiendo que params PUEDE ser una Promesa ---
interface NegocioPageProps {
    params: Promise<PageResolvedParams> | PageResolvedParams; // params puede ser una promesa o el objeto resuelto
}

// --- Función generateMetadata ---
export async function generateMetadata(
    { params: paramsInput }: NegocioPageProps // Renombrar para evitar confusión con la variable 'params' resuelta
): Promise<Metadata> {
    // Resolver params si es una promesa
    const params = ('then' in paramsInput && typeof paramsInput.then === 'function')
        ? await paramsInput
        : paramsInput as PageResolvedParams;

    console.log('[generateMetadata] Params resueltos:', params);
    const slug = params.slugNegocio;
    const negocio = await getNegocioPorSlug(slug);

    if (!negocio) {
        return {
            title: 'Vitrina no encontrada',
            description: 'La vitrina que buscas no está disponible.',
        };
    }

    const description = negocio.slogan || negocio.descripcion?.substring(0, 160) || `Visita la vitrina de ${negocio.nombre} en ProMedia.`;

    return {
        title: `${negocio.nombre}`,
        description: description,
        openGraph: {
            title: negocio.nombre,
            description: description,
            // images: negocio.logo ? [negocio.logo] : [],
            // url: `https://promedia.mx/vd/${negocio.slug}`, // Reemplaza con tu dominio real
        },
    };
}

// --- Componente de Página ---
export default async function NegocioVitrinaPage({ params: paramsInput }: NegocioPageProps) {
    // Resolver params si es una promesa
    const params = ('then' in paramsInput && typeof paramsInput.then === 'function')
        ? await paramsInput
        : paramsInput as PageResolvedParams;

    console.log('[Vitrina Page] Params resueltos:', params);

    const negocio = await getNegocioPorSlug(params.slugNegocio);
    console.log('[Vitrina Page] Negocio encontrado:', negocio?.id, negocio?.nombre);

    if (!negocio) {
        console.log(`[Vitrina Page] Negocio con slug "${params.slugNegocio}" NO encontrado, llamando a notFound().`);
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 text-zinc-100">
            <div className="bg-zinc-800 p-6 md:p-8 rounded-lg shadow-xl my-6">
                {negocio.logo && (
                    <div className="mb-6 text-center md:text-left">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={negocio.logo}
                            alt={`Logo de ${negocio.nombre}`}
                            className="max-w-full h-auto sm:max-w-xs md:max-h-28 object-contain rounded-md inline-block"
                        />
                    </div>
                )}
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{negocio.nombre}</h1>
                {negocio.slogan && <p className="text-xl text-zinc-300 mb-4">{negocio.slogan}</p>}
                {negocio.descripcion && <p className="text-zinc-400 whitespace-pre-line leading-relaxed">{negocio.descripcion}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-3 text-zinc-100">Información de Contacto</h2>
                    <div className="space-y-2 text-zinc-300">
                        {negocio.email && <p><strong>Email:</strong> <a href={`mailto:${negocio.email}`} className="text-blue-400 hover:underline">{negocio.email}</a></p>}
                        {negocio.telefonoLlamadas && <p><strong>Teléfono:</strong> {negocio.telefonoLlamadas}</p>}
                        {negocio.telefonoWhatsapp && <p><strong>WhatsApp:</strong> <a href={`https://wa.me/${negocio.telefonoWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">{negocio.telefonoWhatsapp}</a></p>}
                        {negocio.direccion && <p className="mt-2"><strong>Dirección:</strong> {negocio.direccion}</p>}
                        {negocio.googleMaps && <p className="mt-2"><a href={negocio.googleMaps} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Ver en Google Maps</a></p>}
                        {negocio.paginaWeb && <p className="mt-2"><a href={negocio.paginaWeb} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Visitar Página Web</a></p>}
                    </div>
                </div>
                <div className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-3 text-zinc-100">Más Información</h2>
                    <p className="text-zinc-400">Espacio para más detalles, horarios, etc.</p>
                </div>
            </div>

            <div className="mt-8 text-center">
                <Link href="/vd" className="text-blue-400 hover:text-blue-300">
                    &larr; Volver al Directorio de Vitrinas
                </Link>
            </div>
        </div>
    );
}

// generateStaticParams (igual que antes)
export async function generateStaticParams() {
    try {
        const negocios = await prisma.negocio.findMany({
            where: {
                slug: { not: null },
                status: 'activo'
            },
            select: { slug: true }
        });
        return negocios
            .filter(negocio => negocio.slug)
            .map((negocio) => ({
                slugNegocio: negocio.slug!,
            }));
    } catch (error) {
        console.error("Error generando static params para vitrinas:", error);
        return [];
    }
}
