import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: "No se recibió el código de autorización." });
    }

    try {
        const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: process.env.HUBSPOT_CLIENT_ID!,
                client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
                redirect_uri: "https://promedia.mx/api/hubspot/oauth",
                code: code as string,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(400).json({ error: "Error obteniendo el token", details: data });
        }

        // Guarda los tokens en una base de datos o en un almacenamiento seguro
        return res.status(200).json({ message: "Autenticado con éxito", tokens: data });
    } catch (error) {
        return res.status(500).json({ error: "Error en la autenticación", details: error });
    }
}
