import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenAI, Modality } from "@google/genai";
import { Toaster, toast } from 'react-hot-toast';
import { Tone, VoiceName, TTSHistoryItem, User, UserRole } from './types';
import { decode, decodeAudioData, createAudioBlob } from './utils/audioUtils';
import AudioVisualizer from './components/AudioVisualizer';
import AuthModal from './components/AuthModal';
import PaymentModal from './components/PaymentModal';
import Navbar from './components/Navbar';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

const VOICES = [
  { id: VoiceName.ZEPHYR, label: 'Zephyr', desc: 'ተፈጥሯዊ እና ለስላሳ ድምፅ' },
  { id: VoiceName.KORE, label: 'Kore', desc: 'ብሩህ እና ማራኪ ድምፅ' },
  { id: VoiceName.PUCK, label: 'Puck', desc: 'ተጫዋች እና ሞቅ ያለ ድምፅ' },
  { id: VoiceName.CHARON, label: 'Charon', desc: 'ጥልቅ እና የተረጋጋ ድምፅ' },
  { id: VoiceName.FENRIR, label: 'Fenrir', desc: 'ኃይለኛ እና ትኩረት የሚስብ' }
];

const App: React.FC = () => {
  const [text, setText] = useState('እንኳን ወደ አማርኛ ድምፅ ቀያሪ በደህና መጡ! ይህ መተግበሪያ ማንኛውንም ፅሁፍ ወደ ተፈጥሯዊ ድምፅ ይቀይራል።');
  const [selectedTone, setSelectedTone] = useState<Tone>(Tone.STORYTELLER);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.ZEPHYR);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('amharic_tts_all_users');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // METADATA ONLY: To prevent localStorage crashes
  const [history, setHistory] = useState<TTSHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('amharic_tts_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // TRANSIENT CACHE: Keeps latest 3 audio blobs in RAM only
  const [audioCache, setAudioCache] = useState<Record<string, Uint8Array>>({});

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('amharic_tts_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [currentAudio, setCurrentAudio] = useState<{ buffer: AudioBuffer; raw: Uint8Array } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'admin' | 'forgot-password' | 'reset-password'>('home');
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Simple routing for email links
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify-email/')) {
      const token = path.split('/').pop();
      if (token) {
        fetch(`${import.meta.env.VITE_API_URL}/api/auth/verifyemail/${token}`)
          .then(res => res.json())
          .then(data => {
            toast.success("Email Verified! Please login.");
            setIsAuthModalOpen(true);
            window.history.pushState({}, '', '/'); // Clear URL
          })
          .catch(() => toast.error("Verification failed"));
      }
    } else if (path.startsWith('/reset-password/')) {
      const token = path.split('/').pop();
      if (token) {
        setResetToken(token);
        setCurrentView('reset-password');
      }
    }
  }, []);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const isFreeDownloadEligible = wordCount <= 20;

  useEffect(() => {
    localStorage.setItem('amharic_tts_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  // Refresh User Data on Mount
  useEffect(() => {
    const refreshUser = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          localStorage.setItem('amharic_tts_user', JSON.stringify(user));
        }
      } catch (e) {
        console.error("Failed to refresh user", e);
      }
    };
    refreshUser();
  }, []);

  useEffect(() => {
    // Only persist metadata to localStorage
    const historyMetadata = history.map(({ audioData, ...rest }) => rest).slice(0, 15);
    localStorage.setItem('amharic_tts_history', JSON.stringify(historyMetadata));
  }, [history]);

  const initAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.connect(audioContextRef.current.destination);
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (e) {
      console.error("Audio Context initialization failed", e);
    }
  };

  const generateSpeech = async () => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    // Keep audio context ready
    await initAudioContext();

    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tts/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          voice: selectedVoice,
          tone: selectedTone
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate speech");
      }

      const base64Data = data.audio;
      if (!base64Data) throw new Error("Synthesis failed: Empty response.");

      const raw = decode(base64Data);
      if (audioContextRef.current) {
        const buffer = await decodeAudioData(raw, audioContextRef.current, 24000, 1);
        setCurrentAudio({ buffer, raw });

        const historyId = crypto.randomUUID();

        // Add metadata to history
        setHistory(prev => [{
          id: historyId,
          userId: currentUser?.id || 'guest',
          text: text.substring(0, 80) + (text.length > 80 ? '...' : ''),
          tone: selectedTone,
          voice: selectedVoice,
          timestamp: Date.now()
        }, ...prev].slice(0, 20));

        // Limited memory cache for replay
        setAudioCache(prev => {
          const newCache = { ...prev, [historyId]: raw };
          const keys = Object.keys(newCache);
          if (keys.length > 4) {
            const { [keys[0]]: _, ...rest } = newCache;
            return rest;
          }
          return newCache;
        });

        await playBuffer(buffer);
      }
    } catch (err: any) {
      console.error("TTS Critical Error:", err);
      // Simplify error message for user but keep relevant info
      const errorMsg = err.message || JSON.stringify(err);
      if (errorMsg.includes('400')) {
        toast.error("Invalid Request: Text might be empty.");
      } else if (errorMsg.includes('429') || errorMsg.includes('System Busy')) {
        toast.error("System Busy: Capacity Reached. Please try again in a minute.");
      } else if (errorMsg.includes('safety') || errorMsg.includes('harmful')) {
        toast.error("Safety Filter: Text blocked by safety settings.");
      } else {
        toast.error(`Error: ${errorMsg.substring(0, 50) || "System Error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const playBuffer = useCallback(async (buffer: AudioBuffer) => {
    await initAudioContext();
    if (!audioContextRef.current || !analyserRef.current) return;

    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { }
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current);
    source.onended = () => setIsPlaying(false);

    setIsPlaying(true);
    source.start(0);
    sourceRef.current = source;
  }, []);

  const handleDownloadAttempt = (raw: Uint8Array) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const isPremium = currentUser.isSubscribed || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN;
    if (isPremium) {
      downloadAudio(raw);
    } else {
      // Must subscribe to download at all
      setIsPaymentModalOpen(true);
    }
  };

  const downloadAudio = (rawPcm: Uint8Array) => {
    setIsDownloading(true);
    try {
      const blob = createAudioBlob(rawPcm, 24000);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `amharic_studio_${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Format conversion failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('amharic_tts_user');
    setCurrentView('home');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAllUsers(prev => {
      const exists = prev.find(u => u.email === user.email);
      if (exists) return prev.map(u => u.email === user.email ? { ...u, ...user } : u);
      return [...prev, user];
    });
    localStorage.setItem('amharic_tts_user', JSON.stringify(user));
  };

  const handleSubscriptionSuccess = (paymentId: string) => {
    if (currentUser) {
      const isPending = paymentId === 'PENDING';
      const updatedUser: User = {
        ...currentUser,
        isSubscribed: !isPending, // Don't subscribe yet if pending
        hasPendingPayment: isPending,
        paymentId
      };

      setCurrentUser(updatedUser);
      setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      localStorage.setItem('amharic_tts_user', JSON.stringify(updatedUser));
      setIsPaymentModalOpen(false);

      if (isPending) {
        toast.success("Payment Under Review / ክፍያዎ በግምገማ ላይ ነው");
      } else {
        toast.success("ተሳክቷል! Premium አግኝተዋል።");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020205] relative overflow-hidden" onClick={initAudioContext}>
      <Toaster position="top-center" reverseOrder={false} toastOptions={{
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #334155',
        },
      }} />
      <Navbar user={currentUser} currentView={currentView} onNavigate={v => setCurrentView(v as any)} onLogout={handleLogout} onOpenAuth={() => setIsAuthModalOpen(true)} />

      <AnimatePresence>
        {isAuthModalOpen && <AuthModal isOpen={true} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} onForgotPassword={() => { setIsAuthModalOpen(false); setCurrentView('forgot-password'); }} />}
        {isPaymentModalOpen && <PaymentModal isOpen={true} onClose={() => setIsPaymentModalOpen(false)} onSuccess={handleSubscriptionSuccess} message={wordCount > 20 ? "ከ20 ቃላት በላይ ለማውረድ Premium ያስፈልጋል።" : undefined} />}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {currentView === 'home' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-16">
              <h1 className="text-7xl md:text-9xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 tracking-tighter animate-shiny neon-glow">አማርኛ ድምፅ</h1>
              <p className="text-slate-500 text-lg uppercase tracking-widest font-bold">Studio Grade Neural Synthesis</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                <div className={`glass rounded-[3rem] p-10 transition-all duration-700 ${isLoading ? 'gemini-aura ring-2 ring-purple-500/30' : ''}`}>
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Input Amharic Text</span>
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl ${wordCount > 20 && !currentUser?.isSubscribed ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-slate-500'}`}>{wordCount} Words</span>
                    </div>
                  </div>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="ፅሁፍዎን እዚህ ያስገቡ..."
                    className="w-full h-72 bg-transparent text-white text-3xl font-medium outline-none resize-none placeholder-white/5 leading-[1.3] custom-scrollbar"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 pt-10 border-t border-white/5">
                    <section>
                      <h4 className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-8">Voice Personality</h4>
                      <div className="space-y-3">
                        {VOICES.map(v => (
                          <button key={v.id} onClick={() => setSelectedVoice(v.id)} className={`w-full p-5 rounded-3xl text-left transition-all border ${selectedVoice === v.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent hover:bg-white/[0.08]'}`}>
                            <div className="flex justify-between items-center mb-1"><span className={`text-sm font-bold ${selectedVoice === v.id ? 'text-white' : 'text-slate-400'}`}>{v.label}</span></div>
                            <p className="text-[10px] text-slate-500">{v.desc}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                    <section>
                      <h4 className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-8">Expression Style</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {Object.values(Tone).map(t => (
                          <button key={t} onClick={() => setSelectedTone(t)} className={`px-5 py-3 rounded-2xl text-[10px] font-bold uppercase transition-all border ${selectedTone === t ? 'bg-white text-black' : 'bg-white/5 text-slate-500 border-white/5'}`}>{t}</button>
                        ))}
                      </div>
                    </section>
                  </div>

                  <button
                    onClick={generateSpeech}
                    disabled={isLoading || !text.trim()}
                    className={`w-full mt-12 py-6 rounded-[2rem] text-white font-black text-2xl flex items-center justify-center gap-5 relative overflow-hidden transition-all ${isLoading ? 'bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'}`}
                  >
                    {isLoading && <div className="absolute inset-0 animate-shimmer" />}
                    <span className="relative z-10">{isLoading ? 'Synthesizing...' : 'Generate Voice'}</span>
                  </button>
                </div>

                <div className="glass rounded-[3rem] p-10">
                  <AudioVisualizer analyser={analyserRef.current} isPlaying={isPlaying} />
                  {currentAudio && (
                    <div className="flex flex-col sm:flex-row gap-5 mt-10">
                      <button
                        onClick={() => playBuffer(currentAudio.buffer)}
                        className="flex-1 py-6 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-4 transition-all"
                      >
                        Play Again
                      </button>
                      <button
                        onClick={() => handleDownloadAttempt(currentAudio.raw)}
                        disabled={isDownloading}
                        className={`flex-1 py-6 rounded-[1.5rem] font-bold border flex items-center justify-center gap-4 transition-all ${isFreeDownloadEligible || currentUser?.isSubscribed ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/20 hover:bg-indigo-600/30' : 'bg-amber-600/10 text-amber-500 border-amber-500/20 hover:bg-amber-600/20'}`}
                      >
                        {isDownloading ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <span>{currentUser?.isSubscribed || currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPERADMIN ? 'Download MP3' : 'Download MP3 subscribe'}</span>}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4">
                <h3 className="text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] mb-4 px-4">Recent Generations</h3>
                <div className="space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
                  {history.map(item => (
                    <div key={item.id} className="glass p-6 rounded-[2rem] border-white/5 hover:bg-white/[0.05] transition-all group">
                      <p className="text-slate-300 text-sm line-clamp-2 font-medium mb-4">{item.text}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.voice} • {item.tone}</span>
                        {audioCache[item.id] && (
                          <button
                            onClick={() => decodeAudioData(audioCache[item.id], audioContextRef.current!, 24000, 1).then(playBuffer)}
                            className="text-[10px] text-indigo-400 font-black uppercase tracking-widest"
                          >
                            Replay
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center p-20 text-slate-700 text-[10px] font-black uppercase tracking-[0.4em]">No History</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : currentView === 'profile' ? (
          currentUser ? <UserProfile user={currentUser} onOpenPayment={() => setIsPaymentModalOpen(true)} /> : null
        ) : currentView === 'admin' ? (
          currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPERADMIN ? <AdminDashboard currentUser={currentUser} /> : <div className="text-center text-slate-500">Access Denied</div>
        ) : null}
      </main>

      {currentView === 'forgot-password' && (
        <ForgotPassword onBack={() => { setCurrentView('home'); setIsAuthModalOpen(true); }} />
      )}

      {currentView === 'reset-password' && resetToken && (
        <ResetPassword token={resetToken} onSuccess={() => { setCurrentView('home'); setIsAuthModalOpen(true); }} />
      )}


      <footer className="py-12 border-t border-white/5 bg-black/40 text-center">
        <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.5em]">Amharic Neural Core</p>
      </footer>
    </div>
  );
};

export default App;
