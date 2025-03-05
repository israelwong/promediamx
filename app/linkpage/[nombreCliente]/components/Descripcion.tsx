import React, { useState, useRef, useEffect } from 'react';
import { CircleUser } from 'lucide-react';

interface DescriptionProps {
    description: string;
    maxLines?: number;
    nombreCliente: string;
}

const Description: React.FC<DescriptionProps> = ({ description, maxLines = 3, nombreCliente }) => {
    const [expanded, setExpanded] = useState(false);
    const [maxHeight, setMaxHeight] = useState('100px');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            if (expanded) {
                setMaxHeight(`${contentRef.current.scrollHeight}px`);
            } else {
                setMaxHeight('100px');
            }
        }
    }, [expanded]);

    const toggleExpanded = () => {
        if (contentRef.current) {
            if (expanded) {
                setMaxHeight('100px');
                setTimeout(() => setExpanded(false), 500); // Espera a que la animación termine antes de contraer
            } else {
                setExpanded(true);
                setMaxHeight(`${contentRef.current.scrollHeight}px`);
            }
        }
    };

    const truncatedDescription = !expanded ? description.split('\n').slice(0, maxLines).join('\n') : description;

    return (
        <div>

            <h3 className="text-xl font-FunnelSans-Light mb-3 flex items-center space-x-2">
                <CircleUser size={16} />
                <span>Sobre {nombreCliente}</span>
            </h3>

            <div className="relative text-zinc-400 font-FunnelSans-Light text-left bg-[#0a0a0a]">
                <button
                    className="w-full text-left bg-transparent border-none cursor-pointer p-0"
                    onClick={toggleExpanded}
                >
                    <div
                        ref={contentRef}
                        className={`overflow-hidden transition-all duration-500 ease-in-out`}
                        style={{ maxHeight }}
                    >
                        {truncatedDescription}
                        {!expanded && (
                            <div className="absolute bottom-0 left-0 w-full h-[50px] bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
                        )}
                    </div>
                </button>
            </div>
            <div className="mt-1 text-zinc-400 font-FunnelSans-Light cursor-pointer" onClick={toggleExpanded}>
                {expanded ? 'Ver menos' : 'Leer más ...'}
            </div>
        </div>
    );
};

export default Description;