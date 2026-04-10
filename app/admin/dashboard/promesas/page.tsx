import React from 'react'
import Promesas from './_components/Promesas'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Promesas'
}

export default function page() {
    return <Promesas />
}
