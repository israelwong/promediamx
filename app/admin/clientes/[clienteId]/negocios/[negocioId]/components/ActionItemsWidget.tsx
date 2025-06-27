// app/admin/.../_components/ActionItemsWidget.tsx
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { z } from 'zod';
import { type dashboardDataSchema } from '@/app/admin/_lib/actions/dashboard/dashboard.schemas';
import { AlertTriangle, Lightbulb, Bot } from 'lucide-react';

type ActionItemsData = z.infer<typeof dashboardDataSchema>['actionItems'];

export default function ActionItemsWidget({ data }: { data: ActionItemsData, negocioId: string }) {
    // NOTA: Las rutas de los Link son un ejemplo, habría que ajustarlas a las rutas reales.
    return (
        <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
                <CardTitle>Centro de Acción</CardTitle>
                <CardDescription>Elementos que requieren tu atención para mejorar el asistente.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    <li className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bot className="h-5 w-5 text-red-500" />
                            <span className="text-sm text-zinc-300">Errores del Asistente</span>
                        </div>
                        <span className="text-sm font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md">{data.erroresAsistente}</span>
                    </li>
                    <li className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Lightbulb className="h-5 w-5 text-amber-400" />
                            <span className="text-sm text-zinc-300">Knowledge Gaps (Generales)</span>
                        </div>
                        <Link href={`#`} className="text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md hover:bg-amber-500/20">
                            {data.knowledgeGapsGenerales} por revisar
                        </Link>
                    </li>
                    <li className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                            <span className="text-sm text-zinc-300">Knowledge Gaps (Ofertas)</span>
                        </div>
                        <Link href={`#`} className="text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md hover:bg-amber-500/20">
                            {data.knowledgeGapsOfertas} por revisar
                        </Link>
                    </li>
                </ul>
            </CardContent>
        </Card>
    );
}