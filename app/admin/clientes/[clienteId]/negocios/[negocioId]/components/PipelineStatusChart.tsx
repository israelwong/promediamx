// app/admin/.../_components/PipelineStatusChart.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { type pipelineStageDataSchema } from '@/app/admin/_lib/actions/dashboard/dashboard.schemas';
import { z } from 'zod';

type PipelineData = z.infer<typeof pipelineStageDataSchema>[];

export default function PipelineStatusChart({ data }: { data: PipelineData }) {
    return (
        <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
                <CardTitle>Estado del Pipeline</CardTitle>
                <CardDescription>Leads actuales en cada etapa.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* TODO: Implementar un gráfico de barras real con una librería como Recharts */}
                <div className="space-y-3">
                    {data.map(stage => (
                        <div key={stage.id} className="flex items-center justify-between text-sm">
                            <span className="text-zinc-300">{stage.nombre}</span>
                            <span className="font-bold text-zinc-100 bg-zinc-700 px-2 py-0.5 rounded-md">{stage.leadCount}</span>
                        </div>
                    ))}
                    {data.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No hay datos del pipeline.</p>}
                </div>
            </CardContent>
        </Card>
    );
}