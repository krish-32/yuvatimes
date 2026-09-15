import { create } from 'zustand';

function generateSessionId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `pos-${ts}-${rand}`;
}

const createNewSession = () => ({
  id: generateSessionId(),
  items: [],
  clientDetails: null,
});

export const usePosStore = create((set, get) => {
  const initialSession = createNewSession();
  
  return {
    sessions: [initialSession],
    activeSessionId: initialSession.id,

    // Actions
    addSession: () =>
    set((state) => {
      const newSession = createNewSession();
      return {
        sessions: [...state.sessions, newSession],
        activeSessionId: newSession.id,
      };
    }),

  removeSession: (id) =>
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== id);
      // If we close the last session, create a new empty one
      if (newSessions.length === 0) {
        const fallbackSession = createNewSession();
        return {
          sessions: [fallbackSession],
          activeSessionId: fallbackSession.id,
        };
      }
      // If we closed the active session, switch to the last available session
      const nextActiveId =
        state.activeSessionId === id
          ? newSessions[newSessions.length - 1].id
          : state.activeSessionId;

      return {
        sessions: newSessions,
        activeSessionId: nextActiveId,
      };
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  // Data synchronization (when backend updates the cart)
  syncItems: (sessionId, items) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, items } : s
      ),
    })),
    
  clearSessionItems: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, items: [] } : s
      ),
    })),
  };
});
