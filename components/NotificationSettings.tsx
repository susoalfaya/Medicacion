import React, { useState, useEffect } from 'react';
import { Bell, Clock, ChevronRight, Check, Smartphone } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface NotificationSettingsProps {
  onUpdate: (advanceMinutes: number) => void;
  currentTreatments: any[]; // Para reprogramar al cambiar la antelación
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ 
  onUpdate,
  currentTreatments 
}) => {
  const [advanceMinutes, setAdvanceMinutes] = useState(15);
  const [hasPermission, setHasPermission] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const currentAdvance = notificationService.getAdvanceMinutes();
    setAdvanceMinutes(currentAdvance);
    setHasPermission(notificationService.hasPermission());
  }, []);

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);
    
    if (!granted) {
      alert('⚠️ Debes habilitar las notificaciones en la configuración de tu navegador.\n\nEn Chrome móvil: Menú > Configuración > Notificaciones');
    }
  };

  const handleSave = () => {
    // Actualizar configuración
    notificationService.setAdvanceMinutes(advanceMinutes);
    
    // Reprogramar todas las notificaciones con la nueva antelación
    if (currentTreatments && currentTreatments.length > 0) {
      notificationService.reprogramAll(currentTreatments);
    }
    
    onUpdate(advanceMinutes);
    
    // Mostrar confirmación
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const advanceOptions = [
    { value: 0, label: 'Justo a la hora', desc: '🎯 Sin antelación', emoji: '⏰' },
    { value: 5, label: '5 minutos antes', desc: '⚡ Muy rápido', emoji: '5️⃣' },
    { value: 10, label: '10 minutos antes', desc: '👍 Preparación básica', emoji: '🔟' },
    { value: 15, label: '15 minutos antes', desc: '⭐ Recomendado', emoji: '✨' },
    { value: 30, label: '30 minutos antes', desc: '🎯 Tiempo amplio', emoji: '⏳' },
    { value: 60, label: '1 hora antes', desc: '🔔 Máxima antelación', emoji: '🕐' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Notificaciones</h3>
          <p className="text-sm text-slate-500">Configura tus recordatorios</p>
        </div>
      </div>

      {/* Estado de permisos */}
      <div className={`p-4 rounded-2xl ${hasPermission ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className={`w-5 h-5 ${hasPermission ? 'text-green-600' : 'text-amber-600'}`} />
            <div>
              <p className={`text-sm font-bold ${hasPermission ? 'text-green-900' : 'text-amber-900'}`}>
                {hasPermission ? '✓ Notificaciones activadas' : '⚠️ Notificaciones desactivadas'}
              </p>
              <p className={`text-xs ${hasPermission ? 'text-green-600' : 'text-amber-600'}`}>
                {hasPermission ? 'Recibirás recordatorios' : 'Habilita para recibir alertas'}
              </p>
            </div>
          </div>
          {!hasPermission && (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition-colors"
            >
              Activar
            </button>
          )}
        </div>
      </div>

      {/* Info sobre app cerrada */}
      <div className="p-4 bg-blue-50 rounded-2xl">
        <div className="flex gap-3">
          <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-900">📱 Notificaciones con app cerrada</p>
            <p className="text-xs text-blue-600 mt-1 leading-relaxed">
              <strong>Android:</strong> Funcionan incluso con la app cerrada<br/>
              <strong>iOS/Safari:</strong> Solo con la app en segundo plano<br/>
              <strong>Tip:</strong> Instala la app desde el menú del navegador para mejor funcionamiento
            </p>
          </div>
        </div>
      </div>

      {/* Configuración de antelación */}
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">
          ⏰ Tiempo de Antelación
        </label>
        
        <div className="space-y-2">
          {advanceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAdvanceMinutes(option.value)}
              className={`w-full p-4 rounded-2xl text-left transition-all ${
                advanceMinutes === option.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <div>
                    <p className={`text-sm font-bold ${advanceMinutes === option.value ? 'text-white' : 'text-slate-800'}`}>
                      {option.label}
                    </p>
                    <p className={`text-xs ${advanceMinutes === option.value ? 'text-blue-100' : 'text-slate-500'}`}>
                      {option.desc}
                    </p>
                  </div>
                </div>
                {advanceMinutes === option.value && (
                  <Check className="w-5 h-5 text-white" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={!hasPermission}
        className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 ${
          hasPermission
            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {showSuccess ? (
          <>
            <Check className="w-5 h-5" />
            ¡Guardado!
          </>
        ) : (
          <>
            <Clock className="w-5 h-5" />
            Guardar Configuración
          </>
        )}
      </button>

      {!hasPermission && (
        <p className="text-xs text-center text-slate-400 -mt-2">
          Activa las notificaciones primero para guardar la configuración
        </p>
      )}
    </div>
  );
};