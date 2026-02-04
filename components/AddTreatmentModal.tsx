import React, { useState } from 'react';
import { X, Camera, Pill, Droplets, Clock, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import { analyzeMedicationImage } from '../services/geminiService';

interface AddTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const AddTreatmentModal: React.FC<AddTreatmentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<any[]>([]); 
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
    setDetectedItems([]);
    try {
      const result = await analyzeMedicationImage(file);
      if (result && result.length > 0) {
        if (result.length > 1) {
          setDetectedItems(result);
        } else {
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
        durationDays: formData.durationDays,
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

    onSave({
      ...formData,
      frequencyHours: parseInt(formData.frequencyHours.toString()),
      durationDays: parseInt(formData.durationDays.toString()),
      startDate: startDate.getTime(),
      active: true,
      nextScheduledTime: startDate.getTime()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white">
        
        {/* Encabezado */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">Nuevo Tratamiento</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          
          {/* Alerta de múltiples medicamentos (IA) */}
          {detectedItems.length > 0 && (
            <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 mb-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <span className="font-bold text-sm text-indigo-900">{detectedItems.length} Medicamentos detectados</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDetectedItems([])} className="flex-1 py-2 text-xs font-bold text-slate-400">Cancelar</button>
                <button onClick={handleConfirmAll} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md">Añadir Todos</button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormData({ ...formData, type: 'medication' })} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${formData.type === 'medication' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
                <Pill className="w-6 h-6" />
                <span className="font-bold text-xs uppercase tracking-tight">Medicamento</span>
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, type: 'cure' })} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1 ${formData.type === 'cure' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
                <Droplets className="w-6 h-6" />
                <span className="font-bold text-xs uppercase tracking-tight">Cura / Herida</span>
              </button>
            </div>

            {/* Escáner */}
            <label className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${isAnalyzing ? 'bg-indigo-50 border-indigo-200' : 'border-slate-100 hover:border-indigo-300'}`}>
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /><span className="font-bold text-sm text-indigo-600">Analizando...</span></>
              ) : (
                <><Camera className="w-5 h-5 text-indigo-500" /><span className="font-bold text-sm text-slate-500">Escanear Receta o Caja</span></>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" disabled={isAnalyzing} />
            </label>

            {/* Nombre e Instrucciones */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nombre</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Omeprazol" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Instrucciones</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Dosis e indicaciones..." rows={2} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none" />
              </div>
            </div>

            {/* Frecuencia y Hora (Aquí estaba la info que faltaba) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Frecuencia</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <select value={formData.frequencyHours} onChange={(e) => setFormData({ ...formData, frequencyHours: parseInt(e.target.value) })} className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-none appearance-none text-sm font-bold text-slate-700">
                    <option value={4}>Cada 4h</option>
                    <option value={6}>Cada 6h</option>
                    <option value={8}>Cada 8h</option>
                    <option value={12}>Cada 12h</option>
                    <option value={24}>Cada 24h</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Hora Inicio</label>
                <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700" />
              </div>
            </div>

            {/* Duración */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Duración (Días)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="number" min="1" value={formData.durationDays} onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })} className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700" />
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, durationDays: 365 })} className="px-5 py-4 rounded-2xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">Crónico</button>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2 pb-2">
              <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold shadow-xl active:scale-95 transition-all">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};