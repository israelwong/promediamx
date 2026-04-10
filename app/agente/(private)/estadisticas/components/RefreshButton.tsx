"use client";

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

export default function RefreshButton() {
    const router = useRouter();
    const [isRefreshing, startTransition] = useTransition();

    const handleRefresh = () => {
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
            {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
        </Button>
    );
}