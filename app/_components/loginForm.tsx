'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { login } from '@/app/_lib/Auth';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({ email: "", password: "" });
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [sessionError, setSessionError] = useState("");

    const token = Cookies.get('promediaToken');
    useEffect(() => {
        if (token !== undefined) {
            router.push('/dashboard');
        }
    }
        , [token, router]);

    const validate = () => {
        let valid = true;
        const errors = { email: "", password: "" };
        setSessionError("");

        if (!email) {
            errors.email = "El correo electrónico es obligatorio";
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = "El correo electrónico no es válido";
            valid = false;
        }

        if (!password) {
            errors.password = "La contraseña es obligatoria";
            valid = false;
        } else if (password.length < 6) {
            errors.password = "La contraseña debe tener al menos 6 caracteres";
            valid = false;
        }

        setErrors(errors);
        return valid;
    };

    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();
        if (validate()) {
            try {
                setLoading(true);
                const response = await login(email, password);
                if (response.status) {
                    // Redirect to dashboard
                    Cookies.set('promediaToken', response.token, { expires: 7 }); // La cookie expira en 7 días
                    router.push('/dashboard');
                } else {
                    setSessionError('Credenciales incorrectas');
                }
                setLoading(false);
            } catch (error) {
                console.log(error);
                setSessionError('Error al iniciar sesión');
                setLoading(false);
            }
        }
    };

    return (
        <div className='mx-auto flex h-screen justify-center items-center bg-zinc-950'>

            <div className='border border-zinc-600 rounded-md p-5 max-w-screen-md'>

                <div className='text-center'>
                    <h1 className='text-2xl text-gray-200 py-5'>Iniciar sesión</h1>
                </div>

                <form onSubmit={handleSubmit} className=' text-center'>
                    <div>
                        <input
                            name="email"
                            className='border-2 border-gray-300 p-3 rounded-md mb-4 w-full text-gray-600'
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                    </div>
                    <div>
                        <input
                            name="password"
                            className='border-2 border-gray-300 p-3 rounded-md mb-4 w-full text-gray-600'
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                    </div>
                    {sessionError && <p className="text-sm text-red-500">{sessionError}</p>}
                    <button
                        type="submit"
                        className='bg-blue-500 text-white p-3 rounded-md w-full max-w-xs mt-4'
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : 'Iniciar sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}