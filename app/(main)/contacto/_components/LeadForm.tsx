// 'use client'
// import React, { useState } from 'react'
// import { useSearchParams } from 'next/navigation'
// import "react-datepicker/dist/react-datepicker.css";
// import { registerLocale } from "react-datepicker";
// import { es } from "date-fns/locale/es";
// registerLocale('es', es);

// export default function LeadForm() {

//     const searchParams = useSearchParams()
//     const asunto = searchParams ? searchParams.get('asunto') || '' : ''

//     const [etapa, setEtapa] = useState(1);
//     const [nombre, setNombre] = useState('');
//     const [telefono, setTelefono] = useState('');
//     const [correo, setCorreo] = useState('');
//     const [empresa, setEmpresa] = useState('');
//     const [asuntoEntrada, setAsuntoEntrada] = useState(asunto);
//     const [fechaCita, setFechaCita] = useState('');
//     const [horaCita, setHoraCita] = useState('');

//     const [enviando, setEnviando] = useState(false);

//     const [errorNombre, setErrorNombre] = useState('');
//     const [errorTelefono, setErrorTelefono] = useState('');
//     const [errorAsunto, setErrorAsunto] = useState('');
//     const [errorFechaCita, setErrorFechaCita] = useState('');
//     const [errorHoraCita, setErrorHoraCita] = useState('');


//     const validateFields = () => {
//         let isValid = true;

//         if (!nombre) {
//             setErrorNombre('Ingresa tu nombre');
//             isValid = false;
//         }

//         if (!telefono) {
//             setErrorTelefono('Ingresa tu número de teléfono');
//             isValid = false;
//         } else if (telefono.length !== 10) {
//             setErrorTelefono('El número de teléfono debe tener 10 dígitos');
//             isValid = false;
//         }

//         if (!asuntoEntrada) {
//             setErrorAsunto('Ingresa el asunto');
//             isValid = false;
//         }

//         if (!fechaCita) {
//             setErrorFechaCita('Ingresa la fecha de la cita');
//             isValid = false;
//         }

//         if (!horaCita) {
//             setErrorHoraCita('Ingresa la hora de la cita');
//             isValid = false;
//         }

//         return isValid;
//     };

//     const handleNext = async () => {
//         if (validateFields()) {
//             const nuevoLead = {
//                 nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
//                 empresa: empresa.charAt(0).toUpperCase() + empresa.slice(1),
//                 telefono,
//                 email: correo || '',
//                 asunto: asuntoEntrada.charAt(0).toUpperCase() + asuntoEntrada.slice(1),
//                 fechaCita,
//                 horaCita,
//                 negocioId: 'cm6zhfthu0002gumumknvna5z'
//             };

//             try {
//                 setEnviando(true);
//                 const response = await fetch('/api/webhook/leadform', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     body: JSON.stringify(nuevoLead),
//                 });

//                 if (!response.ok) {
//                     setEnviando(false);
//                     const errorData = await response.json();
//                     throw new Error(`Network response was not ok: ${errorData.message || response.statusText}`);
//                 }

//                 setEtapa(2); // Cambiar a la siguiente etapa si la solicitud es exitosa
//                 setEnviando(false);

//             } catch (error) {
//                 if (error instanceof Error) {
//                     console.error('Error:', error.message);
//                 } else {
//                     console.error('Error:', error);
//                 }
//             }
//         }
//     };

//     const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setNombre(e.target.value);
//         if (e.target.value) {
//             setErrorNombre('');
//         }
//     };

//     const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setTelefono(e.target.value);
//         if (e.target.value) {
//             if (e.target.value.length === 10) {
//                 setErrorTelefono('');
//             } else {
//                 setErrorTelefono('El número de teléfono debe tener 10 dígitos');
//             }
//         } else {
//             setErrorTelefono('Ingresa tu número de teléfono');
//         }
//     };

//     return (
//         <div>
//             <div className="flex items-center justify-center p-5 container mx-auto">
//                 <div className='text-zinc-200 p-5 rounded-md font-FunnelSans-Regular grid grid-cols-2 gap-5 max-w-screen-md w-full'>

//                     <div>
//                         <div className='mb-3'>
//                             <div className='flex justify-between items-start'>
//                                 <p className='font-FunnelSans-Medium md:text-3xl text-2xl pr-10 mb-3'>
//                                     ¡Queremos brindarte la mejor atención!
//                                 </p>
//                             </div>
//                             <p className='text-zinc-300'>
//                                 Por favor compartenos tus datos para darte seguimiento y asegurarnos de que recibas la información que necesitas.
//                             </p>

