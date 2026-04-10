// /app/admin/test-intencion/page.tsx

'use client';

import { useState } from 'react';
import { testearIntencionAction } from '@/app/admin/_lib/actions/test-actions';

export default function TestIntencionPage() {
    const [texto, setTexto] = useState('');
    const [resultado, setResultado] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!texto) return;
        setIsLoading(true);
        setResultado('Probando...');
        try {
            const intencion = await testearIntencionAction(texto);
            setResultado(`Intención Detectada: ${intencion}`);
        } catch (error) {
            setResultado('Error al probar la intención.');
            console.error(error);
        }
        setIsLoading(false);
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>🧪 Test de Intenciones con IA</h1>
            <p>
                Escribe una frase y presiona &quot;Probar&quot; para ver qué intención detecta Gemini.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <input
                    type="text"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escribe una frase..."
                    style={{
                        padding: '0.5rem',
                        fontSize: '1rem',
                        width: '400px',
                        color: 'black',
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' }}
                >
                    {isLoading ? 'Probando...' : 'Probar Intención'}
                </button>
            </div>
            {resultado && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', color: 'black' }}>
                    <h2>Resultado:</h2>
                    <pre><code>{resultado}</code></pre>
                </div>
            )}
        </div>
    );
}