import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Pill, Droplets, Clock, Info } from 'lucide-react';
import { Treatment, TreatmentType } from '../types';

interface EditTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (treatmentId: string, data: any) => void;
  onDeactivate: (treatmentId: string) => void;
  treatment: Treatment | null;
}

export const EditTreatmentModal: React.FC<EditTreatmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDeactivate,
  treatment 
}) => {
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'medication' as TreatmentType,
    description: '',
    frequency: '8',
    durationDays: '',
    cycleStartTime: '08:00',
    nextDoseTime: '08:00'
  });

  useEffect(() => {
    if (treatment) {
      const nextDate = new Date(treatment.nextScheduledTime);
      const nextTimeString = nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      const cycleDate = new Date(treatment.startDate);
      const cycleTimeString = cycleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      setEditForm({
        name: treatment.name,
        type: treatment.type,
        description: treatment.description || '',
        frequency: treatment.frequencyHours.toString(),
        durationDays: treatment.durationDays?.toString() || '',
        cycleStartTime: cycleTimeString,
        nextDoseTime: nextTimeString
      });
    }
  }, [treatment]);

  if (!isOpen || !treatment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.frequency || !editForm.cycleStartTime || !editForm.nextDoseTime) return;

    const now = new Date();
    const [cycleHours, cycleMinutes] = editForm.cycleStartTime.split(':').map(Number);
    const newStartDate = new Date(now);
    newStartDate.setHours(cycleHours, cycleMinutes, 0, 0);

    const [nextHours, nextMinutes] = editForm.nextDoseTime.split(':').map(Number);
    const nextDoseDate = new Date(now);
    nextDoseDate.setHours(nextHours, nextMinutes, 0, 0);
    
    if (nextDoseDate.getTime() < now.getTime()) {
      nextDoseDate.setDate(nextDoseDate.getDate() + 1);
    }

    const durationDays = editForm.durationDays ? parseInt(editForm.durationDays) : null;
    let endDate = null;
    if (durationDays) {
      endDate = new Date(newStartDate);
      endDate.setDate(endDate.getDate() + durationDays);
    }

    onSave(treatment.id, {
      ...treatment,
      name: editForm.name,
      type: editForm.type,
      description: editForm.description,
      frequencyHours: parseInt(editForm.frequency),
      durationDays: durationDays,
      startDate: newStartDate.getTime(),
      nextScheduledTime: nextDoseDate.getTime(),
      endDate: endDate ? endDate.getTime() : null,
      active: endDate ? (Date.now() < endDate.getTime()) : true 
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Editar Tratamiento</h2>
            <p className="text-sm text-slate-500 font-medium">Modifica los detalles del tratamiento</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <form id="editForm" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Tipo de Tratamiento */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, type: 'medication' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${editForm.type === 'medication' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`}
              >
                <Pill className="w-5 h-5" /> Medicamento
              </button>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, type: 'cure' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${editForm.type === 'cure' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                <Droplets className="w-5 h-5" /> Cura
              </button>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Nombre</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800"
                placeholder="Ej: Ibuprofeno"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Detalles (opcional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-5 py-3 pl-12 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800"
                  placeholder="Ej: Después de comer"
                />
                <Info className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Intervalo */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Cada (horas)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={editForm.frequency}
                    onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                    className="w-full px-5 py-3 pl-12 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800"
                  />
                  <Clock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Duración */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Duración (días)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={editForm.durationDays}
                    onChange={(e) => setEditForm({ ...editForm, durationDays: e.target.value })}
                    className="w-full px-5 py-3 pl-12 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800"
                    placeholder="Crónico"
                  />
                  <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Hora Base */}
               <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Hora inicio</label>
                <input
                  type="time"
                  value={editForm.cycleStartTime}
                  onChange={(e) => setEditForm({ ...editForm, cycleStartTime: e.target.value })}
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800"
                />
              </div>

              {/* Próxima Toma */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Próxima toma</label>
                <input
                  type="time"
                  value={editForm.nextDoseTime}
                  onChange={(e) => setEditForm({ ...editForm, nextDoseTime: e.target.value })}
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if(confirm('¿Seguro que quieres dar de baja este tratamiento?')) {
                  onDeactivate(treatment.id);
                  onClose();
                }
              }}
              className="px-5 py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Baja
            </button>
            <button
              form="editForm"
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Guardar
            </button>
          </div>
          <button onClick={onClose} className="w-full py-2 text-slate-400 text-sm font-semibold hover:text-slate-600 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};