import React, { useState } from 'react';
import { X, Camera, Pill, Droplets, Clock, Loader2 } from 'lucide-react';
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
    startTime: '08:00'
  });

  if (!isOpen) return null;

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      // Llamada al servicio de IA
      const result = await analyzeMedicationImage(file);
      if (result && result.length > 0) {
        const med = result[0];
        setFormData(prev => ({
          ...prev,
          name: med.name || prev.name,
          description: med.dosage || prev.description
        }));
      }
    } catch (error) {
      console.error('Error analizando la imagen:', error);
      alert('No se pudo analizar la imagen. Por favor, introduce los datos manualmente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const [hours, minutes] = formData.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    // Si la hora elegida ya pasó hoy, programar para mañana
    if (startDate.getTime() < Date.now()) {
      startDate.setDate(startDate.getDate() + 1);
    }

    onSave({
      ...formData,
      frequencyHours: parseInt(formData.frequencyHours.toString()),
      startDate: startDate.getTime(),
      active: true,
      nextScheduledTime: startDate.getTime()
    });

    // Resetear formulario
    setFormData({
      type: 'medication',
      name: '',
      description: '',
      frequencyHours: 8,
      startTime: '08:00'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Nuevo Tratamiento</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selector de Tipo */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Tipo de tratamiento</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'medication' })}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${
                  formData.type === 'medication'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
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
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                }`}
              >
                <Droplets className="w-6 h-6 mb-1" />
                <span className="font-bold text-sm">Cura / Herida</span>
              </button>
            </div>
          </div>

          {/* Botón de Escaneo IA */}
          <div className="relative">
            <label className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
              isAnalyzing ? 'bg-slate-50 border-indigo-300' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
            }`}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="font-bold text-sm text-indigo-600">Analizando envase...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-sm text-slate-600">Escanear con IA</span>
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
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Nombre</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del medicamento"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Dosis / Instrucciones</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej: 500mg, después de desayunar"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Frecuencia</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={formData.frequencyHours}
                    onChange={(e) => setFormData({ ...formData, frequencyHours: parseInt(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white font-semibold text-slate-700"
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
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Hora inicio</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};