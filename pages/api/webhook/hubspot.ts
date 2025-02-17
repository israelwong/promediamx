// // pages/api/hubspot.ts
// import type { NextApiRequest, NextApiResponse } from "next";

// const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY; // Guardar en .env

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method !== "POST") {
//         return res.status(405).json({ message: "Método no permitido" });
//     }

//     try {
//         const { nombre, monto, etapa } = req.body;

//         const hubspotResponse = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 Authorization: `Bearer ${HUBSPOT_API_KEY}`,
//             },
//             body: JSON.stringify({
//                 properties: {
//                     dealname: nombre, // Nombre del negocio
//                     amount: monto, // Monto en dólares
//                     dealstage: etapa, // Etapa del pipeline
//                     pipeline: "default", // Cambiar si tienes otro pipeline
//                 },
//             }),
//         });

//         if (!hubspotResponse.ok) {
//             const errorData = await hubspotResponse.json();
//             return res.status(500).json({ message: "Error en HubSpot", error: errorData });
//         }

//         const data = await hubspotResponse.json();
//         return res.status(200).json({ message: "Negocio creado con éxito", data });
//     } catch (error) {
//         return res.status(500).json({ message: "Error interno", error });
//     }
// }
