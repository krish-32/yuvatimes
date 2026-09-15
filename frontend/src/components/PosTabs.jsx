import { useState } from 'react';
import { Plus, X, ShoppingCart, AlertCircle } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import GlassModal from './GlassModal';
import GlassButton from './GlassButton';

export default function PosTabs() {
  const { sessions, activeSessionId, addSession, setActiveSession, removeSession } = usePosStore();
  const [tabToRemove, setTabToRemove] = useState(null);

  const handleRemoveClick = (e, session) => {
    e.stopPropagation(); // prevent triggering setActiveSession
    if (session.items.length > 0) {
      setTabToRemove(session.id);
    } else {
      removeSession(session.id);
    }
  };

  const confirmRemove = () => {
    if (tabToRemove) {
      removeSession(tabToRemove);
      setTabToRemove(null);
    }
  };

  return (
    <div className="w-full">
      {/* Horizontal Scrollable Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {sessions.map((session, index) => {
          const isActive = session.id === activeSessionId;
          const itemCount = session.items.length;
          
          return (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`
                group relative flex items-center gap-3 min-w-[160px] max-w-[220px] px-4 py-3 rounded-t-xl 
                cursor-pointer transition-all duration-200 border-b-2
                ${isActive 
                  ? 'bg-primary-900/40 border-primary-500 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] text-white' 
                  : 'bg-primary-900/10 border-transparent text-primary-700/70 hover:bg-primary-900/20 hover:text-primary-800'
                }
              `}
            >
              <div className="flex flex-col flex-1 truncate">
                <span className="text-sm font-semibold truncate">
                  Session {index + 1}
                </span>
                <span className={`text-xs ${isActive ? 'text-primary-100' : 'text-primary-700/50'}`}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              
              <button
                onClick={(e) => handleRemoveClick(e, session)}
                className={`
                  p-1 rounded-full transition-colors 
                  ${isActive ? 'hover:bg-primary-500/50 text-white/70 hover:text-white' : 'hover:bg-primary-800/20 text-primary-800/40 hover:text-primary-800'}
                `}
                title="Close Tab"
              >
                <X size={14} />
              </button>
              
              {/* Active Tab indicator highlight at the bottom */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-400 blur-[1px]" />
              )}
            </div>
          );
        })}
        
        {/* Add Tab Button */}
        <button
          onClick={addSession}
          className="flex items-center justify-center min-w-[48px] h-[48px] rounded-xl bg-primary-900/10 hover:bg-primary-900/20 text-primary-700 transition-colors shrink-0 ml-1"
          title="New Session"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Confirmation Modal for closing tab with items */}
      <GlassModal
        open={!!tabToRemove}
        onClose={() => setTabToRemove(null)}
        title="Close Active Session?"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => setTabToRemove(null)}>
              Cancel
            </GlassButton>
            <GlassButton variant="danger" onClick={confirmRemove}>
              Yes, Close Session
            </GlassButton>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-secondary-500/20 rounded-full text-secondary-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-primary-800 font-semibold mb-1">
              Warning: Items in Cart
            </h4>
            <p className="text-sm text-primary-700/70">
              This session currently has items scanned into its cart. If you close this tab, the session will be discarded and you will lose this progress. Are you sure?
            </p>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
