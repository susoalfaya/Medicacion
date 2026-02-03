import React, { useState } from 'react';
import { HistoryLog } from '../types';
import { Calendar, CheckCircle2, XCircle, Info } from 'lucide-react';

interface AdherenceChartProps {
  history: HistoryLog[];
}

export const AdherenceChart: React.FC<AdherenceChartProps> = ({ history }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayLogs = history.filter(log => 
        log.actualTime >= date.getTime() && log.actualTime < nextDay.getTime()
      );

      days.push({
        date,
        dayName: date.toLocaleDateString('es', { weekday: 'short' }),
        logs: dayLogs,
        taken: dayLogs.filter(log => log.status === 'taken').length,
        total: dayLogs.length
      });
    }
    return days;
  };

  const last7Days = getLast7Days();
  const selectedDay = selectedDayIndex !== null ? last7Days[selectedDayIndex] : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6 transition-all">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            Adherencia Semanal
          </h3>
          <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Tomadas</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"/> Omitidas</span>
          </div>
        </div>

        {/* Gráfico Interactiva */}
        <div className="flex items-end justify-between gap-3 h-40 mb-4 px-2">
          {last7Days.map((day, index) => {
            const hasData = day.total > 0;
            const isSelected = selectedDayIndex === index;
            const takenPercent = hasData ? (day.taken / day.total) * 100 : 0;
            const skippedPercent = hasData ? ((day.total - day.taken) / day.total) * 100 : 0;

            return (
              <div 
                key={index} 
                onClick={() => setSelectedDayIndex(isSelected ? null : index)}
                className={`flex-1 flex flex-col items-center gap-2 h-full cursor-pointer transition-all ${isSelected ? 'scale-105' : 'opacity-80 hover:opacity-100'}`}
              >
                <div className={`w-full flex flex-col justify-end h-full relative rounded-t-xl overflow-hidden ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-50'}`}>
                  {hasData ? (
                    <>
                      <div className="w-full bg-rose-500/80" style={{ height: `${skippedPercent}%` }} />
                      <div className="w-full bg-emerald-500" style={{ height: `${takenPercent}%` }} />
                    </>
                  ) : (
                    <div className="w-full bg-slate-100 absolute bottom-0" style={{ height: '8px' }} />
                  )}
                </div>
                <div className={`text-center transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className="text-xs font-bold capitalize">{day.dayName}</div>
                  <div className="text-[10px] font-semibold">{day.date.getDate()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle del Día Seleccionado */}
      {selectedDay && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              Detalles del {selectedDay.date.toLocaleDateString('es', { day: 'numeric', month: 'long' })}
            </h4>
            <button onClick={() => setSelectedDayIndex(null)} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
          </div>

          {selectedDay.logs.length > 0 ? (
            <div className="space-y-3">
              {selectedDay.logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between bg-white/10 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    {log.status === 'taken' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
                    <div>
                      <p className="text-sm font-bold">{log.treatmentName}</p>
                      <p className="text-[10px] text-slate-400">{new Date(log.actualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${log.status === 'taken' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {log.status === 'taken' ? 'TOMADO' : 'OMITIDO'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-4">No hay registros para este día.</p>
          )}
        </div>
      )}
    </div>
  );
};