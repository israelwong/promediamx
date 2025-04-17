'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerNegocio, actualizarNegocio, generarPrompt } from '@/app/admin/_lib/negocio.actions';

import {
    X,
    Info,
    Users,
    // Clock,
    Shield,
    FileText,
    BarChart,
    User,
    BookOpen,
    AlertCircle,
    CircleAlert
} from 'lucide-react';
// import { Negocio } from '@/app/admin/_lib/types';

interface Props {
    negocioId: string;

}

interface NegocioData {
    logo?: string;
    nombre: string;
    descripcion?: string;
    telefonoLlamadas?: string;
    telefonoWhatsapp?: string;
    email?: string;
    direccion?: string;
    googleMaps?: string;
    paginaWeb?: string;
    redesSociales?: string;
    horarioAtencion?: string;
    garantias?: string;
    politicas?: string;
    // avisoPrivacidad?: string;
    compentencia?: string;
    clienteIdeal?: string;
    terminologia?: string;
    preguntasFrecuentes?: string;
    objeciones?: string;
    catalogoDescriptivo?: string;
    promocionesDescriptivas?: string;
    descuentosDescriptivos?: string;
}

interface TextareaField {
    label: string;
    value: string | undefined;
    setValue: (value: string) => void;
    placeholder: string;
    icon: React.ReactNode;
}

