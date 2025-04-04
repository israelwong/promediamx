export default async function handler(req, res) {
  try {
    const { numeroParrafos, indice, parrafos } = req.body;

    // Convertir numeroParrafos e indice a números
    const numeroParrafosNum = parseInt(numeroParrafos);
    const indiceNum = parseInt(indice);

    console.log("Validndo párrafos...");
    console.table({
      numeroParrafos: numeroParrafosNum,
      indice: indiceNum,
      parrafos: parrafos,
    });

    return res.status(200).json({
      numeroParrafos: numeroParrafosNum,
      indice: indiceNum,
      parrafos: parrafos,
    });

    // Validar que parrafos sea un arreglo de objetos con una propiedad 'text' de tipo string
    let parsedParrafos;
    try {
      if (typeof parrafos === "string") {
        parsedParrafos = JSON.parse(parrafos);
      } else if (typeof parrafos === "object" && parrafos !== null) {
        parsedParrafos = parrafos;
      } else {
        throw new Error("Formato inválido");
      }
    } catch {
      return res.status(400).json({
        error: "El campo 'parrafos' debe ser un JSON válido o un objeto",
      });
    }

    if (
      !Array.isArray(parsedParrafos) ||
      !parsedParrafos.every((p) => p && typeof p.text === "string")
    ) {
      return res.status(400).json({
        error:
          "El campo 'parrafos' debe ser un arreglo de objetos con una propiedad 'text' de tipo string",
      });
    }

    parrafos = parsedParrafos;

    const parrafosArray = parrafos.map((p) => p.text.trim());

    if (numeroParrafosNum <= 2) {
      // Combinar todos los párrafos en un único párrafo
      const mensajeCombinado = parrafosArray.join("\n\n");
      return res
        .status(200)
        .json({ tipo_respuesta: "unico", parrafo: mensajeCombinado });
    } else {
      // Devolver el párrafo correspondiente al índice
      if (indiceNum >= 0 && indiceNum < parrafosArray.length) {
        return res.status(200).json({
          tipo_respuesta: "individual",
          parrafo: parrafosArray[indiceNum],
        });
      } else {
        return res.status(400).json({ error: "Índice fuera de rango" });
      }
    }
  } catch (error) {
    console.error("Error al validar párrafos:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
