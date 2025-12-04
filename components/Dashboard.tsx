
import React, { useMemo } from 'react';
import { Ticket, TicketCategory, TicketStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Users, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';

interface DashboardProps {
  tickets: Ticket[];
  onAudit: (ticket: Ticket) => void;
  summary: string;
  isGeneratingSummary: boolean;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

const Dashboard: React.FC<DashboardProps> = ({ tickets, onAudit, summary, isGeneratingSummary }) => {
  
  // Calculate Stats
  const stats = useMemo(() => {
    const total = tickets.length;
    if (total === 0) return { resolution: 0, negative: 0, topCategory: 'N/A', qaScore: 0 };

    const resolved = tickets.filter(t => t.status === TicketStatus.RESOLVED).length;
    const negative = tickets.filter(t => t.sentiment === 'Negative').length;
    
    // Category counts
    const counts: Record<string, number> = {};
    tickets.forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
    const topCat = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Mock QA score calculation
    const baseScore = 80;
    const sentimentBonus = (tickets.filter(t => t.sentiment === 'Positive').length / total) * 10;
    const qaScore = Math.min(100, Math.round(baseScore + sentimentBonus));

    return {
      resolution: Math.round((resolved / total) * 100),
      negative: Math.round((negative / total) * 100),
      topCategory: topCat,
      qaScore
    };
  }, [tickets]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(TicketCategory).forEach(c => counts[c] = 0);
    tickets.forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  // Dynamic headers extraction
  const tableConfig = useMemo(() => {
    if (tickets.length === 0) return { headers: [], keys: [] };
    
    // Get all keys from the first item's originalData
    const allKeys = Object.keys(tickets[0].originalData);
    
    // We want to exclude very long text fields from the main table view to keep it clean, 
    // but the user said "show details", so let's try to show most things but truncate long ones.
    // We might want to skip strictly internal fields if we added any, but raw usually doesn't have them.
    const keys = allKeys.filter(k => k !== 'Transcript' && k !== 'transcript' && k !== 'Body' && k !== 'body');
    
    // If we filtered everything (e.g. only Transcript existed), fall back to all keys
    const finalKeys = keys.length > 0 ? keys : allKeys;
    
    return {
      headers: finalKeys,
      keys: finalKeys
    };
  }, [tickets]);

  return (
    <div className="space-y-6">
      
      {/* AI Insight Box */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <MessageSquare size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span className="bg-white/20 p-1 rounded-md"><Users size={16} /></span>
            Executive Summary
          </h2>
          {isGeneratingSummary ? (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
              <span className="text-sm font-medium">Gemini is analyzing {tickets.length} tickets...</span>
            </div>
          ) : (
            <p className="text-indigo-100 text-sm md:text-base leading-relaxed max-w-4xl">
              {summary}
            </p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Auto-QA Score" 
          value={`${stats.qaScore}/100`} 
          change="+2.4%" 
          trend="up"
          icon={<CheckCircle className="text-emerald-500" />}
        />
        <KPICard 
          title="Resolution Rate" 
          value={`${stats.resolution}%`} 
          change="-1.2%" 
          trend="down"
          icon={<Users className="text-blue-500" />}
        />
        <KPICard 
          title="Negative Sentiment" 
          value={`${stats.negative}%`} 
          change="-5%" 
          trend="up"
          inverseTrend
          icon={<AlertCircle className="text-rose-500" />}
        />
        <KPICard 
          title="Top Category" 
          value={stats.topCategory} 
          subtext="Most Frequent"
          icon={<MessageSquare className="text-purple-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-gray-700 font-bold mb-6">Ticket Volume by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent List - Dynamic Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-gray-700 font-bold">Ticket Data</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{tickets.length} total</span>
          </div>
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50">
                <tr>
                  {tableConfig.headers.map((header) => (
                    <th key={header} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket, idx) => (
                  <tr key={ticket.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                    {tableConfig.keys.map((key) => {
                       const val = ticket.originalData[key];
                       let displayVal = val;
                       if (typeof val === 'object') displayVal = JSON.stringify(val);
                       if (String(displayVal).length > 40) displayVal = String(displayVal).substring(0, 40) + '...';
                       
                       return (
                         <td key={key} className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                           {displayVal || '-'}
                         </td>
                       );
                    })}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onAudit(ticket)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, change, trend, icon, subtext, inverseTrend }: any) => {
  const isPositive = trend === 'up';
  const isGood = inverseTrend ? !isPositive : isPositive;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
        {change && (
          <div className={`flex items-center mt-2 text-xs font-medium ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {change} <span className="text-gray-400 ml-1 font-normal">vs last week</span>
          </div>
        )}
        {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
      </div>
      <div className="p-3 bg-gray-50 rounded-lg">
        {React.cloneElement(icon, { size: 20 })}
      </div>
    </div>
  );
};

export default Dashboard;
