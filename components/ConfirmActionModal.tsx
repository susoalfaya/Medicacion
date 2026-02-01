import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (timestamp: number) => void;
  treatmentName: string;
  actionType: 'take' | 'skip';
  scheduledTime?: number;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({ 
  isOpen, onClose, onConfirm, treatmentName, actionType, scheduledTime 
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      const targetTime = scheduledTime || Date.now();
      const now = new Date(targetTime);
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
  }, [isOpen, scheduledTime]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const dateTime = new Date(`${date}T${time}`);
    onConfirm(dateTime.getTime());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all scale-100">
        <div className="p-6 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
             actionType === 'take' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
             {actionType === 'take' ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>
          
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">
            {actionType === 'take' ? '¡Bien hecho!' : 'Saltar toma'}
          </h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">
            {actionType === 'take' 
              ? `Vamos a registrar que tomaste ${treatmentName}. ¿A qué hora fue?` 
              : `¿Seguro que quieres omitir ${treatmentName} esta vez?`}
          </p>
        </div>
        
        <div className="px-6 pb-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
             <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Fecha</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold text-slate-700"
                    />
                </div>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Hora</label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="time" 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold text-slate-700"
                    />
                </div>
             </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
           <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors text-sm">
             Cancelar
           </button>
           <button onClick={handleConfirm} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm ${
               actionType === 'take' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-slate-700 hover:bg-slate-800 shadow-slate-300'
           }`}>
             Confirmar
           </button>
        </div>
      </div>
    </div>
  );
};