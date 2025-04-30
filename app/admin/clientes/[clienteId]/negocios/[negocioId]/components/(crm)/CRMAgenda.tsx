import React from 'react'

interface Props {
    crmId: string;
}

export default function CRMAgenda({ crmId }: Props) {
    console.log(crmId)
    return (
        <div>
            Agenda
        </div>
    )
}
