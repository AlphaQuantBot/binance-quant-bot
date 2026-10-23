import React from 'react';
import { Bell, X, Check, Trash2, Zap, ShieldAlert, Target, Sparkles, Radar } from 'lucide-react';
import { AppNotification } from '../types/crypto';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  language?: 'en' | 'tr';
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  language = 'en',
}) => {
  const isTr = language === 'tr';
  if (!isOpen) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'TRADE_BUY': return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'TRADE_SELL': return <Zap className="w-4 h-4 text-rose-400" />;
      case 'TAKE_PROFIT': return <Target className="w-4 h-4 text-emerald-400" />;
      case 'STOP_LOSS': return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'AI_SIGNAL': return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'GEM_RADAR': return <Radar className="w-4 h-4 text-amber-400" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#0b101d] border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100 font-sans text-sm">{isTr ? 'İşlem & Uyarı Bildirimleri' : 'Notifications & Alerts'}</span>
            <span className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
              {notifications.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={onMarkAllAsRead}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                  title={isTr ? 'Tümünü Okundu İşaretle' : 'Mark all as read'}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={onClearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                  title={isTr ? 'Tümünü Temizle' : 'Clear all'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-sans text-xs">
              {isTr ? 'Henüz yeni bir bildirim bulunmuyor.' : 'No recent notifications.'}
            </div>
          ) : (
            Array.from(new Map(notifications.map(n => [n.id, n])).values()).map((n, idx) => (
              <div
                key={`notif-${n.id}-${idx}`}
                className={`p-3 rounded-lg border transition-all text-xs ${
                  n.read 
                    ? 'bg-slate-900/40 border-slate-800/60 text-slate-400' 
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded bg-slate-800/80 shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-slate-200 font-sans truncate">{n.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(n.timestamp).toLocaleTimeString(isTr ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono">
          {isTr ? 'Gerçek Zamanlı WebSocket & SSE Bildirim Kanalı Aktif' : 'Real-Time WebSocket & Event Stream Active'}
        </div>
      </div>
    </div>
  );
};
