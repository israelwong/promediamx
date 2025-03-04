// metadataHelper.ts
export function generateClientMetadata(nombreCliente: string) {
    const decodedNombreCliente = decodeURIComponent(nombreCliente || 'Cliente Desconocido');

    return {
        title: `Ficha de ${decodedNombreCliente} - Promedia`,
        description: `Consulta la información de ${decodedNombreCliente} en Promedia.`,
    };
}
