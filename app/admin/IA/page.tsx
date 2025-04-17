import React from 'react'
import { Metadata } from 'next'
import AIPanel from './components/AIPanel'

export const metadata: Metadata = {
    title: 'IA',
    description: 'IA',
}

export default function page() {
    return <AIPanel />
}
