// Ruta actual del archivo: /Users/israelwong/Documents/Desarrollo/promedia-app/app/admin/_lib/funciones/informarHorarioDeAtencion.type.ts

export interface InformarHorarioArgs {
    negocioId: string;
    // Podrías añadir argumentos opcionales si la IA detecta
    // que se pregunta por un día específico o si está abierto ahora.
    diaEspecifico?: string;
    verificarAbiertoAhora?: boolean;
}

export interface InformarHorarioData {
    respuestaHorario: string; // El texto con la información del horario
}