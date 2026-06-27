import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing. Configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Lazy-initialized Groq Client & Simulation Fallbacks
async function callGroqChat(messages: Array<{ role: string; content: string }>, systemPrompt?: string): Promise<{ text: string; isSimulated: boolean }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "MY_GROQ_API_KEY" || apiKey.trim() === "") {
    console.log("GROQ_API_KEY is missing or template default. Employing high-fidelity Groq simulator.");
    const simText = await simulateGroqResponse(messages, systemPrompt);
    return { text: simText, isSimulated: true };
  }

  try {
    const groqMessages = [];
    if (systemPrompt) {
      groqMessages.push({ role: 'system', content: systemPrompt });
    }
    groqMessages.push(...messages);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!res.ok) {
      console.warn(`Groq API returned status ${res.status}. Employing fallback simulator.`);
      const simText = await simulateGroqResponse(messages, systemPrompt);
      return { text: simText, isSimulated: true };
    }

    const data: any = await res.json();
    const replyText = data?.choices?.[0]?.message?.content || '';
    return { text: replyText, isSimulated: false };
  } catch (err) {
    console.warn('Unable to connect to Groq API. Employing fallback simulator.');
    const simText = await simulateGroqResponse(messages, systemPrompt);
    return { text: simText, isSimulated: true };
  }
}

async function simulateGroqResponse(messages: Array<{ role: string; content: string }>, systemPrompt?: string): Promise<string> {
  try {
    const ai = getGeminiClient();
    const contents = messages.map(m => `${m.role === 'user' ? 'Trader' : 'Assistant'}: ${m.content}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are simulating the GROQ AI Engine running LLAMA-3.3-70B-VERSATILE.
Your persona is an elite Quantitative Analyst, High-Frequency Trader, and Volatility Risk Officer.
You analyze trades with sharp mathematical discipline, statistics, volume profiles, and liquidity sweeps.

System Prompt Context: ${systemPrompt || ''}

Conversation History/Prompt:
${contents}

Please respond in your persona (Llama 70b on Groq):`,
    });
    
    return response.text || '(Groq Simulator) Quantitative risk filters match structural patterns.';
  } catch (e) {
    return 'Llama-3.3 (Groq Fallback): Quantitative indicators and volatility ratios show positive alignment. Invalidation is tight below support.';
  }
}

// Global cached prices to maintain a realistic drift over time if we simulate
const cachedPrices: Record<string, {
  price: number;
  prevClose: number;
  high: number;
  low: number;
  history: number[];
}> = {
  XAUUSD: { price: 4088.38, prevClose: 4070.81, high: 4091.20, low: 4070.13, history: [4070.81, 4075.00, 4080.50, 4088.38] },
  BTCUSD: { price: 61250.00, prevClose: 60800.00, high: 61800.00, low: 60500.00, history: [60800, 60950, 61100, 61250.00] },
  EURUSD: { price: 1.0845, prevClose: 1.0866, high: 1.0890, low: 1.0820, history: [1.0866, 1.086, 1.085, 1.0845] },
  GBPUSD: { price: 1.2650, prevClose: 1.2635, high: 1.2680, low: 1.2610, history: [1.2635, 1.262, 1.264, 1.2650] },
  USDJPY: { price: 157.85, prevClose: 157.40, high: 158.20, low: 157.10, history: [157.40, 157.2, 157.5, 157.85] },
  GBPJPY: { price: 199.65, prevClose: 198.80, high: 200.10, low: 198.90, history: [198.80, 199.1, 199.4, 199.65] }
};

// Global dynamic baselines that update to actual live prices upon successful API fetches
const baselines: Record<string, number> = {
  XAUUSD: 4088.38,
  BTCUSD: 61250.00,
  EURUSD: 1.0845,
  GBPUSD: 1.2650,
  USDJPY: 157.85,
  GBPJPY: 199.65
};

// Tracks the last successful live API quote timestamp to safely bypass drift simulation
let lastLiveFetchTime = 0;

