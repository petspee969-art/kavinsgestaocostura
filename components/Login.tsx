import React, { useState, useEffect } from 'react';
import { Loader2, Lock, User, AlertCircle } from 'lucide-react';
import { BRAND, updateDocumentTitle } from '../lib/brand';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateDocumentTitle();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate network delay for better UX
    setTimeout(() => {
      // White label logic: generic credentials or kept simple for demo
      if (username === 'admin' && password === 'admin') {
        localStorage.setItem('kavins_session', 'true');
        onLoginSuccess();
      } else if (username === 'kavins' && password === 'kavins2026') {
        localStorage.setItem('kavins_session', 'true');
        onLoginSuccess();
      } else {
        setError('Usuário ou senha incorretos.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-8 text-center">
          <h1 className="text-3xl font-bold tracking-tighter text-white mb-2">
            {BRAND.companyName}
          </h1>
          <p className="text-indigo-200 text-sm uppercase tracking-widest">
            {BRAND.appName}
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
              <p className="text-slate-500 text-sm">Entre com suas credenciais</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 animate-in fade-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Nome de usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                'Acessar Painel'
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-xs text-slate-400">
                {BRAND.footerText} • {BRAND.version}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};