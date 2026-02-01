import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Treatment, HistoryLog, UserProfile, TreatmentType } from './types';
import { Navigation } from './components/Navigation';
import { AddTreatmentModal } from './components/AddTreatmentModal';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { Check, X, Clock, AlertCircle, Edit2, Trash2, Droplets, Pill, Calendar, User, ChevronRight, Download, Upload, Save, Cloud, Database, Copy, RefreshCw, Wifi, WifiOff, LogOut, Lock, BellRing, Smartphone, CalendarDays, RefreshCcw, CheckCircle2 } from 'lucide-react';

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

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

// --- DB Mapping Helpers ---
// (Kept same as before)
const mapUserToDB = (u: UserProfile) => ({
    id: u.id,
    name: u.name,
    avatar_color: u.avatarColor,
    pin: u.pin
});

const mapUserFromDB = (u: any): UserProfile => ({
    id: u.id,
    name: u.name,
    avatarColor: u.avatar_color,
    pin: u.pin
});

const mapTreatmentToDB = (t: Treatment) => ({
    id: t.id,
    user_id: t.userId,
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
    nextScheduledTime: t.next_scheduled_time,
    startDate: t.start_date,
    active: t.active
});

const mapHistoryToDB = (h: HistoryLog) => ({
    id: h.id,
    treatment_id: h.treatmentId,
    treatment_name: h.treatmentName,
    user_id: h.userId,
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
    timestamp: h.timestamp,
    actualTime: h.actual_time,
    status: h.status,
    type: h.type
});


// --- Main Component ---