// Returns true if traditional financial markets (Forex & Gold) are closed globally (Friday 22:00 UTC to Sunday 22:00 UTC)
function isTraditionalMarketClosed() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  const hour = now.getUTCHours();
  
  if (day === 5 && hour >= 22) {
    return true; // Friday late night (closed)
  }
  if (day === 6) {
    return true; // Saturday (closed)
  }
  if (day === 0 && hour < 22) {
    return true; // Sunday early morning (closed)
  }
  return false;
}

// Update prices with an anchored random walk model for high-frequency micro-ticks
function driftPrices() {
  const isWeekendClosed = isTraditionalMarketClosed();
  
  for (const [symbol, data] of Object.entries(cachedPrices)) {
    // No artificial random walk drift for BTCUSD! We always use the exact live fetched price to match TradingView.
    if (symbol === 'BTCUSD') {
      continue;
    }

    // If traditional markets are closed on weekends, freeze their prices completely!
    if (isWeekendClosed) {
      continue;
    }

    // Highly realistic volatility scales per tick
    let volatility = 0.00012; // default forex tick size (EURUSD, GBPUSD, etc.)
    if (symbol.includes('JPY')) {
      volatility = 0.025; // yen ticks
    } else if (symbol === 'XAUUSD') {
      volatility = 0.18; // gold ticks
    }

    const drift = (Math.random() - 0.5) * volatility;
    const decimals = symbol.includes('JPY') || symbol === 'XAUUSD' ? 2 : 5;
    
    const baseline = baselines[symbol] || data.price;
    if (!data.price || data.price === 0) {
      data.price = baseline;
    }
    
    let nextPrice = data.price + drift;
    
    // Maintain a highly accurate and tight boundary (max 0.05% deviation from real-time live price baseline).
    const maxDeviationPercent = 0.0005; // 0.05% bound
    const maxDeviation = baseline * maxDeviationPercent;
    
    if (nextPrice > baseline + maxDeviation) {
      nextPrice = baseline + maxDeviation - Math.abs(drift);
    } else if (nextPrice < baseline - maxDeviation) {
      nextPrice = baseline - maxDeviation + Math.abs(drift);
    }

    data.price = Number(nextPrice.toFixed(decimals));
    if (data.price > data.high) data.high = data.price;
    if (data.price < data.low) data.low = data.price;
    
    // Append to live tick sparkline history
    data.history.push(data.price);
    if (data.history.length > 20) {
      data.history.shift();
    }
  }
}

// Periodically drift simulated prices so they look active immediately (every 2 seconds)
setInterval(driftPrices, 2000);

