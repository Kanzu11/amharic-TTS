import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { toast } from 'react-hot-toast';

interface AdminDashboardProps {
  currentUser: User;
}

interface PaymentRequest {
  _id: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  proofImage: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user: { email: string; name?: string };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'payments' | 'users'>('payments');
  const [loading, setLoading] = useState(false);

  // Super Admin: Create Admin Logic
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/pending?page=${page}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      }
    } catch (error) {
      console.error('Failed to fetch payments', error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users`, { // Wait, I didn't create a GET /users route! I only created role update/delete. 
        // I need to create GET /users route first? Or is it already there?
        // Checking previous file context of authRoutes.js... it was NOT showing GET /users.
        // I should assume I need to ADD GET /users to backend too.
        // For now, let's implement the Frontend assuming the route exists, and I will add the route immediately after.
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Map _id to id if necessary
        const mappedUsers = data.map((u: any) => ({ ...u, id: u._id || u.id }));
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
      // toast.error("Failed to fetch users"); 
    } finally {
      setLoading(false);
    }
  };

  const [historyPayments, setHistoryPayments] = useState<PaymentRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const fetchHistory = async (page = 1) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/history?page=${page}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryPayments(data.payments);
        setHistoryTotalPages(data.totalPages);
        setHistoryPage(data.currentPage);
      }
    } catch (error) {
      console.error("Failed to fetch history");
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = `/api/auth/users/${userId}/role`;
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error("Failed to update role");

      const data = await res.json();
      toast.success(`User role updated to ${newRole}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: data.role } : u));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete user");

      toast.success("User deleted successfully");
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm(`Are you sure you want to REJECT this payment?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/${id}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setPayments(prev => prev.filter(p => p._id !== id));
        toast.success('Payment Rejected');
      } else {
        toast.error('Rejection failed');
      }
    } catch (error) {
      toast.error('Error rejecting payment');
    }
  };

  const handleApprove = async (id: string, transactionId: string) => {
    if (!window.confirm(`Approve payment ${transactionId || '(No ID)'}?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/${id}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setPayments(prev => prev.filter(p => p._id !== id));
        toast.success('Payment Approved!');
      } else {
        toast.error('Approval failed');
      }
    } catch (error) {
      toast.error('Error approving payment');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword })
      });

      if (response.ok) {
        toast.success('Admin Created Successfully!');
        setNewAdminEmail('');
        setNewAdminPassword('');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to create admin');
      }
    } catch (error) {
      toast.error('Error creating admin');
    }
  };

  const handleRevokeSubscription = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this user's subscription?")) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/users/${userId}/revoke-subscription`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to revoke subscription");

      const data = await res.json();
      toast.success("Subscription revoked");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription: data.subscription, isSubscribed: false } : u));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-black text-white tracking-tighter">Admin Dashboard</h2>
            {currentUser.role === UserRole.SUPERADMIN && <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-purple-500/30">Super Admin</span>}
          </div>
          <p className="text-slate-500 text-sm mt-1">Manage payments and system access</p>
          <div className="mt-4 flex gap-4">
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Users</span>
              <span className="text-2xl font-black text-white">{users.length}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('payments')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>Payments</button>
          <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>Users</button>
        </div>
      </header>

      {/* Super Admin Section */}
      {currentUser.role === UserRole.SUPERADMIN && (
        <div className="glass rounded-[3rem] border-white/5 overflow-hidden shadow-xl p-8 bg-purple-900/10">
          <h3 className="text-sm font-black uppercase tracking-widest text-purple-300 mb-6">Create New Administrator</h3>
          <form onSubmit={handleCreateAdmin} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Admin Email</label>
              <input type="email" required value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all" placeholder="admin@example.com" />
            </div>
            <div className="flex-1 w-full relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Password</label>
              <input type="password" required value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all" placeholder="Secret password" />
            </div>
            <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-900/40">Create Admin</button>
          </form>
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'payments' ? (
        <>
          <div className="glass rounded-[3rem] border-white/5 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Pending Payments ({payments.length})</h3>
              <button onClick={() => fetchPayments()} className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Loading requests...</div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-bold">No pending payments</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black/40 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="p-6">User / Date</th>
                      <th className="p-6">Transaction ID</th>
                      <th className="p-6">Details</th>
                      <th className="p-6">Proof</th>
                      <th className="p-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payments.map(payment => (
                      <tr key={payment._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-6">
                          <div className="text-white text-sm font-bold">{payment.user?.email || 'Unknown User'}</div>
                          <div className="text-slate-500 text-xs font-mono">{new Date(payment.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="p-6">
                          {payment.status === 'pending' ? (
                            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Under Review</span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{payment.status}</span>
                          )}
                          <div className="mt-1">
                            <code className="bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono text-[10px]">{payment.transactionId || 'No ID'}</code>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-white text-sm font-bold">{payment.amount} ETB</div>
                          <div className="text-slate-500 text-xs uppercase">{payment.paymentMethod}</div>
                        </td>
                        <td className="p-6">
                          <a href={payment.proofImage} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-white/20 hover:scale-110 transition-transform relative group">
                            <img src={payment.proofImage} alt="Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[8px] text-white font-bold uppercase">View</span>
                            </div>
                          </a>
                        </td>
                        <td className="p-6 text-right flex gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(payment._id, payment.transactionId)}
                            className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(payment._id)}
                            className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Payment History Section */}
          <div className="glass rounded-[3rem] border-white/5 overflow-hidden shadow-2xl mt-8">
            <div
              className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01] cursor-pointer hover:bg-white/[0.03] transition-colors"
              onClick={() => setShowHistory(!showHistory)}
            >
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Payment History</h3>
                <div className={`text-slate-500 transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {showHistory && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="overflow-x-auto">
                  {historyPayments.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-bold">No processed payments found</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-black/40 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                          <th className="p-6">User / Date</th>
                          <th className="p-6">Transaction ID</th>
                          <th className="p-6">Details</th>
                          <th className="p-6">Status</th>
                          <th className="p-6 text-right">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {historyPayments.map(payment => (
                          <tr key={payment._id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-6">
                              <div className="text-white text-sm font-bold">{payment.user?.email || 'Unknown User'}</div>
                              <div className="text-slate-500 text-xs font-mono">{new Date(payment.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="p-6">
                              <code className="bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono text-[10px]">{payment.transactionId || 'No ID'}</code>
                            </td>
                            <td className="p-6">
                              <div className="text-white text-sm font-bold">{payment.amount} ETB</div>
                              <div className="text-slate-500 text-xs uppercase">{payment.paymentMethod}</div>
                            </td>
                            <td className="p-6">
                              {payment.status === 'approved' ? (
                                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Approved</span>
                              ) : (
                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Rejected</span>
                              )}
                            </td>
                            <td className="p-6 text-right">
                              <a href={payment.proofImage} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg hover:bg-indigo-500/10 transition-all">
                                View Proof
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination for History */}
                {historyTotalPages > 1 && (
                  <div className="p-6 border-t border-white/5 flex justify-center gap-2">
                    <button
                      onClick={() => fetchHistory(historyPage - 1)}
                      disabled={historyPage === 1}
                      className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-slate-500 text-xs font-bold flex items-center">
                      Page {historyPage} of {historyTotalPages}
                    </span>
                    <button
                      onClick={() => fetchHistory(historyPage + 1)}
                      disabled={historyPage === historyTotalPages}
                      className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="glass rounded-[3rem] border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">All Users ({users.length})</h3>
            <button onClick={fetchUsers} className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-bold">No users found</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/40 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="p-6">User</th>
                    <th className="p-6">Role</th>
                    <th className="p-6">Status</th>
                    <th className="p-6">Joined</th>
                    {currentUser.role === UserRole.SUPERADMIN && <th className="p-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6">
                        <div className="text-white text-sm font-bold">{user.email}</div>
                        <div className="text-slate-500 text-xs">{user.name || 'No Name'}</div>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === UserRole.SUPERADMIN ? 'bg-purple-900/50 text-purple-400 border border-purple-500/30' :
                          user.role === UserRole.ADMIN ? 'bg-blue-900/50 text-blue-400 border border-blue-500/30' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-6">
                        {user.subscription?.status === 'active' ? (
                          <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Inactive</span>
                        )}
                      </td>
                      <td className="p-6 text-slate-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      {currentUser.role === UserRole.SUPERADMIN && (
                        <td className="p-6 text-right space-x-2 flex justify-end">
                          {user.role !== UserRole.SUPERADMIN && (
                            <>
                              {user.role === UserRole.USER ? (
                                <button onClick={() => handleRoleUpdate(user.id, UserRole.ADMIN)} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-all">Promote</button>
                              ) : (
                                <button onClick={() => handleRoleUpdate(user.id, UserRole.USER)} className="text-[10px] font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300 border border-orange-500/30 px-3 py-1.5 rounded-lg hover:bg-orange-500/10 transition-all">Demote</button>
                              )}

                              {user.subscription?.status === 'active' && (
                                <button onClick={() => handleRevokeSubscription(user.id)} className="text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all">Revoke</button>
                              )}

                              <button onClick={() => handleDeleteUser(user.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">Delete</button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;