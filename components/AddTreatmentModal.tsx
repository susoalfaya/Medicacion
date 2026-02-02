import React, { useState, useRef } from 'react';
import { X, Camera, Sparkles, Loader2, Plus, Trash2, CheckCircle2, AlertCircle, Image as ImageIcon, WifiOff } from 'lucide-react';
import { analyzeRecipeImage } from '../services/geminiService';
import { TreatmentType } from '../types';

interface AddTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

interface CandidateTreatment {
  id: string;
  name: string;
  description: string;
  frequency: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  type: TreatmentType;
}

export const AddTreatmentModal: React.FC<AddTreatmentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'review'>('manual');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = navigator.onLine;

  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getCurrentTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    type: 'medication' as TreatmentType,
    description: '',
    frequency: '8',
    startDate: getTodayDate(),
    startTime: getCurrentTime()
  });

  // Scanned Candidates State
  const [candidates, setCandidates] = useState<CandidateTreatment[]>([]);

  if (!isOpen) return null;

  const resetManualForm = () => {
    setManualForm({
      name: '',
      type: 'medication',
      description: '',
      frequency: '8',
      startDate: getTodayDate(),
      startTime: getCurrentTime()
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.frequency || !manualForm.startTime) return;

    saveItem(manualForm);
    resetManualForm();
    onClose();
  };

  const saveItem = (item: typeof manualForm) => {
    const startDateTime = new Date(`${item.startDate}T${item.startTime}`);
    
    onSave({
      name: item.name,
      type: item.type,
      description: item.description,
      frequencyHours: parseInt(item.frequency),
      startDate: startDateTime.getTime(),
    });
  };

  const handleSaveAllCandidates = () => {
    candidates.forEach(c => {
      saveItem({
        name: c.name,
        type: c.type,
        description: c.description,
        frequency: c.frequency,
        startDate: c.startDate,
        startTime: c.startTime
      });
    });
    setCandidates([]);
    setActiveTab('manual');
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!navigator.onLine) {
        alert("Necesitas conexión a internet para usar la IA de Google.");
        return;
    }

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const results = await analyzeRecipeImage(base64);
        
        if (results && results.length > 0) {
          const newCandidates: CandidateTreatment[] = results.map(r => ({
            id: Math.random().toString(36).substr(2, 9),
            name: r.name,
            description: r.description || '',
            frequency: r.frequencyHours.toString(),
            startDate: getTodayDate(),
            startTime: getCurrentTime(),
            type: 'medication'
          }));
          
          setCandidates(newCandidates);
          setActiveTab('review');
        } else {
          alert('No se detectaron medicamentos claros. Por favor intenta manualmente.');
        }
      } catch (error) {
        console.error(error);
        alert('Error al analizar la imagen. Verifica tu conexión o intenta manualmente.');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateCandidate = (id: string, field: keyof CandidateTreatment, value: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
    if (candidates.length <= 1) setActiveTab('manual'); // Go back if list becomes empty
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'review' ? 'Revisar Resultados' : 'Nuevo Tratamiento'}
            </h2>
            <p className="text-sm text-slate-500 font-medium">Añade medicamentos a tu agenda</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {activeTab !== 'review' && (
          <div className="p-5 pb-0">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm ${
                    activeTab === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500 shadow-none hover:text-slate-600'
                }`}
                >
                Manual
                </button>
                <button
                onClick={() => isOnline && setActiveTab('scan')}
                disabled={!isOnline}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'scan' ? 'bg-white text-indigo-600 shadow-sm' : 'bg-transparent text-slate-500 shadow-none hover:text-slate-600'
                } ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                {isOnline ? <Sparkles className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                Escanear IA
                </button>
             </div>
             {!isOnline && (
                 <p className="text-xs text-center mt-2 text-slate-400 font-medium">Conéctate a internet para usar la IA</p>
             )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          
          {/* --- REVIEW MODE --- */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 p-4 rounded-2xl flex items-start gap-3 text-sm text-indigo-800 border border-indigo-100/50">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
                <p>La IA ha detectado <strong>{candidates.length}</strong> elementos. Revisa las horas antes de guardar.</p>
              </div>

              {candidates.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative group hover:border-indigo-200 transition-colors">
                  <button 
                    onClick={() => removeCandidate(c.id)}
                    className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                     <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-1">Nombre</label>
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => updateCandidate(c.id, 'name', e.target.value)}
                          className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-800"
                        />
                     </div>
                     <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-1">Dosis / Detalles</label>
                        <input
                          type="text"
                          value={c.description}
                          onChange={(e) => updateCandidate(c.id, 'description', e.target.value)}
                          className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-1">Frecuencia (h)</label>
                        <input
                          type="number"
                          value={c.frequency}
                          onChange={(e) => updateCandidate(c.id, 'frequency', e.target.value)}
                          className="w-full mt-1 px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-1">Inicio</label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={c.startTime}
                            onChange={(e) => updateCandidate(c.id, 'startTime', e.target.value)}
                            className="w-full mt-1 px-2 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-center"
                          />
                        </div>
                     </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setCandidates(prev => [...prev, {
                    id: Math.random().toString(),
                    name: '',
                    description: '',
                    frequency: '8',
                    startDate: getTodayDate(),
                    startTime: getCurrentTime(),
                    type: 'medication'
                }])}
                className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Añadir otro
              </button>
            </div>
          )}

          {/* --- SCAN MODE --- */}
          {activeTab === 'scan' && (
            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer relative group"
                 onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {isScanning ? (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                  <p className="text-indigo-700 font-bold text-lg">Analizando receta...</p>
                  <p className="text-sm text-slate-400 mt-2 font-medium">Nuestra IA está leyendo los medicamentos</p>
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className="flex justify-center gap-4 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100">
                      <Camera className="w-8 h-8 text-indigo-500" />
                    </div>
                  </div>
                  <p className="font-bold text-slate-800 text-lg">Toca para escanear</p>
                  <p className="text-sm text-slate-500 mt-2 max-w-[200px] mx-auto font-medium">Sube una foto de tu receta o de la caja del medicamento</p>
                </div>
              )}
            </div>
          )}

          {/* --- MANUAL MODE --- */}
          {activeTab === 'manual' && (
            <form id="addForm" onSubmit={handleManualSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Tipo de tratamiento</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all border ${manualForm.type === 'medication' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <input type="radio" name="type" checked={manualForm.type === 'medication'} onChange={() => setManualForm({...manualForm, type: 'medication'})} className="hidden" />
                    <span className="font-bold text-sm">Medicamento</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all border ${manualForm.type === 'cure' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <input type="radio" name="type" checked={manualForm.type === 'cure'} onChange={() => setManualForm({...manualForm, type: 'cure'})} className="hidden" />
                    <span className="font-bold text-sm">Cura / Herida</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={manualForm.name}
                  onChange={(e) => setManualForm({...manualForm, name: e.target.value})}
                  placeholder={manualForm.type === 'medication' ? "Ej. Paracetamol" : "Ej. Limpieza de herida"}
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Detalles</label>
                <input
                  type="text"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({...manualForm, description: e.target.value})}
                  placeholder="Ej. 1 comprimido de 500mg"
                  className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Intervalo (Horas)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="168"
                    value={manualForm.frequency}
                    onChange={(e) => setManualForm({...manualForm, frequency: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 ml-1">Primera Toma</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      required
                      value={manualForm.startTime}
                      onChange={(e) => setManualForm({...manualForm, startTime: e.target.value})}
                      className="w-full px-2 py-3 rounded-xl bg-slate-50 border-none focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold text-slate-800 text-center"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white">
          {activeTab === 'manual' && (
            <button
              form="addForm"
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
            >
              Guardar Tratamiento
            </button>
          )}
          {activeTab === 'review' && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCandidates([]);
                  setActiveTab('manual');
                }}
                className="px-6 py-4 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAllCandidates}
                className="flex-1 bg-gradient-to-r from-primary-600 to-indigo-600 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                Guardar ({candidates.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};