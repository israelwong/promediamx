import React from 'react'
import { Metadata } from 'next'
import LeadForm from './_components/LeadForm'


export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contacta a Promedia México para más información sobre nuestros servicios.',
}

export default function Page() {
  return <LeadForm />
}
