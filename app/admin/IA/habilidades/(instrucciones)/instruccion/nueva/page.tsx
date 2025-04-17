import React from 'react'
import { Metadata } from 'next'
import InstruccionNuevaForm from '../components/InstruccionNuevaForm'

export const metadata: Metadata = {
    title: 'Nueva instrucción',
}

export default function page() {
    return <InstruccionNuevaForm />
}
