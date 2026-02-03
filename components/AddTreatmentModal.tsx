import React, { useState } from 'react';
import { X, Camera, Pill, Droplets, Clock, Loader2, Calendar } from 'lucide-react';
import { analyzeMedicationImage } from '../services/geminiService';

interface AddTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const AddTreatmentModal: React.FC<AddTreatmentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    try {
      // Llamada al servicio que invoca la Edge Function de Supabase
      const result = await analyzeMedicationImage(file);
      
      if (result && result.length > 0) {
        // Si hay varios medicamentos (como Omeprazol y Paracetamol del log)
        if (result.length > 1) {
          const confirmAdd = confirm(
            `Se han detectado ${result.length} medicamentos:\n${result.map((m: any) => `- ${m.name}`).join('\n')}\n\n¿Deseas añadirlos todos automáticamente?`
          );

          if (confirmAdd) {
            for (const med of result) {
              const [hours, minutes] = formData.startTime.split(':').map(Number);
              const startDate = new Date();
              startDate.setHours(hours, minutes, 0, 0);
              
              if (startDate.getTime() < Date.now()) {
                startDate.setDate(startDate.getDate() + 1);
              }

              onSave({
                type: 'medication',
                name: med.name,
                description: med.description || '', // Mapeado desde la IA
                frequencyHours: parseInt(med.frequencyHours?.toString() || "8"),
                startDate: startDate.getTime(),
                durationDays: 7,
                active: true,
                nextScheduledTime: startDate.getTime()
              });
            }
            onClose();
            return;
          }
        }

        // Si solo hay uno o el usuario canceló la carga masiva, rellena el primero en el form
        const med = result[0];
        setFormData(prev => ({
          ...prev,
          name: med.name || prev.name,
          description: med.description || prev.description, // Mapeado a 'description'
          frequencyHours: med.frequencyHours || prev.frequencyHours
        }));
      }
    } catch (error) {
      console.error('Error analizando imagen:', error);
      alert("No se pudo analizar la imagen. Verifica la conexión con Supabase.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const [hours, minutes] = formData.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    if (startDate.getTime() < Date.now()) {
      startDate.setDate(startDate.getDate() + 1);
    }

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

    // Reset del form
    setFormData({
      type: 'medication',
      name: '',
      description: '',
      frequencyHours: 8,
      startTime: '08:00',
      durationDays: 7
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Nuevo Tratamiento</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Selector de Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'medication' })}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${
                formData.type === 'medication'
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}
            >
              <Pill className="w-6 h-6 mb-1" />
              <span className="font-bold text-sm">Medicamento</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'cure' })}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${
                formData.type === 'cure'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                  : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}
            >
              <Droplets className="w-6 h-6 mb-1" />
              <span className="font-bold text-sm">Cura / Herida</span>
            </button>
          </div>

          {/* Botón Escanear con IA */}
          <label className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            isAnalyzing ? 'bg-slate-50 border-indigo-300' : 'border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/30'
          }`}>
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="font-bold text-sm text-indigo-600">Analizando receta...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 text-indigo-500" />
                <span className="font-bold text-sm text-slate-500">Escanear Receta o Caja</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleImageCapture} 
              className="hidden" 
              disabled={isAnalyzing} 
            />
          </label>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Nombre</label>
              <input
                type="text" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Omeprazol"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Instrucciones (Dosis)</label>
              <input
                type="text" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej: 20mg antes del desayuno"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Frecuencia</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={formData.frequencyHours}
                  onChange={(e) => setFormData({ ...formData, frequencyHours: parseInt(e.target.value) })}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm font-medium appearance-none"
                >
                  <option value={4}>Cada 4h</option>
                  <option value={6}>Cada 6h</option>
                  <option value={8}>Cada 8h</option>
                  <option value={12}>Cada 12h</option>
                  <option value={24}>Cada 24h</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Hora Inicio</label>
              <input
                type="time" required value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Duración (Días)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number" min="1" value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, durationDays: 365 })}
                className="px-4 py-3 rounded-2xl bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100 hover:bg-slate-100 transition-colors uppercase"
              >
                Crónico
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-slate-100 font-bold text-slate-400 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};