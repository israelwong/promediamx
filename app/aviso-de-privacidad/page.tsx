import React from 'react'
import Image from 'next/image';

export default function page() {
    return (
        <div className="p-5 text-zinc-200">


            <div className="justify-center max-w-screen-md mx-auto">

                <Image
                    src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia//favicon_fullcolor.svg"
                    width={50}
                    height={50}
                    alt="ProMedia"
                    className='mb-10 mt-5'
                    unoptimized
                />

                <h1 className="text-3xl font-bold mb-4">
                    Aviso de Privacidad
                </h1>
                <div>
                    <p className="mb-4">
                        <strong>ProMedia</strong>, con domicilio en <em>Tecámac Estado de México</em>, es responsable del tratamiento de los datos personales que usted nos proporcione, en cumplimiento con lo dispuesto por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
                    </p>

                    <h2 className="text-xl font-semibold mb-2">1. Datos personales que se recaban</h2>
                    <p className="mb-4">
                        Los datos personales que recopilamos son:
                    </p>
                    <ul className="list-disc list-inside mb-4">
                        <li>Nombre completo</li>
                        <li>Teléfono</li>
                        <li>Dirección</li>
                        <li>Correo electrónico</li>
                    </ul>

                    <h2 className="text-xl font-semibold mb-2">2. Finalidad del tratamiento de los datos personales</h2>
                    <p className="mb-4">
                        Los datos recabados serán utilizados exclusivamente para la elaboración del contrato de servicios, así como para el seguimiento y cumplimiento de los acuerdos establecidos.
                    </p>

                    <h2 className="text-xl font-semibold mb-2">3. Uso interno y protección de datos</h2>
                    <p className="mb-4">
                        Los datos proporcionados serán tratados con estricta confidencialidad y no serán compartidos con terceros bajo ninguna circunstancia. Además, se almacenarán de manera segura utilizando técnicas de encriptación para garantizar su protección.
                    </p>

                    <h2 className="text-xl font-semibold mb-2">4. Ejercicio de derechos ARCO</h2>
                    <p className="mb-4">
                        Usted tiene derecho a acceder, rectificar, cancelar u oponerse (derechos ARCO) al uso de sus datos personales. En caso de que al término de nuestro servicio desee que eliminemos sus registros, deberá enviar su solicitud al correo electrónico: <strong>contacto@promedia.mx</strong>.
                    </p>

                    <h2 className="text-xl font-semibold mb-2">5. Cambios al aviso de privacidad</h2>
                    <p className="mb-4">
                        Nos reservamos el derecho de realizar modificaciones o actualizaciones a este aviso de privacidad. Dichos cambios serán notificados a través del correo electrónico proporcionado por usted.
                    </p>

                    <h2 className="text-xl font-semibold mb-2">6. Contacto</h2>
                    <p className="mb-4">
                        Para cualquier duda, comentario o solicitud relacionada con sus datos personales, puede comunicarse al teléfono <strong>5544546582</strong> o al correo electrónico <strong>contacto@promedia.mx</strong>.
                    </p>

                    <p className="text-sm text-gray-600">
                        Fecha de última actualización: <em>Diciembre 2024</em>
                    </p>
                </div>
            </div>
        </div>
    );
};
