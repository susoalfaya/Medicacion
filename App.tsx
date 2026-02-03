import React, { useState, useEffect, useCallback } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { Treatment, HistoryLog, UserProfile } from './types';
import { Navigation } from './components/Navigation';
import { AddTreatmentModal } from './components/AddTreatmentModal';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { EditTreatmentModal } from './components/EditTreatmentModal';
import { EditHistoryModal } from './components/EditHistoryModal';
import { DailyStats } from './components/DailyStats';
import { TreatmentCard } from './components/TreatmentCard';
import { AdherenceChart } from './components/AdherenceChart';
import { Confetti } from './components/Confetti';
import { Check, X, Clock, AlertCircle, Trash2, Calendar, User as UserIcon, LogOut, Smartphone, CalendarDays, CheckCircle2, Share, Lock, Mail, Loader2, ArrowRight, Pencil, Pill, Droplets } from 'lucide-react';

// --- Helper Functions ---
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

// --- Supabase Init ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// --- DB Mapping Helpers ---
const mapTreatmentToDB = (t: Treatment, userId: string) => ({
    user_id: userId,
    name: t.name,
    type: t.type,
    description: t.description,
    frequency_hours: t.frequencyHours,
    next_scheduled_time: t.nextScheduledTime,
    start_date: t.startDate,
    active: t.active,
    // Nuevos campos
    duration_days: t.durationDays,
    end_date: t.endDate
});

const mapTreatmentFromDB = (t: any): Treatment => ({
    id: t.id,
    userId: t.user_id,
    name: t.name,
    type: t.type,
    description: t.description,
    frequencyHours: t.frequency_hours,
    nextScheduledTime: parseInt(t.next_scheduled_time),
    startDate: parseInt(t.start_date),
    active: t.active,
    // Nuevos campos (manejando posibles nulos de la DB)
    durationDays: t.duration_days || null,
    endDate: t.end_date ? parseInt(t.end_date) : null
});

const mapHistoryToDB = (h: HistoryLog, userId: string) => ({
    user_id: userId,
    treatment_id: h.treatmentId,
    treatment_name: h.treatmentName,
    timestamp: h.timestamp,
    actual_time: h.actualTime,
    status: h.status,
    type: h.type
});

const mapHistoryFromDB = (h: any): HistoryLog => ({
    id: h.id,
    treatmentId: h.treatment_id,
    treatmentName: h.treatment_name,
    userId: h.user_id,
    timestamp: parseInt(h.timestamp),
    actualTime: parseInt(h.actual_time),
    status: h.status,
    type: h.type
});

// --- Main Component ---
function App() {
  // --- State ---
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // PWA & iOS
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // UI Feedback
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'warning' | 'error', action?: { label: string, onClick: () => void } } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAllTreatments, setShowAllTreatments] = useState(false);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Data State
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  
  // Modal states
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    treatmentId: string | null;
    treatmentName: string;
    type: 'take' | 'skip';
    scheduledTime?: number;
  }>({
    isOpen: false,
    treatmentId: null,
    treatmentName: '',
    type: 'take'
  });

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    treatment: Treatment | null;
  }>({
    isOpen: false,
    treatment: null
  });

  const [editHistoryModal, setEditHistoryModal] = useState<{
    isOpen: boolean;
    log: HistoryLog | null;
  }>({
    isOpen: false,
    log: null
  });

  // Añade esto antes de tus otros useEffects
const cleanExpiredTreatments = async () => {
  if (!supabase || !session) return;
  
  // rpc() sirve para ejecutar funciones SQL que creamos en el editor de Supabase
  const { error } = await supabase.rpc('deactivate_expired_treatments');
  
  if (error) {
    console.error("Error al limpiar tratamientos:", error);
  }
};

