import React, { useState, useEffect } from 'react';
import { X, Camera, Pill, Droplets, Clock, Loader2, Calendar, ChevronRight } from 'lucide-react';
import { analyzeMedicationImage } from '../services/geminiService';

interface AddTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const AddTreatmentModal: React.FC<AddTreatmentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]); 
  const [currentIndex, setCurrentIndex] = useState(0); 
  
  const [formData, setFormData] = useState({
    type: 'medication' as 'medication' | 'cure',
    name: '',
    description: '',
    frequencyHours: 8,
    startTime: '08:00',
    durationDays: 7
  });

  // Sincronización con los datos de la IA al cambiar de medicamento en la lista
  useEffect(() => {
    if (pendingItems.length > 0 && pendingItems[currentIndex]) {
      const med = pendingItems[currentIndex];
      setFormData(prev => ({
        ...prev,
        name: med.name || '',
        description: med.description || '',
        frequencyHours: med.frequencyHours || 8,
        type: 'medication' // Prefijado siempre como medicamento por defecto
      }));
    }
  }, [currentIndex, pendingItems]);

  if (!isOpen) return null;

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeMedicationImage(file);
      if (result && result.length > 0) {
        setPendingItems(result);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const nextStep = () => {
    if (currentIndex < pendingItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setPendingItems([]);
      onClose();
    }
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
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

    nextStep();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white animate-in zoom-in-95 duration-200">
        
        {/* Header con indicador de progreso */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {pendingItems.length > 0 ? 'Revisar Tratamiento' : 'Nuevo Tratamiento'}
            </h2>
            {pendingItems.length > 0 && (
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                Medicamento {currentIndex + 1} de {pendingItems.length}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          
          <form onSubmit={handleSaveCurrent} className="space-y-5">
            
            {/* Selector de Tipo (Siempre visible para poder cambiarlo) */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, type: 'medication' })} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${formData.type === 'medication' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
              >
                <Pill className="w-4 h-4" /> Medicamento
              </button>
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, type: 'cure' })} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${formData.type === 'cure' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                <Droplets className="w-4 h-4" /> Cura
              </button>
            </div>

            {/* Solo mostramos el escáner si no estamos en medio de una revisión */}
            {pendingItems.length === 0 && (
              <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-slate-100 rounded-[2rem] cursor-pointer hover:border-blue-300 transition-all">
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin text-blue-600" /><span className="font-bold text-sm text-blue-600">Analizando...</span></>
                ) : (
                  <><Camera className="w-5 h-5 text-blue-500" /><span className="font-bold text-sm text-slate-500">Escanear Receta o Caja</span></>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" disabled={isAnalyzing} />
              </label>
            )}

            {/* Campos de Edición */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block tracking-widest">Nombre</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Omeprazol" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block tracking-widest">Instrucciones</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Dosis e indicaciones..." rows={3} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-600 resize-none shadow-inner" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block tracking-widest">Frecuencia</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <select value={formData.frequencyHours} onChange={(e) => setFormData({ ...formData, frequencyHours: parseInt(e.target.value) })} className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-none appearance-none text-sm font-bold text-slate-700 shadow-inner">
                    <option value={4}>Cada 4h</option>
                    <option value={6}>Cada 6h</option>
                    <option value={8}>Cada 8h</option>
                    <option value={12}>Cada 12h</option>
                    <option value={24}>Cada 24h</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block tracking-widest">Hora Inicio</label>
                <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700 shadow-inner" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block tracking-widest">Duración (Días)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="number" min="1" value={formData.durationDays} onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })} className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700 shadow-inner" />
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, durationDays: 365 })} className="px-5 py-4 rounded-2xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest active:bg-slate-200 transition-colors">Crónico</button>
              </div>
            </div>

            {/* Botones de acción finales */}
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={pendingItems.length > 0 ? nextStep : onClose} 
                className="flex-1 py-4 font-bold text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
              >
                {pendingItems.length > 0 ? 'Descartar' : 'Cancelar'}
              </button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-blue-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {pendingItems.length > 0 ? 'Siguiente' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};