// app/admin/components/QRCodeDisplay.tsx
"use client";

import { QRCode } from 'react-qrcode-logo';

export default function QRCodeDisplay({ url }: { url: string }) {
    return (
        <QRCode
            value={url}
            size={250}
            bgColor="#18181b"
            fgColor="#FFFFFF"
            ecLevel="L" // <-- AÑADE ESTA LÍNEA (Error Correction Level: Low)
        />
    );
}