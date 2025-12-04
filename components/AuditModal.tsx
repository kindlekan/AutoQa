import React, { useEffect, useState } from 'react';
import { Ticket, AuditResult } from '../types';
import { auditTicket } from '../services/geminiService';
import { X, Bot, User, ShieldCheck, Zap, Heart, BookOpen } from 'lucide-react';

interface AuditModalProps {
  ticket: Ticket;
  onClose: () => void;
}

const AuditModal: React.FC<AuditModalProps> = ({ ticket, onClose }) => {
  const [auditData, setAuditData] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAudit = async () => {
      setLoading(true);
      const result = await auditTicket(ticket);
      if (mounted) {
        setAuditData(result);
        setLoading(false);
      }
    };
    fetchAudit();
    return () => { mounted = false; };
  }, [ticket]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Ticket Audit: {ticket.id}
            </h2>
            <p className="text-sm text-gray-500">{ticket.customerName} • {ticket.category}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Transcript */}
          <div className="w-1/2 p-6 overflow-y-auto bg-gray-50/30 border-r border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Transcript History</h3>
            <div className="space-y-4">
              {ticket.transcript.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'Agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'Agent' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 opacity-80 text-xs">
                      {msg.role === 'Agent' ? <Bot size={12} /> : <User size={12} />}
                      <span className="font-medium">{msg.role}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI Analysis */}
          <div className="w-1/2 p-6 overflow-y-auto bg-white relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-indigo-600 font-medium animate-pulse">Gemini is auditing this conversation...</p>
              </div>
            ) : auditData ? (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                {/* Score Header */}
                <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                  <div className="relative flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-sm border-4 border-indigo-100">
                    <span className="text-2xl font-bold text-indigo-700">{auditData.score}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Quality Score</h3>
                    <p className="text-sm text-gray-600">{auditData.summary}</p>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard 
                    label="Empathy" 
                    score={auditData.empathyScore} 
                    icon={<Heart className="w-4 h-4 text-rose-500" />} 
                    color="bg-rose-50 text-rose-700 border-rose-100"
                  />
                  <MetricCard 
                    label="Solution" 
                    score={auditData.solutionScore} 
                    icon={<Zap className="w-4 h-4 text-amber-500" />} 
                    color="bg-amber-50 text-amber-700 border-amber-100"
                  />
                  <MetricCard 
                    label="Grammar" 
                    score={auditData.grammarScore} 
                    icon={<BookOpen className="w-4 h-4 text-emerald-500" />} 
                    color="bg-emerald-50 text-emerald-700 border-emerald-100"
                  />
                </div>

                {/* Coaching Tip */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    AI Coaching Tip
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed italic">
                    "{auditData.coachingTip}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-20">Unable to load audit data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, score, icon, color }: { label: string, score: number, icon: React.ReactNode, color: string }) => (
  <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${color}`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="font-semibold text-sm opacity-90">{label}</span>
    </div>
    <div className="text-2xl font-bold">{score}<span className="text-base font-normal opacity-60">/10</span></div>
  </div>
);

export default AuditModal;