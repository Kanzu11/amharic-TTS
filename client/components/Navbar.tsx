
import React from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User | null;
  currentView: 'home' | 'profile' | 'admin';
  onNavigate: (view: 'home' | 'profile' | 'admin') => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, currentView, onNavigate, onLogout, onOpenAuth }) => {
  return (
    <nav className="w-full max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => onNavigate('home')}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-pink-900/20 hover:scale-110 transition-transform duration-300">
          አ
        </div>
        <span className="text-xl font-black animate-shiny neon-glow hidden md:block tracking-wide">
          አማርኛ ድምፅ
        </span>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <button
          onClick={() => onNavigate('home')}
          className={`text-sm font-medium transition-colors ${currentView === 'home' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
        >
          Home
        </button>

        {user ? (
          <>
            <button
              onClick={() => onNavigate('profile')}
              className={`text-sm font-medium transition-colors ${currentView === 'profile' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
            >
              Profile
            </button>
            {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && (
              <button
                onClick={() => onNavigate('admin')}
                className={`text-sm font-medium transition-colors ${currentView === 'admin' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
              >
                Admin
              </button>
            )}
            <div className="h-6 w-px bg-slate-700 hidden md:block"></div>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-all border border-slate-700"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-6 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/40"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
