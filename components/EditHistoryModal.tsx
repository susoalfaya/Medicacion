import React, { useState, useEffect } from 'react';
import { X, Save, Clock } from 'lucide-react';
import { HistoryLog } from '../types';

interface EditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logId: string, data: { actualTime: number; status: 'taken' | 'skipped' }) => void;
  historyLog: HistoryLog | null;
}

export const EditHistoryModal: React.FC<EditHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  historyLog 
}) => {
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    status: 'taken' as 'taken' | 'skipped'
  });

  useEffect(() => {
    if (historyLog) {
      const logDate = new Date(historyLog.actualTime);
      const dateString = logDate.toISOString().split('T')[0];
      const timeString = logDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });

      setEditForm({
        date: dateString,
        time: timeString,
        status: historyLog.status
      });
    }
  }, [historyLog]);

  if (!isOpen || !historyLog) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combinar fecha y hora
    const newTimestamp = new Date(`${editForm.date}T${editForm.time}`).getTime();

    onSave(historyLog.id, {
      actualTime: newTimestamp,
      status: editForm.status
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Editar Registro
            </h2>
            <p className="text-sm text-slate-500 font-medium">{historyLog.treatmentName}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-white">
          <form id="editHistoryForm" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Estado
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  editForm.status === 'taken' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="status" 
                    checked={editForm.status === 'taken'} 
                    onChange={() => setEditForm({...editForm, status: 'taken'})} 
                    className="hidden" 
                  />
                  <span className="font-bold text-sm">Tomado</span>
                </label>
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  editForm.status === 'skipped' 
                    ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="status" 
                    checked={editForm.status === 'skipped'} 
                    onChange={() => setEditForm({...editForm, status: 'skipped'})} 
                    className="hidden" 
                  />
                  <span className="font-bold text-sm">Omitido</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={editForm.date}
                onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">
                Hora
              </label>
              <input
                type="time"
                required
                value={editForm.time}
                onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 text-center"
              />
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-800 font-medium">
                <Clock className="w-4 h-4 inline mr-1" />
                <strong>Nota:</strong> Solo puedes editar registros de las últimas 24 horas.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-4 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            form="editHistoryForm"
            type="submit"
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};