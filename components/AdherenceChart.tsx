import React from 'react';
import { HistoryLog } from '../types';
import { Calendar } from 'lucide-react';

interface AdherenceChartProps {
  history: HistoryLog[];
}

export const AdherenceChart: React.FC<AdherenceChartProps> = ({ history }) => {
  // Definimos la función dentro para evitar el ReferenceError
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

      const taken = dayLogs.filter(log => log.status === 'taken').length;
      const total = dayLogs.length;

      days.push({
        date,
        dayName: date.toLocaleDateString('es', { weekday: 'short' }),
        taken,
        skipped: total - taken,
        total
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  return (
    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            Adherencia Semanal
          </h3>
          <p className="text-sm text-slate-500 mt-1">Últimos 7 días</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-semibold text-slate-600">Tomadas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-xs font-semibold text-slate-600">Omitidas</span>
          </div>
        </div>
      </div>

      {/* Gráfico con Proporción Real */}
      <div className="flex items-end justify-between gap-3 h-48 mb-4 px-2">
        {last7Days.map((day, index) => {
          const hasData = day.total > 0;
          const takenPercent = hasData ? (day.taken / day.total) * 100 : 0;
          const skippedPercent = hasData ? (day.skipped / day.total) * 100 : 0;

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="w-full flex flex-col justify-end h-full relative group bg-slate-50 rounded-t-xl overflow-hidden">
                {!hasData ? (
                  <div className="w-full bg-slate-100 absolute bottom-0" style={{ height: '8px' }}></div>
                ) : (
                  <>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {day.taken}/{day.total} completadas
                    </div>

                    {/* Omitidas arriba */}
                    <div 
                      className="w-full bg-rose-500/80 transition-all duration-700 ease-out"
                      style={{ height: `${skippedPercent}%` }}
                    ></div>
                    
                    {/* Tomadas abajo */}
                    <div 
                      className="w-full bg-emerald-500 transition-all duration-700 ease-out"
                      style={{ height: `${takenPercent}%` }}
                    ></div>
                  </>
                )}
              </div>

              <div className="text-center">
                <div className="text-xs font-bold text-slate-900 capitalize">{day.dayName}</div>
                <div className="text-[10px] text-slate-400 font-semibold">{day.date.getDate()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen Final */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <div className="text-2xl font-black text-emerald-600">
            {last7Days.reduce((sum, day) => sum + day.taken, 0)}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Tomadas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-rose-600">
            {last7Days.reduce((sum, day) => sum + day.skipped, 0)}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Omitidas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-indigo-600">
            {Math.round(
              (last7Days.reduce((sum, day) => sum + day.taken, 0) / 
               Math.max(last7Days.reduce((sum, day) => sum + day.total, 0), 1)) * 100
            )}%
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Adherencia</div>
        </div>
      </div>
    </div>
  );
};