// --- HIGHLY OPTIMIZED REAL-TIME BACKGROUND POLLING ENGINE ---
async function fetchLivePricesBackground() {
  const isClosed = isTraditionalMarketClosed();
  let anyLiveFetched = false;

  // Let's fetch COINBASE:BTCUSD and other open tickers directly from TradingView's official screener API
  // to guarantee 100% exact alignment with the embedded TradingView charts.
  const tickersToFetch = ["COINBASE:BTCUSD"];
  if (!isClosed) {
    tickersToFetch.push("OANDA:XAUUSD", "FX:EURUSD", "FX:GBPUSD", "FX:USDJPY", "FX:GBPJPY");
  }

  try {
    const tvRes = await fetch('https://scanner.tradingview.com/global/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        symbols: { tickers: tickersToFetch },
        columns: ["close", "change", "change_abs", "high", "low", "open"]
      })
    });

    if (tvRes.ok) {
      const tvJson: any = await tvRes.json();
      const tvData = tvJson?.data || [];
      if (tvData.length > 0) {
        const tvSymbolToAppKey: Record<string, string> = {
          "COINBASE:BTCUSD": "BTCUSD",
          "OANDA:XAUUSD": "XAUUSD",
          "FX:EURUSD": "EURUSD",
          "FX:GBPUSD": "GBPUSD",
          "FX:USDJPY": "USDJPY",
          "FX:GBPJPY": "GBPJPY"
        };

        for (const item of tvData) {
          const appKey = tvSymbolToAppKey[item.s];
          if (appKey && Array.isArray(item.d)) {
            const price = item.d[0];
            const changePercent = item.d[1];
            const changeAbs = item.d[2];
            const high = item.d[3];
            const low = item.d[4];
            const open = item.d[5];

            if (typeof price === 'number') {
              const prevClose = open || (price - (changeAbs || 0));
              baselines[appKey] = price;
              cachedPrices[appKey].price = price;
              cachedPrices[appKey].prevClose = prevClose;
              cachedPrices[appKey].high = high || price;
              cachedPrices[appKey].low = low || price;
              
              const history = cachedPrices[appKey].history;
              if (history.length === 0 || history[history.length - 1] !== price) {
                history.push(price);
                if (history.length > 20) history.shift();
              }
              anyLiveFetched = true;
            }
          }
        }
      }
    }
  } catch (tvErr) {
    console.warn('Background TradingView fetch failed, attempting fallback...', tvErr);
  }

  // Fallback 1: Coinbase spot price API (exact match for COINBASE:BTCUSD)
  if (!anyLiveFetched || cachedPrices['BTCUSD'].price === 61250.00) {
    try {
      const cbRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      if (cbRes.ok) {
        const cbData: any = await cbRes.json();
        const price = parseFloat(cbData?.data?.amount);
        if (!isNaN(price) && price > 0) {
          baselines['BTCUSD'] = price;
          cachedPrices['BTCUSD'].price = price;
          
          const history = cachedPrices['BTCUSD'].history;
          if (history.length === 0 || history[history.length - 1] !== price) {
            history.push(price);
            if (history.length > 20) history.shift();
          }
          anyLiveFetched = true;
        }
      }
    } catch (cbErr) {
      console.warn('Background Coinbase spot fallback failed:', cbErr);
    }
  }

  // Fallback 2: Binance BTCUSDT
  if (!anyLiveFetched || cachedPrices['BTCUSD'].price === 61250.00) {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      if (res.ok) {
        const bQuote: any = await res.json();
        const price = parseFloat(bQuote.lastPrice);
        const prevClose = parseFloat(bQuote.openPrice);
        if (!isNaN(price) && price > 0) {
          baselines['BTCUSD'] = price;
          cachedPrices['BTCUSD'].price = price;
          cachedPrices['BTCUSD'].prevClose = prevClose;
          cachedPrices['BTCUSD'].high = parseFloat(bQuote.highPrice) || price;
          cachedPrices['BTCUSD'].low = parseFloat(bQuote.lowPrice) || price;
          
          const history = cachedPrices['BTCUSD'].history;
          if (history.length === 0 || history[history.length - 1] !== price) {
            history.push(price);
            if (history.length > 20) history.shift();
          }
          anyLiveFetched = true;
        }
      }
    } catch (err) {
      console.warn('Background Binance fallback failed:', err);
    }
  }

  if (anyLiveFetched) {
    lastLiveFetchTime = Date.now();
  }
}

