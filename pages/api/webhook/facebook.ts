import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Verificar la suscripción del webhook
        const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verificado correctamente.');
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Token inválido');
        }
    } else if (req.method === 'POST') {
        // Procesar los leads recibidos
        const body = req.body;

        if (body && body.entry) {
            body.entry.forEach((entry: { changes: { field: string; value: { [key: string]: unknown }; }[] }) => {
                if (entry.changes) {
                    entry.changes.forEach((change: { field: string; value: { [key: string]: unknown }; }) => {
                        if (change.field === 'leadgen') {
                            console.log('Nuevo lead recibido:', change.value);
                            // Aquí puedes procesar y almacenar el lead
                        }
                    });
                }
            });
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.status(400).send('Bad Request');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}