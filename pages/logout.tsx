// pages/logout.tsx

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem("access_token");
    router.push("/login");
  }, [router]);

  return <div>Cerrando sesión...</div>;
}
