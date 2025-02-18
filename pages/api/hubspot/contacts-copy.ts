
import { NextApiRequest, NextApiResponse } from 'next';


interface ContactProperties {
    property: string;
    value: string;
}

interface HubSpotResponse {
    // Define the structure of the response from HubSpot if known
    status: string;
    message: string;
    vid?: number;
    // Add other properties as needed based on the actual HubSpot response
}

const sendToHubSpot = async (
    email: string,
    firstname: string,
    lastname: string,
    phone: string,
    company: string
): Promise<HubSpotResponse> => {
    const accessToken = "CI2Ux67RMhIXAAEAQAAAAQAAAAAgAAAAAAAAAAAAAAEYio69FyCd95gEKI3N-QMyFEwJWvt0u4m-IBP5680fvDqtLHYHOkUAAABBAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAgAAAAAADgAQAAAAAAAAAHAAAAkAIAAAAAAAAAAAAAAAAAAAAAAAAA0ANCFA5BeLaHYMtWKZDc-u3x4UyEyCNYSgNuYTFSAFoAYAA";

    try {
        const contactoCreado = await fetch('https://api.hubapi.com/contacts/v1/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,  // Usa tu access token aquí
            },
            body: JSON.stringify({
                properties: [
                    { property: 'email', value: email },
                    { property: 'firstname', value: firstname },
                    { property: 'lastname', value: lastname },
                    { property: 'phone', value: phone },
                    { property: 'company', value: company },
                ] as ContactProperties[],
            }),
        });

        const result: HubSpotResponse = await contactoCreado.json();
        return result;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error('Error al enviar datos a HubSpot: ' + error.message);
        } else {
            throw new Error('Error al enviar datos a HubSpot');
        }
    }
};

// API handler para recibir datos y enviarlos a HubSpot
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { email, firstname, lastname, phone, company } = req.body;

            // Verificar si los datos son correctos
            if (!email || !firstname || !lastname || !phone || !company) {
                return res.status(400).json({ message: 'Faltan datos en el formulario' });
            }

            // Enviar los datos a HubSpot
            const hubSpotResponse = await sendToHubSpot(email, firstname, lastname, phone, company);

            // Si HubSpot respondió correctamente, enviamos la respuesta
            res.status(200).json({ message: 'Contacto enviado a HubSpot', data: hubSpotResponse });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            res.status(500).json({ message: errorMessage });
        }
    } else {
        // Si no es un método POST
        res.status(405).json({ message: 'Método no permitido' });
    }
}