// --- Initialization ---
  useEffect(() => {
    if (!supabase) {
        setInitialLoading(false);
        return;
    }

    // 1. Manejo de la sesión inicial al cargar la página
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
          // Limpieza y carga inicial
          await cleanExpiredTreatments(); 
          fetchUserProfile(session.user);
          fetchData(session.user.id);
      }
      setInitialLoading(false);
    });

    // 2. Escuchar cambios en la sesión (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
          // Cada vez que el usuario entre, "pasamos la escoba"
          await cleanExpiredTreatments(); 
          fetchUserProfile(session.user);
          fetchData(session.user.id);
      } else {
          setUserProfile(null);
          setTreatments([]);
          setHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user: User) => {
      if (!supabase) return;
      try {
          if (user.user_metadata?.full_name) {
              setUserProfile({
                  id: user.id,
                  email: user.email || '',
                  name: user.user_metadata.full_name
              });
          }

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (data && !error) {
               setUserProfile({
                   id: data.id,
                   email: data.email,
                   name: data.full_name || 'Usuario'
               });
          }
      } catch (e) {
          console.error("Profile fetch error", e);
      }
  };

const fetchData = async (userId: string) => {
    if (!supabase) return;
    
    const now = Date.now();
    // Filtramos en la consulta: activos y (sin fecha fin O fecha fin en el futuro)
    const { data: tData, error: tError } = await supabase
        .from('treatments')
        .select('*')
        .eq('active', true) 
        .or(`end_date.is.null,end_date.gt.${now}`)
        .order('created_at', { ascending: true });

    if (!tError && tData) setTreatments(tData.map(mapTreatmentFromDB));

    const { data: hData, error: hError } = await supabase
        .from('history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
    if (!hError && hData) setHistory(hData.map(mapHistoryFromDB));
};

  // --- Install Prompt ---
  useEffect(() => {
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
    setIsStandalone(isInStandaloneMode);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    if (iOS && !isInStandaloneMode) setTimeout(() => setShowIOSPrompt(true), 3000);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // --- Notifications ---
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
      if (toast) {
          const timer = setTimeout(() => setToast(null), 8000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!session) return;
      const now = Date.now();
      const myTreatments = treatments.filter(t => t.active);

      myTreatments.forEach(t => {
        const diff = t.nextScheduledTime - now;
        if (diff > -60000 && diff < 300000) {
           if (Notification.permission === 'granted' && Math.abs(diff) < 15000) { 
             new Notification(`Hora de tu ${t.type === 'medication' ? 'medicamento' : 'cura'}`, {
               body: `Te toca: ${t.name}. ${t.description || ''}`,
               icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
               tag: t.id 
             });
           }
        }
      });
    }, 15000); 
    return () => clearInterval(interval);
  }, [treatments, session]);

  // --- Auth Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) {
          alert("Error: Supabase no está configurado.");
          return;
      }
      setAuthLoading(true);

      try {
          if (authMode === 'register') {
              const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                      data: { full_name: fullName }
                  }
              });
              if (error) throw error;
              setToast({ message: 'Registro exitoso. ¡Bienvenido!', type: 'success' });
          } else {
              const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password
              });
              if (error) throw error;
          }
      } catch (error: any) {
          setToast({ message: error.message || 'Error de autenticación', type: 'error' });
      } finally {
          setAuthLoading(false);
      }
  };

  const handleLogout = async () => {
      if (supabase) await supabase.auth.signOut();
      setActiveTab('dashboard');
  };

  // --- Treatment Logic ---
  const handleSaveTreatment = async (data: any) => {
    if (!session || !supabase) return;

    const dbPayload = {
        user_id: session.user.id,
        name: data.name,
        type: data.type,
        description: data.description,
        frequency_hours: data.frequencyHours,
        next_scheduled_time: data.startDate,
        start_date: data.startDate,
        active: true
    };

    const { data: inserted, error } = await supabase
        .from('treatments')
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        setToast({ message: 'Error al guardar.', type: 'error' });
        console.error(error);
        return;
    }

    if (inserted) {
        const newTreatment = mapTreatmentFromDB(inserted);
        setTreatments(prev => [...prev, newTreatment]);
        setToast({ 
            message: 'Tratamiento guardado.', 
            type: 'success',
            action: { label: 'Exportar Agenda', onClick: handleExportCalendar } 
        });
    }
  };

  const initiateAction = (treatment: Treatment, type: 'take' | 'skip') => {
    setActionModal({
      isOpen: true,
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      type,
      scheduledTime: treatment.nextScheduledTime
    });
  };

  const handleExportCalendar = () => {
      const myTreatments = treatments.filter(t => t.active);
      if(myTreatments.length === 0) {
          setToast({ message: "No tienes tratamientos activos.", type: 'info' });
          return;
      }

      let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MediGestion//NONSGML v1.0//EN\n";
      const now = new Date();
      
      myTreatments.forEach(t => {
          let nextTime = t.nextScheduledTime;
          while(nextTime < now.getTime()) {
              nextTime += t.frequencyHours * 3600000;
          }
          const endDate = now.getTime() + (14 * 24 * 60 * 60 * 1000);

          while (nextTime < endDate) {
              const startDate = new Date(nextTime);
              const endDateEvent = new Date(nextTime + (30 * 60 * 1000));
              const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

              icsContent += "BEGIN:VEVENT\n";
              icsContent += `UID:${t.id}-${nextTime}-${Date.now()}@medigestion.app\n`; 
              icsContent += `DTSTAMP:${formatICSDate(new Date())}\n`;
              icsContent += `DTSTART:${formatICSDate(startDate)}\n`;
              icsContent += `DTEND:${formatICSDate(endDateEvent)}\n`;
              icsContent += `SUMMARY:💊 Tomar ${t.name}\n`;
              icsContent += `DESCRIPTION:${t.type === 'medication' ? 'Medicamento' : 'Cura'}: ${t.description || ''}\n`;
              icsContent += `ALARM:DISPLAY\nTRIGGER:-PT5M\n`;
              icsContent += "END:VEVENT\n";

              nextTime += t.frequencyHours * 3600000;
          }
      });

      icsContent += "END:VCALENDAR";

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'agenda_medica_actualizada.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast(null);
  };

  const handleConfirmAction = useCallback(async (specificTimestamp: number) => {
    if (!session || !actionModal.treatmentId || !supabase) return;

    const action = actionModal.type;
    const treatmentId = actionModal.treatmentId;
    const treatment = treatments.find(t => t.id === treatmentId);
    if (!treatment) return;

    let nextTime = treatment.nextScheduledTime;
    let timeShiftDetected = false;

    if (action === 'take') {
      nextTime = specificTimestamp + (treatment.frequencyHours * 60 * 60 * 1000);
      
      const diff = Math.abs(specificTimestamp - treatment.nextScheduledTime);
      if (diff > 15 * 60 * 1000 && treatment.frequencyHours > 0) {
          timeShiftDetected = true;
          
          await supabase
            .from('treatments')
            .update({ start_date: specificTimestamp })
            .eq('id', treatmentId);
      }
    } else {
      nextTime = treatment.nextScheduledTime + (treatment.frequencyHours * 60 * 60 * 1000);
    }

    const updatedTreatment = { 
      ...treatment, 
      nextScheduledTime: nextTime,
      ...(timeShiftDetected && action === 'take' ? { startDate: specificTimestamp } : {})
    };
    setTreatments(prev => prev.map(t => t.id === treatmentId ? updatedTreatment : t));
    
    const tempHistoryLog: HistoryLog = {
        id: Math.random().toString(),
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        userId: session.user.id,
        timestamp: Date.now(),
        actualTime: specificTimestamp,
        status: action === 'take' ? 'taken' : 'skipped',
        type: treatment.type
    };
    setHistory(h => [tempHistoryLog, ...h]);

    try {
        await supabase.from('treatments')
            .update({ next_scheduled_time: nextTime })
            .eq('id', treatmentId);

        const { data: insertedLog } = await supabase.from('history').insert(mapHistoryToDB(tempHistoryLog, session.user.id)).select().single();
        if (insertedLog) {
            setHistory(h => h.map(x => x.id === tempHistoryLog.id ? mapHistoryFromDB(insertedLog) : x));
        }

    } catch(e) {
        console.error("Sync error", e);
        setToast({ message: 'Error de conexión.', type: 'warning' });
    }

    setActionModal(prev => ({ ...prev, isOpen: false, treatmentId: null }));
    
    // Verificar si completamos todas las tomas del día
    if (action === 'take') {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const remainingToday = treatments.filter(t => 
        t.active && 
        t.id !== treatmentId &&
        t.nextScheduledTime < endOfDay.getTime() && 
        t.nextScheduledTime > Date.now()
      ).length;
      
      if (remainingToday === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }

    if (timeShiftDetected) {
        setToast({
            message: 'Horario reprogramado.',
            type: 'warning',
            action: { label: 'Actualizar Agenda', onClick: handleExportCalendar }
        });
    } else {
        setToast({ message: 'Registrado correctamente', type: 'success' });
    }

  }, [session, actionModal, treatments]);

  const handleToggleActive = async (treatment: Treatment) => {
      if(!supabase) return;
      
      const confirmMsg = treatment.active 
        ? '¿Dar de baja este tratamiento? El historial se conservará.'
        : '¿Reactivar este tratamiento?';
      
      if(!confirm(confirmMsg)) return;

      setTreatments(prev => prev.map(t => 
        t.id === treatment.id 
          ? { ...t, active: !t.active }
          : t
      ));

      try {
        await supabase
          .from('treatments')
          .update({ active: !treatment.active })
          .eq('id', treatment.id);

        setToast({ 
          message: treatment.active ? 'Tratamiento dado de baja' : 'Tratamiento reactivado', 
          type: 'success' 
        });
      } catch (error) {
        console.error('Error:', error);
        setToast({ message: 'Error al actualizar', type: 'error' });
        fetchData(session.user.id);
      }
  };

  const handleDeletePermanent = async (id: string) => {
      if(!supabase) return;
      if(confirm('⚠️ ELIMINAR PERMANENTEMENTE?\nEsto no se puede deshacer.')) {
          setTreatments(prev => prev.filter(t => t.id !== id));
          await supabase.from('treatments').delete().eq('id', id);
          setToast({ message: 'Eliminado permanentemente', type: 'info' });
      }
  };

  const handleEditTreatment = (treatment: Treatment) => {
    setEditModal({
      isOpen: true,
      treatment: treatment
    });
  };

const handleSaveEdit = async (treatmentId: string, data: any) => {
    if (!session || !supabase) return;

    // Buscamos el tratamiento original para no perder datos
    const original = treatments.find(t => t.id === treatmentId);
    if (!original) return;

    const updatedTreatment: Treatment = {
        ...original,
        name: data.name,
        type: data.type,
        description: data.description,
        frequencyHours: data.frequencyHours,
        startDate: data.startDate,
        nextScheduledTime: data.nextScheduledTime,
        durationDays: data.durationDays,
        endDate: data.endDate,
        active: data.active // Capturamos si el modal lo desactivó por fecha
    };

    // Actualización optimista en el estado local
    setTreatments(prev => prev.map(t => t.id === treatmentId ? updatedTreatment : t));

    try {
        const { error } = await supabase
            .from('treatments')
            .update(mapTreatmentToDB(updatedTreatment, session.user.id))
            .eq('id', treatmentId);

        if (error) throw error;
        setToast({ message: 'Actualizado correctamente', type: 'success' });
        
        // Si el tratamiento se guardó como inactivo (terminó), refrescamos la lista
        if (!updatedTreatment.active) {
            fetchData(session.user.id);
        }
    } catch (error) {
        console.error('Error:', error);
        setToast({ message: 'Error al actualizar', type: 'error' });
        fetchData(session.user.id);
    }

    setEditModal({ isOpen: false, treatment: null });
};

  const handleEditHistory = (log: HistoryLog) => {
    const now = Date.now();
    const timeDiff = now - log.actualTime;
    const hoursAgo = timeDiff / (1000 * 60 * 60);

    if (hoursAgo > 24) {
      setToast({ message: 'Solo puedes editar registros de las últimas 24 horas', type: 'warning' });
      return;
    }

    setEditHistoryModal({ isOpen: true, log: log });
  };

  const handleSaveHistoryEdit = async (logId: string, data: { actualTime: number; status: 'taken' | 'skipped' }) => {
    if (!session || !supabase) return;

    setHistory(prev => prev.map(log => 
      log.id === logId 
        ? { ...log, actualTime: data.actualTime, status: data.status }
        : log
    ));

    try {
      await supabase
        .from('history')
        .update({
          actual_time: data.actualTime,
          status: data.status
        })
        .eq('id', logId);

      setToast({ message: 'Registro actualizado', type: 'success' });
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al actualizar', type: 'error' });
      fetchData(session.user.id);
    }

    setEditHistoryModal({ isOpen: false, log: null });
  };

  const handleDeleteHistory = async (logId: string, logTime: number) => {
    if (!supabase) return;

    const now = Date.now();
    const hoursAgo = (now - logTime) / (1000 * 60 * 60);

    if (hoursAgo > 24) {
      setToast({ message: 'Solo puedes eliminar registros de las últimas 24 horas', type: 'warning' });
      return;
    }

    if (!confirm('¿Seguro que quieres eliminar este registro?')) return;

    setHistory(prev => prev.filter(log => log.id !== logId));

    try {
      await supabase.from('history').delete().eq('id', logId);
      setToast({ message: 'Registro eliminado', type: 'success' });
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al eliminar', type: 'error' });
      fetchData(session.user.id);
    }
  };

  // --- Views ---
  const renderAuthScreen = () => (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

          <div className="text-center mb-8 z-10 animate-fade-in">
              <div className="bg-white w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-900/5">
                  <div className="bg-gradient-to-tr from-primary-500 to-purple-500 text-white p-3.5 rounded-2xl shadow-inner">
                      <Pill className="w-8 h-8" />
                  </div>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">MediGestión</h1>
              <p className="text-slate-500 text-base">Tu salud, organizada.</p>
          </div>

          <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-white z-10">
             {!supabase ? (
                 <div className="text-center space-y-4">
                     <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                     <h3 className="text-lg font-bold text-slate-800">Falta Configuración</h3>
                     <p className="text-sm text-slate-500">
                        No se ha detectado la conexión a Supabase.
                     </p>
                 </div>
             ) : (
                 <form onSubmit={handleAuth} className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Iniciar Sesión</button>
                        <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Registrarse</button>
                    </div>

                    {authMode === 'register' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Nombre Completo</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    required 
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Tu nombre"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all placeholder:font-medium"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="email" 
                                required 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all placeholder:font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="password" 
                                required 
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="******"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all placeholder:font-medium"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={authLoading}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                {authMode === 'login' ? 'Entrar' : 'Crear Cuenta'}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                 </form>
             )}
          </div>
      </div>
  );

  const renderDashboard = () => {
    const myTreatments = treatments
      .filter(t => t.active)
      .sort((a, b) => a.nextScheduledTime - b.nextScheduledTime);

    const nextTwoTreatments = myTreatments.slice(0, 2);
    const hasMoreTreatments = myTreatments.length > 2;

    return (
      <div className="space-y-8 pb-24 md:pb-8 animate-fade-in">
        <header>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            {getGreeting()}, <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">{userProfile?.name.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Gestiona tu medicación de forma sencilla
          </p>
        </header>

        <DailyStats treatments={myTreatments} history={history} />

        {/* Próximas 2 tomas */}
        {nextTwoTreatments.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-indigo-500 rounded-full"></div>
                Próximas tomas
              </h3>
              {hasMoreTreatments && !showAllTreatments && (
                <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  +{myTreatments.length - 2} más
                </span>
              )}
            </div>
            
            <div className="grid gap-5 md:grid-cols-2">
              {(showAllTreatments ? myTreatments : nextTwoTreatments).map((t) => (
                <TreatmentCard
                  key={t.id}
                  treatment={t}
                  onTake={() => initiateAction(t, 'take')}
                  onSkip={() => initiateAction(t, 'skip')}
                  onEdit={() => handleEditTreatment(t)}
                  onDeactivate={() => handleToggleActive(t)}
                />
              ))}
            </div>

            {hasMoreTreatments && (
              <div className="text-center">
                <button 
                  onClick={() => setShowAllTreatments(!showAllTreatments)}
                  className="text-primary-600 font-bold text-sm hover:text-primary-700 hover:underline transition-all"
                >
                  {showAllTreatments 
                    ? 'Mostrar menos ↑' 
                    : `Ver todos los tratamientos (${myTreatments.length}) ↓`
                  }
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-3xl border border-slate-100 shadow-soft">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Calendar className="w-12 h-12 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¡Todo listo!</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              No tienes tratamientos programados.
            </p>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-primary-500 hover:to-indigo-500 transition-all active:scale-95"
            >
              Añadir Tratamiento
            </button>
          </div>
        )}

        {/* Gráfico de adherencia */}
        {history.length > 0 && (
          <AdherenceChart history={history} />
        )}
      </div>
    );
  };

  const renderHistory = () => {
      const now = Date.now();
      
      return (
      <div className="pb-24 md:pb-8 animate-fade-in space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 px-1">Historial de Tomas</h2>
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
              {history.length === 0 ? (
                  <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Clock className="w-8 h-8 text-slate-300" /></div>
                      <p className="text-slate-500 font-medium">Aún no hay historial registrado.</p>
                  </div>
              ) : (
                  <div className="divide-y divide-slate-50">
                      {history.map(log => {
                          const timeDiff = now - log.actualTime;
                          const hoursAgo = timeDiff / (1000 * 60 * 60);
                          const canEdit = hoursAgo <= 24;

                          return (
                          <div key={log.id} className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group">
                              <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${log.status === 'taken' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                      {log.status === 'taken' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 text-base">{log.treatmentName}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-nowrap">{formatDate(log.actualTime)}</span>
                                          <span className="text-xs font-medium text-slate-400">{formatTime(log.actualTime)}</span>
                                          {canEdit && <span className="text-xs font-bold text-indigo-500">• Editable</span>}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${log.status === 'taken' ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-white text-rose-600 border border-rose-100'}`}>
                                      {log.status === 'taken' ? 'Completado' : 'Omitido'}
                                  </span>
                                  {canEdit && (
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                              onClick={() => handleEditHistory(log)}
                                              className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                              title="Editar"
                                          >
                                              <Pencil className="w-4 h-4" />
                                          </button>
                                          <button
                                              onClick={() => handleDeleteHistory(log.id, log.actualTime)}
                                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                              title="Eliminar"
                                          >
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )})}
                  </div>
              )}
          </div>
      </div>
      );
  };

  const renderAllTreatments = () => {
    const activeTreatments = treatments
      .filter(t => t.active)
      .sort((a, b) => a.nextScheduledTime - b.nextScheduledTime);

    return (
      <div className="pb-24 md:pb-8 animate-fade-in space-y-6">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-2xl font-bold text-slate-800">Todos los Tratamientos</h2>
          <span className="text-sm text-slate-500 font-medium">{activeTreatments.length} activos</span>
        </div>

        {activeTreatments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-soft border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium mb-6">No hay tratamientos activos.</p>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Añadir Tratamiento
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {activeTreatments.map((t) => (
              <TreatmentCard
                key={t.id}
                treatment={t}
                onTake={() => initiateAction(t, 'take')}
                onSkip={() => initiateAction(t, 'skip')}
                onEdit={() => handleEditTreatment(t)}
                onDeactivate={() => handleToggleActive(t)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
      <div className="pb-24 md:pb-8 animate-fade-in space-y-8">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-2xl font-bold text-slate-800">Tu Cuenta</h2>
          </div>
          
          <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <div className="relative z-10 flex items-center gap-6">
                 <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl font-bold shadow-lg">
                    {userProfile?.name.charAt(0)}
                 </div>
                 <div>
                     <h3 className="text-2xl font-bold">{userProfile?.name}</h3>
                     <p className="text-indigo-100 font-medium opacity-90">{userProfile?.email}</p>
                 </div>
             </div>
          </div>

          <div className="grid gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-emerald-500"/> Sincronización</h3>
                  <p className="text-sm text-slate-500 mb-6">Añade tus medicamentos al calendario de tu móvil.</p>
                  <button onClick={handleExportCalendar} className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded-xl hover:bg-emerald-100 transition-colors">
                      Exportar al Calendario
                  </button>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft">
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-indigo-500"/> App Móvil</h3>
                   {isStandalone ? (
                       <p className="text-sm text-green-600 font-bold">¡La app ya está instalada!</p>
                   ) : (
                       <button onClick={handleInstallClick} disabled={!deferredPrompt} className="w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50">
                           Instalar App
                       </button>
                   )}
              </div>
          </div>

          <button onClick={handleLogout} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
              <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
      </div>
  );

  // --- Main Render ---
  if (initialLoading) {
      return (
          <div className="min-h-screen bg-white flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
      );
  }

  if (!session) {
      return (
        <>
            {renderAuthScreen()}
            {toast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-slate-800 text-white shadow-xl text-sm font-bold flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400"/> : <CheckCircle2 className="w-4 h-4 text-emerald-400"/>}
                    {toast.message}
                </div>
            )}
        </>
      );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <Navigation 
        currentTab={activeTab} 
        setTab={setActiveTab} 
        onAddClick={() => setShowAddModal(true)} 
        currentUser={userProfile}
      />
      
      <main className="flex-1 w-full md:pl-72 transition-all duration-300">
        <div className="max-w-4xl mx-auto p-5 md:p-10">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'treatments' && renderAllTreatments()} 
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'profiles' && renderSettings()}
        </div>
      </main>

      <AddTreatmentModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveTreatment}
      />

      <ConfirmActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        treatmentName={actionModal.treatmentName}
        actionType={actionModal.type}
        scheduledTime={actionModal.scheduledTime}
      />

      <EditTreatmentModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, treatment: null })}
        onSave={handleSaveEdit}
        treatment={editModal.treatment}
      />

      <EditHistoryModal
        isOpen={editHistoryModal.isOpen}
        onClose={() => setEditHistoryModal({ isOpen: false, log: null })}
        onSave={handleSaveHistoryEdit}
        historyLog={editHistoryModal.log}
      />

      <Confetti show={showConfetti} />

      {toast && (
          <div className="fixed bottom-24 md:bottom-8 right-4 left-4 md:left-auto md:w-96 z-[80] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className={`p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 ${
                  toast.type === 'success' ? 'bg-emerald-900 text-emerald-100' :
                  toast.type === 'warning' ? 'bg-amber-900 text-amber-100' : 
                  toast.type === 'error' ? 'bg-rose-900 text-rose-100' : 'bg-slate-900 text-slate-100'
              }`}>
                  <div className="flex items-center gap-3">
                      {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <AlertCircle className="w-6 h-6 text-amber-400" />}
                      <span className="text-sm font-semibold">{toast.message}</span>
                  </div>
                  {toast.action ? (
                      <button onClick={toast.action.onClick} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold whitespace-nowrap transition-colors">{toast.action.label}</button>
                  ) : (
                      <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
                  )}
              </div>
          </div>
      )}

      {showIOSPrompt && isIOS && !isStandalone && (
          <div className="fixed bottom-4 left-4 right-4 z-[200] animate-in slide-in-from-bottom-5 md:hidden">
              <div className="bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded-3xl shadow-2xl relative">
                  <button onClick={() => setShowIOSPrompt(false)} className="absolute top-2 right-2 p-2 opacity-60 hover:opacity-100"><X className="w-5 h-5"/></button>
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/10 rounded-2xl"><Share className="w-6 h-6" /></div>
                      <div>
                          <h3 className="font-bold text-lg">Instalar App</h3>
                          <p className="text-slate-300 text-sm mt-1">
                              Para usar sin conexión:
                              <br/>1. Pulsa <span className="font-bold">Compartir</span> <Share className="w-3 h-3 inline"/>.
                              <br/>2. Elige <span className="font-bold">"Añadir a inicio"</span>.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;