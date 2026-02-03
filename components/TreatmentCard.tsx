import React, { useState } from 'react';
import { Treatment } from '../types';
import { Check, X, Clock, Pill, Droplets, Pencil, AlertCircle, Zap } from 'lucide-react';

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
  onDeactivate
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const now = Date.now();
  const isOverdue = treatment.nextScheduledTime < now;
  const timeUntil = treatment.nextScheduledTime - now;
  const isDueSoon = timeUntil > 0 && timeUntil < 3600000; // Próxima hora

  // Calcular progreso hasta la próxima toma
  const totalInterval = treatment.frequencyHours * 60 * 60 * 1000;
  const timeSinceLastDose = totalInterval - timeUntil;
  const progress = Math.min(Math.max((timeSinceLastDose / totalInterval) * 100, 0), 100);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeUntil = (ms: number) => {
    const hours = Math.floor(Math.abs(ms) / (1000 * 60 * 60));
    const minutes = Math.floor((Math.abs(ms) % (1000 * 60 * 60)) / (1000 * 60));
    
    if (ms < 0) return 'Retrasado';
    if (hours === 0) return `en ${minutes}m`;
    if (minutes === 0) return `en ${hours}h`;
    return `en ${hours}h ${minutes}m`;
  };

  // Colores según estado y tipo
  const getColors = () => {
    if (isOverdue) {
      return {
        gradient: 'from-rose-500 to-red-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        icon: 'bg-rose-100 text-rose-600',
        progressBg: 'bg-rose-200',
        progressFill: 'bg-rose-500'
      };
    }
    if (isDueSoon) {
      return {
        gradient: 'from-amber-500 to-orange-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'bg-amber-100 text-amber-600',
        progressBg: 'bg-amber-200',
        progressFill: 'bg-amber-500'
      };
    }
    if (treatment.type === 'medication') {
      return {
        gradient: 'from-blue-500 to-indigo-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'bg-blue-100 text-blue-600',
        progressBg: 'bg-blue-200',
        progressFill: 'bg-blue-500'
      };
    }
    return {
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-600',
      progressBg: 'bg-emerald-200',
      progressFill: 'bg-emerald-500'
    };
  };

  const colors = getColors();

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${colors.bg} border-2 ${colors.border}`}
    >
      {/* Barra de progreso superior */}
      <div className={`h-2 ${colors.progressBg}`}>
        <div 
          className={`h-full ${colors.progressFill} transition-all duration-1000`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Icono con badge de estado */}
            <div className="relative">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${colors.icon} shadow-lg`}>
                {treatment.type === 'medication' ? 
                  <Pill className="w-8 h-8" /> : 
                  <Droplets className="w-8 h-8" />
                }
              </div>
              {isOverdue && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-slate-900 truncate mb-1">
                {treatment.name}
              </h3>
              <p className="text-sm text-slate-600 font-medium truncate">
                {treatment.description || 'Seguir pauta médica'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors.bg} ${colors.border} border`}>
                  Cada {treatment.frequencyHours}h
                </span>
              </div>
            </div>
          </div>

          {/* Botón editar */}
          <button
            onClick={onEdit}
            className="p-2 bg-white/50 hover:bg-white shadow-sm rounded-xl transition-all border border-slate-200" 
            title="Editar"
          >
            <Pencil className="w-5 h-5 text-slate-700 hover:text-indigo-600" />
          </button>
        </div>

        {/* Hora y countdown */}
        <div className={`p-4 rounded-2xl mb-4 ${colors.bg} border ${colors.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              <span className="text-lg font-bold text-slate-900">
                {formatTime(treatment.nextScheduledTime)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isDueSoon && <Zap className="w-4 h-4 text-amber-500 animate-pulse" />}
              <span className={`text-sm font-bold ${isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-slate-600'}`}>
                {formatTimeUntil(timeUntil)}
              </span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <X className="w-5 h-5" />
            Omitir
          </button>
          <button
            onClick={onTake}
            className={`flex-[2] py-4 rounded-2xl bg-gradient-to-r ${colors.gradient} text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95`}
          >
            <Check className="w-5 h-5" />
            Tomado
          </button>
          <button
            onClick={onDeactivate}
            className="w-14 flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95"
            title="Dar de baja"
          >
            <AlertCircle className="w-5 h-5 text-slate-400 hover:text-amber-500" />
          </button>
        </div>
      </div>
    </div>
  );
};