// pages/login.tsx
'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (res.ok) {
      // Guardar el JWT en el localStorage o cookies (preferiblemente)
      localStorage.setItem("supabase.auth.token", data.access_token);
      router.push("/dashboard"); // Redirige a una página protegida
    } else {
      setError(data.error || "Hubo un problema con el login.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={handleLogin} className="p-6 rounded-md shadow-lg">
        <h1 className="text-2xl mb-4">Iniciar sesión</h1>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 mb-4 border border-zinc-800 rounded w-full bg-zinc-900"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 mb-4 border border-zinc-800 rounded w-full bg-zinc-900"
        />
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full">
          Iniciar sesión
        </button>
        <button className="bg-red-500 text-white p-2 rounded w-full mt-2"
          onClick={() => router.push("/")}
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
