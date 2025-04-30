import React from 'react'
import { Metadata } from 'next'
import TareaNuevaForm from '../components/TareaNuevaForm'

export const metadata: Metadata = {
    title: 'Nueva instrucción',
}

export default function page() {
    return <TareaNuevaForm />
}
