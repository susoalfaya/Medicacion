import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Treatment, TreatmentType } from '../types';

interface EditTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (treatmentId: string, data: any) => void;
  treatment: Treatment | null;
}

export const EditTreatmentModal: React.FC<EditTreatmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  treatment 
}) => {
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'medication' as TreatmentType,
    description: '',
    frequency: '8',
    cycleStartTime: '08:00', // Hora base del ciclo diario
    nextDoseTime: '08:00'    // Próxima toma específica
  });

  useEffect(() => {
    if (treatment) {
      // Hora de la próxima toma específica
      const nextDate = new Date(treatment.nextScheduledTime);
      const nextTimeString = nextDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });

      // Calcular hora base del ciclo desde startDate
      const cycleDate = new Date(treatment.startDate);
      const cycleTimeString = cycleDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });

      setEditForm({
        name: treatment.name,
        type: treatment.type,
        description: treatment.description || '',
        frequency: treatment.frequencyHours.toString(),
        cycleStartTime: cycleTimeString,
        nextDoseTime: nextTimeString
      });
    }
  }, [treatment]);

  if (!isOpen || !treatment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.frequency || !editForm.cycleStartTime || !editForm.nextDoseTime) return;

    // Actualizar startDate con la nueva hora base del ciclo
    const now = new Date();
    const [cycleHours, cycleMinutes] = editForm.cycleStartTime.split(':').map(Number);
    const newStartDate = new Date(now);
    newStartDate.setHours(cycleHours, cycleMinutes, 0, 0);

    // Calcular próxima toma específica
    const [nextHours, nextMinutes] = editForm.nextDoseTime.split(':').map(Number);
    const nextDoseDate = new Date(now);
    nextDoseDate.setHours(nextHours, nextMinutes, 0, 0);
    
    // Si la próxima toma ya pasó hoy, programar para mañana
    if (nextDoseDate.getTime() < now.getTime()) {
      nextDoseDate.setDate(nextDoseDate.getDate() + 1);
    }

    onSave(treatment.id, {
      name: editForm.name,
      type: editForm.type,
      description: editForm.description,
      frequencyHours: parseInt(editForm.frequency),
      startDate: newStartDate.getTime(),
      nextScheduledTime: nextDoseDate.getTime()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Editar Tratamiento
            </h2>
            <p className="text-sm text-slate-500 font-medium">Modifica los detalles del tratamiento</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <form id="editForm" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Tipo de tratamiento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  editForm.type === 'medication' 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="type" 
                    checked={editForm.type === 'medication'} 
                    onChange={() => setEditForm({...editForm, type: 'medication'})} 
                    className="hidden" 
                  />
                  <span className="font-bold text-sm">Medicamento</span>
                </label>
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  editForm.type === 'cure' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="type" 
                    checked={editForm.type === 'cure'} 
                    onChange={() => setEditForm({...editForm, type: 'cure'})} 
                    className="hidden" 
                  />
                  <span className="font-bold text-sm">Cura / Herida</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder={editForm.type === 'medication' ? "Ej. Paracetamol" : "Ej. Limpieza de herida"}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">
                Detalles
              </label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                placeholder="Ej. 1 comprimido de 500mg"
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">
                  Intervalo (Horas)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="168"
                  value={editForm.frequency}
                  onChange={(e) => setEditForm({...editForm, frequency: e.target.value})}
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">
                  Hora Base Ciclo
                </label>
                <input
                  type="time"
                  required
                  value={editForm.cycleStartTime}
                  onChange={(e) => setEditForm({...editForm, cycleStartTime: e.target.value})}
                  className="w-full px-2 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">
                Próxima Toma Real
              </label>
              <input
                type="time"
                required
                value={editForm.nextDoseTime}
                onChange={(e) => setEditForm({...editForm, nextDoseTime: e.target.value})}
                className="w-full px-2 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 text-center"
              />
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-800 font-medium">
                💡 <strong>Nota:</strong> La "Hora Base Ciclo" es tu horario habitual de inicio (ej: 08:00). 
                La "Próxima Toma Real" es cuándo toca específicamente la siguiente dosis. 
                El historial anterior se mantiene.
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
            form="editForm"
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