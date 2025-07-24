// Asumiendo que AsistenteCard es parte de AsistenteLista.tsx o se importa
// ... otras importaciones (Image, Link, iconos)

// Importar el nuevo tipo Zod-inferido
import { Bot, MessageSquare, Pencil } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { AsistenteEnListaData } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.schemas';

export const AsistenteCard = ({
    asistente,
    clienteId,
    negocioId
}: {
    asistente: AsistenteEnListaData; // Usar el nuevo tipo
    clienteId: string;
    negocioId: string;
}) => {
    const editUrl = `/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistente.id}`;

    // --- UI Classes ---
    // Hacemos la card un poco más ancha para el estilo "ficha" si está en un grid
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-4 flex flex-col items-center text-center hover:border-blue-500/50 transition-all duration-150 group min-w-[220px] h-full"; // Añadido min-w y h-full
    const avatarContainerClasses = "mb-3"; // Espacio debajo del avatar
    const avatarClasses = "w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-600 group-hover:border-blue-500 bg-zinc-700 flex items-center justify-center shadow-md"; // Avatar más grande
    const placeholderIconClasses = "w-10 h-10 text-zinc-400"; // Icono placeholder más grande
    const nameClasses = "text-md font-semibold text-zinc-50 group-hover:text-blue-400 truncate w-full block mb-1";
    const statsContainerClasses = "w-full flex flex-col items-center text-xs text-zinc-400 space-y-1 mb-3";
    const statItemClasses = "flex items-center gap-1.5 px-2 py-0.5 bg-zinc-700/50 rounded-full";
    // El botón de editar ahora podría estar más prominente o ser parte de un menú contextual
    const editLinkClasses = "mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors duration-150 opacity-80 group-hover:opacity-100";

    return (
        <div className={cardClasses}>
            <div className={avatarContainerClasses}>
                <Link href={editUrl} className={avatarClasses}>
                    {asistente.urlImagen ? (
                        <Image
                            src={asistente.urlImagen}
                            alt={`Avatar de ${asistente.nombre}`}
                            width={80} // Tamaño aumentado
                            height={80} // Tamaño aumentado
                            className="object-cover w-full h-full"
                        // onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Ocultar si falla
                        />
                    ) : (
                        <Bot className={placeholderIconClasses} />
                    )}
                </Link>
            </div>

            <Link href={editUrl} className={nameClasses} title={asistente.nombre}>
                {asistente.nombre}
            </Link>

            <div className={statsContainerClasses}>
                <div className={`${statItemClasses} ${asistente.status === 'activo' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-zinc-700 text-zinc-400 border border-zinc-600'}`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${asistente.status === 'activo' ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
                    Status: {asistente.status === 'activo' ? 'Activo' : 'Inactivo'}
                </div>

                {asistente.totalConversaciones !== undefined && asistente.totalConversaciones !== null && (
                    <div className={statItemClasses} title={`${asistente.totalConversaciones} Conversaciones gestionadas`}>
                        <MessageSquare size={12} /> {asistente.totalConversaciones} Conversaciones
                    </div>
                )}

                {/* Mostrar costo de tareas adicionales si es mayor a 0 */}
                {asistente.costoTotalTareasAdicionales > 0 && (
                    <div className={`${statItemClasses} bg-amber-500/10 text-amber-400 border border-amber-500/30`} title="Costo mensual de tareas premium">
                        + {asistente.costoTotalTareasAdicionales.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} /mes (tareas)
                    </div>
                )}
            </div>

            <Link href={editUrl} className={editLinkClasses}>
                <Pencil size={12} /> Configurar
            </Link>
        </div>
    );
};
