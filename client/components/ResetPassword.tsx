import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface ResetPasswordProps {
    token: string;
    onSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/api/auth/resetpassword/${token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Password reset successfully");
                onSuccess();
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
            <div className="glass w-full max-w-md p-8 rounded-[2rem] border-white/10">
                <h2 className="text-2xl font-black text-white mb-2">Reset Password</h2>
                <p className="text-slate-400 text-sm mb-8">Enter your new password below</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">New Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
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
            </div>
        </div>
    );
};

export default ResetPassword;
