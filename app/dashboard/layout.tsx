'use client'
// import "@/app/globals.css";
import { useEffect, useState } from "react";
import Navbar from "./_components/Navbar";
import { verifyToken } from "../_lib/Auth";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";


interface User {
  id: string
  email: string
  username: string
  rol: string
  token: string
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const token = Cookies.get('promediaToken');

  useEffect(() => {

    async function validarToken(token: string | undefined) {
      if (token) {
        try {
          const response = await verifyToken(token);
          if (response.valid) {
            const user: User = response.payload as unknown as User;
            user.token = token;
            setUser(user);
          }
          else {
            Cookies.remove('promediaToken');
            router.push('/login');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    }

    validarToken(token);
  }, [token, router]);

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div>

      <Navbar user={user} />
      <div className="bg-zinc-900/90 min-h-screen">
        <div className="">
          {children}
        </div>
      </div>
    </div>

  );
}