import React from 'react';
import { LayoutDashboard, Pill, History, Users, PlusCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface NavigationProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onAddClick: () => void;
  currentUser: UserProfile | null;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, setTab, onAddClick, currentUser }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Agenda' },
    { id: 'treatments', icon: Pill, label: 'Mis Meds' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'profiles', icon: Users, label: 'Perfiles' },
  ];

  return (
    <>
      {/* Desktop/Tablet Sidebar */}
      <nav className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 h-screen fixed left-0 top-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="bg-gradient-to-tr from-primary-600 to-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Pill className="w-6 h-6" />
            </div>
            MediGestión
          </h1>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1.5">
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu Principal</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                currentTab === item.id
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${currentTab === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {item.label}
            </button>
          ))}
        </div>
        
        <div className="p-4 m-4 bg-slate-50 rounded-3xl border border-slate-100">
          {/* Add Button */}
          <button
            onClick={onAddClick}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-bold shadow-xl shadow-slate-200 transition-all active:scale-[0.98] mb-4"
          >
            <PlusCircle className="w-5 h-5" />
            Nuevo Tratamiento
          </button>

          {/* Current User Mini Profile */}
          {currentUser && (
            <button 
              onClick={() => setTab('profiles')}
              className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-white transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl ${currentUser.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-slate-700 truncate group-hover:text-primary-600 transition-colors">{currentUser.name}</p>
                <p className="text-xs text-slate-400 font-medium">Ver ajustes</p>
              </div>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-20 pb-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-colors ${
                currentTab === item.id ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${currentTab === item.id ? 'bg-primary-50' : 'bg-transparent'}`}>
                 <item.icon className={`w-6 h-6 ${currentTab === item.id ? 'fill-current' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Floating Action Button */}
      <button
        onClick={onAddClick}
        className="md:hidden fixed bottom-24 right-5 bg-slate-900 text-white p-4 rounded-2xl shadow-xl shadow-slate-500/30 z-40 active:scale-90 transition-transform"
        aria-label="Añadir medicamento"
      >
        <PlusCircle className="w-7 h-7" />
      </button>
    </>
  );
};