// Ruta: app/admin/_lib/helpers/date.helpers.ts
import { set } from 'date-fns';

/**
 * Combina un objeto Date (que representa el día) con un string de hora (ej. "14:00").
 * Esta función es crucial porque construye la fecha final de una manera que es inmune
 * a los problemas de zona horaria del servidor.
 * @param date El objeto Date del selector de calendario.
 * @param timeString La hora seleccionada, en formato "HH:mm".
 * @returns Un nuevo objeto Date con la fecha y hora combinadas correctamente.
 */
export function combineDateAndTime(date: Date, timeString: string): Date {
    console.log(`[date.helper] 1. Recibiendo Fecha (objeto Date):`, date.toISOString());
    console.log(`[date.helper] 2. Recibiendo Hora (string):`, timeString);

    const [hours, minutes] = timeString.split(':').map(Number);

    // La función 'set' de date-fns es la clave aquí. Modifica la fecha
    // manteniendo la zona horaria original del objeto Date del cliente,
    // en lugar de reinterpretarla en la zona horaria del servidor (UTC).
    const combinedDate = set(date, {
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0,
    });

    console.log(`[date.helper] 3. Fecha y Hora Combinadas (objeto Date):`, combinedDate.toISOString());
    return combinedDate;
}
