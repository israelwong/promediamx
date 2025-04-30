import { GoogleGenerativeAI } from "@google/generative-ai";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("La variable de entorno GEMINI_API_KEY no está definida.");
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: [],
  responseMimeType: "text/plain",
};

/**
 *
 * Necesito pasar el mensaje y el phoneNumberId
 * phoneNumberId <- está asociado con el numero de whatsapp del cliente
 * tendria que obtener el id del cliente
 */

export async function obtenerIntencion(mensaje, phoneNumberId) {
  // const { clienteId, contactId, canalId } = await obtenerClienteId(
  console.log("obtener intención:", { mensaje, phoneNumberId });
  const construirInstrucciones = () => {
    const intencionesDB = [
      {
        nombre: "comprar_producto",
        categoria: "compra",
        subcategoria: "producto",
        sinonimos: [
          "quiero comprar",
          "deseo adquirir",
          "necesito un producto",
          "quiero un bot",
        ],
        ejemplos: [
          "Quiero un bot",
          "Me interesa adquirir el producto X",
          "Necesito comprar una licencia",
        ],
        etapa_embudo: "MOFU",
        accion_sugerida: "iniciar_compra",
        estado: "activo",
      },
      {
        nombre: "solicitar_informacion_servicio",
        categoria: "servicios",
        subcategoria: "informacion",
        sinonimos: [
          "información sobre",
          "detalles de",
          "cómo funciona",
          "qué es",
        ],
        ejemplos: [
          "Me gustaría obtener información sobre la configuración de Manychat",
          "Quisiera saber más detalles sobre sus servicios de automatización",
          "Cómo funciona su servicio de diseño de embudos de venta?",
        ],
        etapa_embudo: "TOFU",
        accion_sugerida: "enviar_informacion",
        estado: "activo",
      },
      {
        nombre: "agendar_cita",
        categoria: "contacto",
        subcategoria: "agendar",
        sinonimos: ["agendar reunión", "programar cita", "reservar hora"],
        ejemplos: [
          "Quiero agendar una cita para hablar sobre mis necesidades",
          "Me gustaría programar una reunión para discutir una cotización",
          "Necesito reservar una hora para una consulta",
        ],
        etapa_embudo: "BOFU",
        accion_sugerida: "agendar_cita",
        estado: "activo",
      },
      {
        nombre: "solicitar_cotizacion",
        categoria: "cotizacion",
        subcategoria: "general",
        sinonimos: ["cuánto cuesta", "precio de", "cotización de"],
        ejemplos: [
          "Me gustaría saber cuánto cuesta configurar Manychat",
          "Podrían darme el precio de sus servicios de mantenimiento",
          "Necesito una cotización de sus servicios de automatización",
        ],
        etapa_embudo: "MOFU",
        accion_sugerida: "mostrar_cotizacion",
        estado: "activo",
      },
      {
        nombre: "informacion_general",
        categoria: "informacion",
        subcategoria: "general",
        sinonimos: ["informacion general", "sobre la empresa", "acerca de"],
        ejemplos: [
          "Qué es ProMedia",
          "Me pueden dar información sobre la empresa",
          "Acerca de sus servicios",
        ],
        etapa_embudo: "TOFU",
        accion_sugerida: "responder",
        estado: "activo",
      },
    ];

    let instrucciones = [
      "Eres un modelo de lenguaje avanzado que ayuda a analizar mensajes de usuarios.",
      "Tu objetivo principal es identificar la intención del usuario con la mayor precisión posible, basándote en las siguientes intenciones reconocidas y sus ejemplos.",
      "Devuelve la intención principal, intenciones secundarias, entidades clave, etapa del embudo (TOFU, MOFU, BOFU) y acción recomendada.",
      "Ejemplo de formato de salida esperado (JSON):",
      `{
        "intencion_principal": "compra.producto",
        "intenciones_secundarias": ["servicios.informacion"],
        "entidades_clave": ["bot", "licencia"],
        "contexto": "venta",
        "informacion_adicional": "urgencia",
        "resumen": "compra",
        "etapa_embudo": "MOFU",
        "accion": "iniciar_compra"
      }`,
      "Lista de intenciones reconocidas:\n",
    ];

    intencionesDB.forEach((intencion) => {
      instrucciones.push(`* ${intencion.nombre}:`);
      instrucciones.push(`  - Categoría: ${intencion.categoria}`);
      if (intencion.subcategoria)
        instrucciones.push(`  - Subcategoría: ${intencion.subcategoria}`);
      instrucciones.push(`  - Sinónimos: ${intencion.sinonimos.join(", ")}`);
      instrucciones.push(`  - Ejemplos: ${intencion.ejemplos.join(", ")}`);
      instrucciones.push(`  - Etapa: ${intencion.etapa_embudo}`);
      instrucciones.push(`  - Acción: ${intencion.accion_sugerida}`);
    });

    return instrucciones.join("\n");
  };

  try {
    const instruccionesString = construirInstrucciones();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: instruccionesString,
    });

    const prompt = `
      Analiza el siguiente mensaje y devuelve el resultado en formato JSON con las siguientes claves:
      - intencion_principal (string)
      - intenciones_secundarias (array de string)
      - entidades_clave (array de string)
      - contexto (string)
      - informacion_adicional (string)
      - resumen (string)
      - etapa_embudo (TOFU, MOFU o BOFU)
      - accion (string)

      Mensaje: "${mensaje}"
    `;

    const chatSession = model.startChat({
      generationConfig,
      messages: [],
    });

    const response = await chatSession.sendMessage(prompt);
    const responseText =
      response?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("No se recibió respuesta del modelo.");
    }

    const cleanedText = responseText
      .replace(/```(json)?\n?/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonObject = JSON.parse(cleanedText);

    // Si por alguna razón no devuelve la etapa, la volvemos a clasificar
    if (!jsonObject.etapa_embudo) {
      const etapa = await clasificarEtapaEmbud(mensaje);
      jsonObject.etapa_embudo = etapa;
    }

    return jsonObject;
  } catch (error) {
    console.error("Error al obtener intención:", error);
    return {
      intencion_principal: "informacion.general",
      intenciones_secundarias: [],
      entidades_clave: [],
      contexto: "",
      informacion_adicional: "",
      resumen: "",
      etapa_embudo: "TOFU",
      accion: "responder",
    };
  }

  async function clasificarEtapaEmbud(texto) {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });

    const prompt = `
      Clasifica la siguiente intención del usuario en TOFU, MOFU o BOFU. Devuelve solo la etapa:

      "${texto}"
    `;

    try {
      const result = await model.generateContent(prompt);
      const etapa = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
        ?.trim()
        ?.toUpperCase();
      return etapa === "MOFU" || etapa === "BOFU" ? etapa : "TOFU";
    } catch (e) {
      console.error("Error clasificando etapa:", e);
      return "TOFU";
    }
  }
}
