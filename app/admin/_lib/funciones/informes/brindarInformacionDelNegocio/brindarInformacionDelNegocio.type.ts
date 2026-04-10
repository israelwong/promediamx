// Ruta actual: /Users/israelwong/Documents/Desarrollo/promedia-app/app/admin/_lib/funciones/brindarInformacionDelNegocio.type.ts
export interface BrindarInfoArgs {
    // Define qué argumentos necesita esta función. Podría ser solo el negocioId
    // o quizás un tema específico si la IA lo puede determinar.
    negocioId: string;
    tema?: string; // Ejemplo: 'mision', 'valores', 'general'
}

export interface BrindarInfoData {
    informacionEncontrada: string; // El texto con la información
}
// -