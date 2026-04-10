// import { GoogleGenerativeAI } from "@google/generative-ai";
// import dotenv from "dotenv";

// dotenv.config();
// const apiKey = process.env.GEMINI_API_KEY;

// if (!apiKey) {
//   console.error("La variable de entorno GEMINI_API_KEY no está definida.");
//   throw new Error("GEMINI_API_KEY is not defined in environment variables.");
// }
// const genAI = new GoogleGenerativeAI(apiKey);

// const generationConfig = {
//   temperature: 1,
//   topP: 0.95,
//   topK: 40,
//   maxOutputTokens: 8192,
//   responseModalities: [],
//   responseMimeType: "text/plain",
// };

// export async function generarConsulta(instruccion, interacciones, mensaje) {
//   try {
//     const model = genAI.getGenerativeModel({
//       model: "gemini-2.0-flash-lite",
//       systemInstruction: instruccion,
//     });

//     const chatSession = model.startChat({
//       generationConfig,
//       messages: interacciones,
//     });

//     const response = await chatSession.sendMessage(mensaje);
//     console.log("Respuesta de Gemini:", response);
//     return response;
//   } catch (error) {
//     console.error("Error en determinarIntencion:", error);
//     throw new Error("No se pudo determinar la intención del mensaje.");
//   }
// }