//                             <div>
//                                 <p className='text-zinc-500 mb-1'>
//                                     Asunto de la conversación
//                                 </p>

//                                 <textarea
//                                     value={asuntoEntrada}
//                                     onChange={(e) => setAsuntoEntrada(e.target.value)}
//                                     className='w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-2 rounded-md'
//                                     style={{ height: 'auto' }}
//                                     rows={Math.max(3, asuntoEntrada.split('\n').length)}
//                                 />
//                                 {errorAsunto && <p className='text-red-500 text-sm mt-1'>* {errorAsunto}</p>}
//                             </div>

//                         </div>
//                     </div>

//                     <div>
//                         {etapa === 1 && (
//                             <div>


//                                 <div className='mb-4'>
//                                     <input
//                                         type="text"
//                                         placeholder="Nombre del interesado"
//                                         value={nombre}
//                                         onChange={handleNombreChange}
//                                         className='w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-2 rounded-md focus:border-blue-500'
//                                     />
//                                     {errorNombre && <p className='text-red-500 text-sm'>* {errorNombre}</p>}
//                                 </div>

//                                 <div className='mb-4'>
//                                     <input
//                                         type="text"
//                                         placeholder="Nombre negocio o empresa (opcional)"
//                                         value={empresa}
//                                         onChange={(e) => setEmpresa(e.target.value)}
//                                         className='w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-2 rounded-md'
//                                     />
//                                 </div>

//                                 <div>
//                                     <input
//                                         type="tel"
//                                         placeholder="Teléfono de contacto"
//                                         value={telefono}
//                                         onChange={handleTelefonoChange}
//                                         className='w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-2 rounded-md'
//                                         pattern="[0-9]*"
//                                     />
//                                     {errorTelefono && <p className='text-red-500 text-sm mt-1'>* {errorTelefono}</p>}
//                                 </div>

//                                 <div className='mt-4 mb-3'>
//                                     <input
//                                         type="email"
//                                         placeholder="Correo electrónico (opcional)"
//                                         value={correo}
//                                         onChange={(e) => setCorreo(e.target.value)}
//                                         className='w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-2 rounded-md'
//                                     />
//                                 </div>

//                                 <div className='mb-4'>
//                                     <input
//                                         type="date"
//                                         placeholder="Fecha de la cita"
//                                         value={fechaCita}
//                                         onChange={(e) => setFechaCita(e.target.value)}
//                                         className='w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-2 rounded-md focus:border-blue-500'
//                                     />
//                                     {errorFechaCita && <p className='text-red-500 text-sm mt-1'>* {errorFechaCita}</p>}
//                                 </div>

//                                 <div className='mb-4'>
//                                     <input
//                                         type="time"
//                                         placeholder="Hora de la cita"
//                                         value={horaCita}
//                                         onChange={(e) => setHoraCita(e.target.value)}
//                                         className='w-full bg-zinc-900 border border-zinc-800 text-zinc-200 p-2 rounded-md'
//                                     />
//                                     {errorHoraCita && <p className='text-red-500 text-sm'>* {errorHoraCita}</p>}
//                                 </div>



//                                 <button
//                                     type="button"
//                                     onClick={() => handleNext()}
//                                     disabled={enviando}
//                                     className={`w-full border text-white py-2 mt-3 rounded-md transition-colors duration-300 ${enviando ? 'bg-blue-700 border-blue-600' : 'bg-blue-900 border-blue-700 hover:bg-blue-950'}`}
//                                 >
//                                     {enviando ? 'Enviando...' : 'Enviar solicitud'}
//                                 </button>
//                             </div>
//                         )}
//                         {etapa === 2 && (
//                             <div className='mb-5'>
//                                 <p className='font-FunnelSans-Medium text-3xl pr-10 mb-3'>
//                                     ¡{nombre}, gracias por tu interés!
//                                 </p>
//                                 <p className='font-FunnelSans-Light mb-5'>
//                                     Te prometemos contactarte lo antes posible para brindarte la información que necesitas.
//                                 </p>
//                                 <p className='text-zinc-300'>
//                                     Nos saludamos pronto 👋
//                                 </p>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }