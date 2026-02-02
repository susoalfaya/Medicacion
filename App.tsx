import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Treatment, HistoryLog, UserProfile } from './types';
import { Navigation } from './components/Navigation';
import { AddTreatmentModal } from './components/AddTreatmentModal';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { EditTreatmentModal } from './components/EditTreatmentModal';
import { Check, X, Clock, AlertCircle, Trash2, Droplets, Pill, Calendar, User as UserIcon, LogOut, BellRing, Smartphone, CalendarDays, CheckCircle2, Share, Lock, Mail, Loader2, ArrowRight, Pencil } from 'lucide-react';

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

// Only create client if keys exist to avoid crashes, handle errors in UI
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// --- DB Mapping Helpers ---
// Maps camelCase (App) <-> snake_case (DB)

const mapTreatmentToDB = (t: Treatment, userId: string) => ({
    user_id: userId,
    name: t.name,
    type: t.type,
    description: t.description,
    frequency_hours: t.frequencyHours,
    next_scheduled_time: t.nextScheduledTime,
    start_date: t.startDate,
    active: t.active
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
    active: t.active
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
  const [authLoading, setAuthLoading] = useState(false); // For login/register buttons
  const [initialLoading, setInitialLoading] = useState(true); // For app startup

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // PWA & iOS
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // UI Feedback
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'warning' | 'error', action?: { label: string, onClick: () => void } } | null>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Data State
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  
  // Modal for confirming actions
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

  // Modal for editing treatments
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    treatment: Treatment | null;
  }>({
    isOpen: false,
    treatment: null
  });

  // --- Initialization ---

  useEffect(() => {
    if (!supabase) {
        setInitialLoading(false);
        return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user);
      setInitialLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
          fetchUserProfile(session.user);
          fetchData(session.user.id); // Fetch data immediately on login
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
          // First check metadata (fastest)
          if (user.user_metadata?.full_name) {
              setUserProfile({
                  id: user.id,
                  email: user.email || '',
                  name: user.user_metadata.full_name
              });
          }

          // Then ensure DB profile exists/is up to date
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
      
      const { data: tData, error: tError } = await supabase.from('treatments').select('*').order('created_at', { ascending: true });
      if (!tError && tData) setTreatments(tData.map(mapTreatmentFromDB));

      const { data: hData, error: hError } = await supabase.from('history').select('*').order('created_at', { ascending: false }).limit(50);
      if (!hError && hData) setHistory(hData.map(mapHistoryFromDB));
  };


  // --- Install Prompt & Standalone Detection ---
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

  // Check for due medicines every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      if (!session) return;
      const now = Date.now();
      const myTreatments = treatments.filter(t => t.active);

      myTreatments.forEach(t => {
        const diff = t.nextScheduledTime - now;
        if (diff > -60000 && diff < 300000) { // Window: 1 min past to 5 mins future
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
          alert("Error: Supabase no está configurado. Revisa las variables de entorno.");
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
              // Session listener will handle the rest
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


  // --- Logic ---

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
        setToast({ message: 'Error al guardar. Inténtalo de nuevo.', type: 'error' });
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
          // Start from now or slightly past
          while(nextTime < now.getTime()) {
              nextTime += t.frequencyHours * 3600000;
          }
          const endDate = now.getTime() + (14 * 24 * 60 * 60 * 1000); // 14 days

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
      }
    } else {
      nextTime = treatment.nextScheduledTime + (treatment.frequencyHours * 60 * 60 * 1000);
    }

    // Optimistic Update
    const updatedTreatment = { ...treatment, nextScheduledTime: nextTime };
    setTreatments(prev => prev.map(t => t.id === treatmentId ? updatedTreatment : t));
    
    // Log history locally for immediate feedback
    const tempHistoryLog: HistoryLog = {
        id: Math.random().toString(), // Temp ID
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        userId: session.user.id,
        timestamp: Date.now(),
        actualTime: specificTimestamp,
        status: action === 'take' ? 'taken' : 'skipped',
        type: treatment.type
    };
    setHistory(h => [tempHistoryLog, ...h]);

    // DB Sync
    try {
        await supabase.from('treatments')
            .update({ next_scheduled_time: nextTime })
            .eq('id', treatmentId);

        const { data: insertedLog } = await supabase.from('history').insert(mapHistoryToDB(tempHistoryLog, session.user.id)).select().single();
        if (insertedLog) {
            // Replace temp log with real one
            setHistory(h => h.map(x => x.id === tempHistoryLog.id ? mapHistoryFromDB(insertedLog) : x));
        }

    } catch(e) {
        console.error("Sync error", e);
        setToast({ message: 'Error de conexión. Se reintentará.', type: 'warning' });
    }

    setActionModal(prev => ({ ...prev, isOpen: false, treatmentId: null }));
    
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


  const handleDelete = async (id: string) => {
      if(!supabase) return;
      if(confirm('¿Seguro que quieres eliminar este tratamiento?')) {
          setTreatments(prev => prev.filter(t => t.id !== id));
          await supabase.from('treatments').delete().eq('id', id);
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

    // Actualización optimista en UI
    setTreatments(prev => prev.map(t => 
      t.id === treatmentId 
        ? {
            ...t,
            name: data.name,
            type: data.type,
            description: data.description,
            frequencyHours: data.frequencyHours,
            nextScheduledTime: data.nextScheduledTime
          }
        : t
    ));

    // Sincronizar con base de datos
    try {
      await supabase
        .from('treatments')
        .update({
          name: data.name,
          type: data.type,
          description: data.description,
          frequency_hours: data.frequencyHours,
          next_scheduled_time: data.nextScheduledTime
        })
        .eq('id', treatmentId);

      setToast({ 
        message: 'Tratamiento actualizado correctamente', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error actualizando tratamiento:', error);
      setToast({ 
        message: 'Error al actualizar. Inténtalo de nuevo.', 
        type: 'error' 
      });
      // Recargar datos en caso de error
      fetchData(session.user.id);
    }

    setEditModal({ isOpen: false, treatment: null });
  };

  // --- Views ---

  const renderAuthScreen = () => (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Decorative Background */}
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

          <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-white z-10 animate-in slide-in-from-bottom-5 duration-500">
             {!supabase ? (
                 <div className="text-center space-y-4">
                     <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                     <h3 className="text-lg font-bold text-slate-800">Falta Configuración</h3>
                     <p className="text-sm text-slate-500">
                        No se ha detectado la conexión a Supabase. 
                        Por favor, configura las variables VITE_SUPABASE_URL y VITE_SUPABASE_KEY en GitHub Secrets o en tu archivo .env.
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

    const now = Date.now();

    return (
      <div className="space-y-8 pb-24 md:pb-8 animate-fade-in">
        <header className="flex justify-between items-end">
          <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {getGreeting()}, <span className="text-primary-600">{userProfile?.name.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-500 mt-1 font-medium">
                 Tienes <span className="text-slate-800 font-bold">{myTreatments.length}</span> pautas activas.
              </p>
          </div>
        </header>

        {myTreatments.length > 0 ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-primary-500" />
                    Próximas tomas
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{formatDate(now)}</span>
            </div>
            
            <div className="grid gap-4">
            {myTreatments.map((t) => {
                const isOverdue = t.nextScheduledTime < now;
                const isDueSoon = t.nextScheduledTime < now + 3600000;
                
                let borderClass = 'border-l-4 border-l-slate-200';
                let bgClass = 'bg-white';
                if (isOverdue) {
                    borderClass = 'border-l-4 border-l-rose-500';
                    bgClass = 'bg-rose-50/30';
                } else if (isDueSoon) {
                    borderClass = 'border-l-4 border-l-amber-400';
                    bgClass = 'bg-amber-50/30';
                } else {
                    borderClass = 'border-l-4 border-l-primary-400';
                }

                return (
                    <div key={t.id} className={`relative group p-5 rounded-2xl shadow-soft border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-lg ${bgClass} ${borderClass}`}>
                        <div className="flex justify-between items-start mb-5">
                            <div className="flex items-center gap-4">
                                <button
                                  onClick={() => handleEditTreatment(t)}
                                  className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                  title="Editar tratamiento"
                                >
                                  <Pencil className="w-5 h-5" />
                                </button>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${t.type === 'medication' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {t.type === 'medication' ? <Pill className="w-7 h-7" /> : <Droplets className="w-7 h-7" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-xl leading-tight">{t.name}</h4>
                                    <p className="text-slate-500 font-medium text-sm mt-0.5">{t.description || 'Seguir pauta médica'}</p>
                                </div>
                            </div>
                            <div className={`flex flex-col items-end`}>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${isOverdue ? 'bg-rose-100 text-rose-700' : isDueSoon ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatTime(t.nextScheduledTime)}
                                </div>
                                {isOverdue && <span className="text-[10px] font-bold text-rose-500 mt-1">RETRASADO</span>}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100/50">
                            <button 
                                onClick={() => initiateAction(t, 'skip')}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Saltar
                            </button>
                            <button 
                                onClick={() => initiateAction(t, 'take')}
                                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-primary-200 hover:shadow-lg hover:from-primary-500 hover:to-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Marcar como Tomado
                            </button>
                            <button 
                                onClick={() => handleDelete(t.id)} 
                                className="w-12 flex items-center justify-center text-slate-300 hover:text-rose-400 hover:bg-rose-50 rounded-xl transition-all"
                                title="Eliminar"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                );
            })}
            </div>
          </div>
        ) : (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="bg-gradient-to-tr from-slate-100 to-slate-200 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner">
                     <Calendar className="w-10 h-10 text-slate-400" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Todo despejado</h3>
                 <p className="text-slate-500 max-w-xs mx-auto mb-8">No tienes tratamientos programados. ¡Añade uno!</p>
                 <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-primary-600 shadow-sm hover:bg-slate-50 transition-colors">
                    Añadir Tratamiento
                 </button>
             </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
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
                      {history.map(log => (
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
                                      </div>
                                  </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${log.status === 'taken' ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-white text-rose-600 border border-rose-100'}`}>
                                  {log.status === 'taken' ? 'Completado' : 'Omitido'}
                              </span>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );

  const renderSettings = () => (
      <div className="pb-24 md:pb-8 animate-fade-in space-y-8">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-2xl font-bold text-slate-800">Tu Cuenta</h2>
          </div>
          
          <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <div className="relative z-10 flex items-center gap-6">
                 <div className={`w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl font-bold shadow-lg`}>
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
          {activeTab === 'treatments' && renderDashboard()} 
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

      {/* Global Toast */}
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

      {/* iOS Prompt */}
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