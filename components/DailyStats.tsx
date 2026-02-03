import React from 'react';
import { Treatment, HistoryLog } from '../types';
import { CheckCircle2, Clock, Flame, TrendingUp, Award } from 'lucide-react';

interface DailyStatsProps {
  treatments: Treatment[];
  history: HistoryLog[];
}

export const DailyStats: React.FC<DailyStatsProps> = ({ treatments, history }) => {
  const now = Date.now();
  
  // 1. Definir límites del día actual (00:00:00 a 23:59:59)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTodayMs = endOfToday.getTime();

  // 2. Tomas de hoy (desde las 00:00)
  const todayLogs = history.filter(log => log.actualTime >= startOfTodayMs && log.actualTime <= endOfTodayMs);
  const takenToday = todayLogs.filter(log => log.status === 'taken').length;

  // 3. Próximas tomas del día (desde ahora hasta las 23:59)
  const pendingToday = treatments.filter(t => 
    t.active && 
    t.nextScheduledTime > now && 
    t.nextScheduledTime <= endOfTodayMs
  ).length;

  // 4. Adherencia semanal (últimos 7 días)
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weekLogs = history.filter(log => log.actualTime > oneWeekAgo);
  const weekTaken = weekLogs.filter(log => log.status === 'taken').length;
  const weekTotal = weekLogs.length;
  const adherencePercent = weekTotal > 0 ? Math.round((weekTaken / weekTotal) * 100) : 100;

  // 5. Calcular racha (días perfectos consecutivos)
  const calculateStreak = () => {
    const days: { [key: string]: { taken: number; total: number } } = {};
    
    history.forEach(log => {
      const date = new Date(log.actualTime).toDateString();
      if (!days[date]) days[date] = { taken: 0, total: 0 };
      days[date].total++;
      if (log.status === 'taken') days[date].taken++;
    });

    const sortedDates = Object.keys(days).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    let streak = 0;
    for (const date of sortedDates) {
      // Si es el día de hoy y aún no hay registros, lo saltamos para no romper la racha
      if (date === new Date().toDateString() && days[date].total === 0) continue;

      const day = days[date];
      if (day.taken === day.total && day.total > 0) {
        streak++;
      } else {
        break; // La racha se rompe
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Tarjeta de Adherencia */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 opacity-80" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">7 días</span>
          </div>
          <div className="text-4xl font-black mb-1">{adherencePercent}%</div>
          <div className="text-sm font-semibold opacity-90">Adherencia</div>
        </div>
      </div>

      {/* Tarjeta de Tomadas Hoy */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-6 h-6 opacity-80" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">Hoy</span>
          </div>
          <div className="text-4xl font-black mb-1">{takenToday}</div>
          <div className="text-sm font-semibold opacity-90">Tomadas</div>
        </div>
      </div>

      {/* Tarjeta de Pendientes */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 opacity-80" />
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">Resto día</span>
          </div>
          <div className="text-4xl font-black mb-1">{pendingToday}</div>
          <div className="text-sm font-semibold opacity-90">Pendientes</div>
        </div>
      </div>

      {/* Tarjeta de Racha */}
      <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-6 text-white shadow-xl shadow-purple-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <Flame className="w-6 h-6 opacity-80" />
            <Award className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-black mb-1">{streak}</div>
          <div className="text-sm font-semibold opacity-90">Días perfectos</div>
        </div>
      </div>
    </div>
  );
};