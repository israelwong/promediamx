"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs" // Importar los primitivos de Radix

// Componente Raíz de Tabs (Tabs.Root)
const Tabs = TabsPrimitive.Root

// Componente para la Lista de Disparadores (Tabs.List)
const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        // Se usa template literal para combinar clases base con las pasadas en className
        className={`
      inline-flex h-10 items-center justify-center rounded-md bg-zinc-800 p-1 text-zinc-400
      ${className || ''}
    `}
        {...props}
    />
))
TabsList.displayName = TabsPrimitive.List.displayName

// Componente Disparador de Pestaña (Tabs.Trigger)
const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={`
      inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-zinc-900 transition-all
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50
      data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm
      ${className || ''}
    `}
        {...props}
    />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

// Componente Contenedor de Contenido de Pestaña (Tabs.Content)
const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={`
      mt-2 ring-offset-zinc-900
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
      ${className || ''}
    `}
        {...props}
    />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }