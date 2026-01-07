
import React from 'react';
import { User, UserRole } from '../types';

interface UserProfileProps {
  user: User;
  onOpenPayment: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onOpenPayment }) => {
  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-purple-900/30">
            {(user.name || user.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">{user.name || 'User'}</h2>
            <p className="text-slate-400">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest">
              {user.role} Account
            </span>
          </div>
        </div>

        <div className="h-px bg-slate-700"></div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Subscription Status / የደንበኝነት ሁኔታ</h3>

          {/* Pending Payment View */}
          {!user.subscription?.expiresAt && user.hasPendingPayment && (
            <div className="p-6 rounded-2xl border border-yellow-500/30 bg-yellow-900/20 animate-pulse">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-bold uppercase tracking-widest text-yellow-500">Verification Pending</p>
                <div className="bg-yellow-500/20 p-2 rounded-full text-yellow-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-yellow-200/80 text-sm">Reviewing your payment... We will activate your account shortly.</p>
              <p className="text-yellow-200/60 text-xs mt-2">ብሩን ገምግመን እስክንጨርስ እባክዎ ይጠብቁ።</p>
            </div>
          )}

          <div className={`p-6 rounded-2xl border ${user.subscription?.status === 'active' || user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN ? 'bg-green-900/20 border-green-500/30' : 'bg-slate-900/50 border-slate-700'}`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className={`text-sm font-bold uppercase tracking-widest ${user.subscription?.status === 'active' || user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN ? 'text-green-400' : 'text-slate-500'}`}>
                  {user.subscription?.status === 'active' || user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN ? 'Active Subscription' : 'Free Plan'}
                </p>
                <p className="text-slate-400 text-xs mt-1">Monthly Premium Amharic TTS</p>
              </div>
              {(user.subscription?.status === 'active' || user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && (
                <div className="bg-green-500 p-2 rounded-full text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {(user.subscription?.status === 'active' || user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) ? (
              <div className="space-y-2">
                <p className="text-white text-sm">You have full access to high-fidelity audio downloads and all neural voice personalities.</p>
                {user.subscription?.expiresAt && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Time Remaining</span>
                      <span>
                        {Math.ceil((new Date(user.subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, (Math.ceil((new Date(user.subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) / 30) * 100))}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 text-right">Expires: {new Date(user.subscription.expiresAt).toLocaleDateString()}</p>
                  </div>
                )}
                {!user.subscription?.expiresAt && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN && <p className="text-slate-500 text-xs italic">No active plan</p>}
                {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mt-2">Admin Override Active</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-300 text-sm">Upgrade now to unlock high-quality audio downloads and all emotional voice personalities.</p>
                {!user.hasPendingPayment && (
                  <button
                    onClick={onOpenPayment}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/40"
                  >
                    Unlock Premium Access (200 ETB / Month)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/30 p-4 rounded-xl text-slate-500 text-xs">
          <p>Account Created: {new Date(user.createdAt).toLocaleDateString()}</p>
          <p>User ID: {user.id}</p>
        </div>

        {/* Payment History Section */}
        <PaymentHistorySection />
      </div>
      <div className="mt-8 text-center border-t border-slate-700/50 pt-8">
        <div className="bg-slate-900/40 border border-slate-700/50 p-6 rounded-2xl w-full">
          <p className="text-slate-400 text-sm mb-4">Need help? / እርዳታ ይፈልጋሉ?</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <a href="https://t.me/kanzedin" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-indigo-400 transition-colors group">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.55-1.07-.7-.37-1.09.23-1.7l3.75-3.55c.18-.16.35-.39-.04-.5-.39-.11-2.43 1.34-2.65 1.48-2.6 1.63-3.08 1.55-4.41 1.15-1.11-.34-2.27-.64-2.27-.64.83-2.3 8.53-5.26 12.06-5.26.83 0 1.94.39 2.05.51.13.13.06.34.02.44z" /></svg>
              </div>
              <span className="font-medium">@kanzedin</span>
            </a>
            {/* Contact info removed as requested */}
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentHistorySection = () => {
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/my-history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (e) {
        console.error("Failed to fetch history", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="text-slate-500 text-xs text-center animate-pulse">Loading history...</div>;
  if (history.length === 0) return null;

  return (
    <div className="pt-8 border-t border-slate-700">
      <h3 className="text-lg font-bold text-white mb-4">Payment History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-700">
              <th className="pb-3 text-[10px] font-black">Date</th>
              <th className="pb-3 text-[10px] font-black">Amount</th>
              <th className="pb-3 text-[10px] font-black">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {history.map((item: any) => (
              <tr key={item._id} className="text-slate-300">
                <td className="py-3 pr-4">{new Date(item.createdAt).toLocaleDateString()}</td>
                <td className="py-3 pr-4 font-bold">{item.amount} ETB</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${item.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    item.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserProfile;
