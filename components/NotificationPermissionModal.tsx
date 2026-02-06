import React from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in slide-in-from-bottom-4">
        <div className="text-center">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Bell className="w-10 h-10 text-indigo-500" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">¿Activar avisos?</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Recibe recordatorios en tu móvil cuando te toque tomar tu medicación. 
            <span className="font-semibold text-slate-700"> No te perderás ninguna toma.</span>
          </p>

          <button
            onClick={onAccept}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <Bell className="w-5 h-5" />
            Activar avisos
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};