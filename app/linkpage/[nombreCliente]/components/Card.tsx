import React from 'react'
import Link from 'next/link';
// import { ChevronRight } from 'lucide-react';

interface CardProps {
  params: {
    id: string;
    hook?: string;
    hook_align?: string;
    cta?: string;
    cta_align?: string;
    button_title?: string;
    button_url?: string;
    button_align?: string;
  }
}

export default function Card({ params }: CardProps) {

  return (

    <div id={params.id} className='flex items-center justify-center  '>

      <div className='p-5 space-y-4'>

        <h1 className={`text-${params.hook_align} text-3xl font-FunnelSans-Bold text-zinc-300`}>
          {params.hook}
        </h1>
        <p className={`text-${params.cta_align} font-FunnelSans-Light`}>
          {params.cta}
        </p>

        {params.button_title && (
          <div className={`py-3 text-${params.button_align || 'left'} space-x-3`}>
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
  )
}