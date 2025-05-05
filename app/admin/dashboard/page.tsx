import React from 'react'
import { Metadata } from 'next'
import Dashboard from './components/Dashboard'

export const metadata: Metadata = {
  title: 'Dashboard'
}

export default function page() {
  return <Dashboard />
}
