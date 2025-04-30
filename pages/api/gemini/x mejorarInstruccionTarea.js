import { mejorarInstruccionTarea } from "@/scripts/gemini/mejorarInstruccionTarea";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Extracción de datos - ¡Bien!
  const {
    nombre_tarea,
    descripcion_tarea,
    rol_asignado,
    personalidad_asistente,
    trigger_activacion,
    nombre_funcion_automatizacion,
    parametros, // <-- Asegúrate de cómo viene este dato
    instrucion_a_mejorar, // <-- Pequeño typo aquí: 'instruccion_a_mejorar'
  } = req.body;

  // **Sugerencia 1: Validación de Entrada (Importante)**
  // Antes de continuar, valida que los campos esenciales no estén vacíos/undefined
  if (
    !nombre_tarea ||
    !descripcion_tarea ||
    !rol_asignado ||
    !personalidad_asistente ||
    !instrucion_a_mejorar
  ) {
    return res
      .status(400)
      .json({ error: "Faltan campos requeridos para mejorar la instrucción." });
  }
  // Podrías añadir más validaciones (ej. si parámetros es un array esperado)
  try {
    // Log para depuración - ¡Bien!
    console.table({
      nombre_tarea,
      descripcion_tarea,
      rol_asignado,
      personalidad_asistente,
      trigger_activacion,
      nombre_funcion_automatizacion,
      parametros,
      instrucion_a_mejorar, // <-- Corregir typo si aplica en la variable también
    });

    //! Llamar a la función mejorarInstruccionTarea - ¡Correcto!
    const resultado = await mejorarInstruccionTarea(
      nombre_tarea,
      descripcion_tarea,
      rol_asignado,
      personalidad_asistente,
      trigger_activacion,
      nombre_funcion_automatizacion,
      parametros,
      instrucion_a_mejorar // <-- Corregir typo aquí también si aplica
    );

    // **Sugerencia 2: Verificar resultado antes de enviar**
    if (resultado === null || typeof resultado === "undefined") {
      // La función de script falló y manejó el error internamente (ver sugerencia en script)
      return res.status(500).json({
        error:
          "Error al generar la instrucción mejorada desde el servicio de IA.",
      });
    }

    // Respuesta Exitosa - ¡Bien!
    res.status(200).json({ resultado });
  } catch (error) {
    // Manejo de errores - ¡Bien!
    console.error("Error al procesar la solicitud:", error);
    res.status(500).json({ error: "Error interno del servidor" });
    // Considera si quieres loguear el error aquí o si ya se logueó en la función llamada
  }
}
