import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../lib/constants';
import { Shield, Sun, Moon, LogOut, KeyRound } from 'lucide-react';

export default function Header({ onOpenKeyModal }) {
  const { currentProfile, hasKeys, logout, darkMode, setDarkMode } = useAuth();

  return (
    <header className="dashboard-header flex-wrap gap-3">
      <div className="header-left flex items-center gap-3">
        <div className="logo-icon flex items-center justify-center bg-accent text-white w-10 h-10 rounded-lg shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wide">FirmaDigital · Panel de Control</h1>
          <p className="text-xs text-blue-200 hidden sm:block">Criptografía Híbrida RSA-2048 + ML-DSA-87</p>
        </div>
      </div>

      <div className="user-info flex items-center gap-2.5 flex-wrap">
        {!hasKeys ? (
          <button
            onClick={onOpenKeyModal}
            className="btn btn-warning btn-sm gap-2 text-xs bg-amber-500 hover:bg-amber-600 text-white border-none"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden md:inline">Generar Llaves Criptográficas</span>
            <span className="md:hidden">Llaves</span>
          </button>
        ) : (
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-semibold hidden md:flex items-center gap-1">
            🛡️ Llaves ML-DSA-87 Activas
          </span>
        )}

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          aria-label="Cambiar tema visual"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="user-badge flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
          <div className="user-avatar w-7 h-7 rounded-full bg-accent flex items-center justify-center font-bold text-xs text-white">
            {currentProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <div className="user-name text-xs font-semibold text-white">{currentProfile?.full_name || 'Usuario'}</div>
            <div className="user-role text-[10px] text-gray-300">{getRoleLabel(currentProfile?.role)}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-outline btn-sm text-xs text-white border-white/30 hover:bg-white/10 gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
