import React from 'react'
import Image from 'next/image'

function SkeletonPage() {
    return (
        <div className='max-w-screen-sm mx-auto px-10 md:px-0 h-screen flex items-center justify-center'>
            <div className='text-center h-fit justify-center w-full py-5'>

                <div className='py-6'>
                    <h3 className='text-2xl md:text-4xl text-gray-500 font-bold'>
                        Un momento por favor
                    </h3>
                    <p className='font-light text-sm md:text-lg'>
                        Estamos optimizando la pagina para mejorar tu experiencia.
                    </p>
                </div>

                {/* SKELETON */}
                <div className='grid gap-4'>

                    <div className="border border-gray-300 shadow rounded-md p-4 w-full mx-auto">
                        <div className="animate-pulse flex space-x-4">
                            <div className="rounded-full bg-slate-700 h-10 w-10"></div>
                            <div className="flex-1 space-y-6 py-1">
                                <div className="h-2 bg-slate-700 rounded"></div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div className="border border-gray-300 shadow rounded-md p-4 w-full mx-auto">
                            <div className="animate-pulse flex space-x-4">
                                <div className="rounded-full bg-slate-700 h-10 w-10"></div>
                                <div className="flex-1 space-y-6 py-1">
                                    <div className="h-2 bg-slate-700 rounded"></div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                                            <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="border border-gray-300 shadow rounded-md p-4 w-full mx-auto">
                            <div className="animate-pulse flex space-x-4">
                                <div className="rounded-full bg-slate-700 h-10 w-10"></div>
                                <div className="flex-1 space-y-6 py-1">
                                    <div className="h-2 bg-slate-700 rounded"></div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                                            <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-300 shadow rounded-md p-4 w-full mx-auto">
                        <div className="animate-pulse flex space-x-4">
                            <div className="rounded-full bg-slate-700 h-10 w-10"></div>
                            <div className="flex-1 space-y-6 py-1">
                                <div className="h-2 bg-slate-700 rounded"></div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className='py-6 mx-auto text-center'>
                    <Image
                        alt='ProSocial'
                        src='https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/logotipo_gris.svg'
                        width={500} height={300}
                        className='mx-auto h-8 md:h-12'
                    />
                </div>

            </div>
        </div>
    )
}

export default SkeletonPage
