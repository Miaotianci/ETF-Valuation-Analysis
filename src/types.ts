export interface HistoricalData {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ma200?: number | null;
  rsi?: number | null;
}

export interface ETFData {
  code: string;
  market: string;
  name: string;
  pe: number | null;
  pePercentile: number | null;
  pb: number | null;
  pbPercentile: number | null;
  dividendYield: number | null;
  roe: number | null;
  currentDrawdown: number | null;
  currentPrice: number | null;
  historicalData: HistoricalData[];
  valueScore: number;
  painScore: number;
  totalScore: number;
  status: string;
}

export interface HistoryItem {
  market: string;
  code: string;
  name: string;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  status: string;
  timestamp: number;
}
