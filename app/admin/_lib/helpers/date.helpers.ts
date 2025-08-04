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

    // Construye un string de fecha y hora local, sin información de zona horaria.
    const localDateTimeString = `${datePart}T${timeString}:00`;
    console.log(`[date.helper] 4. String de fecha-hora local construido:`, localDateTimeString);

    // Crea el objeto Date a partir de este string. El motor de JavaScript
    // interpretará este string como si estuviera en la zona horaria local del servidor,
    // lo que resulta en un objeto Date correcto tanto en local (CST) como en Vercel (UTC).
    const finalDate = new Date(localDateTimeString);
    console.log(`[date.helper] 5. Fecha final construida (ISO):`, finalDate.toISOString());

    return finalDate;
}
