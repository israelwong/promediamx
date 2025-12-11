// Ruta: app/admin/_lib/helpers/date.helpers.ts

/**
 * ✅ REFACTORIZADO Y CORREGIDO: Combina una fecha y una hora de forma robusta e inmune a la zona horaria.
 * @param utcDateString El string de fecha en formato ISO 8601 (ej. "2025-08-08T00:00:00.000Z").
 * @param timeString La hora seleccionada, en formato "HH:mm".
 * @returns Un nuevo objeto Date con la fecha y hora combinadas correctamente, siempre en UTC.
 */
export function combineDateAndTime(utcDateString: string, timeString: string): Date {
    console.log(`[date.helper] 1. Recibiendo Fecha (string):`, utcDateString);
    console.log(`[date.helper] 2. Recibiendo Hora (string):`, timeString);

    // Extrae solo la parte de la fecha (YYYY-MM-DD) del string.
    const datePart = utcDateString.slice(0, 10);
    console.log(`[date.helper] 3. Parte de la fecha extraída:`, datePart);

    // Construye un string de fecha y hora en formato ISO 8601 completo, añadiendo la 'Z' para forzar UTC.
    const utcDateTimeString = `${datePart}T${timeString}:00.000Z`;
    console.log(`[date.helper] 4. String de fecha-hora UTC forzado:`, utcDateTimeString);

    // Al incluir la 'Z', el objeto Date se crea SIEMPRE en UTC, sin importar la zona del servidor.
    // Esto garantiza un comportamiento idéntico en local y en Vercel.
    const finalDate = new Date(utcDateTimeString);
    console.log(`[date.helper] 5. Fecha final construida (ISO):`, finalDate.toISOString());

    return finalDate;
}