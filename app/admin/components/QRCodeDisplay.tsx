// app/admin/components/QRCodeDisplay.tsx
"use client";

import { QRCode } from 'react-qrcode-logo';

export default function QRCodeDisplay({ url }: { url: string }) {
    return (
        <div style={{ width: "100%" }}>
            <QRCode
                value={url}
                size={undefined}
                bgColor="#18181b"
                fgColor="#FFFFFF"
                ecLevel="L"
                style={{ width: "100%", height: "auto" }}
            />
        </div>
    );
}