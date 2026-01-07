import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";
// import { createOrder } from '../utils/telebirr'; // Removed

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  message?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, message }) => {
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'auto' | 'manual'>('auto');
  const [manualType, setManualType] = useState<'telebirr' | 'cbe'>('telebirr');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [verifyStep, setVerifyStep] = useState<'input' | 'processing' | 'done'>('input');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto payment (Telebirr H5) logic remains for 'auto', or can be deprecated if user wants ONLY manual. 
  // User said "forget all the telebirr integration i want you to add the payment to be like pay 200 birr..."
  // Assuming 'auto' might still be desired as an option or replaced entirely? 
  // The request says "forget all the telebirr integration... add the payment to be like pay 200 birr... if using telebirr ... with copy account numbers".
  // This implies the MAIN flow should be this manual transfer. 
  // I will make 'manual' the default or only way for now as requested "forget all...". 
  // But to be safe I'll keep the structure but default to manual or show choices.

  // Actually, "if using telebirr ... with copy account numbers" implies manual transfer for telebirr too.
  // So likely no H5 integration is needed for this request, just manual for both.

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = async () => {
    setError('');



    if (!proofFile) {
      setError('Please upload a screenshot of the payment');
      return;
    }

    setVerifyStep('processing');

    try {
      const formData = new FormData();
      formData.append('amount', '200');
      formData.append('transactionId', transactionId);
      formData.append('paymentMethod', manualType);
      formData.append('proofImage', proofFile);

      // Helper to wait for backend or use fetch
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData, // fetch automatically sets Content-Type to multipart/form-data
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit payment proof');
      }

      setVerifyStep('done');
      setVerifyStep('done');
      onSuccess('PENDING');

    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Submission failed. Please try again.';
      setError(msg);
      toast.error(msg);
      setVerifyStep('input');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-[#005cb9] p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <h2 className="text-3xl font-black tracking-tighter relative z-10">Premium Activation</h2>
          <p className="text-blue-100 text-sm mt-2 opacity-80 relative z-10">{message || "Unlock full access"}</p>
        </div>

        <div className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {verifyStep === 'input' ? (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-[2rem] text-center">
                  <p className="text-[#005cb9] font-black text-4xl mb-2">200.00 <span className="text-lg">ETB</span></p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Monthly Access</p>
                </div>

                {/* Tabs for Payment Method */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setManualType('telebirr')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${manualType === 'telebirr' ? 'bg-white shadow-sm text-[#005cb9]' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Telebirr
                  </button>
                  <button
                    onClick={() => setManualType('cbe')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${manualType === 'cbe' ? 'bg-white shadow-sm text-[#6f2c91]' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    CBE Bank
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 relative overflow-hidden">
                  <p className="text-xs text-slate-500 font-black uppercase">Send Payment To:</p>

                  {manualType === 'telebirr' ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                        <img src="/telebirr_logo.png" className="w-full h-full object-contain" alt="Telebirr" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">0994152120</p>
                        <p className="text-[10px] text-slate-500">Telebirr Account</p>
                      </div>
                      <button className="ml-auto text-xs text-blue-500 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors" onClick={() => handleCopy('0994152120')}>
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                        <img src="/cbe_logo.png" className="w-full h-full object-contain" alt="CBE" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">1000358783407</p>
                        <p className="text-[10px] text-slate-500">Commercial Bank of Ethiopia</p>
                      </div>
                      <button className="ml-auto text-xs text-blue-500 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors" onClick={() => handleCopy('1000358783407')}>
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {/* Copied Toast Overlay */}
                  <AnimatePresence>
                    {copied && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-green-500/90 flex items-center justify-center backdrop-blur-sm z-10 rounded-2xl">
                        <p className="text-white font-bold text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          Copied Successfully
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Form Inputs */}
                <div className="space-y-4">
                  {/* Transaction ID Removed */}

                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-2">Payment Screenshot</label>
                    <div className="mt-1 relative">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="proof-upload" />
                      <label htmlFor="proof-upload" className="block w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer text-center transition-colors">
                        {proofFile ? (
                          <span className="text-[#005cb9] font-bold text-sm flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {proofFile.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm font-semibold">Click to upload image</span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{error}</p>}

                <button onClick={handleManualSubmit} className="w-full py-4 bg-[#005cb9] hover:bg-[#004a96] text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98]">
                  Submit for Approval
                </button>

              </motion.div>
            ) : verifyStep === 'processing' ? (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-[#005cb9] rounded-full animate-spin"></div>
                <p className="text-slate-600 font-bold">Uploading proof...</p>
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-800">Submitted!</h3>
                <p className="text-slate-500 text-sm max-w-[200px]">Your payment is being reviewed by our team. Check back shortly.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {verifyStep === 'input' && (
            <button onClick={onClose} className="w-full py-2 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Cancel</button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentModal;
