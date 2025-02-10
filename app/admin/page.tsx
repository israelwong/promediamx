'use client'
import React from 'react'
import { useAuth } from "@/lib/useAuth";

export default function AdminDashboard() {
    const { user, loading } = useAuth();
    if (loading) return <p>Cargando...</p>;
    return user ? <h1>Dashboard Admin</h1> : null;
}