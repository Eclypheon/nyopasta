import React, { useState } from 'react';
import { User, Mail, Phone, Lock, ArrowRight, X, AlertCircle } from 'lucide-react';
import { api, AuthUser } from '@nyopasta/shared';

interface AuthModalProps {
  isOpen: boolean;
  canDismiss?: boolean;
  onClose?: () => void;
  onSuccess: (user: AuthUser) => void;
  onContinueAsGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  canDismiss = false,
  onClose,
  onSuccess,
  onContinueAsGuest,
}) => {
  const [authMode, setAuthMode] = useState<'email_signup' | 'email_login'>('email_signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.loginWithGoogle();
      const user = await api.getCurrentUser();
      if (user) {
        onSuccess(user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let user: AuthUser;
      if (authMode === 'email_signup') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter your email and a password.');
        }
        user = await api.signupWithEmail(email.trim(), password, name.trim() || 'Member', phone.trim() || undefined);
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter your email and password.');
        }
        user = await api.loginWithEmail(email.trim(), password);
      }

      onSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-cream-dark text-navy relative overflow-hidden animate-scale-in my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss Button if allowed */}
        {canDismiss && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-navy/40 hover:text-navy hover:bg-cream transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div
            className="w-16 h-16 rounded-full border-2 border-terracotta overflow-hidden shadow-md mx-auto mb-2.5 bg-cream flex items-center justify-center shrink-0"
            style={{ width: 64, height: 64, minWidth: 64, minHeight: 64 }}
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.jpg`}
              alt="NYO Pasta"
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}stamp-darkblue.png`;
              }}
            />
          </div>
          <h2 className="text-xl font-black text-terracotta tracking-tight">NYO PASTA</h2>
          <p className="text-[11px] font-bold text-navy/60 uppercase tracking-wider">Toa Payoh Palm Spring #01-54</p>
          <p className="text-xs text-navy/80 mt-1 font-medium">
            Handcrafted pasta. Join as a member to collect stamps & unlock free rewards!
          </p>
        </div>

        {/* 1-Click Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] border border-gray-300 text-gray-800 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-all disabled:opacity-50"
        >
          {/* Google G SVG */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>1-Click Sign up with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-3.5">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-[10px] uppercase font-bold text-gray-400">or continue with email</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Auth Sub-mode Selector: Email Sign Up / Email Log In */}
        <div className="flex bg-cream p-1 rounded-xl mb-3 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('email_signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              authMode === 'email_signup' ? 'bg-white text-terracotta shadow-xs' : 'text-navy/60 hover:text-navy'
            }`}
          >
            Email Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('email_login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              authMode === 'email_login' ? 'bg-white text-terracotta shadow-xs' : 'text-navy/60 hover:text-navy'
            }`}
          >
            Email Log In
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {authMode === 'email_signup' && (
            <>
              <div>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-navy/40 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Alex Tan)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-cream-dark rounded-xl bg-cream-light focus:outline-hidden focus:border-terracotta font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-navy/40 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="Mobile Phone (for order pickup notifications)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-cream-dark rounded-xl bg-cream-light focus:outline-hidden focus:border-terracotta font-medium"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-navy/40 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-cream-dark rounded-xl bg-cream-light focus:outline-hidden focus:border-terracotta font-medium"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-navy/40 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-cream-dark rounded-xl bg-cream-light focus:outline-hidden focus:border-terracotta font-medium"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-terracotta hover:bg-terracotta-600 active:scale-[0.98] text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>
              {isLoading
                ? 'Processing...'
                : authMode === 'email_signup'
                ? 'Sign Up as Member'
                : 'Log In'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Divider to Guest Option */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-cream-dark" />
          <span className="px-2.5 text-[10px] uppercase font-bold text-navy/40">or</span>
          <div className="flex-1 border-t border-cream-dark" />
        </div>

        {/* Continue as Guest Button */}
        <button
          type="button"
          onClick={onContinueAsGuest}
          className="w-full bg-cream-light hover:bg-cream active:scale-[0.98] border border-cream-dark text-navy font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex flex-col items-center justify-center shadow-2xs"
        >
          <span className="font-extrabold text-navy">Continue as Guest</span>
          <span className="text-[10px] text-navy/50 font-normal">Order without account (loyalty stamps not earned)</span>
        </button>
      </div>
    </div>
  );
};
