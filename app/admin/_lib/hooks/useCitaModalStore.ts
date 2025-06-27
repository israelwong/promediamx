import { create } from 'zustand';

interface CitaModalStore {
    leadId?: string;
    agendaId?: string; // CORRECCIÓN: Añadimos el ID de la agenda
    isOpen: boolean;
    onOpen: (leadId: string, agendaId?: string) => void; // CORRECCIÓN: onOpen ahora puede recibir el agendaId
    onClose: () => void;
}

export const useCitaModalStore = create<CitaModalStore>((set) => ({
    leadId: undefined,
    agendaId: undefined, // CORRECCIÓN: Estado inicial
    isOpen: false,
    onOpen: (leadId, agendaId) => set({ isOpen: true, leadId, agendaId }),
    onClose: () => set({ isOpen: false, leadId: undefined, agendaId: undefined }),
}));