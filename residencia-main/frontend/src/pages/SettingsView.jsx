import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Palette, Users } from 'lucide-react';

export default function SettingsView() {
  const { darkMode, setDarkMode } = useAuth();

  const rolesInfo = [
    {
      name: 'Jefe de División',
      desc: 'Acceso total: invitar y administrar usuarios, eliminar documentos, limpiar historial y configurar sistema.',
      dotColor: '#c0392b',
    },
    {
      name: 'Presidente de Academia',
      desc: 'Supervisión documental, consulta de usuarios y administración exclusiva del historial de cargos académicos.',
      dotColor: '#b7950b',
    },
    {
      name: 'Secretario de Academia',
      desc: 'Gestión documental completa, firma híbrida, verificación y consulta del directorio de usuarios.',
      dotColor: '#1e8449',
    },
    {
      name: 'Docente',
      desc: 'Operaciones de carga y firma digital sobre sus propios documentos académicos y consulta de verificaciones.',
      dotColor: '#1565c0',
    },
  ];

  return (
    <div className="content-section active">
      <div className="section-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h2>
          <p className="text-sm text-gray-500">Apariencia visual y niveles de acceso institucionales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarjeta Apariencia */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3.5 bg-gray-50/70 dark:bg-gray-900/40">
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Apariencia</h3>
              <p className="text-xs text-gray-500">Tema visual de la interfaz</p>
            </div>
          </div>

          <div className="p-5">
            <div className="flex gap-3 p-1.5 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setDarkMode(false)}
                className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-lg border-2 transition-all cursor-pointer ${
                  !darkMode
                    ? 'bg-white dark:bg-gray-800 border-accent text-accent font-semibold shadow-sm'
                    : 'border-transparent text-gray-600 dark:text-gray-400'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs font-semibold">☀️ Modo Claro</span>
              </button>

              <button
                type="button"
                onClick={() => setDarkMode(true)}
                className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-lg border-2 transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-white dark:bg-gray-800 border-accent text-accent font-semibold shadow-sm'
                    : 'border-transparent text-gray-600 dark:text-gray-400'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs font-semibold">🌙 Modo Oscuro</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tarjeta Roles */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3.5 bg-gray-50/70 dark:bg-gray-900/40">
            <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Roles</h3>
              <p className="text-xs text-gray-500">Niveles de acceso del sistema</p>
            </div>
          </div>

          <div className="p-5 space-y-2.5">
            {rolesInfo.map((r) => (
              <div
                key={r.name}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/60"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: r.dotColor }}
                />
                <div>
                  <strong className="text-sm text-gray-900 dark:text-white block">{r.name}</strong>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

