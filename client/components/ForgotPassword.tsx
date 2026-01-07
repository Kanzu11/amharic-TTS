import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ForgotPasswordProps {
    onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/auth/forgotpassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setStep('otp');
                toast.success("Reset code sent to your email");
            } else {
                toast.error(data.message || "Failed to send email");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/auth/resetpassword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, password: newPassword })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Password reset successfully! Please login.");
                onBack();
            } else {
                toast.error(data.message || "Failed to reset password");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass w-full max-w-md p-8 rounded-[2rem] border-white/10 relative">
                <button onClick={onBack} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>

                <h2 className="text-2xl font-black text-white mb-2">Recover Password</h2>

                {step === 'email' ? (
                    <>
                        <p className="text-slate-400 text-sm mb-8">Enter your email to receive a recovery code</p>
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? 'Sending...' : 'Send Recovery Code'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <p className="text-slate-400 text-sm mb-8">Enter the code sent to {email}</p>
                        <form onSubmit={handleReset} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Verification Code</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-center font-mono tracking-widest text-xl outline-none focus:border-indigo-500 transition-all"
                                    placeholder="000000"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-indigo-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-indigo-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? 'Resetting...' : 'Set New Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
