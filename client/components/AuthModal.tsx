import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserRole, User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  onForgotPassword?: () => void;
}

type AuthView = 'login' | 'signup' | 'verification';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onForgotPassword }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const loggedUser: User = {
        id: data._id,
        email: data.email,
        name: data.email.split('@')[0],
        role: data.role,
        isSubscribed: data.role === UserRole.ADMIN || data.role === UserRole.SUPERADMIN || (data.subscription?.status === 'active' && new Date(data.subscription.expiresAt) > new Date()),
        isVerified: true,
        createdAt: Date.now(),
        subscription: data.subscription
      };

      localStorage.setItem('authToken', data.token);

      onLogin(loggedUser);
      toast.success("Successfully logged in!");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Login failed");
      if (error.message?.includes('token') || error.message?.includes('authorized')) {
        localStorage.removeItem('authToken');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Instead of logging in immediately, ask for OTP
      toast.success("Verification code sent to email!");
      setView('verification');
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/verifyemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Verification failed");

      const loggedUser: User = {
        id: data.user._id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        isSubscribed: data.user.isSubscribed,
        isVerified: true,
        createdAt: Date.now()
      };

      if (data.token) localStorage.setItem('authToken', data.token);

      onLogin(loggedUser);
      onClose();
      toast.success("Email Verified! Welcome!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">
            {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Create Account' : 'Check Your Email'}
          </h2>
          <p className="text-slate-400 text-center mb-8">
            {view === 'login' ? 'Login to your account' : view === 'signup' ? 'Start your journey with us' : 'Enter the code we just sent you'}
          </p>

          <form onSubmit={view === 'login' ? handleLogin : view === 'signup' ? handleSignup : handleVerify} className="space-y-4">
            {view === 'verification' && (
              <div className="text-center animate-in fade-in zoom-in">
                <div className="mb-6">
                  <div className="text-5xl mb-4">📧</div>
                  <label className="block text-slate-300 text-sm mb-2 font-bold">Verification Code</label>
                  <p className="text-slate-500 text-xs mb-4">We sent a 6-digit code to <span className="text-white font-bold">{email}</span></p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-white text-center text-3xl font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Email'}
                </button>
                <div className="flex justify-between items-center text-xs px-2">
                  <button type="button" onClick={() => setView('signup')} className="text-slate-500 hover:text-white transition-colors">Wrong email?</button>
                  <button type="button" onClick={async () => {
                    toast.loading("Resending code...", { id: 'resend' });
                    try {
                      await fetch('http://localhost:3001/api/auth/resend-verification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                      });
                      toast.success("Code sent!", { id: 'resend' });
                    } catch {
                      toast.error("Failed to resend", { id: 'resend' });
                    }
                  }} className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Resend Code</button>
                </div>
              </div>
            )}

            {view !== 'verification' && (
              <>
                {view === 'signup' && (
                  <div>
                    <label className="block text-slate-300 text-sm mb-1 ml-1 font-medium">ሙሉ ስም (Full Name)</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-slate-300 text-sm mb-1 ml-1 font-medium">ኢሜይል (Email)</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1 ml-1 font-medium">የይለፍ ቃል (Password)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl mt-4 hover:opacity-90 transition-all shadow-lg shadow-purple-900/40 active:scale-[0.98] disabled:opacity-50"
                >
                  {isVerifying ? 'በመሞከር ላይ...' : view === 'login' ? 'ይግቡ (Login)' : 'ይመዝገቡ (Sign Up)'}
                </button>
              </>
            )}
          </form>

          {view !== 'verification' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors"
              >
                {view === 'login' ? "መለያ የለዎትም? ይመዝገቡ (Don't have an account?)" : "ቀድሞውኑ መለያ አለዎት? ይግቡ (Already have an account?)"}
              </button>
              {view === 'login' && (
                <button
                  onClick={() => onForgotPassword?.()}
                  className="block w-full mt-2 text-slate-500 text-xs font-medium hover:text-white transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-slate-500 text-[10px] uppercase tracking-[0.2em] hover:text-slate-300 transition-colors"
          >
            ዝጋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
