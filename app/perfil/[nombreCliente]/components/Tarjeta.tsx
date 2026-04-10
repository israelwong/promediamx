import React from 'react'
import Link from 'next/link';

interface CardProps {
  params: {
    id: string;
    hook?: string;
    cta?: string;
    button_title?: string;
    button_url?: string;
    align: string;
  }
}

export default function Tarjeta({ params }: CardProps) {
  return (
    <div className='p-5'>
      <div className={`border border-zinc-600 rounded-md mb-5 text-${params.align || 'left'}`}>
        <div className='p-5 space-y-4'>
          <h1 className={`text-3xl font-FunnelSans-Bold text-zinc-300`}>
            {params.hook}
          </h1>
          <p className={`font-FunnelSans-Light`}>
            {params.cta}
          </p>
          {params.button_title && (
            <div className={`py-3 } space-x-3`}>
              <Link
                href={params.button_url || '#'}
                className="p-3 text-white bg-blue-500 rounded-md"
              >
                {params.button_title}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}