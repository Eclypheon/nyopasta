import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (username: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const allowedUser = (import.meta.env.VITE_ADMIN_USERNAME || 'waiyan').toLowerCase();
    const allowedPass = import.meta.env.VITE_ADMIN_PASSWORD || 'nyopasta2026*';

    if ((cleanUser === allowedUser || cleanUser === 'admin') && cleanPass === allowedPass) {
      localStorage.setItem('nyo_admin_auth', cleanUser);
      setIsLoading(false);
      onLoginSuccess(cleanUser);
    } else {
      setIsLoading(false);
      setErrorMsg('Invalid admin credentials. Please check your username and password.');
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-200 p-6 sm:p-8 space-y-6 animate-scale-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-navy flex items-center justify-center p-1.5 shadow-md">
            <img
              src={`${import.meta.env.BASE_URL}stamp-darkblue.png`}
              alt="NYO Pasta Logo"
              className="w-full h-full object-contain filter invert"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logo.jpg`;
              }}
            />
          </div>
          <div>
            <h1 className="font-black text-xl text-gray-900 tracking-wide">NYO Kitchen Admin</h1>
            <p className="text-xs text-gray-500 mt-0.5">Kitchen Portal & Order Dispatch System</p>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Admin Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-terracotta focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-terracotta focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-navy hover:bg-navy-900 active:scale-98 text-white font-extrabold text-sm py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>{isLoading ? 'Verifying...' : 'Sign In to Kitchen Admin'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
