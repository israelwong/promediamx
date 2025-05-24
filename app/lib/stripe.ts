// lib/stripe.ts
import Stripe from 'stripe';

// Validamos que la variable de entorno esté presente
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('La variable de entorno STRIPE_SECRET_KEY no está definida.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia', // Es buena práctica fijar la versión de la API
    typescript: true,         // Para mejor soporte de tipos con TypeScript
});