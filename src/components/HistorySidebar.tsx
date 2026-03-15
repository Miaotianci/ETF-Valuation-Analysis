import React from 'react';
import { X, Clock, ChevronRight } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (market: string, code: string) => void;
  currentCode?: string;
}

export default function HistorySidebar({ history, onSelect, onRemove, currentCode }: HistorySidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case '极度低估': return 'text-green-500';
      case '低估': return 'text-emerald-400';
      case '合理': return 'text-yellow-500';
      case '高估': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#161616]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">搜索历史</h3>
        </div>
        <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-bold">
          {history.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {history.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-gray-700" />
            </div>
            <p className="text-gray-500 text-xs">暂无查询记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {history.map((item) => (
              <div
                key={`${item.market}-${item.code}`}
                onClick={() => onSelect(item)}
                className={`p-4 hover:bg-white/5 cursor-pointer transition-all group relative ${
                  currentCode === item.code ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate max-w-[140px]">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {item.market} · {item.code}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.market, item.code);
                    }}
                    className="p-1 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  <div className="bg-white/5 rounded-xl p-2 border border-white/5 group-hover:border-indigo-500/20 transition-colors">
                    <div className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">PE</div>
                    <div className="text-xs font-mono text-gray-200">{item.pe?.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/5 group-hover:border-indigo-500/20 transition-colors">
                    <div className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">PB</div>
                    <div className="text-xs font-mono text-gray-200">{item.pb?.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/5 group-hover:border-indigo-500/20 transition-colors">
                    <div className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">股息</div>
                    <div className="text-xs font-mono text-emerald-400">{item.dividendYield?.toFixed(2) || '-'}%</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-700 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
