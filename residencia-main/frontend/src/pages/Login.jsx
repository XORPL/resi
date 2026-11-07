import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const { login, authNotice, setAuthNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (setAuthNotice) setAuthNotice('');
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión. Verifica tus datos o intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || authNotice;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-dark via-primary to-primary-light">
      <div className="app-container w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row bg-white dark:bg-gray-900">
        <div className="brand-section flex-1 bg-gradient-to-br from-primary-dark to-primary p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="logo-area flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FirmaDigital</h1>
              <span className="text-xs text-blue-200 font-medium">TESJo · Sistema de Gestión Documental</span>
            </div>
          </div>

          <div className="brand-content my-8 md:my-10 relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4">
              Firma electrónica híbrida con criptografía post-cuántica
            </h2>
            <p className="text-sm text-gray-200 mb-6 leading-relaxed">
              Plataforma institucional de gestión y firma inmutable de documentos académicos respaldada por RSA-2048 y ML-DSA-87 (FIPS 204).
            </p>
            <div className="crypto-badges flex flex-wrap gap-2">
              <span className="crypto-badge bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                🔐 RSA-2048 / PSS
              </span>
              <span className="crypto-badge bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                🛡️ ML-DSA-87 (FIPS 204)
              </span>
              <span className="crypto-badge bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                🔑 Bóveda AES-256-GCM
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-300 relative z-10">
            © 2026 Tecnológico de Estudios Superiores de Jocotitlán
          </div>
        </div>

        <div className="form-section flex-1 p-8 md:p-10 flex flex-col justify-center">
          <div className="form-container max-w-sm w-full mx-auto">
            <div className="form-header mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Iniciar Sesión</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {displayError && (
              <div className="alert alert-error mb-4" style={{ display: 'flex' }}>
                <span>⚠️</span>
                <span>{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div className="form-group">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Correo electrónico
                </label>
                <div className="input-wrapper relative flex items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    autoComplete="email"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3" />
                </div>
              </div>

              <div className="form-group">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña
                </label>
                <div className="input-wrapper relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-accent outline-none"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label="Mostrar u ocultar contraseña"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn btn-primary py-3 rounded-lg bg-primary hover:bg-primary-light text-white font-semibold flex items-center justify-center gap-2 transition-all mt-6"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>{loading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
