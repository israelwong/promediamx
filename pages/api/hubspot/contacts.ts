import { NextApiRequest, NextApiResponse } from 'next';

const HUBSPOT_ACCESS_TOKEN = "CLChhbTRMhIXAAEAQAAAAQAAAAAwAgAAAAAAAAAAAAEYio69FyCd95gEKI3N-QMyFDOgAXv-wax_tzwhSK_SIZzXAhhCOkUAAABBAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAgAAAAAADgAQAAAAAAAOAHBgAAkAMAAAAAAAAAAAAAAAAAAAAAAAAA0ANCFLyI-ocqZj4XK7vF1Qxx8W_HROAuSgNuYTFSAFoAYAA";
const REFRESH_TOKEN = "na1-3f07-eee3-466a-a7de-38f9695b4542"; // El refresh token almacenado


// 📌 1. Crear contacto
const createContact = async (email: string, firstName: string, phone: string, comments: string, service: string, token: string) => {
    try {
        const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
                properties: {
                    email,
                    firstname: firstName,
                    phone,
                    "servicio_de_interes": service, // Propiedad personalizada
                    comments, // Propiedad estándar
                    // "hs_appointment_start": appointmentDateTime, // Usamos esta propiedad para fecha y hora combinados
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Error de HubSpot:", data);
            throw new Error(`Error creando el contacto: ${data.message || JSON.stringify(data)}`);
        }

        console.log("Contacto creado con ID:", data.id);
        return data.id;
    } catch (error) {
        console.error("Error creando el contacto:", error);
        throw error;
    }
};

// 📌 2. Crear negocio (deal)
const createDeal = async (dealName: string, pipelineId: string, stageId: string, token: string) => {
    try {
        const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    dealname: dealName,
                    pipeline: pipelineId,
                    dealstage: stageId
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("Error en createDeal:", data);
            throw new Error(`Error creando el negocio: ${data.message}`);
        }

        console.log("Negocio creado con ID:", data.id);
        return data.id;
    } catch (error) {
        console.error('Error en createDeal:', error);
        throw error;
    }
};

// 📌 3. Asociar contacto con negocio (deal)
const associateContactWithDeal = async (contactId: string, dealId: string, token: string) => {
    try {
        const response = await fetch(`https://api.hubapi.com/crm/v3/associations/deal/contact/batch/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: [
                    {
                        from: { id: dealId },
                        to: { id: contactId },
                        type: 3 // Asociación válida en HubSpot
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error en associateContactWithDeal:", errorData);
            throw new Error(`Error asociando contacto al negocio: ${errorData.message}`);
        }

        console.log(`Contacto ${contactId} asociado al negocio ${dealId} exitosamente.`);
    } catch (error) {
        console.error('Error en associateContactWithDeal:', error);
        throw error;
    }
};

// Función para refrescar el token
const refreshAccessToken = async () => {
    try {
        const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: '8ae514b4-469e-497a-a3ef-712a14a7f12f', // Asegúrate de que sea correcto
                client_secret: '71c71bdc-4c5c-4def-be34-fa19dc9c3c8d', // Asegúrate de que sea correcto
                refresh_token: REFRESH_TOKEN, // Asegúrate de que este refresh token sea el adecuado
            }),
        });

        if (!response.ok) {
            const errorData = await response.json(); // Captura la respuesta de error
            console.error('HubSpot API error:', errorData);
            throw new Error(`Error actualizando el token de acceso: ${errorData.message || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error actualizando el token:', error);
        throw error;
    }
};

const checkIfContactExists = async (email: string, token: string) => {
    try {
        const response = await fetch(`https://api.hubapi.com/contacts/v1/contact/email/${email}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 200) {
            return await response.json(); // El contacto existe
        } else {
            console.log("El contacto no existe");
            return null; // El contacto no existe
        }
    } catch (error) {
        console.error('Error al verificar el contacto:', error);
        throw error;
    }
};

// const createEngagement = async (contactId: string, appointmentDateTime: string, token: string) => {
//     try {
//         const engagementResponse = await fetch("https://api.hubapi.com/engagements/v1/engagements", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "Authorization": `Bearer ${token}`,
//             },
//             body: JSON.stringify({
//                 engagement: {
//                     type: "TASK", // Usamos TASK para representar la cita
//                     timestamp: new Date(appointmentDateTime).getTime(), // Convertir la fecha y hora de la cita en timestamp Unix
//                 },
//                 associations: {
//                     contactIds: [contactId], // Asociamos la cita con el ID del contacto creado
//                 },
//                 properties: {
//                     "hs_appointment_start": appointmentDateTime, // Fecha y hora de la cita
//                 },
//             }),
//         });

//         if (!engagementResponse.ok) {
//             const errorData = await engagementResponse.json();
//             console.error("Error en createEngagement:", errorData);
//             throw new Error(`Error creando el engagement: ${errorData.message}`);
//         }

//         const engagementData = await engagementResponse.json();
//         console.log("Engagement creado con ID:", engagementData.engagement.id);
//         return engagementData.engagement.id;
//     } catch (error) {
//         console.error("Error en createEngagement:", error);
//         throw error;
//     }
// }


// API handler en Next.js
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const pipelineId = "default"; // Reemplaza con el ID real del pipeline
            const stageId = "1008382295"; // ID del stage dentro del pipeline
            let token = HUBSPOT_ACCESS_TOKEN;
            const { email, firstname, phone, service, comments, appointmentDateTime } = req.body;
            console.log(req.body);

            if (!email || !firstname || !phone || !service || !comments || !appointmentDateTime) {
                return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
            }

            //! Verificar si el contacto ya existe
            const testResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                }
            });

            //! Si el token ha expirado, obtenemos uno nuevo
            if (testResponse.status === 401) {
                console.log("Token expirado, actualizando...");
                token = await refreshAccessToken();
            } else {
                console.log("Token válido");
            }

            //! Verificar si el contacto ya existe
            const existingContact = await checkIfContactExists(email, token);
            if (existingContact) {
                const dealName = `Solicitud repetida negocio - ${firstname}`;
                const dealId = await createDeal(dealName, pipelineId, stageId, token);
                await associateContactWithDeal(existingContact.vid, dealId, token);
                return res.status(200).json({ message: 'El contacto ya existe pero se agrego al pipeline', contactId: existingContact.vid });
            } else {
                // 1️⃣ Crear contacto
                const contactId = await createContact(email, firstname, phone, service, comments, token);
                // 2️⃣ Crear negocio
                const dealName = `Nuevo negocio - ${firstname}`;
                const dealId = await createDeal(dealName, pipelineId, stageId, token);
                // 3️⃣ Asociar contacto con negocio
                await associateContactWithDeal(contactId, dealId, token);


                // // 4️⃣ Crear engagement
                // if (appointmentDateTime) {
                //     await createEngagement(contactId, appointmentDateTime, token);
                // }

                res.status(200).json({ message: 'Contacto creado, asociado y agregado al pipeline', contactId, dealId });
            }
        } catch (error) {
            console.error('Hubo un error:', error);
            res.status(500).json({ message: 'Hubo un error al procesar la solicitud', error: (error as Error).message });
        }
    } else {
        res.status(405).json({ message: 'Método no permitido' });
    }
}
