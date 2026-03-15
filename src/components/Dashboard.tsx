import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { ETFData, HistoryItem } from '../types';
import ETFDetails from './ETFDetails';
import HistorySidebar from './HistorySidebar';

const MARKETS = [
  { id: 'A', label: 'A股' },
  { id: 'HK', label: '港股' },
  { id: 'US', label: '美股' }
];

export default function Dashboard() {
  const [etfCode, setEtfCode] = useState('');
  const [market, setMarket] = useState('A');
  const [interval, setInterval] = useState('1mo');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentData, setCurrentData] = useState<ETFData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedHistory = localStorage.getItem('etfHistoryV3');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('etfHistoryV3', JSON.stringify(newHistory));
  };

  const handleSearch = async (searchCode: string, searchMarket: string, searchInterval: string = interval) => {
    if (!searchCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/etf/${searchMarket}/${searchCode}?interval=${searchInterval}`);
      const data: ETFData = res.data;
      setCurrentData(data);
      
      const newEntry: HistoryItem = { 
        market: searchMarket, 
        code: searchCode, 
        name: data.name,
        pe: data.pe,
        pb: data.pb,
        dividendYield: data.dividendYield,
        status: data.status,
        timestamp: Date.now()
      };
      
      const filtered = history.filter(h => !(h.market === searchMarket && h.code === searchCode));
      saveHistory([newEntry, ...filtered].slice(0, 20)); // Keep last 20
    } catch (err: any) {
      setError(err.response?.data?.error || '获取数据失败，请检查代码是否正确');
    } finally {
      setLoading(false);
    }
  };

  const removeHistory = (mkt: string, code: string) => {
    saveHistory(history.filter(h => !(h.market === mkt && h.code === code)));
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setMarket(item.market);
    setEtfCode(item.code);
    handleSearch(item.code, item.market);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header & Search */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-1">ETF 估值分析</h1>
              <p className="text-gray-500 text-sm">多市场覆盖，深度价值挖掘</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex bg-[#111111] p-1 rounded-2xl border border-gray-800 shrink-0">
                {MARKETS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMarket(m.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      market === m.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 sm:w-64 flex items-center">
                <Search className="absolute left-4 text-gray-600 w-4 h-4" />
                <input
                  type="text"
                  value={etfCode}
                  onChange={(e) => setEtfCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(etfCode, market)}
                  placeholder="输入代码..."
                  className="w-full bg-[#111111] border border-gray-800 rounded-2xl py-3 pl-10 pr-20 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
                <button
                  onClick={() => handleSearch(etfCode, market)}
                  disabled={loading || !etfCode}
                  className="absolute right-1.5 bg-white text-black hover:bg-gray-200 px-4 py-1.5 rounded-xl text-xs font-black transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '分析'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* Left Panel: Details */}
          <div className="lg:col-span-6">
            {currentData ? (
              <ETFDetails 
                data={currentData} 
                interval={interval} 
                onIntervalChange={(i) => {
                  setInterval(i);
                  handleSearch(currentData.code, currentData.market, i);
                }} 
              />
            ) : (
              <div className="h-[600px] bg-[#111111] border border-gray-800 rounded-3xl flex flex-col items-center justify-center text-center p-12 border-dashed">
                <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-indigo-500/40" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">开始您的 ETF 分析</h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  在上方输入 ETF 代码并选择对应市场，我们将为您提供深度的估值数据与历史回撤分析。
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: History Sidebar */}
          <div className="lg:col-span-4 h-[calc(100vh-250px)] lg:sticky lg:top-8">
            <HistorySidebar 
              history={history} 
              onSelect={handleHistorySelect} 
              onRemove={removeHistory}
              currentCode={currentData?.code}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
