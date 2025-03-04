'use strict';
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

const access_token = process.env.FB_ACCESS_TOKEN;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {

        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === 'meatyhamhock') {
            console.log('Webhook verificado correctamente.');
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Token inválido');
        }
    } else if (req.method === 'POST') {
        const body = req.body;
        if (!body.entry || !body.entry[0]?.changes || !body.entry[0].changes[0]?.value) {
            console.error('Estructura de webhook no válida:', JSON.stringify(body));
            return res.status(400).send('Bad Request');
        }

        try {

            const leadId = body.entry[0].changes[0].value.leadgen_id;
            const clienteId = body.entry[0].changes[0].value.clienteId;
            const url = `https://graph.facebook.com/v16.0/${leadId}?access_token=${access_token}`;

            // console.log(clienteId ? 'Datos del cliente:' : 'Datos del lead:', leadId);


            fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    const leadData = data as { error?: { message: string } };
                    if (leadData.error) {
                        console.error('Error obteniendo datos del lead:', (data as { error: { message: string } }).error.message);
                        res.status(500).send('Internal Server Error');
                    } else {

                        // Procesar los datos del lead
                        const processedData = (data as { field_data: { name: string; values: string[] }[] }).field_data.map((field: { name: string; values: string[] }) => ({
                            name: field.name,
                            value: field.values[0], // Tomamos el primer valor del array
                        })) || [];

                        const endpoint = '/api/storage/promedia';
                        const payload = clienteId ? { clienteId, processedData } : { processedData };
                        const fullUrl = new URL(endpoint, `http://${req.headers.host}`).toString();

                        // console.log('Datos del lead:', endpoint, payload);

                        // return

                        fetch(fullUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payload),
                        })
                            .then((response) => response.json())
                            .then((result) => {
                                console.log('Data sent successfully:', result);
                                res.status(200).send('EVENT_RECEIVED');
                            })
                            .catch((error) => {
                                console.error('Error sending data:', error);
                                res.status(500).send('Internal Server Error');
                            });
                        res.status(200).send('EVENT_RECEIVED');
                    }
                })
                .catch((error) => {
                    console.error('Error obteniendo datos del lead:', error);
                    res.status(500).send('Internal Server Error');
                });
        } catch (error) {
            console.error('Error procesando la solicitud:', error);
            res.status(400).send('Bad Request');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}

