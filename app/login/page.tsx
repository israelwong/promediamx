import React from 'react'
import LoginForm from '@/app/_components/LoginForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inicio de sesión'
}

function Login() {
  return <LoginForm />
}

export default Login
