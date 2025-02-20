'use client'
import { useEffect } from "react";
import Cookies from 'js-cookie';
import { verifyToken } from "@/app/lib/auth";
import { useRouter } from "next/navigation";
import Head from 'next/head';

function Dashboard() {

  const router = useRouter();
  const token = Cookies.get('token');

  useEffect(() => {
    const verify = async () => {
      if (token) {
        try {
          const response = await verifyToken(token);
          if (response.payload) {
            router.push('/admin/dashboard');
          } else {
            Cookies.remove('token');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          Cookies.remove('token');
        }
      } else {
        router.push('/login');
      }
    }
    verify();
  }, [token, router]);

  return (
    <>
      <Head>
        <title>Admin Dashboard</title>
        <meta name="description" content="Admin dashboard" />
      </Head>
      <div>
        {/* Your dashboard content */}
      </div>
    </>
  );
}

export default Dashboard;
