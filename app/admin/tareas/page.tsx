import React from 'react'
import { Metadata } from 'next'
import TareasDashboard from './components/TareasDashboard'

export const metadata: Metadata = {
    title: 'Tareas'
}

export default function page() {
    return <TareasDashboard />
}
