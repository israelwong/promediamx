import React from 'react'
import Image from 'next/image';

export default function FraseCEO() {
    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-center text-zinc-200 mt-5 text-2xl mb-5 p-8 bg-zinc-900 rounded-md gap-4">
                <div className="rounded-full overflow-hidden border-4 border-zinc-700">
                    <Image
                        src="/foto.png"
                        width={200}
                        height={200}
                        alt="ProMedia"
                        className="object-cover md:w-full md:h-full w-32 h-32"
                    />
                </div>
                <div className="mt-4 md:mt-0 md:ml-4 text-center md:text-left">
                    <div className="font-FunnelSans-LightItalic text-xl md:mb-0 mb-4">
                        <span>
                            Trabajemos juntos en estrategias digitales que convierten ideas en resultados reales. ¡Hagamos equipo!
                        </span>
                    </div>
                    <div className="font-FunnelSans-Light text-sm mt-2 text-zinc-400">
                        <p className="text-zinc-300 font-semibold">Israel Wong</p>
                        <p>CEO | ProMedia</p>
                    </div>
                </div>
            </div>

        </div>
    )
}
