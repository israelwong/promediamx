import React from 'react'

interface Props {
    ofertaId: string;
}

export default function OfertaVideos({ ofertaId }: Props) {
    return (
        <div>
            Galería de videos para la oferta {ofertaId}
        </div>
    )
}
