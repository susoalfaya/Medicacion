import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Pill, Droplets, Clock, Info, AlertCircle } from 'lucide-react';
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
  const [showConfirmBaja, setShowConfirmBaja] = useState(false);
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
      setShowConfirmBaja(false);
    }
  }, [treatment, isOpen]); // Aseguramos que se resetee al abrir

  if (!isOpen || !treatment) return null;

  const handleBajaDefinitiva = () => {
    if (treatment && onDeactivate) {
      onDeactivate(treatment.id);
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white relative">
        
        {!showConfirmBaja ? (
          <>
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Editar Tratamiento</h2>
                <p className="text-sm text-slate-500 font-medium">Modifica los detalles del tratamiento</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <form id="editForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button type="button" onClick={() => setEditForm({ ...editForm, type: 'medication' })} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${editForm.type === 'medication' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
                    <Pill className="w-5 h-5" /> Medicamento
                  </button>
                  <button type="button" onClick={() => setEditForm({ ...editForm, type: 'cure' })} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${editForm.type === 'cure' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>
                    <Droplets className="w-5 h-5" /> Cura
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nombre</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 shadow-inner" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Detalles</label>
                  <div className="relative">
                    <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-5 py-4 pl-12 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-600 shadow-inner" />
                    <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cada (horas)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input type="number" value={editForm.frequency} onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })} className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700 shadow-inner" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Duración (días)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input type="number" value={editForm.durationDays} onChange={(e) => setEditForm({ ...editForm, durationDays: e.target.value })} placeholder="Crónico" className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700 shadow-inner" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex flex-col gap-3">
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowConfirmBaja(true)} className="px-6 py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-all flex items-center gap-2">
                  <Trash2 className="w-5 h-5" /> Baja
                </button>
                <button form="editForm" type="submit" className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> Guardar
                </button>
              </div>
              <button onClick={onClose} className="w-full py-2 text-slate-400 text-xs font-black uppercase tracking-widest">Cancelar</button>
            </div>
          </>
        ) : (
          <div className="p-10 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-3">¿Dar de baja?</h3>
            <p className="text-slate-500 text-sm font-medium mb-10 px-4 leading-relaxed">
              Estás a punto de finalizar el tratamiento de <span className="font-bold text-slate-800">{editForm.name}</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleBajaDefinitiva} className="w-full py-5 bg-rose-500 text-white rounded-[1.5rem] font-bold shadow-lg shadow-rose-100 active:scale-95 transition-all">
                Sí, finalizar tratamiento
              </button>
              <button onClick={() => setShowConfirmBaja(false)} className="w-full py-4 text-slate-400 font-bold text-sm">
                No, mantener activo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};