const NegocioForm: React.FC<Props> = ({ negocioId }) => {
    const [logo, setLogo] = useState<string | undefined>();
    const [nombre, setNombre] = useState('');
    const [telefonoLlamadas, setTelefonoLlamadas] = useState<string | undefined>();
    const [telefonoWhatsapp, setTelefonoWhatsapp] = useState<string | undefined>();
    const [email, setEmail] = useState<string | undefined>();
    const [direccion, setDireccion] = useState<string | undefined>();
    const [googleMaps, setGoogleMaps] = useState<string | undefined>();
    const [paginaWeb, setPaginaWeb] = useState<string | undefined>();

    // Estados para los textareas
    const [descripcion, setDescripcion] = useState<string | undefined>();
    const [redesSociales, setRedesSociales] = useState<string | undefined>();
    const [horarioAtencion, setHorarioAtencion] = useState<string | undefined>();
    const [garantias, setGarantias] = useState<string | undefined>();
    const [politicas, setPoliticas] = useState<string | undefined>();
    // const [avisoPrivacidad, setAvisoPrivacidad] = useState<string | undefined>();
    const [compentencia, setCompentencia] = useState<string | undefined>();
    const [clienteIdeal, setClienteIdeal] = useState<string | undefined>();
    const [terminologia, setTerminologia] = useState<string | undefined>();
    const [preguntasFrecuentes, setPreguntasFrecuentes] = useState<string | undefined>();
    const [objeciones, setObjeciones] = useState<string | undefined>();

    const [catalogoDescriptivo, setCatalogoDescriptivo] = useState<string | undefined>();
    const [promocionesDescriptivas, setPromocionesDescriptivas] = useState<string | undefined>();
    const [descuentosDescriptivos, setDescuentosDescriptivos] = useState<string | undefined>();

    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [camposLlenados, setCamposLlenados] = useState(0);

    const router = useRouter();

    const [negocioPrompt, setNegocioPrompt] = useState<string | undefined>();

    useEffect(() => {
        const fetchNegocio = async () => {
            const negocio = await obtenerNegocio(negocioId);
            if (negocio) {
                setLogo(negocio?.logo ?? '');
                setNombre(negocio?.nombre ?? '');
                setTelefonoLlamadas(negocio?.telefonoLlamadas ?? '');
                setTelefonoWhatsapp(negocio?.telefonoWhatsapp ?? '');
                setEmail(negocio?.email ?? '');
                setDireccion(negocio?.direccion ?? '');
                setGoogleMaps(negocio?.googleMaps ?? '');
                setPaginaWeb(negocio?.paginaWeb ?? '');
                setDescripcion(negocio?.descripcion ?? '');
                setRedesSociales(negocio?.redesSociales ?? '');
                setHorarioAtencion(negocio?.horarioAtencion ?? '');
                setGarantias(negocio?.garantias ?? '');
                setPoliticas(negocio?.politicas ?? '');
                // setAvisoPrivacidad(negocio?.avisoPrivacidad ?? '');
                setCompentencia(negocio?.compentencia ?? '');
                setClienteIdeal(negocio?.clienteIdeal ?? '');
                setTerminologia(negocio?.terminologia ?? '');
                setPreguntasFrecuentes(negocio?.preguntasFrecuentes ?? '');
                setObjeciones(negocio?.objeciones ?? '');

                setCatalogoDescriptivo(negocio?.catalogoDescriptivo ?? '');
                setPromocionesDescriptivas(negocio?.promocionesDescriptivas ?? '');
                setDescuentosDescriptivos(negocio?.descuentosDescriptivos ?? '');

                // Generar el prompt inicial
                const prompt = await generarPrompt(negocioId, 'catalogo_descriptivo');
                setNegocioPrompt(prompt);
            }
        };

        fetchNegocio();
    }
        , [
            negocioId,
        ]);

    // Calcula el número de campos llenos
    useEffect(() => {
        const updateCamposLlenados = async () => {
            let count = 0;
            if (logo) count++;
            if (nombre) count++;
            if (telefonoLlamadas) count++;
            if (telefonoWhatsapp) count++;
            if (email) count++;
            if (direccion) count++;
            if (googleMaps) count++;
            if (paginaWeb) count++;
            if (descripcion) count++;
            if (redesSociales) count++;
            if (garantias) count++;
            if (politicas) count++;
            if (compentencia) count++;
            if (clienteIdeal) count++;
            if (terminologia) count++;
            if (preguntasFrecuentes) count++;
            if (objeciones) count++;
            if (catalogoDescriptivo) count++;
            if (promocionesDescriptivas) count++;
            if (descuentosDescriptivos) count++;
            setCamposLlenados(count);
        };

        updateCamposLlenados();
    }, [
        logo,
        nombre,
        telefonoLlamadas,
        telefonoWhatsapp,
        email,
        direccion,
        googleMaps,
        paginaWeb,
        descripcion,
        redesSociales,
        // horarioAtencion,
        garantias,
        politicas,
        // avisoPrivacidad,
        compentencia,
        clienteIdeal,
        terminologia,
        preguntasFrecuentes,
        objeciones,
        catalogoDescriptivo,
        promocionesDescriptivas,
        descuentosDescriptivos,
    ]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogo(file.name);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData: NegocioData = {
            logo,
            nombre,
            descripcion,
            telefonoLlamadas,
            telefonoWhatsapp,
            email,
            direccion,
            googleMaps,
            paginaWeb,
            redesSociales,
            garantias,
            politicas,
            compentencia,
            clienteIdeal,
            terminologia,
            preguntasFrecuentes,
            objeciones,
            catalogoDescriptivo,
            promocionesDescriptivas,
            descuentosDescriptivos,
        };

        const negocioActualizado = await actualizarNegocio(negocioId, formData);
        console.log("Negocio actualizado:", negocioActualizado);

        const prompt = await generarPrompt(negocioId, '');
        setNegocioPrompt(prompt);
    };

    // Array para simplificar la creación de campos de textarea
    const textareaFields: TextareaField[] = [
        {
            label: "Resumen ejecutivo",
            value: descripcion,
            setValue: setDescripcion,
            placeholder: "Resumen Ejecutivo, Misión, Visión, Filosofía, Valores, Antecedentes.",
            icon: <Info className="w-4 h-4" />,
        },
        {
            label: "Redes Sociales",
            value: redesSociales,
            setValue: setRedesSociales,
            placeholder: "Facebook, Instagram, Twitter, LinkedIn, TikTok, Pinterest, YouTube.",
            icon: <Users className="w-4 h-4" />,
        },
        {
            label: "Garantías",
            value: garantias,
            setValue: setGarantias,
            placeholder: "Descripción de las garantías ofrecidas.",
            icon: <Shield className="w-4 h-4" />,
        },
        {
            label: "Políticas",
            value: politicas,
            setValue: setPoliticas,
            placeholder: "Contratación, términos y condiciones, devoluciones, etc.",
            icon: <FileText className="w-4 h-4" />,
        },
        {
            label: "Competencia",
            value: compentencia,
            setValue: setCompentencia,
            placeholder: "Competencia, Análisis FODA, Análisis PESTEL, Análisis de Mercado.",
            icon: <BarChart className="w-4 h-4" />,
        },
        {
            label: "Cliente Ideal",
            value: clienteIdeal,
            setValue: setClienteIdeal,
            placeholder: "Rango de Edad, Ingresos, Género, Ubicación, Nivel Educativo, Ocupación, etc.",
            icon: <User className="w-4 h-4" />,
        },
        {
            label: "Terminología",
            value: terminologia,
            setValue: setTerminologia,
            placeholder: "Terminología del Negocio, Glosario de Términos, Jerga del Sector.",
            icon: <BookOpen className="w-4 h-4" />,
        },
        {
            label: "Preguntas Frecuentes",
            value: preguntasFrecuentes,
            setValue: setPreguntasFrecuentes,
            placeholder: "Preguntas Frecuentes, Preguntas Comunes, Preguntas Recurrentes.",
            icon: <AlertCircle className="w-4 h-4" />,
        },
        {
            label: "Objeciones",
            value: objeciones,
            setValue: setObjeciones,
            placeholder: "Respuestas a Objeciones, Respuestas a Preguntas Frecuentes.",
            icon: <AlertCircle className="w-4 h-4" />,
        },

        {
            label: "Catálogo Descriptivo",
            value: catalogoDescriptivo,
            setValue: setCatalogoDescriptivo,
            placeholder: "Descripción detallada del catálogo de productos o servicios.",
            icon: <FileText className="w-4 h-4" />,
        },
        {
            label: "Promociones Descriptivas",
            value: promocionesDescriptivas,
            setValue: setPromocionesDescriptivas,
            placeholder: "Descripción de las promociones actuales o futuras.",
            icon: <FileText className="w-4 h-4" />,
        },
        {
            label: "Descuentos Descriptivos",
            value: descuentosDescriptivos,
            setValue: setDescuentosDescriptivos,
            placeholder: "Descripción de los descuentos disponibles.",
            icon: <FileText className="w-4 h-4" />,
        },
    ];

    const handleFieldClick = useCallback((fieldName: string) => {
        setSelectedField(fieldName);
    }, []);

    const renderForm = () => {
        if (selectedField === 'general') {
            return (
                <form onSubmit={handleSubmit} className="space-y-6 p-4 w-full max-w-2xl mx-auto">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setSelectedField(null)}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-transparent text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-200">Información General</h2>
                    <div>
                        <label htmlFor="logo" className="block font-medium text-zinc-300">Logo</label>
                        <input
                            id="logo"
                            name="logo"
                            type="file"
                            onChange={handleFileChange}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300"
                        />
                    </div>
                    <div>
                        <label htmlFor="nombre" className="block font-medium text-zinc-300">Nombre</label>
                        <input
                            id="nombre"
                            name="nombre"
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300"
                        />
                    </div>
                    <div>
                        <label htmlFor="telefonoLlamadas" className="block font-medium text-zinc-300">Teléfono de Llamadas</label>
                        <input
                            id="telefonoLlamadas"
                            name="telefonoLlamadas"
                            type="tel"
                            value={telefonoLlamadas}
                            onChange={(e) => setTelefonoLlamadas(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300"
                        />
                    </div>
                    <div>
                        <label htmlFor="telefonoWhatsapp" className="block font-medium text-zinc-300">Teléfono de WhatsApp</label>
                        <input
                            id="telefonoWhatsapp"
                            name="telefonoWhatsapp"
                            type="tel"
                            value={telefonoWhatsapp}
                            onChange={(e) => setTelefonoWhatsapp(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block font-medium text-zinc-300">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300"
                        />
                    </div>
                    <div>
                        <label htmlFor="direccion" className="block font-medium text-zinc-300">Dirección</label>
                        <textarea
                            id="direccion"
                            name="direccion"
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300 resize-y"
                            rows={4}
                        />
                    </div>
                    <div>
                        <label htmlFor="googleMaps" className="block font-medium text-zinc-300">Google Maps</label>
                        <input
                            id="googleMaps"
                            name="googleMaps"
                            type="url"
                            value={googleMaps}
                            onChange={(e) => setGoogleMaps(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300"
                        />
                    </div>
                    <div>
                        <label htmlFor="paginaWeb" className="block font-medium text-zinc-300">Página Web</label>
                        <input
                            id="paginaWeb"
                            name="paginaWeb"
                            type="url"
                            value={paginaWeb}
                            onChange={(e) => setPaginaWeb(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300"
                        />
                    </div>

                    <div>
                        <label htmlFor="horarioAtencion" className="block font-medium text-zinc-300">Horario de Atención</label>
                        <textarea
                            id="horarioAtencion"
                            name="horarioAtencion"
                            value={horarioAtencion}
                            onChange={(e) => setHorarioAtencion(e.target.value)}
                            className="p-3 mt-1 block w-full rounded-md bg-zinc-900 border border-zinc-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-zinc-300 resize-y"
                            rows={4}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center rounded-md border border-transparent bg-blue-500 py-2 px-4 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Guardar Información General
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedField(null)}
                        className="w-full inline-flex items-center justify-center rounded-md border border-transparent bg-zinc-700 py-2 px-4 font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                    >
                        Cerrar ventana
                    </button>
                </form>
            );
        }

        const selectedTextareaField = textareaFields.find(f => f.label.toLowerCase() === selectedField);
        //!Información general
        if (selectedTextareaField) {
            return (
                <form onSubmit={handleSubmit} className="space-y-6 p-4 w-full max-w-2xl mx-auto h-full flex flex-col justify-center">

                    <div className='mt-10'>
                        <div className="justify-between flex items-center">
                            <h2 className="text-2xl font-bold text-zinc-300">{selectedTextareaField.label}</h2>
                            <button
                                type="button"
                                onClick={() => setSelectedField(null)}
                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-transparent text-zinc-300 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div
                        className="bg-zinc-800/80 backdrop-blur-md text-zinc-300 italic p-2 rounded-md pointer-events-none border border-zinc-700 shadow-md"
                    >
                        <CircleAlert className="inline-block w-4 h-4 mr-1" /> {selectedTextareaField.placeholder}
                    </div>

                    <div className="flex-1 flex flex-col">

                        <div className="relative flex-1">
                            <div className="relative w-full h-full">
                                <textarea
                                    id={selectedTextareaField.label.toLowerCase()}
                                    name={selectedTextareaField.label.toLowerCase()}
                                    value={selectedTextareaField.value}
                                    onChange={(e) => selectedTextareaField.setValue(e.target.value)}
                                    placeholder=""
                                    className="block w-full h-full min-h-[400px] px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-t-md shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-y text-zinc-300"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center rounded-md border border-transparent bg-blue-500 py-2 px-4 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        style={{ maxWidth: '100%' }}
                    >
                        Guardar {selectedTextareaField.label}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedField(null)}
                        className="w-full inline-flex items-center justify-center rounded-md border border-transparent bg-zinc-700 py-2 px-4 font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
                    >
                        Cerrar ventana
                    </button>
                </form>
            );
        }
        //! Información texto libre
        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 p-4 font-FunnelSans-Light text-xl">
                    <button
                        type="button"
                        className="flex flex-col items-center justify-center h-40 rounded-lg border border-zink-800 hover:bg-zinc-800/50"
                        onClick={() => handleFieldClick('general')}
                    >
                        <Info className="w-4 h-4 mb-3 text-zinc-300" />
                        <span className="text-zinc-300">Información General</span>
                    </button>
                    {textareaFields.map((field) => (
                        <button
                            key={field.label}
                            type="button"
                            className="flex flex-col items-center justify-center h-40 rounded-lg border border-zink-800 hover:bg-zinc-800/50"
                            onClick={() => handleFieldClick(field.label.toLowerCase())}
                        >
                            {field.icon}
                            <span className="text-zinc-300 mt-3">{field.label}</span>
                        </button>
                    ))}
                </div>

            </>

        );
    };

    return (
        <div className="w-full">
            {/* ENCABEZADO */}
            <div className='flex items-center justify-between mt-4 p-4 mb-5'>
                <div>
                    <p>Negocio Panel ID: {negocioId}</p>
                    <p className='text-zinc-300'>
                        {camposLlenados} de {textareaFields.length + 8} Campos Llenados ({((camposLlenados / (textareaFields.length + 8)) * 100).toFixed(0)}%)
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Cerrar ventana
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* menu */}
                <div>
                    {renderForm()}
                </div>
                {/* preview prompt */}
                <div className=" p-4 rounded-md shadow-md">
                    <textarea
                        className="w-full h-full p-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-300 resize-none"
                        value={negocioPrompt}
                        readOnly
                        onChange={() => { }} // Prevents warning about onChange
                    />

                </div>
            </div>
        </div>
    );
};

export default NegocioForm;

