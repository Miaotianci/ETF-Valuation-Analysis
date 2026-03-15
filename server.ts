import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import NodeCache from "node-cache";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const app = express();
const PORT = 3000;
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Danqu Index List Cache
let danquIndexList: any[] = [];
async function fetchDanquIndices() {
  try {
    const res = await axios.get('https://danjuanfunds.com/djapi/index_eva/dj?type=all', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.data && res.data.data && res.data.data.items) {
      danquIndexList = res.data.data.items;
      console.log(`Loaded ${danquIndexList.length} indices from Danqu.`);
    }
  } catch (e: any) {
    console.error('Failed to fetch Danqu indices:', e.message);
  }
}

// EastMoney Index Valuation Cache
let emIndexList: any[] = [];
async function fetchEmIndices() {
  try {
    const res = await axios.get('https://fundmobapi.eastmoney.com/FundMNewApi/FundMNIndexValuationList?pageIndex=1&pageSize=1000&deviceid=123456&plat=Android&product=EFund&version=6.2.8');
    if (res.data && res.data.Datas) {
      emIndexList = res.data.Datas;
      console.log(`Loaded ${emIndexList.length} indices from EastMoney.`);
    }
  } catch (e: any) {
    console.error('Failed to fetch EastMoney indices:', e.message);
  }
}

fetchDanquIndices();
fetchEmIndices();
setInterval(() => {
  fetchDanquIndices();
  fetchEmIndices();
}, 3600000);

function extractIndexName(etfName: string) {
  return etfName
    .replace(/ETF.*/i, '')
    .replace(/LOF.*/i, '')
    .replace(/联接.*/i, '')
    .replace(/指数.*/i, '')
    .replace(/主题.*/i, '')
    .replace(/华泰柏瑞|华夏|易方达|嘉实|南方|广发|博时|富国|天弘|汇添富|鹏华|银华|招商|工银|建信|交银|国泰|中银|大成|华安|景顺|长城|中欧|诺安|兴全|国投|万家|光大|长信|信诚|泰达|海富通|国联安|华宝|华商|申万|农银|中海|信达|东方|长盛|融通|新华|天治|益民|金鹰|宝盈|诺德|东吴|中邮|国海|SPDR|Invesco|iShares|Vanguard/gi, '')
    .replace(/-/g, '')
    .trim();
}

async function findValuation(code: string, etfName: string, indexCode?: string, indexName?: string, mktNum?: string) {
  const hardcoded: Record<string, string> = {
    '02800': '恒生指数',
    'SPY': '标普500',
    'QQQ': '纳斯达克100',
    'DIA': '道琼斯',
    '513100': '纳斯达克100',
    '513500': '标普500',
    '510300': '沪深300',
    '510050': '上证50',
    '159915': '创业板指',
    '512100': '中证1000',
    '588000': '科创50',
    '512480': '半导体',
    '512760': '芯片产业',
    '159995': '芯片产业',
    '588170': '芯片产业',
  };
  
  let searchName = hardcoded[code] || indexName || extractIndexName(etfName);
  let searchCode = indexCode || code;

  // 1. Try exact code match in EM
  let emMatch = emIndexList.find(i => i.INDEXCODE === searchCode || i.INDEXCODE === code);
  if (emMatch) return {
    pe: parseFloat(emMatch.PETTM) || null,
    pb: parseFloat(emMatch.PB) || null,
    pePercentile: parseFloat(emMatch.PEP) * 100 || null,
    pbPercentile: 50,
    roe: null,
    dividendYield: parseFloat(emMatch.GXL) || null
  };

  // 2. Try exact code match in Danqu
  let danquMatch = danquIndexList.find(i => i.index_code.includes(searchCode) || i.index_code.includes(code));
  if (danquMatch) return {
    pe: danquMatch.pe,
    pb: danquMatch.pb,
    pePercentile: danquMatch.pe_percentile * 100,
    pbPercentile: danquMatch.pb_percentile * 100,
    roe: danquMatch.roe * 100,
    dividendYield: danquMatch.yeild * 100
  };

  // 3. Try name match in EM
  emMatch = emIndexList.find(i => i.INDEXNAME === searchName || searchName.includes(i.INDEXNAME) || i.INDEXNAME.includes(searchName));
  if (emMatch) return {
    pe: parseFloat(emMatch.PETTM) || null,
    pb: parseFloat(emMatch.PB) || null,
    pePercentile: parseFloat(emMatch.PEP) * 100 || null,
    pbPercentile: 50,
    roe: null,
    dividendYield: parseFloat(emMatch.GXL) || null
  };

  // 4. Try name match in Danqu
  danquMatch = danquIndexList.find(i => i.name === searchName || searchName.includes(i.name) || i.name.includes(searchName));
  if (danquMatch) return {
    pe: danquMatch.pe,
    pb: danquMatch.pb,
    pePercentile: danquMatch.pe_percentile * 100,
    pbPercentile: danquMatch.pb_percentile * 100,
    roe: danquMatch.roe * 100,
    dividendYield: danquMatch.yeild * 100
  };

  // 5. NEW: Try Danjuan Detail API for the index code
  if (indexCode) {
    const djPrefix = indexCode.startsWith('3') ? 'SZ' : 'SH';
    const djCode = `${djPrefix}${indexCode}`;
    try {
      const djRes = await axios.get(`https://danjuanfunds.com/djapi/index_valuation/detail/${djCode}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const djData = djRes.data?.data;
      if (djData) {
        return {
          pe: djData.pe || null,
          pb: djData.pb || null,
          pePercentile: djData.pe_percentile * 100 || 50,
          pbPercentile: djData.pb_percentile * 100 || 50,
          roe: djData.roe * 100 || null,
          dividendYield: djData.yeild * 100 || null
        };
      }
    } catch (e) {}
  }

  // 6. NEW: Try EastMoney Realtime API for the ETF itself
  if (mktNum && code) {
    try {
      const secid = `${mktNum}.${code}`;
      const quoteRes = await axios.get(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f162,f163,f164`);
      const q = quoteRes.data?.data;
      if (q && q.f162 !== '-') {
        return {
          pe: parseFloat(q.f162) || null,
          pb: parseFloat(q.f163) || null,
          pePercentile: 50, // Default to neutral if no history
          pbPercentile: 50,
          roe: null,
          dividendYield: parseFloat(q.f164) || null
        };
      }
    } catch (e) {}
  }

  return null;
}

