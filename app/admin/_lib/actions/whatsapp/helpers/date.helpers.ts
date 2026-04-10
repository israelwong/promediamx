// /helpers/date.helpers.ts
// Este archivo contiene funciones puras para la manipulación y cálculo de fechas.
// No tiene dependencias externas más allá de las nativas de JavaScript/TypeScript.

export function construirFechaDesdePalabrasClave(
    palabrasClave: { dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string },
    fechaReferencia: Date
): { fecha: Date | null, hora: { hora: number, minuto: number } | null, fechaEncontrada: boolean, horaEncontrada: boolean } {

    const fechaCalculada: Date | null = new Date(fechaReferencia);
    let fechaModificada = false;

    if (palabrasClave.dia_relativo?.toLowerCase() === 'mañana') {
        fechaCalculada.setDate(fechaCalculada.getDate() + 1);
        fechaModificada = true;
    } else if (palabrasClave.dia_relativo?.toLowerCase() === 'hoy') {
        fechaModificada = true;
    }

    if (palabrasClave.dia_semana) {
        const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
        const diaTarget = diasSemana.indexOf(palabrasClave.dia_semana.toLowerCase());
        if (diaTarget !== -1) {
            const diaActual = fechaCalculada.getDay();
            let diasAAñadir = diaTarget - diaActual;
            if (diasAAñadir <= 0) { diasAAñadir += 7; }
            fechaCalculada.setDate(fechaCalculada.getDate() + diasAAñadir);
            fechaModificada = true;
        }
    }

    if (palabrasClave.dia_mes) {
        fechaCalculada.setDate(palabrasClave.dia_mes);
        fechaModificada = true;
    }

    let horaCalculada: { hora: number, minuto: number } | null = null;
    let horaEncontrada = false;
    if (palabrasClave.hora_str) {
        const matchHora = palabrasClave.hora_str.match(/(\d{1,2}):?(\d{2})?/);
        if (matchHora) {
            let hora = parseInt(matchHora[1], 10);
            const minuto = matchHora[2] ? parseInt(matchHora[2], 10) : 0;

            if (palabrasClave.hora_str.toLowerCase().includes('pm') && hora < 12) { hora += 12; }
            if (palabrasClave.hora_str.toLowerCase().includes('am') && hora === 12) { hora = 0; }

            horaCalculada = { hora, minuto };
            horaEncontrada = true;

            if (fechaCalculada) {
                fechaCalculada.setHours(hora, minuto, 0, 0);
            }
        }
    }

    return {
        fecha: fechaModificada ? fechaCalculada : null,
        hora: horaCalculada,
        fechaEncontrada: fechaModificada,
        horaEncontrada: horaEncontrada
    };
}

export function sonElMismoDia(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getFullYear() === fecha2.getFullYear() &&
        fecha1.getMonth() === fecha2.getMonth() &&
        fecha1.getDate() === fecha2.getDate();
}