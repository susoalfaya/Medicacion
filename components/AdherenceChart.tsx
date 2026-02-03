import React from 'react';
import { HistoryLog } from '../types';
import { CheckCircle2, XCircle, Calendar } from 'lucide-react';

interface AdherenceChartProps {
  history: HistoryLog[];
}

// ... (mismos imports)

export const AdherenceChart: React.FC<AdherenceChartProps> = ({ history }) => {
  // ... (misma lógica de getLast7Days)
  const last7Days = getLast7Days();

  // Cambiamos la lógica de altura: cada barra es un 100% independiente
  return (
    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6">
      {/* ... (mismo encabezado y leyenda) */}

      {/* Gráfico */}
      <div className="flex items-end justify-between gap-3 h-48 mb-4 px-2">
        {last7Days.map((day, index) => {
          const hasData = day.total > 0;
          
          // Calculamos el porcentaje real de cada segmento sobre el total del día
          const takenPercent = hasData ? (day.taken / day.total) * 100 : 0;
          const skippedPercent = hasData ? (day.skipped / day.total) * 100 : 0;

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="w-full flex flex-col justify-end h-full relative group bg-slate-50 rounded-t-xl overflow-hidden">
                {!hasData ? (
                  // Estado sin datos: barra gris mínima
                  <div className="w-full bg-slate-100 absolute bottom-0" style={{ height: '8px' }}></div>
                ) : (
                  <>
                    {/* Tooltip mejorado */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {day.taken} de {day.total} completadas
                    </div>

                    {/* Segmento Omitidas (Arriba) */}
                    <div 
                      className="w-full bg-rose-500/80 transition-all duration-700 ease-out"
                      style={{ height: `${skippedPercent}%` }}
                    ></div>
                    
                    {/* Segmento Tomadas (Abajo) */}
                    <div 
                      className="w-full bg-emerald-500 transition-all duration-700 ease-out"
                      style={{ height: `${takenPercent}%` }}
                    ></div>
                  </>
                )}
              </div>

              {/* Etiquetas de fecha */}
              <div className="text-center">
                <div className="text-xs font-bold text-slate-900 capitalize">{day.dayName}</div>
                <div className="text-[10px] text-slate-400 font-semibold">{day.date.getDate()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ... (mismo resumen inferior) */}
    </div>
  );
};