// Calculate Max Drawdown
function calculateMaxDrawdown(prices: number[]) {
  let maxPrice = 0;
  let maxDrawdown = 0;
  for (const price of prices) {
    if (price > maxPrice) {
      maxPrice = price;
    }
    const drawdown = (maxPrice - price) / maxPrice;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  if (prices.length === 0) return 0;
  const currentPrice = prices[prices.length - 1];
  const currentMaxPrice = Math.max(...prices);
  return (currentMaxPrice - currentPrice) / currentMaxPrice;
}

// Map value to score (0-12)
function mapValueScore(percentile: number) {
  return Math.max(0, Math.min(12, 12 - (percentile / 100) * 12));
}

// Map drawdown to score (0-8)
function mapPainScore(drawdown: number) {
  return Math.max(0, Math.min(8, (drawdown / 0.5) * 8));
}

const ETF_MAPPING: Record<string, { yfCode: string, proxy: string, name: string }> = {
  '513100': { yfCode: '513100.SS', proxy: 'QQQ', name: '纳斯达克100ETF' },
  '513500': { yfCode: '513500.SS', proxy: 'SPY', name: '标普500ETF' },
  '510300': { yfCode: '510300.SS', proxy: '000300.SS', name: '沪深300ETF' },
  '510050': { yfCode: '510050.SS', proxy: '000016.SS', name: '上证50ETF' },
  '159915': { yfCode: '159915.SZ', proxy: '399006.SZ', name: '创业板ETF' },
  '588000': { yfCode: '588000.SS', proxy: '000688.SS', name: '科创50ETF' },
  '02800': { yfCode: '2800.HK', proxy: '2800.HK', name: '盈富基金' },
  '2800': { yfCode: '2800.HK', proxy: '2800.HK', name: '盈富基金' },
  'SPY': { yfCode: 'SPY', proxy: 'SPY', name: '标普500(SPY)' },
  'QQQ': { yfCode: 'QQQ', proxy: 'QQQ', name: '纳斯达克100(QQQ)' },
};

app.get("/api/etf/:market/:code", async (req, res) => {
  const { market, code } = req.params;
  const interval = (req.query.interval as string) || '1mo';
  const upperCode = code.toUpperCase();
  const cacheKey = `${market}_${upperCode}_${interval}`;
  
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    let result: any = {
      code: upperCode,
      market: market,
      pe: null,
      pePercentile: null,
      pb: null,
      pbPercentile: null,
      dividendYield: null,
      roe: null,
      currentDrawdown: null,
      currentPrice: null,
      historicalData: [],
      valueScore: 0,
      painScore: 0,
      totalScore: 0,
      status: "未知",
      name: upperCode
    };

    // 1. Search EastMoney for ETF Info and Index Info
    let mktNum = "";
    let etfName = "";
    let indexCode = "";
    let indexName = "";
    try {
      const searchRes = await axios.get(`https://searchapi.eastmoney.com/api/suggest/get?input=${upperCode}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8`);
      const data = searchRes.data?.QuotationCodeTable?.Data;
      if (data && data.length > 0) {
        let match = data.find((d: any) => {
          if (market === 'A' && d.Classify === 'AStock') return true;
          if (market === 'HK' && d.Classify === 'HK') return true;
          if (market === 'US' && d.Classify === 'UsStock') return true;
          return false;
        });
        if (!match) match = data.find((d: any) => d.Code.toUpperCase() === upperCode) || data[0];
        
        etfName = match.Name;
        mktNum = match.MktNum;
        result.name = etfName;

        // Fetch fund basic info for index code
        if (market === 'A') {
          try {
            const basicRes = await axios.get(`https://fundmobapi.eastmoney.com/FundMNewApi/FundMNBasicInformation?FCODE=${upperCode}&deviceid=123456&plat=Android&product=EFund&version=6.2.8`);
            if (basicRes.data && basicRes.data.Datas) {
              indexCode = basicRes.data.Datas.INDEXCODE;
              indexName = basicRes.data.Datas.INDEXNAME;
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error("EastMoney search error:", e);
    }

    // Override name if in mapping
    if (ETF_MAPPING[upperCode]) {
      result.name = ETF_MAPPING[upperCode].name;
    }

    // 2. Try to match Index Valuation
    const valuation = await findValuation(upperCode, etfName, indexCode, indexName, mktNum);
    if (valuation) {
      result.pe = valuation.pe;
      result.pb = valuation.pb;
      result.pePercentile = valuation.pePercentile;
      result.pbPercentile = valuation.pbPercentile;
      result.roe = valuation.roe;
      result.dividendYield = valuation.dividendYield;
    } else {
      // Fallback to Yahoo Finance quote using mapping proxy or direct code
      const mappedProxy = ETF_MAPPING[upperCode]?.proxy;
      if (mappedProxy || market === 'US' || market === 'HK' || mktNum === "105" || mktNum === "106" || mktNum === "107" || mktNum === "116") {
        try {
          let yfCode = mappedProxy || upperCode;
          if (!mappedProxy && (market === 'HK' || mktNum === "116")) yfCode = `${parseInt(upperCode, 10)}.HK`;
          
          const quote: any = await yahooFinance.quote(yfCode);
          if (!ETF_MAPPING[upperCode]) result.name = quote.shortName || result.name;
          result.pe = quote.trailingPE || null;
          result.pb = quote.priceToBook || null;
          result.dividendYield = quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : null;
          
          // Get current price from the actual ETF, not the proxy, if possible
          if (mappedProxy && mappedProxy !== upperCode) {
            try {
              const actualQuote: any = await yahooFinance.quote(ETF_MAPPING[upperCode].yfCode);
              result.currentPrice = actualQuote.regularMarketPrice || null;
            } catch (e) {}
          } else {
            result.currentPrice = quote.regularMarketPrice || null;
          }
          
          // Mock percentiles for fallback
          result.pePercentile = 50;
          result.pbPercentile = 50;
        } catch (e) {
          console.error("Yahoo quote fallback error:", e);
        }
      } else {
        // Fallback for A-shares if Danqu fails
        result.pePercentile = 50;
        result.pbPercentile = 50;
      }
    }

    // 3. Fetch Historical Prices for Drawdown and Trend using Yahoo Finance chart
    let yfCode = upperCode;
    if (ETF_MAPPING[upperCode]) {
      yfCode = ETF_MAPPING[upperCode].yfCode;
    } else if (market === 'A') {
      if (mktNum === "1" || upperCode.startsWith('5')) yfCode = `${upperCode}.SS`;
      else yfCode = `${upperCode}.SZ`;
    } else if (market === 'HK' || mktNum === "116") {
      yfCode = `${parseInt(upperCode, 10)}.HK`;
    }
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (interval === '1d') {
        startDate.setFullYear(endDate.getFullYear() - 1); // 1 year for daily
      } else if (interval === '1wk') {
        startDate.setFullYear(endDate.getFullYear() - 5); // 5 years for weekly
      } else {
        startDate.setFullYear(endDate.getFullYear() - 10); // 10 years for monthly
      }
      
      const chart = await yahooFinance.chart(yfCode, { period1: startDate, interval: interval as any });
      if (chart && chart.quotes && chart.quotes.length > 0) {
        const prices = chart.quotes.map((q: any) => q.adjclose || q.close).filter((p: any) => p != null);
        result.currentDrawdown = calculateMaxDrawdown(prices);
        
        // Populate historical data for chart
        result.historicalData = chart.quotes
          .filter((q: any) => q.close != null)
          .map((q: any) => ({
            date: q.date.toISOString().split('T')[0],
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            price: q.close
          }));
          
        if (!result.currentPrice && result.historicalData.length > 0) {
          result.currentPrice = result.historicalData[result.historicalData.length - 1].price;
        }
      } else {
        result.currentDrawdown = 0;
      }
    } catch (e: any) {
      console.error(`Yahoo chart error for ${yfCode}:`, e.message);
      result.currentDrawdown = 0;
    }

    // 4. Calculate Scores
    const maxPercentile = Math.max(result.pePercentile || 0, result.pbPercentile || 0);
    result.valueScore = mapValueScore(maxPercentile);
    result.painScore = mapPainScore(result.currentDrawdown || 0);
    result.totalScore = result.valueScore + result.painScore;

    if (result.totalScore >= 15) {
      result.status = "极度低估";
    } else if (result.totalScore >= 12) {
      result.status = "低估";
    } else if (result.totalScore >= 8) {
      result.status = "合理";
    } else {
      result.status = "高估";
    }

    cache.set(cacheKey, result);
    res.json(result);

  } catch (error: any) {
    console.error("Error fetching ETF data:", error);
    res.status(500).json({ error: "Failed to fetch ETF data", details: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
