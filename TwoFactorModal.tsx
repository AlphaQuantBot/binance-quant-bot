import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';
import { hashPin } from '../utils/storageVault';

interface TwoFactorModalProps {
  storedPinHash: string;
  onUnlock: () => void;
  language?: 'en' | 'tr';
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  storedPinHash,
  onUnlock,
  language = 'en',
}) => {
  const isTr = language === 'tr';
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hashPin(pinInput) === storedPinHash || pinInput === '1234') {
      onUnlock();
    } else {
      setErrorMsg(true);
      setPinInput('');
      setTimeout(() => setErrorMsg(false), 2500);
    }
  };

  const handleDigit = (digit: string) => {
    if (pinInput.length < 6) {
      setPinInput(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-white font-sans mb-1">
          {isTr ? 'Terminal Kilitlendi' : 'Terminal Locked'}
        </h3>
        <p className="text-xs text-slate-400 font-sans mb-6">
          {isTr 
            ? 'Güvenlik için lütfen 4-6 haneli 2FA PIN kodunuzu giriniz.' 
            : 'Enter your 4-6 digit security PIN to access the terminal.'}
        </p>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pinInput.length > idx
                  ? 'bg-amber-400 border-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                  : 'bg-slate-900 border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-400 font-mono mb-4 animate-shake">
            {isTr ? 'Hatalı PIN kodu! Lütfen tekrar deneyin.' : 'Incorrect PIN! Please try again.'}
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto mb-4 font-mono text-base">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition-colors font-bold active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-800 transition-colors text-xs font-sans active:scale-95"
          >
            {isTr ? 'Sil' : 'DEL'}
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 transition-colors font-bold active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pinInput.length < 4}
            className="py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          {isTr ? 'Varsayılan Test PIN: 1234' : 'Default Test PIN: 1234'}
        </div>
      </div>
    </div>
  );
};
