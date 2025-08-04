// Ruta: app/admin/_lib/helpers/date.helpers.ts
// import { set } from 'date-fns';

/**
 * ✅ REFACTORIZADO: Combina una fecha y una hora de forma robusta e inmune a la zona horaria.
 * @param utcDateString El string de fecha en formato ISO 8601 (ej. "2025-08-08T00:00:00.000Z").
 * @param timeString La hora seleccionada, en formato "HH:mm".
 * @returns Un nuevo objeto Date con la fecha y hora combinadas correctamente.
 */
export function combineDateAndTime(utcDateString: string, timeString: string): Date {
    console.log(`[date.helper] 1. Recibiendo Fecha UTC (string):`, utcDateString);
    console.log(`[date.helper] 2. Recibiendo Hora (string):`, timeString);

    // Extrae solo la parte de la fecha (YYYY-MM-DD) del string ISO.
    // Esto ignora la hora y la zona horaria, tratando la entrada como un día calendario.
    const datePart = utcDateString.slice(0, 10);
    console.log(`[date.helper] 3. Parte de la fecha extraída:`, datePart);

    const [hours, minutes] = timeString.split(':').map(Number);
    const [year, month, day] = datePart.split('-').map(Number);

    // El mes en el constructor de Date es 0-indexed, por lo que restamos 1.
    // new Date(year, month, day, hours, minutes) crea una fecha en la
    // zona horaria local del sistema que está ejecutando el código.
    const finalDate = new Date(year, month - 1, day, hours, minutes);
    console.log(`[date.helper] 4. Fecha final construida en la zona horaria del servidor:`, finalDate.toISOString());

    return finalDate;
}
