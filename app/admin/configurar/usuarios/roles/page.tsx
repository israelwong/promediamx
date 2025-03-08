import React from 'react'
import { Metadata } from 'next'
import Roles from './components/Roles'

export const metadata: Metadata = {
    title: 'Roles',
    description: 'Administración de roles de usuario',
}

export default function page() {
    return <Roles />
}
