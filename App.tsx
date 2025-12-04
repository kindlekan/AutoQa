
import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Sparkles, Upload, Download, LayoutDashboard, FileText, Settings, Database, FileSpreadsheet, ArrowRight, PlayCircle, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { MOCK_TICKETS } from './constants';
import { Ticket, TicketCategory, TicketStatus, Sentiment } from './types';
import Dashboard from './components/Dashboard';
import AuditModal from './components/AuditModal';
import { generateExecutiveSummary } from './services/geminiService';

declare global {
  interface Window {
    XLSX: any;
  }
}

function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [summary, setSummary] = useState<string>("Initializing analysis...");
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Analyze tickets when we switch to dashboard view with data
  useEffect(() => {
    if (view === 'dashboard' && tickets.length > 0) {
      const fetchSummary = async () => {
        setLoadingSummary(true);
        // Analyze a subset for speed/token limits
        const result = await generateExecutiveSummary(tickets.slice(0, 15)); 
        setSummary(result);
        setLoadingSummary(false);
      };
      fetchSummary();
    }
  }, [view, tickets]);

  const mapToTicket = (raw: any, index: number): Ticket => {
    // 1. Identify Transcript/Body
    // Look for fields: Transcript, Body, Message, Description, Text
    const rawTranscript = raw.Transcript || raw.transcript || raw.Body || raw.body || raw.Message || raw.message || raw.Description || "No transcript available.";
    
    let transcript = [];
    try {
      if (typeof rawTranscript === 'string' && (rawTranscript.startsWith('[') || rawTranscript.startsWith('{'))) {
        transcript = JSON.parse(rawTranscript);
      } else if (Array.isArray(rawTranscript)) {
        transcript = rawTranscript;
      } else {
        transcript = [{ role: 'Customer', text: String(rawTranscript) }];
      }
    } catch (e) {
      transcript = [{ role: 'Customer', text: String(rawTranscript) }];
    }

    // 2. Identify Category/Department
    // Look for: Category, Department, Topic, Dept
    const rawCategory = raw.Category || raw.category || raw.Department || raw.department || raw.Topic || "Other";
    const mapCategory = (val: string): TicketCategory => {
      const v = String(val).toLowerCase();
      if (v.includes('bill')) return TicketCategory.BILLING;
      if (v.includes('tech')) return TicketCategory.TECHNICAL;
      if (v.includes('ship')) return TicketCategory.SHIPPING;
      if (v.includes('return')) return TicketCategory.RETURNS;
      return TicketCategory.OTHER;
    };
    const category = Object.values(TicketCategory).includes(rawCategory as any) ? rawCategory : mapCategory(rawCategory);

    // 3. Identify Status/Priority
    // Look for: Status, Priority, State, Stage
    const rawStatus = raw.Status || raw.status || raw.Priority || raw.priority || raw.State || "Pending";
    const mapStatus = (val: string): TicketStatus => {
      const v = String(val).toLowerCase();
      if (v.includes('resolv') || v.includes('clos') || v.includes('done') || v.includes('low')) return TicketStatus.RESOLVED;
      if (v.includes('escalat') || v.includes('urg') || v.includes('high') || v.includes('critic')) return TicketStatus.ESCALATED;
      return TicketStatus.PENDING;
    };
    const status = Object.values(TicketStatus).includes(rawStatus as any) ? rawStatus : mapStatus(rawStatus);

    // 4. Identify Sentiment (Optional, often not in raw data so we guess or default)
    const rawSentiment = raw.Sentiment || raw.sentiment || "Neutral";
    const mapSentiment = (val: string): Sentiment => {
      const v = String(val).toLowerCase();
      if (v.includes('pos')) return Sentiment.POSITIVE;
      if (v.includes('neg')) return Sentiment.NEGATIVE;
      return Sentiment.NEUTRAL;
    };
    const sentiment = Object.values(Sentiment).includes(rawSentiment as any) ? rawSentiment : mapSentiment(rawSentiment);

    // 5. ID and Customer
    const id = raw.TicketID || raw.id || raw.ID || raw['Ticket ID'] || `TICK-${1000 + index}`;
    const customerName = raw.Customer || raw.customer || raw.Name || raw.name || raw['Customer Name'] || "Unknown";

    return {
      id: String(id),
      customerName: String(customerName),
      category: category as TicketCategory,
      status: status as TicketStatus,
      sentiment: sentiment as Sentiment,
      transcript: transcript,
      timestamp: raw.Timestamp || raw.Date || new Date().toISOString(),
      originalData: raw // IMPORTANT: Store the raw object for dynamic table display
    };
  };

  const processData = (data: any[]) => {
    try {
      const processed = data.map((item, idx) => mapToTicket(item, idx));
      if (processed.length === 0) {
        alert("No valid records found.");
        return;
      }
      setTickets(processed);
      setView('dashboard');
    } catch (err) {
      console.error(err);
      alert("Error processing data format. Please check your file structure.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          processData(Array.isArray(json) ? json : []);
        } catch (err) {
          alert("Error parsing JSON file.");
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processData(results.data);
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          if (!window.XLSX) {
            alert("Excel parser not loaded. Please refresh or use CSV.");
            setIsProcessing(false);
            return;
          }
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = window.XLSX.utils.sheet_to_json(firstSheet);
          processData(json);
        } catch (err) {
          console.error(err);
          alert("Error parsing Excel file.");
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file format. Please use JSON, CSV, or XLSX.");
      setIsProcessing(false);
    }
  };

  const handleUrlImport = async () => {
    if (!urlInput) return;
    setIsProcessing(true);
    try {
      const response = await fetch(urlInput);
      const data = await response.json();
      if (Array.isArray(data)) {
        processData(data);
      } else {
        alert("API response is not an array of tickets.");
        setIsProcessing(false);
      }
    } catch (err) {
      alert("Failed to fetch data from URL. Ensure CORS is enabled or URL is correct.");
      setIsProcessing(false);
    }
  };

  const handleLoadDemo = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setTickets(MOCK_TICKETS);
      setView('dashboard');
      setIsProcessing(false);
    }, 800);
  };

  const handleExport = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(tickets.map(t => t.originalData), null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "autoqa_export.json";
    link.click();
  };

  const handleLogout = () => {
    setTickets([]);
    setView('landing');
    setSummary("Initializing analysis...");
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans relative overflow-hidden flex flex-col">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[100px]"></div>
        </div>

        <nav className="w-full px-6 py-6 flex justify-between items-center relative z-10">
           <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
                <Sparkles size={24} />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">
                AutoQA
              </span>
            </div>
            <div className="text-sm font-medium text-slate-500">
              Enterprise Grade Quality Assurance
            </div>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
              Subjective QA, <span className="text-indigo-600">Automated</span> by Gemini.
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Upload your customer support transcripts to instantly analyze sentiment, 
              audit agent performance, and generate executive summaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {/* Upload Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-50 p-8 flex flex-col items-center text-center transition-transform hover:scale-[1.02] duration-300 relative group overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
               <div className="mb-6 p-4 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-100 transition-colors">
                 <Upload size={32} />
               </div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Data</h3>
               <p className="text-sm text-slate-500 mb-6">Support for JSON, CSV, and XLSX files.</p>
               <label className={`w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}>
                 {isProcessing ? 'Processing...' : 'Select File'}
                 <input type="file" className="hidden" accept=".csv,.json,.xlsx,.xls" onChange={handleFileUpload} disabled={isProcessing} />
               </label>
            </div>

            {/* API Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-50 p-8 flex flex-col items-center text-center transition-transform hover:scale-[1.02] duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400"></div>
               <div className="mb-6 p-4 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-100 transition-colors">
                 <Database size={32} />
               </div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Connect API</h3>
               <p className="text-sm text-slate-500 mb-6">Fetch data directly from a JSON endpoint.</p>
               
               {showUrlInput ? (
                 <div className="w-full space-y-2">
                   <input 
                    type="url" 
                    placeholder="https://api.example.com/tickets"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                   />
                   <button 
                    onClick={handleUrlImport}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                   >
                     Fetch
                   </button>
                 </div>
               ) : (
                 <button 
                  onClick={() => setShowUrlInput(true)}
                  className="w-full py-3 px-4 bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 rounded-xl font-semibold transition-all"
                 >
                   Connect Source
                 </button>
               )}
            </div>

             {/* Demo Card */}
             <div className="bg-white rounded-2xl shadow-xl border border-indigo-50 p-8 flex flex-col items-center text-center transition-transform hover:scale-[1.02] duration-300 relative group overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
               <div className="mb-6 p-4 bg-teal-50 text-teal-600 rounded-full group-hover:bg-teal-100 transition-colors">
                 <PlayCircle size={32} />
               </div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Try Demo</h3>
               <p className="text-sm text-slate-500 mb-6">Explore with pre-loaded mock data.</p>
               <button 
                onClick={handleLoadDemo}
                className="w-full py-3 px-4 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
               >
                 Launch Demo <ArrowRight size={16} />
               </button>
            </div>
          </div>
          
          <div className="mt-12 flex items-center gap-6 text-sm text-slate-400">
             <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> Excel Supported</span>
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             <span className="flex items-center gap-1"><FileText size={14} /> CSV / JSON</span>
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             <span className="flex items-center gap-1"><LinkIcon size={14} /> REST API</span>
          </div>

          {!process.env.API_KEY && (
             <div className="mt-6 flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full text-xs font-medium border border-amber-100">
               <AlertCircle size={14} />
               Gemini API Key missing. AI features will be simulated.
             </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Sparkles size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                AutoQA
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>
              <button 
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 cursor-not-allowed opacity-50"
                title="Coming Soon"
              >
                <FileText size={16} />
                Reports
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                <Upload size={16} className="mr-2 text-slate-500" />
                Import
                <input type="file" className="hidden" accept=".csv,.json,.xlsx,.xls" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Download size={16} className="mr-2" />
                Export
              </button>
              <button 
                onClick={handleLogout}
                className="ml-2 text-xs text-slate-500 hover:text-rose-600 underline"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? (
          <Dashboard 
            tickets={tickets} 
            onAudit={setSelectedTicket}
            summary={summary}
            isGeneratingSummary={loadingSummary}
          />
        ) : (
          <div className="text-center py-20 text-slate-400">Settings Unavailable in Demo</div>
        )}
      </main>

      {/* Modals */}
      {selectedTicket && (
        <AuditModal 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}

      {/* Floating Status Indicator for API */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white border border-slate-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-xs font-medium text-slate-600">
          <div className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
          {process.env.API_KEY ? 'Gemini Connected' : 'Demo Mode (Mock AI)'}
        </div>
      </div>
    </div>
  );
}

export default App;
