import { create } from 'zustand';

/**
 * @typedef {Object} PosSession
 * @property {string} id - Unique identifier for the checkout session.
 * @property {Array} items - Array of items scanned into this session.
 * @property {Object|null} clientDetails - Optional customer details for the session.
 */

/**
 * Generates a unique, randomized session ID.
 * @returns {string} The generated session ID.
 */
function generateSessionId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `pos-${ts}-${rand}`;
}

/**
 * Creates a fresh, empty POS session object.
 * @returns {PosSession}
 */
const createNewSession = () => ({
  id: generateSessionId(),
  items: [],
  clientDetails: null,
});

/**
 * Zustand store for managing multiple concurrent POS checkout sessions.
 * Provides actions to add, remove, and switch between tabs, as well as 
 * syncing cart items with the backend state.
 */
export const usePosStore = create((set, get) => {
  const initialSession = createNewSession();
  
  return {
    /** @type {PosSession[]} */
    sessions: [initialSession],
    /** @type {string} */
    activeSessionId: initialSession.id,

    /**
     * Adds a new empty session and makes it the active session.
     */
    addSession: () =>
    set((state) => {
      const newSession = createNewSession();
      return {
        sessions: [...state.sessions, newSession],
        activeSessionId: newSession.id,
      };
    }),

    /**
     * Removes a session by ID. If it's the last session, creates a fallback session.
     * If the active session is removed, switches to the previous session in the list.
     * @param {string} id - The ID of the session to remove.
     */
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

    /**
     * Sets the currently active session ID.
     * @param {string} id - The ID of the session to make active.
     */
    setActiveSession: (id) => set({ activeSessionId: id }),

    /**
     * Synchronizes the items for a specific session with the backend data.
     * @param {string} sessionId - The ID of the session.
     * @param {Array} items - The new array of items.
     */
    syncItems: (sessionId, items) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, items } : s
      ),
    })),
    
    /**
     * Clears all items from a specific session (e.g., after completing a checkout).
     * @param {string} sessionId - The ID of the session.
     */
    clearSessionItems: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, items: [] } : s
      ),
    })),
  };
});
