import React from 'react'
import { Metadata } from 'next'
import IADashboard from './components/IADashboard'

export const metadata: Metadata = {
    title: 'IA Dashboard',
    description: 'Dashboard de IA',
}

export default function page() {
    return <IADashboard />
}
