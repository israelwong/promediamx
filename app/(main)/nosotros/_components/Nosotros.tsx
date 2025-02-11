import React from 'react'
import Image from 'next/image'

export default function Nosotros() {
    return (
        <div className='max-w-screen-xl mx-auto p-5'>

            <header className='my-16 text-center md:p-5 rounded-md'>
                <div className='md:max-w-screen-md mx-auto'>
                    <p className='md:font-FunnelSans-Regular md:text-3xl text-xl text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-500 to-purple-600'>
                        Nosotros somos una
                    </p>
                    <p className='md:font-FunnelSans-Bold font-FunnelSans-Bold md:text-5xl text-3xl mb-2 text-zinc-300'>
                        agencia especializada en <span className='underline decoration-yellow-400'>
                            comercialización digital
                        </span>
                    </p>
                    <p className='md:font-FunnelSans-Regular uppercase md:px-32 px-10 md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 font-FunnelSans-Bold'>
                        con experiencia en branding, marketing y social media
                    </p>
                </div>
            </header>

            <div className='grid grid-cols-1 md:grid-cols-3 md:gap-8'>

                <div className='col-span-2 p-5 rounded-md border-dashed border border-zinc-800 mb-5'>

                    <div className='text-zinc-400 py-5 text-lg/7'>

                        <h2 className='font-FunnelSans-Bold text-3xl mb-5'>
                            Hola 👋!
                        </h2>

                        <p className='font-FunnelSans-Regular mb-5'>
                            En <span className='bg-gradient-to-r from-cyan-500 to-cyan-600 text-transparent bg-clip-text'>ProMedia Mexico</span>, entendemos que una presencia digital sólida es clave para que los negocios crezcan y conecten con su audiencia.
                        </p>

                        <p className='font-FunnelSans-Regular mb-5'>
                            Creemos en el poder del contenido y la tecnología como herramientas para impulsar el éxito de las pymes y emprendedores. Nuestro compromiso es brindar soluciones integrales en marketing digital y comunicación visual, optimizando la captación de clientes a través de estrategias accesibles y efectivas.
                        </p>

                        <div className='mb-5'>
                            <p>Enfocamos nuestro talento y esfuerzo en:</p>
                            <ul className="list-disc pl-3 ">
                                <li>Gestionar y optimizar contenido para redes sociales, mejorando la interacción con clientes sin incrementar costos.</li>
                                <li>Ofrecer la renta de landing pages y herramientas digitales a través de nuestro SaaS, facilitando la captación de clientes y la automatización de procesos.</li>
                                <li>Desarrollar contenido multimedia y diseño gráfico para fortalecer campañas publicitarias y estrategias de branding.</li>
                                <li>Brindar asesoría en marketing digital y social media, ayudando a los negocios a tomar decisiones estratégicas basadas en datos y tendencias.</li>
                            </ul>
                        </div>

                        <p className='font-FunnelSans-Regular mb-5'>
                            Nos encanta aportar valor en cada proyecto, acompañando a nuestros clientes en cada etapa del proceso para asegurar su crecimiento y éxito.
                        </p>

                        <div className='mb-2'>
                            <p className='font-FunnelSans-Bold mt-10'>
                                Con gratitud,
                            </p>
                            <p className='font-FunnelSans-Italic text-zinc-400 text-sm'>
                                El equipo de ProMedia México
                            </p>
                        </div>

                        <div className='flex justify-left'>
                            <Image
                                src='https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia//logo_fullcolor.svg'
                                width={200}
                                height={100}
                                alt='Logo de Promedia México'
                            />
                        </div>
                    </div>
                </div>

                <div className='col-span-1'>

                    <div className='mb-5 border border-zinc-800 bg-zinc-900 p-5 rounded-md'>
                        <h3 className='font-FunnelSans-Bold text-xl text-zinc-200'>
                            <span className='animate-pulse mr-2 text-pink-400'>•</span>
                            Filosofía
                        </h3>
                        <p className='font-FunnelSans-Regular text-zinc-400'>
                            Aportar valor en cada etapa del servicio, acompañando a nuestros clientes de inicio a fin.
                        </p>
                    </div>

                    <div className='mb-5 border border-zinc-800 bg-zinc-900 p-5 rounded-md'>
                        <h3 className='font-FunnelSans-Bold text-xl text-zinc-200'>
                            <span className='animate-pulse mr-2 text-yellow-400'>•</span>
                            Misión
                        </h3>
                        <p className='font-FunnelSans-Regular text-zinc-400'>
                            Ayudar a los negocios a conectar con su audiencia a través de contenido relevante y herramientas digitales que simplifican la gestión de tu negocio.
                        </p>
                    </div>

                    <div className='mb-5 border border-zinc-800 bg-zinc-900 p-5 rounded-md'>
                        <h3 className='font-FunnelSans-Bold text-xl'>
                            <span className='animate-pulse mr-2 text-blue-400'>•</span>
                            Visión
                        </h3>
                        <p className='font-FunnelSans-Regular text-zinc-400'>
                            Ser una de las agencias de marketind digital de comercialización y creación de contenido
                            multimedia más reconocidas en el mercado mexicano gracias a sus
                            casos de éxito y satisfacción del cliente.
                        </p>

                    </div>

                    <div className='mb-5 border border-zinc-800 bg-zinc-900 p-5 rounded-md'>
                        <h3 className='font-FunnelSans-Bold text-xl'>
                            <span className='animate-pulse mr-2 text-rose-400'>•</span>
                            Valores
                        </h3>

                        <ul className="list-disc pl-5 font-FunnelSans-Regular text-zinc-400">
                            <li>Estrategia: Acciones con propósito y resultados medibles.</li>
                            <li>Creatividad: Innovación para destacar en lo digital.</li>
                            <li>Accesibilidad: Soluciones escalables para cualquier negocio.</li>
                            <li>Compromiso: Trabajamos como si fuera nuestra propia empresa.</li>
                            <li>Transparencia: Comunicación clara y honesta.</li>
                            <li>Eficiencia: Máximo impacto con óptimos recursos.</li>
                        </ul>
                    </div>

                </div>
            </div>

        </div>
    )
}
