import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface ConfettiProps {
  show: boolean;
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ show, onComplete }) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    scale: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    if (show) {
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        duration: 2 + Math.random() * 2
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 rounded-full animate-fall"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animation: `fall ${particle.duration}s ease-in forwards`
          }}
        />
      ))}
      
      {/* Mensaje de felicitación */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-50 fade-in duration-500">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-6 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 animate-pulse" />
            <div>
              <div className="text-2xl font-black">¡Excelente!</div>
              <div className="text-sm font-semibold opacity-90">Todas las tomas completadas</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};