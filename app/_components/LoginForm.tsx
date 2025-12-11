'use client'
import { useEffect, useState } from "react";
import Cookies from 'js-cookie';
import { login, verifyToken } from "@/app/lib/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Footer from "../(main)/_components/Footer";

const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [sessionError, setSessionError] = useState("");
    const [errors, setErrors] = useState({ email: "", password: "" });
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const token = Cookies.get('token');

    useEffect(() => {
        const verify = async () => {
            if (token) {
                try {
                    const response = await verifyToken(token);
                    if (response.payload) {
                        // router.push('/admin/dashboard');
                        router.push('/admin/clientes/cmc9sw9jr0000gucnlskxn06n/negocios/cmcb10kno000mgulq4ilqe9ug/');
                    } else {
                        Cookies.remove('token');
                    }
                } catch (error) {
                    console.error('Error verifying token:', error);
                    Cookies.remove('token');
                }
            }
        }
        verify();
    });

    const validate = () => {
        let valid = true;
        const errors = { email: "", password: "" };

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
                console.log(response);
                if (response.status) {
                    //redirect to dashboard
                    Cookies.set('token', response.token, { expires: 7 }); // La cookie expira en 7 días
                    // router.push('/admin/dashboard');
                    router.push('/admin/clientes/cmc9sw9jr0000gucnlskxn06n/negocios/cmcb10kno000mgulq4ilqe9ug/');
                }
                else {
                    setSessionError('Credenciales incorrectas');
                    setLoading(false);
                }
            }
            catch (error) {
                console.log(error);
                setSessionError(`Error al iniciar sesión ${error}}`);
                setLoading(false);
            }

        };
    }

    return (
        <div className="container mx-auto min-h-screen justify-center items-center flex flex-col">

            <div>
                <div className='mt-10 text-center items-center flex flex-col font-FunnelSans-Light text-zinc-500'>
                    <Image className="mb-2" src='https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/promedia/favicon_color.svg' width={30} height={30} alt='Logo' />
                    ProMedia México
                </div>

                <p className="text-xl font-FunnelSans-Light text-zinc-600 mb-5 uppercase">
                    Inicio de sesión
                </p>
            </div>

            <div className="flex items-center font-FunnelSans-Light">
                <div className="p-5 space-y-6  border border-zinc-800 rounded-md">
                    {/* <h2 className="text-2xl font-light text-center">
                        Iniciar Sesión
                    </h2> */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-zinc-400">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`text-black w-full px-3 py-2 mt-1 border rounded ${errors.email ? "border-red-500" : "border-zic-300"
                                    }`}
                            />
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-zinc-400">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`text-black w-full px-3 py-2 mt-1 border rounded ${errors.password ? "border-red-500" : "border-gray-300"
                                    }`}
                            />
                            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                        </div>
                        {sessionError && <p className="text-sm text-red-500">{sessionError}</p>}

                        <div className="space-y-2">

                            <button
                                type="submit"
                                className="w-full px-4 py-2 font-bold text-white bg-blue-900 rounded hover:bg-blue-700
                            disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Validando...' : 'Iniciar Sesión'}
                            </button>
                            <button type="button" className="w-full px-4 py-2 font-bold text-white bg-red-900 rounded hover:bg-red-700"
                                onClick={() => router.push('/')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

            </div>
            <Footer />
        </div>
    );
};

export default LoginForm;