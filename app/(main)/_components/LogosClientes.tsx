'use client'
import Image from "next/image";


function LogosClientes() {

    const logos_secundarios = [
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/IPN.svg",
            'Instituto Politécnico Nacional',
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/UIN.svg",
            "Universidad Insurgentes"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/TecMilenio.svg",
            "Tec Milenio"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/EdoMex.svg",
            "Gobierno del Estado de Mexico"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Concentra.svg",
            "Grupo Concentra"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Movistar.svg",
            "Telefónica Movistar"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Vinte.svg",
            "Inmobiliarias Vinte"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/DaVivir.svg",
            "Inmobiliaria DaVivir"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/el-universal.svg",
            "Periódico El Universal"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Goberno-de-mexico.svg",
            "Gobierno de Mexico"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Qantum.svg",
            "Elevadores Quantum"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Elopse-Hospotal.svg",
            "Elipse Hospital"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/DIF-EdoMex.svg",
            "DIF Estado de Mexico"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/CAVM.svg",
            "Concretera CAVM"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Aselac.svg",
            "Grupo Aselac"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/MKT-Solutions.svg",
            "MKT Solutions"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Jemiza.svg",
            "Distribuidora Jemiza"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/BTL.svg",
            "Equipo Médico BTL"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Odapas.svg",
            "Odapas Tecámas"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Angkor.svg",
            "Angkor gym"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/AquaMarvic.svg",
            "Acuatuca AquaMarvic"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/La-Antigua.svg",
            "Restaurante La Antigua"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Invierte-Bien.svg",
            "Inmobiliaria Invierte Bien"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/ProSocial.svg",
            "Fotografía y video Prosocial"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Verticca.svg",
            "Hotel Verticca"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Trevor.svg",
            "Trevot Cantina"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Finca-Dona-Eulalia.svg",
            "Finca Dona Eulalia"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Ferretip.svg",
            "Fereratip"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Orpoprint.svg?t=2024-09-27T16%3A39%3A14.226Z",
            "Orpoprint"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Ostore.svg",
            "Ostore"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Polenta.svg",
            "Restaurante Polenta"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Tecamac.svg",
            "Gobierno de Tecámac"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Andalucia.svg",
            "Jardín de eventos Andalucia"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Cesars-Gym-Strength.svg",
            "Cesars Gym Strength"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/CHIC.svg",
            "Chic Boutique"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Dancerias.svg",
            "Dancerías"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Dely-Estudio.svg",
            "Dely Estudio"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Denta3Fsvg.svg",
            "Denta 3D"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Lilibeth-escuela.svg",
            "Escuela Lilibeth"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Marsala.svg",
            "Jardín de eventos Marsala"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Rancho-El-Carmen.svg",
            "Rancho El Carmen"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/RH-Consultoria.svg",
            "RH Consultoría"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Tania-Sandoval.svg",
            "Tania Sandoval"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Barsa.svg",
            "Barsa Acuática And Sport Center"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/aluvitec.svg",
            "Aluvitec"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Ateneo.svg",
            "Colegio Ateneo Mexicano"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/TGH.svg",
            "TGH"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/CCT-Plantilla-3.svg",
            "CTC Sindicato"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/ITEC.svg",
            "Universidad ITEC"
        ],
        [
            "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Dar-Comunicaciones.svg",
            "Dar Comunicaciones"
        ],
    ]

    return (
        <div className="pb-10 mx-auto text-center md:max-w-screen-lg max-w-screen-sm md:px-0">
            <ul className="grid md:grid-cols-5 grid-cols-3 gap-1 h-auto">
                {
                    logos_secundarios.map((logo, index) => (
                        <li key={index} className="px-3 bg-zinc-900/30 md:py-12 md:px-10 p-10">
                            <Image
                                width={200}
                                height={200}
                                src={logo[0]}
                                alt={logo[1]}
                                className="md:h-20 h-10 w-fit object-fill mx-auto" />
                        </li>
                    ))
                }
            </ul>

        </div>
    )
}

export default LogosClientes
