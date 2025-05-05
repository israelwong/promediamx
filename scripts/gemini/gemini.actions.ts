'use server';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content, Part, GenerationConfig } from "@google/generative-ai";
import { Buffer } from 'buffer'; // Necesario para trabajar con datos binarios de imagen

// --- Configuración API Key ---
const apiKey = process.env.GEMINI_API_KEY; // Asegúrate que esta variable de entorno esté definida
if (!apiKey) {
    console.error("¡ERROR CRÍTICO! La variable de entorno GEMINI_API_KEY no está definida.");
    // En un entorno real, podrías querer lanzar un error o tener un manejo más robusto
    // throw new Error("GEMINI_API_KEY no definida.");
}
// Inicializar cliente solo si hay API Key
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const gemini_model = "gemini-1.5-flash-latest"; // Modelo recomendado para tareas rápidas y multimodales

const defaultGenerationConfig: GenerationConfig = { // Usar el tipo GenerationConfig
    temperature: 0.5, // Default a medio
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 512, // Un límite general razonable
    responseMimeType: "text/plain", // Default a texto plano
};

// Configuración de seguridad (ajusta según tu tolerancia al riesgo)
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- Función Helper para obtener datos de imagen desde URL ---
async function urlToGenerativePart(url: string): Promise<Part | null> {
    try {
        console.log(`Fetching image data from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error al descargar imagen: ${response.status} ${response.statusText}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.startsWith('image/')) {
            console.warn(`Tipo de contenido no es imagen (${contentType}) para URL: ${url}. Intentando de todos modos.`);
            // Podrías intentar inferir basado en la extensión si es necesario, o fallar aquí.
            // Por ahora, intentaremos con un tipo común si no se detecta.
        }
        // Usar el tipo detectado o un default razonable
        const mimeType = contentType?.startsWith('image/') ? contentType : 'image/jpeg';

        const buffer = await response.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString("base64");

        console.log(`Imagen obtenida y convertida a base64 (MIME: ${mimeType}). Tamaño original: ${buffer.byteLength} bytes.`);

        return {
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        };
    } catch (error) {
        console.error(`Error al procesar imagen desde URL ${url}:`, error);
        return null; // Devolver null si no se puede procesar la imagen
    }
}



//! Descripción Multimodal ---
/**
 * @description Llama a un modelo multimodal de Gemini para generar texto basado en un prompt y una imagen.
 * @param {string} promptTexto - El prompt de texto que acompaña a la imagen.
 * @param {string} urlImagen - La URL pública de la imagen a procesar.
 * @param {Partial<GenerationConfig>} [configOverrides] - Opciones para sobrescribir la configuración de generación (ej. temperature, maxOutputTokens).
 * @returns {Promise<string | null>} - La descripción generada o null en caso de error.
 */

export async function llamarGeminiMultimodalParaGenerarDescripcion(
    promptTexto: string,
    urlImagen: string,
    configOverrides?: Partial<GenerationConfig> // <-- NUEVO PARÁMETRO OPCIONAL
): Promise<string | null> {
    if (!genAI) { console.error("Gemini AI Client no inicializado."); return null; }
    if (!promptTexto || typeof promptTexto !== 'string' || !urlImagen || typeof urlImagen !== 'string') { console.error("Parámetros inválidos."); return null; }

    try {
        // 1. Obtener datos de imagen
        const imagePart = await urlToGenerativePart(urlImagen);
        if (!imagePart) throw new Error("No se pudo procesar la imagen desde la URL.");

        // 2. Preparar contenido multimodal
        const content: Content = { role: "user", parts: [{ text: promptTexto }, imagePart] };

        // --- Combinar configuración default con overrides ---
        const finalGenerationConfig = {
            ...defaultGenerationConfig, // Empezar con los defaults
            ...configOverrides,        // Sobrescribir con los parámetros pasados
            responseMimeType: "text/plain" // Asegurar texto plano como respuesta
        };
        // --------------------------------------------------

        // 3. Seleccionar modelo multimodal
        const model = genAI.getGenerativeModel({
            model: gemini_model, // Modelo multimodal
            generationConfig: finalGenerationConfig, // <-- Usar configuración final
            safetySettings: safetySettings,
        });

        console.log("Llamando a Gemini (multimodal) para generación con config:", finalGenerationConfig);
        // 4. Generar contenido
        const result = await model.generateContent({ contents: [content] });

        // 5. Procesar respuesta
        const response = result.response;
        const responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            const safetyRatings = response?.candidates?.[0]?.safetyRatings;
            console.error("Respuesta vacía o inválida de Gemini (multimodal).");
            console.error("Finish Reason:", finishReason);
            console.error("Safety Ratings:", JSON.stringify(safetyRatings, null, 2));
            throw new Error(`Respuesta vacía del modelo (multimodal). Razón: ${finishReason || 'Desconocida'}`);
        }

        console.log("Descripción generada (multimodal) recibida de Gemini.");
        // Podrías aplicar la misma limpieza aquí si fuera necesario, aunque es menos común en generación
        // responseText = responseText.replace(/([.\-*])\s+\n/g, '$1\n');
        return responseText.trim();

    } catch (error: unknown) {
        console.error('Error en llamarGeminiMultimodalParaGenerarDescripcion:', error);
        return null;
    }
}

//
//! --- Mejorar Texto---
/**
 * @description Llama a un modelo de texto de Gemini para mejorar un texto dado un prompt.
 * @param {string} prompt - El prompt completo que incluye el contexto y el texto a mejorar.
 * @param {Partial<GenerationConfig>} [configOverrides] - Opciones para sobrescribir la configuración de generación (ej. temperature, maxOutputTokens).
 * @returns {Promise<string | null>} - El texto mejorado o null en caso de error.
 */
export async function llamarGeminiParaMejorarTexto(
    prompt: string,
    configOverrides?: Partial<GenerationConfig> // <-- NUEVO PARÁMETRO OPCIONAL
): Promise<string | null> {
    if (!genAI) { console.error("Gemini AI Client no inicializado."); return null; }
    if (!prompt || typeof prompt !== 'string') { console.error("Prompt inválido."); return null; }

    try {
        // --- Combinar configuración default con overrides ---
        const finalGenerationConfig = {
            ...defaultGenerationConfig, // Empezar con los defaults
            ...configOverrides,        // Sobrescribir con los parámetros pasados
            responseMimeType: "text/plain" // Asegurar texto plano para esta función
        };
        // --------------------------------------------------

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest", // O "gemini-pro"
            generationConfig: finalGenerationConfig, // <-- Usar configuración final
            safetySettings: safetySettings,
        });

        console.log("Llamando a Gemini (texto) para mejora con config:", finalGenerationConfig);
        const result = await model.generateContent(prompt);

        const response = result.response;
        let responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            const finishReason = response?.candidates?.[0]?.finishReason;
            const safetyRatings = response?.candidates?.[0]?.safetyRatings;
            console.error("Respuesta vacía o inválida de Gemini (texto).");
            console.error("Finish Reason:", finishReason);
            console.error("Safety Ratings:", JSON.stringify(safetyRatings, null, 2));
            throw new Error(`Respuesta vacía del modelo (texto). Razón: ${finishReason || 'Desconocida'}`);
        }

        console.log("Texto original recibido de Gemini:", JSON.stringify(responseText)); // Log original

        // --- INICIO: Limpieza de espacios antes de saltos de línea ---
        // Reemplaza patrones como ". \n", "- \n", "* \n" con la versión sin espacio
        // \s+ busca uno o más espacios en blanco (espacio, tab, etc.)
        // El modificador 'g' asegura que se reemplacen todas las ocurrencias
        responseText = responseText.replace(/([.\-*])\s+\n/g, '$1\n');
        // Podrías añadir más patrones si observas otros problemas comunes
        // Ejemplo: eliminar múltiples saltos de línea seguidos si es necesario
        // responseText = responseText.replace(/\n{3,}/g, '\n\n'); // Reemplaza 3 o más \n con solo 2
        // -------------------------------------------------------------

        console.log("Texto después de la limpieza:", JSON.stringify(responseText.trim())); // Log limpiado
        return responseText.trim(); // Devolver el texto limpiado


    } catch (error: unknown) {
        console.error('Error en llamarGeminiParaMejorarTexto:', error);
        return null;
    }
}