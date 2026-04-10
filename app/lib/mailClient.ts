// lib/emailClient.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
    throw new Error('La variable de entorno RESEND_API_KEY no está definida.');
}

export const resend = new Resend(process.env.RESEND_API_KEY);