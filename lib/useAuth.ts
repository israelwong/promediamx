import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
    token: string;
}

export function useAuth() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("./login");
        } else {
            setUser({ token });
        }

        setLoading(false);
    }, [router]);

    return { user, loading };
}
