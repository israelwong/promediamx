// Helper Component: SwitchControl (puedes ponerlo en un archivo separado o al inicio de AgendaConfiguracion.tsx)
interface SwitchControlProps {
    id: string;
    name: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label: string;
    disabled?: boolean;
}

export const SwitchControl: React.FC<SwitchControlProps> = ({ id, name, checked, onChange, label, disabled }) => {
    return (
        <label htmlFor={id} className={`flex items-center justify-between py-3 px-4 rounded-md cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700/40 bg-zinc-900/50 border border-zinc-700/80'}`}>
            <span className="text-sm text-zinc-200">{label}</span>
            <div className="relative inline-flex items-center">
                <input
                    type="checkbox"
                    id={id}
                    name={name}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="sr-only peer" // Oculta el checkbox default pero lo mantiene funcional
                />
                <div className={`w-11 h-6 rounded-full transition-colors
                                ${checked ? 'bg-blue-600' : 'bg-zinc-600'}
                                peer-focus:outline-none 
                                peer-focus:ring-2 
                                peer-focus:ring-blue-500 
                                peer-focus:ring-offset-2 
                                peer-focus:ring-offset-zinc-800
                                `}>
                </div>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform
                                ${checked ? 'translate-x-5' : 'translate-x-0'}
                                `}>
                </div>
            </div>
        </label>
    );
};