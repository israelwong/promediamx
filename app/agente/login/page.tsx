'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/agente/_lib/actions/auth.actions'; // La ruta a la action se actualiza
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

// Componente para mostrar mensajes de error de forma consistente
function ErrorMessage({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div className="bg-red-900/40 border border-red-500/50 text-red-300 p-3 rounded-md flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            <p>{message}</p>
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (!email || !password) {
            setError("Por favor, ingresa tu email y contraseña.");
            return;
        }

        startTransition(async () => {
            const response = await login(email, password);

            if (response.success && response.token) {
                localStorage.setItem('auth_token', response.token);
                router.push('/agente'); // Redirige al dashboard del agente
            } else {
                setError(response.error || 'Ocurrió un error inesperado.');
            }
        });
    };

    return (
        <main className="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
            <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800 rounded-xl shadow-2xl shadow-black/30">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-zinc-100 tracking-tight">
                        Portal de Agente
                    </CardTitle>
                    <CardDescription className="text-zinc-400 pt-1">
                        Ingresa para gestionar tus prospectos.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isPending}
                                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500 focus-visible:ring-offset-zinc-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                                Contraseña
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isPending}
                                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500 focus-visible:ring-offset-zinc-900"
                            />
                        </div>
                        {error && <ErrorMessage message={error} />}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </main>
    );
}
