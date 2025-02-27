import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Verificar la suscripción del webhook
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === 'meatyhamhock') {
            console.log('Webhook verificado correctamente.');
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Token inválido');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}
