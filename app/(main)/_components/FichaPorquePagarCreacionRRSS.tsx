import React from 'react'

export default function FichaPorquePagarCreacionRRSS() {
    return (
        <div className='border border-rose-800 p-5 rounded-md bg-zinc-900/50'>
            <div className=''>
                <h3 className='text-2xl text-rose-600 font-FunnelSans-Bold mb-3'>
                    ¿Crees que pagar por creación de contenido es tirar el dinero?
                </h3>

                <ol className='list-decimal list-inside mb-5 text-zinc-400 space-y-3'>
                    <li className='flex items-start'>
                        <span>👉</span>
                        <span className='ml-2'>Las personas validan y comparan antes de comprar,</span>
                    </li>
                    <li className='flex items-start'>
                        <span>👉</span>
                        <span className='ml-2'>Deciden si confían en ti o no,</span>
                    </li>
                    <li className='flex items-start'>
                        <span>👉</span>
                        <span className='ml-2'>Si les gusta lo que ven, te siguen,</span>
                    </li>
                    <li className='flex items-start'>
                        <span>👉</span>
                        <span className='ml-2'>Si les gusta lo que ven, te compran,</span>
                    </li>
                </ol>

                <p className='text-white font-FunnelSans-Light'>
                    Haz que cada peso invertido en contenido te genere conversiones. 👏👏👏
                </p>
            </div>
        </div>
    )
}
