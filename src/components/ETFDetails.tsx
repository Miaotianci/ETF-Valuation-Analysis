import React from 'react';
import { TrendingUp, TrendingDown, Info, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ETFData } from '../types';

interface ETFDetailsProps {
  data: ETFData;
  interval: string;
  onIntervalChange: (interval: string) => void;
}

const INTERVALS = [
  { id: '1d', label: '日线' },
  { id: '1wk', label: '周线' },
  { id: '1mo', label: '月线' }
];

export default function ETFDetails({ data, interval, onIntervalChange }: ETFDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case '极度低估': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case '低估': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case '合理': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case '高估': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const formatCurrency = (val: number | null, mkt: string) => {
    if (val == null) return '-';
    const prefix = mkt === 'US' ? '$' : mkt === 'HK' ? 'HK$' : '¥';
    return `${prefix}${val.toFixed(2)}`;
  };

  const formatXAxis = (val: string) => {
    if (!data.historicalData || data.historicalData.length < 2) return val;
    const firstDate = new Date(data.historicalData[0].date);
    const lastDate = new Date(data.historicalData[data.historicalData.length - 1].date);
    const diffDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 365) return val.substring(5);
    return val.substring(0, 4);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#1a1a1a] border border-gray-800 p-3 rounded-xl shadow-xl">
          <p className="text-gray-400 text-xs mb-2">{label}</p>
          <p className="text-indigo-400 text-sm font-bold">收盘: <span className="font-mono">{d.price.toFixed(2)}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
      {/* Main Score Card */}
      <div className="bg-[#111111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-3xl font-bold text-white tracking-tight">{data.name}</h2>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                {data.market} · {data.code}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`inline-flex items-center px-4 py-1.5 rounded-full border text-sm font-bold tracking-wide ${getStatusColor(data.status)}`}>
                {data.status}
              </div>
              {data.currentPrice && (
                <div className="flex items-center gap-1.5 text-gray-300 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="font-mono font-medium">{formatCurrency(data.currentPrice, data.market)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#1a1a1a] p-5 rounded-3xl border border-gray-800 w-full md:w-auto">
            <div className="text-center flex-1 md:flex-none md:w-20">
              <div className="text-3xl font-black text-white">{data.totalScore.toFixed(1)}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">综合得分</div>
            </div>
            <div className="w-px h-10 bg-gray-800"></div>
            <div className="text-center flex-1 md:flex-none md:w-16">
              <div className="text-xl font-bold text-gray-300">{data.valueScore.toFixed(1)}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">估值</div>
            </div>
            <div className="w-px h-10 bg-gray-800"></div>
            <div className="text-center flex-1 md:flex-none md:w-16">
              <div className="text-xl font-bold text-gray-300">{data.painScore.toFixed(1)}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">回撤</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* PE Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-5 group">
          <div className="flex justify-between items-start mb-4">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">市盈率 (PE)</div>
            <Info className="w-3.5 h-3.5 text-gray-600 group-hover:text-indigo-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{data.pe?.toFixed(2) || '-'}</div>
          <div className="w-full bg-gray-900 rounded-full h-1.5 mb-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${data.pePercentile || 0}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-gray-500 flex justify-between font-medium">
            <span>历史百分位</span>
            <span className="text-gray-300">{data.pePercentile?.toFixed(2) || '-'}%</span>
          </div>
        </div>

        {/* PB Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-5 group">
          <div className="flex justify-between items-start mb-4">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">市净率 (PB)</div>
            <Info className="w-3.5 h-3.5 text-gray-600 group-hover:text-indigo-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">{data.pb?.toFixed(2) || '-'}</div>
          <div className="w-full bg-gray-900 rounded-full h-1.5 mb-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${data.pbPercentile || 0}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-gray-500 flex justify-between font-medium">
            <span>历史百分位</span>
            <span className="text-gray-300">{data.pbPercentile?.toFixed(2) || '-'}%</span>
          </div>
        </div>

        {/* Drawdown Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">当前回撤</div>
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-400">
            -{((data.currentDrawdown || 0) * 100).toFixed(2)}%
          </div>
          <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
            相对近10年最高价的跌幅。跌幅越大，回撤得分越高。
          </p>
        </div>

        {/* Yield & ROE Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-400 font-medium">股息率</div>
              <span className="text-sm font-bold text-emerald-400">{data.dividendYield?.toFixed(2) || '-'}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-400 font-medium">ROE</div>
              <span className="text-sm font-bold text-white">{data.roe?.toFixed(2) || '-'}%</span>
            </div>
          </div>
          <p className="text-[9px] text-gray-600 mt-3 uppercase tracking-wider font-medium">
            辅助参考指标
          </p>
        </div>
      </div>

      {/* Historical Trend Chart */}
      {data.historicalData && data.historicalData.length > 0 && (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">历史走势</h3>
            </div>
            
            <div className="flex bg-[#1a1a1a] p-0.5 rounded-lg border border-gray-800">
              {INTERVALS.map(i => (
                <button
                  key={i.id}
                  onClick={() => onIntervalChange(i.id)}
                  className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all ${
                    interval === i.id 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.historicalData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#444" 
                  tick={{fill: '#666', fontSize: 10}} 
                  tickFormatter={formatXAxis}
                  minTickGap={30}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#444" 
                  tick={{fill: '#666', fontSize: 10}}
                  tickFormatter={(val) => `${val.toFixed(0)}`}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
