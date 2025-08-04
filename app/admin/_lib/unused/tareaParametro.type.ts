// Ruta: app/admin/_lib/parametrosTareas.type.ts

// Importamos el tipo base ParametroRequerido.
// Eventualmente, este será el tipo generado por Prisma, pero por ahora usamos el de tu archivo global.
import { ParametroRequerido as ParametroRequeridoBasePrisma } from '../types'; // O directamente Prisma.ParametroRequerido si ya lo tienes
import {
    ParametroRequerido as ParametroRequeridoPrisma,
    TareaFuncionParametroRequerido
} from '@prisma/client';

// Interfaz para el tipo ParametroRequerido que usa la UI, con conteo opcional de funciones
export interface ParametroConDetalles extends ParametroRequeridoBasePrisma {
    _count?: {
        funciones?: number;
    };
}

// Tipo para los datos del formulario del modal.
// nombreInterno es más un estado temporal del formulario para la UI al crear.
export type ParametroFormData = Partial<Pick<ParametroRequeridoBasePrisma, 'nombreVisible' | 'tipoDato' | 'descripcion'>> & {
    nombreInterno?: string; // Usado en la UI para mostrar el ID generado antes de enviar
};

// Tipo base para los datos de entrada de las acciones de crear/editar.
// No incluye 'nombreInterno' porque se genera en el backend para 'crear'
// y no se edita para 'editar'.
export type ParametroRequeridoInput = Pick<ParametroRequeridoBasePrisma, 'nombreVisible' | 'tipoDato'> & {
    // Hacemos 'descripcion' explícitamente opcional y potencialmente null según tu action
    descripcion?: string | null;
};

export type CrearParametroRequeridoInput = Pick<ParametroRequeridoPrisma, 'nombreVisible' | 'tipoDato' | 'descripcion'>;
export type EditarParametroRequeridoInput = Pick<ParametroRequeridoPrisma, 'nombreVisible' | 'tipoDato' | 'descripcion'>;


export interface ParametroRequerido {
    id: string;
    nombreVisible: string; // Nuevo campo
    nombreInterno: string; // Antes 'nombre'
    tipoDato: string;
    descripcion?: string | null;
    orden?: number | null; // Mantenemos 'orden'
    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    funciones?: TareaFuncionParametroRequerido[];

    // Añadir _count si lo usas en las consultas
    _count?: {
        funciones?: number;
    };
}