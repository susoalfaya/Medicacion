import React from 'react';
import { Treatment } from '../types';
import { Check, X, Clock, Pill, Droplets, Zap } from 'lucide-react';

interface TreatmentCardProps {
  treatment: Treatment;
  onTake: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}

export const TreatmentCard: React.FC<TreatmentCardProps> = ({
  treatment,
  onTake,
  onSkip,
  onEdit,
}) => {
  const now = Date.now();
  const isOverdue = treatment.nextScheduledTime < now;
  const timeUntil = treatment.nextScheduledTime - now;
  const isDueSoon = timeUntil > 0 && timeUntil < 3600000;

  // --- Lógica de la barra de progreso superior ---
  const totalInterval = treatment.frequencyHours * 60 * 60 * 1000;
  const timeSinceLastDose = totalInterval - timeUntil;
  const progress = Math.min(Math.max((timeSinceLastDose / totalInterval) * 100, 0), 100);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeUntil = (ms: number) => {
    if (ms < 0) return 'Retrasado';
    const hours = Math.floor(Math.abs(ms) / (1000 * 60 * 60));
    const minutes = Math.floor((Math.abs(ms) % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `en ${minutes}m`;
    return `en ${hours}h ${minutes}m`;
  };

  const getColors = () => {
    if (isOverdue) return { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600', btn: 'from-rose-500 to-red-600', progressFill: 'bg-rose-500', progressBg: 'bg-rose-200' };
    if (isDueSoon) return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', btn: 'from-amber-500 to-orange-600', progressFill: 'bg-amber-500', progressBg: 'bg-amber-200' };
    if (treatment.type === 'medication') return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', btn: 'from-blue-500 to-indigo-600', progressFill: 'bg-blue-500', progressBg: 'bg-blue-200' };
    return { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', btn: 'from-emerald-500 to-teal-600', progressFill: 'bg-emerald-500', progressBg: 'bg-emerald-200' };
  };

  const colors = getColors();

  return (
    <div className={`relative rounded-[2.5rem] overflow-hidden shadow-lg border-2 transition-all ${colors.bg} ${colors.border}`}>
      
      {/* Barra de progreso superior restaurada */}
      <div className={`h-2 ${colors.progressBg}`}>
        <div 
          className={`h-full ${colors.progressFill} transition-all duration-1000`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6">
        {/* Header con Icono clickable para editar */}
        <div className="flex items-start gap-4 mb-4">
          <button 
            onClick={onEdit}
            className={`relative flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${colors.icon} shadow-sm transition-transform active:scale-90`}
            title="Pulsar para editar"
          >
            {treatment.type === 'medication' ? <Pill className="w-8 h-8" /> : <Droplets className="w-8 h-8" />}
            {isOverdue && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                <span className="text-white text-[10px] font-bold">!</span>
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-slate-900 truncate">
              {treatment.name}
            </h3>
            {/* Descripción visible y legible */}
            <p className="text-sm text-slate-600 font-medium leading-snug mt-1">
              {treatment.description || 'Sin descripción adicional'}
            </p>
            <div className="mt-2 inline-block px-2 py-0.5 rounded-full bg-white/50 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Cada {treatment.frequencyHours} horas
            </div>
          </div>
        </div>

        {/* Bloque de Tiempo */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/50 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            <span className="text-lg font-bold text-slate-900">{formatTime(treatment.nextScheduledTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isDueSoon && <Zap className="w-4 h-4 text-amber-500 animate-pulse" />}
            <span className={`text-sm font-black ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
              {formatTimeUntil(timeUntil)}
            </span>
          </div>
        </div>

        {/* Botones de acción simplificados (solo 2) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSkip}
            className="py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Omitir
          </button>
          <button
            onClick={onTake}
            className={`py-4 rounded-2xl bg-gradient-to-r ${colors.btn} text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2`}
          >
            <Check className="w-5 h-5" />
            Tomado
          </button>
        </div>
      </div>
    </div>
  );
};