import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, PenTool, Search, History, Users, Settings } from 'lucide-react';

export default function Sidebar({ activeSection, setActiveSection }) {
  const { currentProfile } = useAuth();
  const role = currentProfile?.role;

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'firmar', label: 'Firmar', icon: PenTool },
    { id: 'verificar', label: 'Verificar', icon: Search },
    { id: 'historial', label: 'Historial', icon: History },
  ];

  if (['jefe_division', 'presidente_academia', 'secretario_academia'].includes(role)) {
    navItems.push({ id: 'usuarios', label: 'Usuarios', icon: Users });
  }

  if (role === 'jefe_division') {
    navItems.push({ id: 'configuracion', label: 'Configuración', icon: Settings });
  }

  return (
    <nav className="sidebar">
      <ul className="sidebar-nav py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <li key={item.id} className="sidebar-nav-item">
              <button
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`sidebar-nav-btn w-full text-left flex items-center gap-3 px-6 py-3 font-medium text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent/10 text-accent active'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