function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Sync / Notification State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'warning', action?: { label: string, onClick: () => void } } | null>(null);

  // Users State
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('medigest_users');
    return saved ? JSON.parse(saved) : [
        { id: 'u1', name: 'Usuario Principal', avatarColor: 'bg-indigo-500' }
    ];
  });

  // Session State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Supabase State
  const [supabaseConfig, setSupabaseConfig] = useState<{url: string, key: string} | null>(() => {
      // 1. Try Environment Variables (Vite standard)
      const envUrl = import.meta.env.VITE_SUPABASE_URL;
      const envKey = import.meta.env.VITE_SUPABASE_KEY; // Or VITE_SUPABASE_ANON_KEY
      
      if (envUrl && envKey) {
        return { url: envUrl, key: envKey };
      }

      // 2. Fallback to LocalStorage (Manual entry in UI)
      const saved = localStorage.getItem('medigest_supabase_config');
      return saved ? JSON.parse(saved) : null;
  });

  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  
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

  const [treatments, setTreatments] = useState<Treatment[]>(() => {
    const saved = localStorage.getItem('medigest_treatments');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<HistoryLog[]>(() => {
    const saved = localStorage.getItem('medigest_history');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Install Prompt Effect ---
  useEffect(() => {
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
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // --- Supabase Connection Effect ---
  useEffect(() => {
      if (supabaseConfig?.url && supabaseConfig?.key) {
          try {
              const client = createClient(supabaseConfig.url, supabaseConfig.key);
              setSupabaseClient(client);
              setIsOnline(true);
          } catch (e) {
              console.error("Supabase init error", e);
              setIsOnline(false);
          }
      } else {
          setSupabaseClient(null);
          setIsOnline(false);
      }
  }, [supabaseConfig]);

  // --- Data Loading & Subscription Effect ---
  useEffect(() => {
      if (!supabaseClient || !isOnline) return;

      const fetchData = async () => {
          setSyncStatus('syncing');
          try {
              const { data: usersData } = await supabaseClient.from('users').select('*');
              if (usersData && usersData.length > 0) {
                  const mappedUsers = usersData.map(mapUserFromDB);
                  setUsers(mappedUsers);
                  if (currentUser) {
                      const updatedMe = mappedUsers.find(u => u.id === currentUser.id);
                      if (updatedMe) setCurrentUser(updatedMe);
                  }
              }

              const { data: treatmentsData } = await supabaseClient.from('treatments').select('*');
              if (treatmentsData) setTreatments(treatmentsData.map(mapTreatmentFromDB));

              const { data: historyData } = await supabaseClient.from('history').select('*');
              if (historyData) setHistory(historyData.map(mapHistoryFromDB));
              
              setSyncStatus('idle');
          } catch (e) {
              console.error("Fetch error", e);
              setSyncStatus('error');
          }
      };

      fetchData();

      const channel = supabaseClient.channel('db_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
             if(payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                 setUsers(prev => {
                     const idx = prev.findIndex(u => u.id === payload.new.id);
                     const newUser = mapUserFromDB(payload.new);
                     if (idx >= 0) {
                         const copy = [...prev];
                         copy[idx] = newUser;
                         if (currentUser && currentUser.id === newUser.id) setCurrentUser(newUser);
                         return copy;
                     }
                     return [...prev, newUser];
                 });
             }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'treatments' }, (payload) => {
            if(payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                 setTreatments(prev => {
                     const idx = prev.findIndex(t => t.id === payload.new.id);
                     const newTreatment = mapTreatmentFromDB(payload.new);
                     if (idx >= 0) {
                         const copy = [...prev];
                         copy[idx] = newTreatment;
                         return copy;
                     }
                     return [...prev, newTreatment];
                 });
             } else if (payload.eventType === 'DELETE') {
                 setTreatments(prev => prev.filter(t => t.id !== payload.old.id));
             }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, (payload) => {
            if(payload.eventType === 'INSERT') {
                setHistory(prev => [mapHistoryFromDB(payload.new), ...prev]);
            }
        })
        .subscribe();

      return () => {
          supabaseClient.removeChannel(channel);
      }

  }, [supabaseClient, isOnline]);

  // --- Local Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('medigest_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('medigest_treatments', JSON.stringify(treatments));
  }, [treatments]);

  useEffect(() => {
    localStorage.setItem('medigest_history', JSON.stringify(history));
  }, [history]);

  // Notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Timer for toast auto-dismiss
  useEffect(() => {
      if (toast) {
          const timer = setTimeout(() => setToast(null), 8000); // 8 seconds
          return () => clearTimeout(timer);
      }
  }, [toast]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentUser) return;
      
      const now = Date.now();
      const myTreatments = treatments.filter(t => t.userId === currentUser.id && t.active);

      myTreatments.forEach(t => {
        const diff = t.nextScheduledTime - now;
        // Check window: 1 minute past, 5 minutes future
        if (diff > -60000 && diff < 300000) { 
           // Only trigger if we haven't already noticed this specific instance recently (basic debounce)
           if (Notification.permission === 'granted' && Math.abs(diff) < 10000) { 
             new Notification(`Hora de tu ${t.type === 'medication' ? 'medicamento' : 'cura'}`, {
               body: `Te toca: ${t.name}. ${t.description || ''}`,
               icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
               tag: t.id // Prevents duplicate notifications on Android
             });
           }
        }
      });
    }, 15000); 

    return () => clearInterval(interval);
  }, [treatments, currentUser]);


  // --- Logic ---

  const handleLogin = (user: UserProfile) => {
      if (user.pin) {
          const enteredPin = prompt(`Este perfil está protegido. Introduce el PIN de ${user.name}:`);
          if (enteredPin !== user.pin) {
              alert("PIN incorrecto. Acceso denegado.");
              return;
          }
      }
      setCurrentUser(user);
      setActiveTab('dashboard');
  };

  const handleLogout = () => {
      setCurrentUser(null);
  };

  const handleSaveTreatment = async (data: any) => {
    if (!currentUser) return;

    const newTreatment: Treatment = {
      id: generateId(),
      userId: currentUser.id,
      name: data.name,
      type: data.type,
      description: data.description,
      frequencyHours: data.frequencyHours,
      nextScheduledTime: data.startDate, 
      startDate: data.startDate,
      active: true,
    };

    if (isOnline && supabaseClient) {
        await supabaseClient.from('treatments').insert(mapTreatmentToDB(newTreatment));
    } else {
        setTreatments(prev => [...prev, newTreatment]);
    }
    setToast({ 
        message: 'Tratamiento guardado. Recuerda exportar tu agenda.', 
        type: 'success',
        action: { label: 'Exportar Agenda', onClick: handleExportCalendar } 
    });
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

  // --- Calendar Export Logic (Moved up for scope access) ---
  const handleExportCalendar = () => {
      if(!currentUser) return;
      const myTreatments = treatments.filter(t => t.userId === currentUser.id && t.active);
      if(myTreatments.length === 0) {
          alert("No tienes tratamientos activos para exportar.");
          return;
      }

      // Generate .ics content
      let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MediGestion//NONSGML v1.0//EN\n";
      const now = new Date();
      
      myTreatments.forEach(t => {
          // Schedule for next 14 days
          let nextTime = t.nextScheduledTime;
          // Ensure we start from now or future
          while(nextTime < now.getTime()) {
              nextTime += t.frequencyHours * 3600000;
          }

          const endDate = now.getTime() + (14 * 24 * 60 * 60 * 1000); // 2 weeks out

          while (nextTime < endDate) {
              const startDate = new Date(nextTime);
              const endDateEvent = new Date(nextTime + (30 * 60 * 1000)); // 30 min duration

              // Format date to YYYYMMDDTHHMMSSZ
              const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

              icsContent += "BEGIN:VEVENT\n";
              // We append a random ID or timestamp to UID to ensure calendar apps treat these as new/updates if re-imported often
              icsContent += `UID:${t.id}-${nextTime}-${Date.now()}@medigestion.app\n`; 
              icsContent += `DTSTAMP:${formatICSDate(new Date())}\n`;
              icsContent += `DTSTART:${formatICSDate(startDate)}\n`;
              icsContent += `DTEND:${formatICSDate(endDateEvent)}\n`;
              icsContent += `SUMMARY:💊 Tomar ${t.name}\n`;
              icsContent += `DESCRIPTION:${t.type === 'medication' ? 'Medicamento' : 'Cura'}: ${t.description || ''}\n`;
              icsContent += `ALARM:DISPLAY\nTRIGGER:-PT5M\n`; // Alarm 5 mins before
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
      setToast(null); // Dismiss toast on action
  };

  const handleConfirmAction = useCallback(async (specificTimestamp: number) => {
    if (!currentUser || !actionModal.treatmentId) return;

    const action = actionModal.type;
    const treatmentId = actionModal.treatmentId;

    const treatment = treatments.find(t => t.id === treatmentId);
    if (!treatment) return;

    let nextTime = treatment.nextScheduledTime;
    let timeShiftDetected = false;

    if (action === 'take') {
      // Calculate next time based on ACTUAL intake time
      nextTime = specificTimestamp + (treatment.frequencyHours * 60 * 60 * 1000);
      
      // Check if the shift is significant (> 15 mins different from original schedule)
      const diff = Math.abs(specificTimestamp - treatment.nextScheduledTime);
      if (diff > 15 * 60 * 1000 && treatment.frequencyHours > 0) {
          timeShiftDetected = true;
      }
    } else {
      nextTime = treatment.nextScheduledTime + (treatment.frequencyHours * 60 * 60 * 1000);
    }

    const log: HistoryLog = {
        id: generateId(),
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        userId: currentUser.id,
        timestamp: Date.now(),
        actualTime: specificTimestamp,
        status: action === 'take' ? 'taken' : 'skipped',
        type: treatment.type
    };

    const updatedTreatment = { ...treatment, nextScheduledTime: nextTime };

    if (isOnline && supabaseClient) {
        await Promise.all([
            supabaseClient.from('treatments').update(mapTreatmentToDB(updatedTreatment)).eq('id', treatmentId),
            supabaseClient.from('history').insert(mapHistoryToDB(log))
        ]);
    } else {
        setTreatments(prev => prev.map(t => t.id === treatmentId ? updatedTreatment : t));
        setHistory(h => [log, ...h]);
    }

    setActionModal(prev => ({ ...prev, isOpen: false, treatmentId: null }));
    
    // Trigger notification
    if (timeShiftDetected) {
        setToast({
            message: 'Horario reprogramado. Actualiza tus alarmas.',
            type: 'warning',
            action: { label: 'Actualizar Agenda', onClick: handleExportCalendar }
        });
    } else {
        setToast({ message: 'Registrado correctamente', type: 'success' });
    }

  }, [currentUser, actionModal, treatments, isOnline, supabaseClient, handleExportCalendar]);


  const handleDelete = async (id: string) => {
      if(confirm('¿Seguro que quieres eliminar este tratamiento?')) {
          if (isOnline && supabaseClient) {
              await supabaseClient.from('treatments').delete().eq('id', id);
          } else {
              setTreatments(prev => prev.filter(t => t.id !== id));
          }
      }
  };

  const handleCreateUser = async () => {
      const name = prompt("Nombre del nuevo usuario:");
      if(name) {
          const pin = prompt("Crea un PIN de 4 dígitos para proteger tu cuenta (opcional, deja vacío si no quieres PIN):");
          const colors = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500'];
          const newUser: UserProfile = {
              id: generateId(),
              name,
              avatarColor: colors[Math.floor(Math.random()*colors.length)],
              pin: pin || undefined
          };
          
          if (isOnline && supabaseClient) {
              await supabaseClient.from('users').insert(mapUserToDB(newUser));
          } else {
              setUsers(prev => [...prev, newUser]);
          }
      }
  };


  // --- Data Management ---
  const handleExportData = () => {
    const data = { users, treatments, history, exportDate: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medigestion_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("ADVERTENCIA: Al importar una copia de seguridad, se reemplazarán los datos actuales. ¿Estás seguro?")) {
      if(importInputRef.current) importInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        if (data.users && Array.isArray(data.users)) {
          if (isOnline && supabaseClient) {
             const confirmCloud = confirm("Estás conectado a la nube. ¿Quieres subir estos datos a la nube? (Esto puede duplicar datos si ya existen)");
             if (confirmCloud) {
                 for (const u of data.users) await supabaseClient.from('users').upsert(mapUserToDB(u));
                 for (const t of data.treatments) await supabaseClient.from('treatments').upsert(mapTreatmentToDB(t));
                 for (const h of data.history) await supabaseClient.from('history').upsert(mapHistoryToDB(h));
                 alert("Datos subidos y sincronizados.");
             }
          } else {
             setUsers(data.users);
             setTreatments(data.treatments);
             setHistory(data.history);
             alert("Datos restaurados localmente. Por favor, inicia sesión.");
          }
        } else {
          alert("El archivo no tiene el formato correcto.");
        }
      } catch (error) {
        console.error(error);
        alert("Error al procesar archivo.");
      }
      if(importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleConnectCloud = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const url = (form.elements.namedItem('sb_url') as HTMLInputElement).value;
      const key = (form.elements.namedItem('sb_key') as HTMLInputElement).value;
      
      if(url && key) {
          const config = { url, key };
          setSupabaseConfig(config);
          localStorage.setItem('medigest_supabase_config', JSON.stringify(config));
          alert("Configuración guardada. Intentando conectar...");
      }
  };

  const handleDisconnectCloud = () => {
      if(confirm('¿Desconectar de la nube? Volverás a usar los datos locales.')) {
          setSupabaseConfig(null);
          setSupabaseClient(null);
          setIsOnline(false);
          localStorage.removeItem('medigest_supabase_config');
      }
  };

  // --- Views ---

  const renderLoginScreen = () => (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

          <div className="text-center mb-10 z-10">
              <div className="bg-white w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-900/5">
                  <div className="bg-gradient-to-tr from-primary-500 to-purple-500 text-white p-4 rounded-2xl shadow-inner">
                      <Pill className="w-8 h-8" />
                  </div>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">MediGestión</h1>
              <p className="text-slate-500 text-lg">Tu asistente de salud personal</p>
          </div>

          <div className="w-full max-w-sm space-y-6 z-10">
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-indigo-100/50 border border-white">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 ml-1">Selecciona un perfil</h3>
                {users.length === 0 ? (
                     <div className="p-8 text-center text-slate-400">No hay perfiles. Crea uno.</div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {users.map(u => (
                            <button 
                                key={u.id}
                                onClick={() => handleLogin(u)}
                                className="group flex items-center gap-4 p-3 pr-4 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.02] transition-all duration-300 border border-transparent hover:border-indigo-50 bg-slate-50"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${u.avatarColor} text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:shadow-lg transition-all relative`}>
                                    {u.name.charAt(0)}
                                    {u.pin && (
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                                            <Lock className="w-3 h-3 text-slate-700" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-primary-600 transition-colors">{u.name}</h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        {u.pin ? 'Acceso con PIN' : 'Tocar para entrar'}
                                    </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm text-primary-500">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
              </div>

              <button 
                onClick={handleCreateUser}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-400 font-bold hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
              >
                  <User className="w-5 h-5" />
                  Crear Nuevo Perfil
              </button>
              
              <div className="mt-8 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-all ${isOnline ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200' : 'bg-slate-200/50 text-slate-500 border border-slate-200'}`}>
                      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {isOnline ? 'Sincronizado' : 'Modo Local'}
                  </div>
              </div>
          </div>
      </div>
  );

  const renderDashboard = () => {
    if (!currentUser) return null;
    
    const myTreatments = treatments
      .filter(t => t.userId === currentUser.id && t.active)
      .sort((a, b) => a.nextScheduledTime - b.nextScheduledTime);

    const now = Date.now();

    return (
      <div className="space-y-8 pb-24 md:pb-8 animate-fade-in">
        {/* Header */}
        <header className="flex justify-between items-end">
          <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {getGreeting()}, <span className="text-primary-600">{currentUser.name.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-500 mt-1 font-medium">
                 Tienes <span className="text-slate-800 font-bold">{myTreatments.length}</span> pautas activas hoy.
              </p>
          </div>
          <div className="hidden sm:block">
              {isOnline ? (
                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
              ) : (
                <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
              )}
          </div>
        </header>

        {/* Timeline / Cards */}
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
            {myTreatments.map((t, idx) => {
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

                        {/* Actions Overlay/Area */}
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
                 <p className="text-slate-500 max-w-xs mx-auto mb-8">No tienes tratamientos programados para este momento. ¡Disfruta tu día!</p>
                 <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-primary-600 shadow-sm hover:bg-slate-50 transition-colors">
                    Añadir Tratamiento
                 </button>
             </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    if (!currentUser) return null;
    const myHistory = history.filter(h => h.userId === currentUser.id).sort((a, b) => b.actualTime - a.actualTime);

    return (
        <div className="pb-24 md:pb-8 animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 px-1">Historial de Tomas</h2>
            
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                {myHistory.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Aún no hay historial registrado.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {myHistory.map(log => (
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
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                    log.status === 'taken' ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-white text-rose-600 border border-rose-100'
                                }`}>
                                    {log.status === 'taken' ? 'Completado' : 'Omitido'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderProfiles = () => {
    // SQL Script kept same but hidden in UI better
    const sqlScript = `create table if not exists users (id text primary key, name text, avatar_color text, pin text);
create table if not exists treatments (id text primary key, user_id text, name text, type text, description text, frequency_hours int, next_scheduled_time bigint, start_date bigint, active boolean);
create table if not exists history (id text primary key, treatment_id text, treatment_name text, user_id text, timestamp bigint, actual_time bigint, status text, type text);
alter table treatments enable row level security;
alter table history enable row level security;
alter table users enable row level security;
create policy "Public access users" on users for all using (true);
create policy "Public access treatments" on treatments for all using (true);
create policy "Public access history" on history for all using (true);
alter publication supabase_realtime add table users, treatments, history;`;

    return (
        <div className="pb-24 md:pb-8 animate-fade-in space-y-8">
            <div className="flex justify-between items-center px-1">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">Ajustes y Perfiles</h2>
                  <p className="text-slate-500 text-sm">Gestiona tu cuenta y sincronización</p>
              </div>
              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-100 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm"
              >
                  <LogOut className="w-4 h-4" />
                  Salir
              </button>
            </div>
            
            {/* Current Profile Card */}
            <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
               <div className="relative z-10 flex items-center gap-6">
                   <div className={`w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl font-bold shadow-lg`}>
                      {currentUser?.name.charAt(0)}
                   </div>
                   <div>
                       <h3 className="text-2xl font-bold">{currentUser?.name}</h3>
                       <p className="text-indigo-100 font-medium opacity-90">Perfil Administrador</p>
                       <div className="mt-3 flex gap-2">
                           <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium backdrop-blur-sm border border-white/10">ID: {currentUser?.id.substring(0,8)}...</span>
                           {currentUser?.pin && <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium backdrop-blur-sm flex items-center gap-1"><Lock className="w-3 h-3"/> PIN Activo</span>}
                       </div>
                   </div>
               </div>
            </div>

            {/* Install App Section (Only visible if deferredPrompt exists) */}
            {deferredPrompt && (
                <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                <Smartphone className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Instalar MediGestión</h3>
                                <p className="text-indigo-200 text-sm">Añade la app a tu inicio para mejor experiencia.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleInstallClick}
                            className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl shadow-lg hover:bg-indigo-50 transition-colors w-full md:w-auto"
                        >
                            Instalar Ahora
                        </button>
                    </div>
                </div>
            )}
            
            {/* Calendar Export Section */}
             <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <CalendarDays className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Sincronizar Calendario</h3>
                            <p className="text-emerald-100 text-sm">Exporta tus tomas al calendario de tu móvil para recibir alarmas fiables incluso sin conexión.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleExportCalendar}
                        className="px-6 py-3 bg-white text-emerald-800 font-bold rounded-xl shadow-lg hover:bg-emerald-50 transition-colors w-full md:w-auto"
                    >
                        Exportar Agenda
                    </button>
                </div>
            </div>

            {/* Sync Section */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-slate-900 rounded-3xl p-6 text-slate-300 shadow-xl shadow-slate-200 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-slate-800 rounded-xl"><Cloud className="w-6 h-6 text-sky-400" /></div>
                            <h3 className="text-lg font-bold text-white">Nube (Supabase)</h3>
                        </div>
                        
                        {isOnline ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3 text-emerald-400 text-sm mb-4">
                                <Wifi className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Sincronización Activa</p>
                                    <p className="opacity-80 text-xs mt-1">Tus datos se actualizan en tiempo real.</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                Conecta tu base de datos para acceder desde cualquier dispositivo.
                            </p>
                        )}
                        
                        {!isOnline && (
                             <form onSubmit={handleConnectCloud} className="space-y-3">
                                <input name="sb_url" required defaultValue={supabaseConfig?.url || ''} placeholder="Project URL" className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-sky-500 placeholder-slate-600" />
                                <input name="sb_key" required defaultValue={supabaseConfig?.key || ''} placeholder="Public Key" className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-sky-500 placeholder-slate-600" />
                                <button type="submit" className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl text-sm font-bold shadow-lg shadow-sky-900/40 transition-colors mt-2">
                                    Conectar
                                </button>
                             </form>
                        )}
                    </div>
                    {isOnline && (
                        <button onClick={handleDisconnectCloud} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-colors text-slate-300">
                            Desconectar
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
                     <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-50 rounded-xl"><Save className="w-6 h-6 text-indigo-500" /></div>
                            <h3 className="text-lg font-bold text-slate-800">Copia de Seguridad</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">
                            Exporta tus datos a un archivo JSON o restaura una copia anterior manualmente.
                        </p>
                     </div>
                     
                     <div className="space-y-3">
                        <button 
                            onClick={handleExportData}
                            className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-700 py-3 rounded-xl border border-slate-200 font-bold text-sm hover:bg-white hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Descargar Backup
                        </button>
                        
                        <div className="relative">
                            <input type="file" accept=".json" ref={importInputRef} className="hidden" onChange={handleImportData} />
                            <button 
                                onClick={() => importInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 py-3 rounded-xl border border-dashed border-slate-300 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                                <Upload className="w-4 h-4" />
                                Restaurar Backup
                            </button>
                        </div>
                     </div>
                </div>
            </div>

            {/* Dev Tools (SQL) */}
             <div className="border-t border-slate-200 pt-6">
                <details className="group">
                    <summary className="list-none flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-400 hover:text-indigo-500 transition-colors">
                        <Database className="w-4 h-4" />
                        Ver Script SQL para Supabase
                        <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="mt-4 relative bg-slate-900 rounded-xl overflow-hidden p-4">
                        <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto">{sqlScript}</pre>
                        <button onClick={() => navigator.clipboard.writeText(sqlScript)} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </details>
             </div>
        </div>
    );
  };

  // --- Render ---

  if (!currentUser) {
      return (
        <>
            {renderLoginScreen()}
            <AddTreatmentModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleSaveTreatment} />
        </>
      )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <Navigation 
        currentTab={activeTab} 
        setTab={setActiveTab} 
        onAddClick={() => setShowAddModal(true)} 
        currentUser={currentUser}
      />
      
      <main className="flex-1 w-full md:pl-72 transition-all duration-300">
        <div className="max-w-4xl mx-auto p-5 md:p-10">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'treatments' && renderDashboard()} 
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'profiles' && renderProfiles()}
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

      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
          <div className="fixed bottom-24 md:bottom-8 right-4 left-4 md:left-auto md:w-96 z-[80] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className={`p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 ${
                  toast.type === 'success' ? 'bg-emerald-900 text-emerald-100' :
                  toast.type === 'warning' ? 'bg-amber-900 text-amber-100' : 'bg-slate-900 text-slate-100'
              }`}>
                  <div className="flex items-center gap-3">
                      {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <AlertCircle className="w-6 h-6 text-amber-400" />}
                      <span className="text-sm font-semibold">{toast.message}</span>
                  </div>
                  {toast.action ? (
                      <button 
                        onClick={toast.action.onClick}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
                      >
                          {toast.action.label}
                      </button>
                  ) : (
                      <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}

export default App;