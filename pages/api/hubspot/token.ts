import fetch from 'node-fetch';

const clientId = '8ae514b4-469e-497a-a3ef-712a14a7f12f';
const clientSecret = '71c71bdc-4c5c-4def-be34-fa19dc9c3c8d';
const refreshToken = 'na1-3f07-eee3-466a-a7de-38f9695b4542'; // El refresh token obtenido inicialmente

async function refreshAccessToken() {
    const url = 'https://api.hubapi.com/oauth/v1/token';

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
    });

    const response = await fetch(url, {
        method: 'POST',
        body,
    });

    interface HubSpotTokenResponse {
        access_token?: string;
    }

    const data: HubSpotTokenResponse = await response.json() as HubSpotTokenResponse;
    if (data.access_token) {
        return data.access_token; // Retorna el nuevo access token
    } else {
        throw new Error('No se pudo obtener un nuevo access token');
    }
}

// Llamada para refrescar el token
refreshAccessToken().then(newAccessToken => {
    console.log('Nuevo access token:', newAccessToken);
}).catch(err => {
    console.error('Error al refrescar el token:', err.message);
});

export default refreshAccessToken;

