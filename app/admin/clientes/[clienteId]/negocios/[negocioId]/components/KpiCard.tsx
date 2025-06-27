// app/admin/.../_components/KpiCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

interface KpiCardProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
}

export default function KpiCard({ title, value, icon: Icon }: KpiCardProps) {
    return (
        <Card className="bg-zinc-800 border-zinc-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <Icon className="h-5 w-5 text-zinc-500" />
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold text-zinc-50">
                    {value}
                </div>
                {/* Aquí podrías añadir un texto de comparación vs ayer, etc. */}
            </CardContent>
        </Card>
    );
}