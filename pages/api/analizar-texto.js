import { PythonShell } from "python-shell";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const texto = req.body.texto; // Obtén el texto del body de la petición

    let options = {
      mode: "text",
      pythonOptions: ["-u"], // unbuffered output
      scriptPath: "./scripts_python/",
      args: [texto],
    };

    try {
      const results = await new Promise((resolve, reject) => {
        PythonShell.run("analizar_texto.py", options, function (err, results) {
          if (err) reject(reject(err));
          resolve(results);
        });
      });

      res.status(200).json({ resultado: results });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al analizar el texto" });
    }
  } else {
    res.status(405).json({ error: "Método no permitido" });
  }
}