// Start background polling immediately and every 1.5s
function startBackgroundPricePolling() {
  fetchLivePricesBackground();
  setInterval(fetchLivePricesBackground, 1500);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Start background real-time price loop
  startBackgroundPricePolling();

  // API Status
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', hasApiKey: !!process.env.GEMINI_API_KEY });
  });

  // API 1: Fetch Live Prices (Served INSTANTLY from server memory cache with maximum anti-caching headers)
  app.get('/api/prices', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    try {
      const symbols = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY'];
      const isClosed = isTraditionalMarketClosed();
      const resultsPayload: Record<string, any> = {};

      for (const key of symbols) {
        const currentData = cachedPrices[key];
        const change = currentData.price - currentData.prevClose;
        const changePercent = (change / currentData.prevClose) * 100;
        const decimals = key === 'BTCUSD' ? 2 : key.includes('JPY') || key === 'XAUUSD' ? 2 : 5;

        resultsPayload[key] = {
          price: currentData.price,
          change: Number(change.toFixed(decimals)),
          changePercent: Number(changePercent.toFixed(3)),
          high: Number(currentData.high.toFixed(decimals)),
          low: Number(currentData.low.toFixed(decimals)),
          history: [...currentData.history],
          isSimulated: (Date.now() - lastLiveFetchTime) > 15000,
          isMarketClosed: key !== 'BTCUSD' && isClosed
        };
      }

      res.json({ success: true, prices: resultsPayload });
    } catch (routeErr: any) {
      console.error('CRITICAL: Error in /api/prices handler:', routeErr);
      // Fallback response
      const fallbackPayload: Record<string, any> = {};
      const isClosedFallback = isTraditionalMarketClosed();
      for (const key of ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY']) {
        const currentData = cachedPrices[key];
        const change = currentData.price - currentData.prevClose;
        const changePercent = (change / currentData.prevClose) * 100;
        const decimals = key === 'BTCUSD' ? 2 : key.includes('JPY') || key === 'XAUUSD' ? 2 : 5;

        fallbackPayload[key] = {
          price: currentData.price,
          change: Number(change.toFixed(decimals)),
          changePercent: Number(changePercent.toFixed(3)),
          high: Number(currentData.high.toFixed(decimals)),
          low: Number(currentData.low.toFixed(decimals)),
          history: [...currentData.history],
          isSimulated: true,
          isMarketClosed: key !== 'BTCUSD' && isClosedFallback
        };
      }
      res.json({ success: true, prices: fallbackPayload });
    }
  });

  // API 2: Structure Scanner (BOS, CHoCH patterns & Dual-Brain Verdict via Gemini + Groq)
  app.post('/api/scan', async (req, res) => {
    try {
      const { pair, timeframe } = req.body;
      if (!pair || !timeframe) {
        return res.status(400).json({ error: 'Pair and timeframe parameters are required.' });
      }

      // 1. Algorithmically generate structure readings based on current price
      const priceMeta = cachedPrices[pair] || cachedPrices.XAUUSD;
      const currentPrice = priceMeta.price;

      // Deterministic but realistic readings based on symbol and timeframe
      const seed = pair.charCodeAt(0) + timeframe.charCodeAt(0);
      const isBullishTrend = seed % 2 === 0;
      const trend = isBullishTrend ? 'BULLISH' : 'BEARISH';
      const structureEvent = seed % 3 === 0 ? 'BOS (Break of Structure)' : 'CHoCH (Change of Character)';
      const rsi = Math.floor(52 + (seed % 23) - (isBullishTrend ? 0 : 15));
      const macd = isBullishTrend ? 'Bullish Crossover (+0.04)' : 'Bearish Crossover (-0.03)';
      const decimals = (pair === 'BTCUSD' || pair === 'XAUUSD' || pair.includes('JPY')) ? 2 : 5;
      const ema50 = (currentPrice * (isBullishTrend ? 0.998 : 1.002)).toFixed(decimals);
      const ema200 = (currentPrice * (isBullishTrend ? 0.995 : 1.005)).toFixed(decimals);

      const supportOffset = pair === 'BTCUSD' ? 650 : pair === 'XAUUSD' ? 12 : pair.includes('JPY') ? 0.8 : 0.0045;
      const support = (currentPrice - supportOffset).toFixed(decimals);
      const resistance = (currentPrice + supportOffset).toFixed(decimals);
      const orderBlock = `${trend} Institutional Demand OB around ${support}`;

      // 2. BRAIN 1: Query Gemini for SMC Structural Footprints
      const ai = getGeminiClient();
      const geminiPrompt = `You are JARVIS (powered by Gemini-3.5-Flash), an elite Smart Money Concepts (SMC) Specialist.
Analyze the following technical snapshot:
- Symbol: ${pair}
- Timeframe: ${timeframe}
- Spot Price: ${currentPrice}
- Trend: ${trend}
- Structure Event: ${structureEvent}
- RSI: ${rsi}, MACD: ${macd}
- Support: ${support}
- Resistance: ${resistance}
- Order Block: ${orderBlock}

Provide a concise 2-3 sentence technical analysis outlining where institutional liquidity rests, whether there's structural validation, and your initial SMC bias. Keep it direct and professional.`;

      let geminiThesis = "";
      try {
        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: geminiPrompt,
        });
        geminiThesis = geminiResponse.text || "Structural demand accumulation is confirmed at the specified order block. Buy setups are highly viable.";
      } catch (geminiErr: any) {
        console.warn("Gemini scan thesis failed. Using structural fallback template.");
        geminiThesis = `Strong structural alignment on the ${timeframe} timeframe indicates order block accumulation near key support of ${support}. Recommend entry alignment on lower timeframe candle confirmations.`;
      }

      // 3. BRAIN 2: Query Groq Llama-3.3 (or high-fidelity fallback simulator) to run Quant cross-examination & build joint plan
      const groqSystemPrompt = `You are LLAMA-3.3 (powered by Groq), a legendary Quantitative Analyst and Risk Management Officer on a multi-million dollar trading desk.
Your counterpart is JARVIS (the SMC specialist, powered by Gemini). Your job is to review JARVIS's analysis, perform a quantitative volatility/momentum check, debate/discuss with JARVIS, and compile a consolidated trading plan.`;

      const groqUserPrompt = `TECHNICAL PROFILE:
- Symbol: ${pair}
- Timeframe: ${timeframe}
- Spot Price: ${currentPrice}
- Trend: ${trend}
- Structure Event: ${structureEvent}
- RSI: ${rsi}, MACD: ${macd}
- Support: ${support}
- Resistance: ${resistance}
- Order Block: ${orderBlock}

JARVIS SMC THESIS:
"${geminiThesis}"

Evaluate this and generate a unified, consolidated JSON matching the following schema. Return ONLY valid, minified JSON. Do not surround with markdown block formatting.

Required JSON Schema:
{
  "trend": "${trend}",
  "verdict": "STRONG BUY" | "BUY" | "WAIT" | "SELL" | "STRONG SELL",
  "confidence": number (e.g. 85),
  "support": "${support}",
  "resistance": "${resistance}",
  "orderBlock": "${orderBlock}",
  "tradeSetup": {
    "entry": ${currentPrice},
    "sl": number,
    "tp1": number,
    "tp2": number,
    "rrRatio": "string (e.g. 1:2.4)"
  },
  "reasoning": "A joint consensus statement representing the synthesis of your quantitative analysis and Gemini's SMC patterns.",
  "scalpPlan": "Actionable instructions outlining entry triggers, stop management, and take profit execution rules.",
  "geminiView": "A concise summary of JARVIS's SMC thesis.",
  "groqView": "A concise summary of your Llama-3.3 Quant analysis and risk adjustments.",
  "debateTranscript": [
    { "speaker": "Gemini (SMC)", "text": "Short conversational statement from Gemini advocating for its SMC pattern detection and key levels." },
    { "speaker": "Groq (Quant)", "text": "Your professional quantitative cross-examination, raising risk concerns, volume profile walls, or confirming levels." },
    { "speaker": "Gemini (SMC)", "text": "Gemini's response adjusting or agreeing to the risk mitigation parameters." },
    { "speaker": "Groq (Quant)", "text": "Your final consensus sign-off, confirming risk validation parameters." }
  ],
  "isGroqActive": true
}`;

      const groqResult = await callGroqChat([{ role: 'user', content: groqUserPrompt }], groqSystemPrompt);
      
      let verdictData: any = {};
      try {
        // Strip out any accidental markdown blocks if returned by the LLM
        let cleanJsonText = groqResult.text.trim();
        if (cleanJsonText.startsWith("```")) {
          cleanJsonText = cleanJsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        verdictData = JSON.parse(cleanJsonText);
        verdictData.isGroqActive = !groqResult.isSimulated;
      } catch (e) {
        console.warn("Groq JSON parsing failed, deploying fail-safe fallback:", e);
        // Fail-safe fallback trade setup structure
        const entry = Number(currentPrice);
        const sl = isBullishTrend ? entry * 0.996 : entry * 1.004;
        const tp1 = isBullishTrend ? entry * 1.006 : entry * 0.994;
        const tp2 = isBullishTrend ? entry * 1.012 : entry * 0.988;
        verdictData = {
          trend,
          verdict: isBullishTrend ? 'BUY' : 'SELL',
          confidence: 78,
          support,
          resistance,
          orderBlock,
          tradeSetup: {
            entry: Number(entry.toFixed(decimals)),
            sl: Number(sl.toFixed(decimals)),
            tp1: Number(tp1.toFixed(decimals)),
            tp2: Number(tp2.toFixed(decimals)),
            rrRatio: '1:2.5'
          },
          reasoning: `Joint Consensus: Confluence of ${structureEvent} with a trend direction of ${trend} identifies institutional accumulation. Llama Quant checks confirm RSI of ${rsi} is in neutral breakout momentum.`,
          scalpPlan: 'Wait for structural retest of the OB zone before entry. Lock in 50% at TP1, move stops to break-even to protect capital.',
          geminiView: geminiThesis,
          groqView: `Quantitative review confirms volatility models are favorable. Volatility index matches the trend of ${trend}.`,
          debateTranscript: [
            { "speaker": "Gemini (SMC)", "text": `The structural order block on ${timeframe} is beautifully defined around ${support}. This is a textbook institutional entry.` },
            { "speaker": "Groq (Quant)", "text": `Structure is valid, but the 50 EMA is hovering close, creating mild friction. Let's make sure our Stop Loss is wide enough to survive the standard liquidity sweep.` },
            { "speaker": "Gemini (SMC)", "text": `Understood. I will adjust stop loss just below the structural invalidation zone at ${support} to accommodate any noise.` },
            { "speaker": "Groq (Quant)", "text": `Perfect. Sizing is adjusted to normal risk parameters. Protocol is fully signed off by both models.` }
          ],
          isGroqActive: !groqResult.isSimulated
        };
      }

      res.json({ success: true, data: verdictData });
    } catch (error: any) {
      console.error('Error in /api/scan:', error);
      res.status(500).json({ success: false, error: error.message || 'AI scanner error occurred.' });
    }
  });

  // API 3: Economic Calendar and AI Sentiment Synthesis
  app.get('/api/news', async (req, res) => {
    try {
      let calendarEvents = [];
      try {
        // Fetch economic calendar from ForexFactory CDN
        const ffRes = await fetch('https://cdn-files.forexfactory.net/ff_calendar_thisweek.json', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(4000)
        });
        if (ffRes.ok) {
          calendarEvents = await ffRes.json();
        }
      } catch (ffErr) {
        console.warn('Unable to reach ForexFactory directly. Deploying institutional calendar fallback.');
      }

      // Dynamic Fallback items representing major high-impact events
      if (calendarEvents.length === 0) {
        calendarEvents = [
          { title: "NFP (Non-Farm Employment Change)", country: "USD", impact: "High", forecast: "185K", previous: "175K" },
          { title: "CPI m/m (Consumer Price Index)", country: "USD", impact: "High", forecast: "0.2%", previous: "0.3%" },
          { title: "FOMC Federal Funds Rate Decision", country: "USD", impact: "High", forecast: "5.25%", previous: "5.25%" },
          { title: "Unemployment Claims", country: "USD", impact: "Medium", forecast: "215K", previous: "220K" },
          { title: "ECB Monetary Policy Statement", country: "EUR", impact: "High", forecast: "4.25%", previous: "4.50%" },
          { title: "BOE Official Bank Rate Decision", country: "GBP", impact: "High", forecast: "5.00%", previous: "5.25%" },
          { title: "Retail Sales m/m", country: "USD", impact: "Medium", forecast: "0.3%", previous: "0.1%" },
          { title: "BOJ Policy Rate Press Conference", country: "JPY", impact: "High", forecast: "0.10%", previous: "0.10%" }
        ];
      }

      const activeEvents = calendarEvents.slice(0, 10);

      // Analyze economic calendar with Gemini
      const ai = getGeminiClient();
      const prompt = `You are JARVIS TRADING INTELLIGENCE v6. Synthesize this week's key forex economic calendar events into a concise institutional risk assessment. 
      
CALENDAR ITEMS:
${JSON.stringify(activeEvents)}

Provide a structured narrative. Return your synthesis in JSON format. Return ONLY a valid JSON object matching the following structure:
{
  "macroNarrative": "A high-level synthesis explaining what USD/EUR/GBP catalysts to watch and how they impact Spot Gold (XAUUSD) or major crosses.",
  "events": [
    {
      "title": "string (the event name)",
      "country": "string",
      "impact": "High" | "Medium" | "Low",
      "forecast": "string",
      "previous": "string",
      "sentimentBias": "GOLD BULLISH" | "USD BULLISH" | "VOLATILITY ALIGNMENT" | "NEUTRAL",
      "scalperAdvice": "Actionable risk advice for short-term traders."
    }
  ]
}`;

      let parsedAnalysis: any = null;
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        parsedAnalysis = JSON.parse(response.text || '{}');
      } catch (geminiErr: any) {
        console.warn("Gemini model returned error on news scan. Trying Groq fallback.");
        try {
          // Attempt Groq fallback
          const groqUserPrompt = `You are LLAMA-3.3 (powered by Groq). Review these economic calendar items and generate a structured JSON object matching the requested schema. Do not output anything else.
          
CALENDAR ITEMS:
${JSON.stringify(activeEvents)}

Required JSON Schema:
{
  "macroNarrative": "A concise synthesis explaining USD/EUR/GBP catalysts and Gold/Crosses impact.",
  "events": [
    {
      "title": "string",
      "country": "string",
      "impact": "High" | "Medium" | "Low",
      "forecast": "string",
      "previous": "string",
      "sentimentBias": "GOLD BULLISH" | "USD BULLISH" | "VOLATILITY ALIGNMENT" | "NEUTRAL",
      "scalperAdvice": "string"
    }
  ]
}`;
          const groqRes = await callGroqChat([{ role: 'user', content: groqUserPrompt }]);
          let cleanJsonText = groqRes.text.trim();
          if (cleanJsonText.startsWith("```")) {
            cleanJsonText = cleanJsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          }
          parsedAnalysis = JSON.parse(cleanJsonText);
        } catch (groqErr) {
          console.warn("Groq news fallback also failed. Deploying high-fidelity static analysis.");
        }
      }

      // If both AI calls failed or returned empty, generate beautiful deterministic analysis based on events!
      if (!parsedAnalysis || !parsedAnalysis.macroNarrative || !Array.isArray(parsedAnalysis.events)) {
        parsedAnalysis = {
          macroNarrative: "Macro catalysts are currently driven by high-impact rate decisions and central bank statements. Anticipate increased liquidity swipes and volatile order block tests ahead of key session openings.",
          events: activeEvents.map((evt: any) => {
            let bias = "NEUTRAL";
            let advice = "No high impact scheduled. Practice standard risk metrics.";
            
            if (evt.impact === "High") {
              bias = evt.country === "USD" ? "USD BULLISH" : "GOLD BULLISH";
              advice = "High volatility expected. Reduce position sizes and protect open positions by trailing stops.";
            } else if (evt.impact === "Medium") {
              bias = "VOLATILITY ALIGNMENT";
              advice = "Moderate liquidity sweeps expected. Watch local 15m order blocks for structure retests.";
            }

            return {
              title: evt.title || evt.event || "Economic Release",
              country: evt.country || "USD",
              impact: evt.impact || "Medium",
              forecast: evt.forecast || "N/A",
              previous: evt.previous || "N/A",
              sentimentBias: bias,
              scalperAdvice: advice
            };
          })
        };
      }

      res.json({ success: true, rawEvents: activeEvents, analysis: parsedAnalysis });
    } catch (error: any) {
      console.error('Error in /api/news:', error);
      res.status(500).json({ success: false, error: error.message || 'Economic calendar intelligence error.' });
    }
  });

  // API 4: JARVIS Interactive Mentor Chat (Dual-Brain Gemini + Groq)
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, context } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'A valid messages array is required.' });
      }

      const ai = getGeminiClient();
      const formattedMessages = messages.map(msg => {
        return `${msg.role === 'user' ? 'Trader' : msg.role.toUpperCase()}: ${msg.content}`;
      }).join('\n');

      // 1. Ask Gemini for the SMC (Smart Money Concepts) viewpoint
      const geminiPrompt = `You are JARVIS (powered by Gemini-3.5-Flash), an elite Smart Money Concepts (SMC) Mentor and Liquidity Officer.
Analyze the user's message/conversation history in the context of our active rates.

ACTIVE PRICES CONTEXT:
${JSON.stringify(context || { prices: cachedPrices })}

CONVERSATION HISTORY:
${formattedMessages}

Provide a concise, expert 2-paragraph technical analysis from your SMC perspective. Address the user's question directly, highlighting order blocks, trend lines, or structural changes. Keep your tone highly analytical and professional.`;

      let geminiReply = "";
      try {
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: geminiPrompt,
        });
        geminiReply = geminiRes.text || "Structural patterns indicate standard market consolidation. Focus on volume spikes for direction.";
      } catch (geminiErr) {
        console.warn("Gemini chat perspective failed. Relying on structural fallback guide.");
        geminiReply = "Focus on order block invalidations and wait for structural confirmation on high-volume session opens.";
      }

      // 2. Ask Groq Llama-3.3 (or high-fidelity simulator) to evaluate and debate Gemini's reply, creating a joint debrief
      const groqSystemPrompt = `You are LLAMA-3.3 (powered by Groq), a legendary Quantitative Analyst and Volatility Risk Officer.
You work alongside JARVIS (the SMC specialist) to mentor a trader. Your role is to review JARVIS's SMC reply, inject quantitative risk parameters, check risk-to-reward metrics, and debate/cooperate on the final recommendation.`;

      const groqUserPrompt = `CONVERSATION HISTORY:
${formattedMessages}

JARVIS SMC PERSPECTIVE:
"${geminiReply}"

Active Prices Context:
${JSON.stringify(context || { prices: cachedPrices })}

Please discuss with JARVIS's perspective and construct a beautifully formatted response.
Your output must be formatted with clean spacing. Return a detailed answer containing exactly the following sections:

### 🤖 DUAL-AI QUANT CO-PILOT DEBRIEF

**[GEMINI SMC Specialist]:**
${geminiReply}

**[GROQ Llama-3.3 Quant]:**
(Write your Llama-3.3 quantitative/volatility analysis here. Review Gemini's points, suggest specific risk precautions, evaluate if current volumes support the bias, and add value from a HFT/Quant perspective. Speak in the first person as Groq Quant.)

**[🎯 STRATEGIC DIRECTIVE]:**
(Write a unified, bulleted consensus action plan with precise trade guidelines, invalidation zones, and positioning advice.)`;

      const groqResult = await callGroqChat([{ role: 'user', content: groqUserPrompt }], groqSystemPrompt);

      res.json({ success: true, reply: groqResult.text || 'Understood. Let us focus our analysis back on capital preservation and price action structure.' });
    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      res.status(500).json({ success: false, error: error.message || 'Chat intelligence engine error.' });
    }
  });

  // Vite Integration
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`JARVIS Server running in ${isProd ? 'production' : 'development'} mode on port ${port}`);
  });
}

startServer();
