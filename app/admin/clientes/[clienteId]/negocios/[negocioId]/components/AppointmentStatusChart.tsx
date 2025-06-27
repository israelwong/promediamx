// app/admin/.../_components/AppointmentStatusChart.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { z } from 'zod';
import { type appointmentStatusDataSchema } from '@/app/admin/_lib/actions/dashboard/dashboard.schemas';

type AppointmentData = z.infer<typeof appointmentStatusDataSchema>[];

export default function AppointmentStatusChart({ data }: { data: AppointmentData }) {
    return (
        <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
                <CardTitle>Estado de Citas</CardTitle>
                <CardDescription>Resumen de citas en los últimos 7 días.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* TODO: Implementar un gráfico de dona real */}
                <div className="space-y-3">
                    {data.map(item => (
                        <div key={item.status} className="flex items-center justify-between text-sm">
                            <span className="text-zinc-300 capitalize flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${item.status === 'PENDIENTE' ? 'bg-green-500' : 'bg-red-500'}`} />
                                {item.status.toLowerCase().replace('_', ' ')}
                            </span>
                            <span className="font-bold text-zinc-100 bg-zinc-700 px-2 py-0.5 rounded-md">{item.count}</span>
                        </div>
                    ))}
                    {data.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No hay citas recientes.</p>}
                </div>
            </CardContent>
        </Card>
    );
}