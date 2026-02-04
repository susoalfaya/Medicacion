import React, { useState } from 'react';
import { X, Camera, Pill, Droplets, Clock, Loader2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { analyzeMedicationImage } from '../services/geminiService';

interface AddTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const AddTreatmentModal: React.FC<AddTreatmentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<any[]>([]); // Para la lista estética
  const [formData, setFormData] = useState({
    type: 'medication' as 'medication' | 'cure',
    name: '',
    description: '',
    frequencyHours: 8,
    startTime: '08:00',
    durationDays: 7
  });

  if (!isOpen) return null;

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setDetectedItems([]); // Limpiamos detecciones previas
    try {
      const result = await analyzeMedicationImage(file);
      
      if (result && result.length > 0) {
        if (result.length > 1) {
          // Guardamos la lista para mostrarla estéticamente
          setDetectedItems(result);
        } else {
          // Solo uno: lo volcamos directo
          const med = result[0];
          setFormData(prev => ({
            ...prev,
            name: med.name || prev.name,
            description: med.description || prev.description,
            frequencyHours: med.frequencyHours || prev.frequencyHours
          }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAll = () => {
    detectedItems.forEach(med => {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      if (startDate.getTime() < Date.now()) startDate.setDate(startDate.getDate() + 1);

      onSave({
        type: 'medication',
        name: med.name,
        description: med.description || '',
        frequencyHours: parseInt(med.frequencyHours?.toString() || "8"),
        startDate: startDate.getTime(),
        durationDays: 7,
        active: true,
        nextScheduledTime: startDate.getTime()
      });
    });
    setDetectedItems([]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [hours, minutes] = formData.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    if (startDate.getTime() < Date.now()) startDate.setDate(startDate.getDate() + 1);

    const endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + parseInt(formData.durationDays.toString()));

    onSave({
      ...formData,
      frequencyHours: parseInt(formData.frequencyHours.toString()),
      durationDays: parseInt(formData.durationDays.toString()),
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      active: true,
      nextScheduledTime: startDate.getTime()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">Nuevo Tratamiento</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Vista de Múltiples Detecciones (La parte estética) */}
          {detectedItems.length > 0 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-indigo-900">IA: {detectedItems.length} Medicamentos</h3>
                  <p className="text-xs text-indigo-600 mt-1">Hemos analizado tu receta. ¿Añadimos todo?</p>
                </div>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {detectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cada {item.frequencyHours}h</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setDetectedItems([])} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600">Revisar uno a uno</button>
                <button onClick={handleConfirmAll} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">Confirmar Todo</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selector de Tipo (Pill / Droplets) */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFormData({ ...formData, type: 'medication' })} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${formData.type === 'medication' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                  <Pill className="w-6 h-6" />
                  <span className="font-bold text-xs">Medicamento</span>
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, type: 'cure' })} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${formData.type === 'cure' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                  <Droplets className="w-6 h-6" />
                  <span className="font-bold text-xs">Cura / Herida</span>
                </button>
              </div>

              {/* Botón Escanear Estético */}
              <label className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${isAnalyzing ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    <span className="font-bold text-sm text-indigo-600">Analizando Receta...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-indigo-500" />
                    <span className="font-bold text-sm text-slate-500">Escanear Receta o Caja</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" disabled={isAnalyzing} />
              </label>

              {/* Inputs */}
              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nombre</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Omeprazol" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800 font-medium" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Instrucciones</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ej: 20mg antes del desayuno" rows={2} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800 font-medium resize-none" />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold shadow-xl active:scale-95 transition-all">Guardar</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};