import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  Calendar, 
  AlertTriangle, 
  Percent, 
  Activity, 
  Search, 
  RefreshCw, 
  Globe, 
  Sliders, 
  CheckCircle2, 
  User, 
  Clock, 
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Flame,
  Scale
} from 'lucide-react';
import { PriceData, NewsEvent } from './types';

// Extended type for news event analysis response
interface EventAnalysisData {
  consensusBias: 'BULLISH' | 'BEARISH' | 'VOLATILE RANGE';
  probabilities: {
    bullishExpansion: number;
    bearishSweep: number;
    volatilityDangerIndex: number;
    liquidityGrabProb: number;
    interestRateShiftProb: number;
  };
  targets: {
    upperTarget: string;
    lowerTarget: string;
    liquidityZone: string;
  };
  debateTranscript: Array<{ speaker: 'Macro Hawk' | 'SMC Quant'; text: string }>;
  macroImpactAnalysis: string;
}

// Helper to parse and convert scheduled event times from EDT (Forex Factory) to UTC and BDT (Bangladesh Local Time)
function formatEventTimes(dateStr?: string, timeStr?: string) {
  if (!dateStr) {
    return {
      ny: "Pending Schedule",
      utc: "Pending Schedule",
      bdt: "Pending Schedule"
    };
  }

  const timeRaw = timeStr || "12:00pm";
  const cleanTime = timeRaw.trim().toLowerCase();

  // If time is tentative or all day, we can't perform specific hour/minute math
  if (cleanTime === "tentative" || cleanTime === "all day" || cleanTime.includes("day") || cleanTime.includes("tent")) {
    return {
      ny: `${dateStr} (${timeRaw})`,
      utc: `${dateStr} (${timeRaw})`,
      bdt: `${dateStr} (${timeRaw})`
    };
  }

  try {
    // 1. Establish year, month (0-indexed), day
    let year = 2026;
    let month = 5; // June
    let day = 28;

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      month = parseInt(parts[0], 10) - 1;
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      const parsedD = new Date(dateStr.includes(',') ? dateStr : `${dateStr}, ${year}`);
      if (!isNaN(parsedD.getTime())) {
        year = parsedD.getFullYear();
        month = parsedD.getMonth();
        day = parsedD.getDate();
      }
    }

    // 2. Parse timeStr (e.g. "12:30pm", "8:15am")
    const match = cleanTime.match(/(\d+)[:.]?(\d*)\s*(am|pm)/i);
    let hours = 12;
    let minutes = 0;

    if (match) {
      hours = parseInt(match[1], 10);
      if (match[2]) {
        minutes = parseInt(match[2], 10);
      }
      const ampm = match[3].toLowerCase();
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
    }

    // 3. Create EDT baseline
    const baseDate = new Date(Date.UTC(year, month, day, hours, minutes));

    // Calculate dates (UTC is EDT + 4 hrs, BDT is EDT + 10 hrs)
    const utcDate = new Date(baseDate.getTime() + 4 * 60 * 60 * 1000);
    const bdtDate = new Date(baseDate.getTime() + 10 * 60 * 60 * 1000);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formatPart = (d: Date, tzLabel: string) => {
      const mName = months[d.getUTCMonth()];
      const dayNum = d.getUTCDate();
      const yr = d.getUTCFullYear();
      let hr = d.getUTCHours();
      const min = d.getUTCMinutes().toString().padStart(2, '0');
      const ampm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12;
      if (hr === 0) hr = 12;
      return `${mName} ${dayNum}, ${yr} at ${hr}:${min} ${ampm} (${tzLabel})`;
    };

    return {
      ny: formatPart(baseDate, "New York / EDT"),
      utc: formatPart(utcDate, "UTC / GMT"),
      bdt: formatPart(bdtDate, "Bangladesh / BDT")
    };
  } catch (err) {
    return {
      ny: `${dateStr} ${timeStr || ''} (EDT)`,
      utc: `${dateStr} ${timeStr || ''} (UTC)`,
      bdt: `${dateStr} ${timeStr || ''} (BDT)`
    };
  }
}

// Helper to calculate custom high-fidelity simulated deviation scenarios
function getSimulatedScenario(title: string, country: string, deviation: 'ABOVE' | 'BELOW' | 'INLINE') {
  const cleanTitle = title.toUpperCase();
  const cleanCountry = country.toUpperCase();

  let scenarioName = "";
  let dxyBias = "";
  let goldBias = "";
  let summary = "";
  let steps: string[] = [];
  let playbook = { entry: "", sl: "", tp: "", caution: "" };

  if (cleanTitle.includes("NFP") || cleanTitle.includes("EMPLOYMENT") || cleanTitle.includes("JOB")) {
    if (deviation === 'ABOVE') {
      scenarioName = "Hot Job Growth (Hawkish Tightening)";
      dxyBias = "BULLISH EXPANSION";
      goldBias = "BEARISH SWEEP";
      summary = "Employment figures print significantly above expectations. This reinforces the Federal Reserve's restrictive stance, sparking a wave of treasury bond yields which directly drains liquidity out of Spot Gold (XAUUSD).";
      steps = [
        "1. Instant spike in DXY sweeps the previous daily high liquidity.",
        "2. XAUUSD drops violently to mitigate the H4 bullish order block.",
        "3. Wait for 5m consolidation before entering any bounce plays."
      ];
      playbook = {
        entry: "Sell XAUUSD on pullbacks to $2335, or Buy DXY on retest.",
        sl: "$2346 on XAUUSD limit orders.",
        tp: "$2302 (Primary weekly liquid liquidity pool).",
        caution: "Slippage is extremely severe on high-impact NFP prints."
      };
    } else if (deviation === 'BELOW') {
      scenarioName = "Cooling Jobs (Rate Cut Frontrunning)";
      dxyBias = "BEARISH DISPLACEMENT";
      goldBias = "BULLISH BREAKOUT";
      summary = "Employment prints below expectations, confirming economic cooling. Swaps market will aggressively price in immediate rate cuts, triggering high-velocity fund inflows into non-yielding safe-havens like Gold.";
      steps = [
        "1. DXY breaks structure to the downside, displacing below short-term support.",
        "2. Gold initiates a massive breakout, sweeping previous session buy-side liquidity.",
        "3. Price tests and holds the 15m Fair Value Gap before expansion."
      ];
      playbook = {
        entry: "Buy XAUUSD at $2352 (FVG trigger) with solid volume confirmation.",
        sl: "$2340 (Below structural low).",
        tp: "$2385 (Key resistance and daily range high).",
        caution: "Watch for false downside sweeps in the first 30 seconds."
      };
    } else {
      scenarioName = "Inline Employment (Chop & Reversion)";
      dxyBias = "NEUTRAL RANGEBOUND";
      goldBias = "CONSOLIDATION CHOP";
      summary = "Jobs report comes in close to expectations. No significant policy deviation is implied. Markets will experience initial two-sided whipsaw before reverting to the day's starting ranges.";
      steps = [
        "1. Two-sided stop hunt sweeps both Asian session highs and lows.",
        "2. Price-delivery algorithm stabilizes near the daily opening price.",
        "3. Spreads widen but trend direction remains highly consolidative."
      ];
      playbook = {
        entry: "Mean-reversion scalp plays on XAUUSD boundaries.",
        sl: "$12 below/above entry zone.",
        tp: "Daily equilibrium price level ($2340 area).",
        caution: "High spreads during the first 10 minutes make scalping dangerous."
      };
    }
  } else if (cleanTitle.includes("CPI") || cleanTitle.includes("INFLATION") || cleanTitle.includes("PCE")) {
    if (deviation === 'ABOVE') {
      scenarioName = "Inflation Heatwave (Hawkish Pivot)";
      dxyBias = "AGGRESSIVE BULLISH EXPANSION";
      goldBias = "BEARISH DISTRIBUTION";
      summary = "Inflation measures come in higher than forecasted. This locks the central bank into a prolonged restrictive policy, driving up real yields and initiating aggressive distribution in Gold.";
      steps = [
        "1. DXY expands upward, breaching and holding above the weekly pivot.",
        "2. Gold collapses to sweep Sell-Side Liquidity (SSL) below previous daily lows.",
        "3. Retests the newly formed bearish order block before continuing lower."
      ];
      playbook = {
        entry: "Short positions on XAUUSD on retests of $2328.",
        sl: "$2342 (Above structural break).",
        tp: "$2295 (Major historical support).",
        caution: "Institutional sellers will attempt to fill blocks at premium prices."
      };
    } else if (deviation === 'BELOW') {
      scenarioName = "Disinflation Confirmation (Dovish Rally)";
      dxyBias = "BEARISH BREAKDOWN";
      goldBias = "EXPLOSIVE BULLISH EXPANSION";
      summary = "Inflation prints cooler than expected. The market celebrates the return of price stability, boosting confidence in upcoming policy easing, pushing capital out of cash and into Gold and BTC.";
      steps = [
        "1. Immediate sell-off in DXY triggers institutional stop run.",
        "2. Gold breaks out of H1 consolidation with strong volume displacement.",
        "3. Tap and go off the 5m Bullish Mitigation Block."
      ];
      playbook = {
        entry: "Buy XAUUSD at $2362 or BTCUSD at 67,800 on support retests.",
        sl: "$2349 (Gold) / 66,500 (BTC).",
        tp: "$2398 (Gold) / 70,500 (BTC).",
        caution: "Avoid FOMO entries at absolute range highs; wait for the first pullback."
      };
    } else {
      scenarioName = "Inline Inflation (Stable Pricing)";
      dxyBias = "STABLE MEAN REVERSION";
      goldBias = "SIDEWAYS COMPRESSION";
      summary = "Inflation is matching consensus exactly. Policy-makers are vindicated, and capital flows remain calm. Suitable for short-term range-bound grid strategies.";
      steps = [
        "1. Markets test the session high and are immediately rejected.",
        "2. Institutional algorithmic buying absorbs any major downside moves.",
        "3. Price coils tightly within a symmetric triangle pattern."
      ];
      playbook = {
        entry: "Sell the range highs, buy the range lows on XAUUSD ($2330-$2350).",
        sl: "$10 beyond range boundaries.",
        tp: "Midpoint of the range ($2340).",
        caution: "Spreads may remain elevated despite low directional bias."
      };
    }
  } else if (cleanTitle.includes("FOMC") || cleanTitle.includes("RATE") || cleanTitle.includes("DECISION") || cleanTitle.includes("FED") || cleanTitle.includes("BOE") || cleanTitle.includes("ECB")) {
    if (deviation === 'ABOVE') {
      scenarioName = "Hawkish Stance / Surprise Rate Hike";
      dxyBias = "EXTREME BULLISH EXPANSION";
      goldBias = "LIQUIDATION RUN LOWER";
      summary = "The central bank delivers a hawkish statement or higher interest rates. This is highly restrictive, creating a global capital squeeze and initiating liquidation sweeps across all safe-haven and crypto assets.";
      steps = [
        "1. Mass liquidation triggers cascading sell stops on Gold and BTC.",
        "2. DXY climbs vertically, creating multiple hourly Fair Value Gaps.",
        "3. Major institutional order blocks are breached with no signs of mitigation."
      ];
      playbook = {
        entry: "Short sell limit orders on XAUUSD on minor relief rallies.",
        sl: "$25 above entry.",
        tp: "$2260 (Extremely strong macro support pool).",
        caution: "Do not attempt to catch falling knives or buy local dips."
      };
    } else if (deviation === 'BELOW') {
      scenarioName = "Dovish Pivot / Surprise Rate Cut";
      dxyBias = "SUDDEN LIQUIDITY CRASH";
      goldBias = "PARABOLIC MACRO EXPANSION";
      summary = "The central bank announces lower rates or a highly accommodative dovish statement. This instantly devalues cash holdings, triggering parabolic capital allocation into Gold and Bitcoin.";
      steps = [
        "1. Vertically rising bid prices on Gold break all intermediate resistance levels.",
        "2. Dollar Index experiences deep, multi-day structure breaks.",
        "3. Institutional algorithms aggressively hunt short-sellers' stop-losses."
      ];
      playbook = {
        entry: "Aggressive Buy Market entry or limit buys on any minor 1m dip.",
        sl: "$20 below entry.",
        tp: "$2410 (All-time high target).",
        caution: "Slippage can be extreme on buy limits; market execution is safer."
      };
    } else {
      scenarioName = "Inline Decision (Press Conference Catalyst)";
      dxyBias = "HIGH-VOLATILITY SWING";
      goldBias = "TWO-SIDED WHIPSAW";
      summary = "The rate decision matches forecast exactly. All attention shifts to the live press conference. Prepare for dual-sided liquidity sweeps as the chair speaks in real-time.";
      steps = [
        "1. Initial statement release sparks standard volatility sweeps.",
        "2. Live comments from the chair trigger sudden, massive 200-pip trend reversals.",
        "3. Price action is highly erratic and non-directional until the press conference ends."
      ];
      playbook = {
        entry: "Wait until 30 minutes after the press conference before initiating positions.",
        sl: "Keep stops wide ($25+) if active during the press conference.",
        tp: "Focus on weekly high/low sweeps.",
        caution: "Standard technical analysis fails during the live speaker session."
      };
    }
  } else {
    // General high/medium news
    if (deviation === 'ABOVE') {
      scenarioName = "Positive Economic Catalyst (Better than expected)";
      dxyBias = cleanCountry === "USD" ? "STRENGTH" : "WEAKNESS VS BASKET";
      goldBias = cleanCountry === "USD" ? "MODERATE PRESSURE" : "MODERATE SUPPORT";
      summary = `The economic metric for ${country} prints higher than expected. This indicates economic strength, bolstering the currency and putting minor pressure on safe-havens like Spot Gold.`;
      steps = [
        "1. Currency index rises instantly, testing local session resistance levels.",
        "2. Retests and consolidates above the daily opening price."
      ];
      playbook = {
        entry: `Buy ${cleanCountry} crosses on structure retests.`,
        sl: "30 pips below entry.",
        tp: "Previous day high target.",
        caution: "Ensure the deviation is substantial enough to sustain the trend."
      };
    } else if (deviation === 'BELOW') {
      scenarioName = "Negative Economic Catalyst (Economic Slowdown)";
      dxyBias = cleanCountry === "USD" ? "WEAKNESS" : "STRENGTH VS BASKET";
      goldBias = cleanCountry === "USD" ? "MODERATE SUPPORT" : "MODERATE PRESSURE";
      summary = `The ${country} economic release prints below consensus. This sparks local economic slowing concerns, pushing investors to allocate capital into safe-haven gold or stronger currencies.`;
      steps = [
        "1. Immediate structural break on local currency charts.",
        "2. Money flows redirect into safety plays and Gold."
      ];
      playbook = {
        entry: `Short ${cleanCountry} crosses or Buy Gold.`,
        sl: "25 pips on forex crosses.",
        tp: "Local support floor pools.",
        caution: "Check for counter-moves during London/NY session crossovers."
      };
    } else {
      scenarioName = "Inline Release (Quiet Session)";
      dxyBias = "FLATLINE CONSOLIDATION";
      goldBias = "STEADY RANGE";
      summary = `The ${country} release prints exactly as expected. No capital reallocation is triggered, and price continues in its pre-release consolidative structure.`;
      steps = [
        "1. Low volume profile remains active near the session Point of Control (POC).",
        "2. Technical support and resistance levels hold firmly."
      ];
      playbook = {
        entry: "Maintain existing swing positions. No news-based execution required.",
        sl: "Standard structure stop.",
        tp: "Existing swing targets.",
        caution: "Avoid over-trading quiet sessions."
      };
    }
  }

  return { scenarioName, dxyBias, goldBias, summary, steps, playbook };
}

export default function App() {
  // --- GENERAL STATE ---
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<Date>(new Date());
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [selectedPrimaryModel, setSelectedPrimaryModel] = useState<string>('gemini-3.5-flash');
  const [selectedSecondaryModel, setSelectedSecondaryModel] = useState<string>('llama-3.3-70b-versatile');

  // --- NEWS EVENTS FEED STATE ---
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');

  // --- ACTIVE ANALYSIS STATE ---
  const [selectedEvent, setSelectedEvent] = useState<NewsEvent | null>(null);
  const [analysisData, setAnalysisData] = useState<EventAnalysisData | null>(null);
  const [simulatedDeviation, setSimulatedDeviation] = useState<'ABOVE' | 'BELOW' | 'INLINE'>('ABOVE');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- CUSTOM INJECTION STATE ---
  const [customTitle, setCustomTitle] = useState('');
  const [customCountry, setCustomCountry] = useState('USD');
  const [customImpact, setCustomImpact] = useState<'High' | 'Medium' | 'Low'>('High');
  const [customForecast, setCustomForecast] = useState('');
  const [customPrevious, setCustomPrevious] = useState('');
  const [customDate, setCustomDate] = useState('2026-06-28');
  const [customTime, setCustomTime] = useState('12:30pm');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // --- AUDIO VOCALIZER STATE ---
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [activeSpeechTurn, setActiveSpeechTurn] = useState<number | null>(null);
  const speechUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  // --- REFERENCES ---
  const analysisPanelRef = useRef<HTMLDivElement>(null);

  // --- FETCH INITIAL ECONOMIC EVENTS & LIVE PRICES ---
  useEffect(() => {
    fetchPrices();
    loadEconomicCalendar();

    // Direct Browser-to-Binance Live WebSocket connection for spot rates
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        setWsStatus('RECONNECTING');
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
        
        ws.onopen = () => {
          setWsStatus('CONNECTED');
          console.log('Connected to Binance Live WebSocket for zero-lag spot rates');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.c) {
              const wsPrice = parseFloat(data.c);
              const changePercent = parseFloat(data.P) || 0;
              const change = parseFloat(data.p) || 0;
              const high = parseFloat(data.h) || wsPrice;
              const low = parseFloat(data.l) || wsPrice;

              if (!isNaN(wsPrice) && wsPrice > 0) {
                setPrices(prev => ({
                  ...prev,
                  'BTCUSD': {
                    price: wsPrice,
                    change,
                    changePercent,
                    high,
                    low,
                    history: prev['BTCUSD']?.history ? [...prev['BTCUSD'].history.slice(-19), wsPrice] : [wsPrice],
                    isSimulated: false,
                    tickDir: prev['BTCUSD']?.price ? (wsPrice > prev['BTCUSD'].price ? 'up' : wsPrice < prev['BTCUSD'].price ? 'down' : 'stable') : 'stable'
                  }
                }));
                const now = new Date();
                setLastUpdateTime(now.toTimeString().split(' ')[0]);
              }
            }
          } catch (e) {
            // ignore JSON parse errors
          }
        };

        ws.onclose = () => {
          setWsStatus('DISCONNECTED');
          console.warn('Binance WebSocket closed. Reconnecting in 3s...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        console.error('Failed to create Binance WebSocket:', err);
      }
    };

    connectWebSocket();

    // UTC clock
    const clockInterval = setInterval(() => {
      setUtcTime(new Date());
    }, 1000);

    // Fetch prices periodically (acts as fallback and pulls non-crypto prices)
    const priceInterval = setInterval(() => {
      fetchPrices();
    }, 3000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(priceInterval);
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      stopDebateSpeech();
    };
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      if (data.success) {
        setPrices(prev => {
          // Merge websocket-updated BTCUSD with the fetched prices
          const merged = { ...data.prices };
          if (prev['BTCUSD'] && !prev['BTCUSD'].isSimulated) {
            merged['BTCUSD'] = prev['BTCUSD'];
          }
          return merged;
        });
      }
    } catch (e) {
      console.error('Failed to fetch prices');
    }
  };

  const loadEconomicCalendar = async () => {
    setIsNewsLoading(true);
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success && data.rawEvents) {
        setNewsEvents(data.rawEvents);
        // Auto-select first High Impact event or first event on load
        const defaultEvent = data.rawEvents.find((e: NewsEvent) => e.impact === 'High') || data.rawEvents[0];
        if (defaultEvent) {
          triggerEventAnalysis(defaultEvent);
        }
      }
    } catch (e) {
      console.error('Failed to load economic events');
    } finally {
      setIsNewsLoading(false);
    }
  };

  const triggerEventAnalysis = async (event: NewsEvent) => {
    setSelectedEvent(event);
    setIsAnalyzing(true);
    setAnalysisData(null);
    stopDebateSpeech();

    try {
      const res = await fetch('/api/analyze-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          primaryModel: selectedPrimaryModel,
          secondaryModel: selectedSecondaryModel
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAnalysisData(data.data);
      } else {
        console.error('Failed to analyze event');
      }
    } catch (e) {
      console.error('Error in event analysis call', e);
    } finally {
      setIsAnalyzing(false);
      // Scroll to view on smaller screens
      setTimeout(() => {
        if (analysisPanelRef.current) {
          analysisPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  };

  // --- TEXT TO SPEECH DEBATE VOCALIZER ---
  const startDebateSpeech = () => {
    if (!analysisData || !analysisData.debateTranscript) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert("Text-to-speech is not supported in this browser environment.");
      return;
    }

    stopDebateSpeech();
    setIsPlayingSpeech(true);
    speechUtterancesRef.current = [];

    const voices = window.speechSynthesis.getVoices();
    
    // Attempt to pick alternate voices for the two different AI brains
    // Vance (Macro Hawk) -> British / older voice if possible
    // Silas (SMC Quant) -> American / dynamic voice if possible
    const macroHawkVoice = voices.find(v => v.lang.includes('GB') || v.name.includes('Daniel') || v.name.includes('Vocalizer')) || voices[0];
    const smcQuantVoice = voices.find(v => v.lang.includes('US') || v.name.includes('Google US English') || v.name.includes('Microsoft David')) || voices[0];

    analysisData.debateTranscript.forEach((turn, idx) => {
      const textToSpeak = `${turn.speaker} says: ${turn.text}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      if (turn.speaker === 'Macro Hawk') {
        if (macroHawkVoice) utterance.voice = macroHawkVoice;
        utterance.pitch = 0.95; // slightly lower
        utterance.rate = 0.95; // formal tempo
      } else {
        if (smcQuantVoice) utterance.voice = smcQuantVoice;
        utterance.pitch = 1.15; // younger energetic
        utterance.rate = 1.05; // rapid technical tempo
      }

      utterance.onstart = () => {
        setActiveSpeechTurn(idx);
      };

      utterance.onend = () => {
        if (idx === analysisData.debateTranscript.length - 1) {
          setIsPlayingSpeech(false);
          setActiveSpeechTurn(null);
        }
      };

      utterance.onerror = () => {
        setIsPlayingSpeech(false);
        setActiveSpeechTurn(null);
      };

      speechUtterancesRef.current.push(utterance);
    });

    // Speak sequentially
    speechUtterancesRef.current.forEach(utt => {
      window.speechSynthesis.speak(utt);
    });
  };

  const stopDebateSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingSpeech(false);
    setActiveSpeechTurn(null);
    speechUtterancesRef.current = [];
  };

  // --- DEPLOY CUSTOM NEWS HEADLINE ---
  const handleDeployCustomNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newEvent: NewsEvent = {
      title: customTitle.trim(),
      country: customCountry,
      impact: customImpact,
      forecast: customForecast.trim() || 'N/A',
      previous: customPrevious.trim() || 'N/A',
      date: customDate || '2026-06-28',
      time: customTime.trim() || '12:30pm'
    };

    // Prepend to current news events list
    setNewsEvents(prev => [newEvent, ...prev]);
    setCustomTitle('');
    setCustomForecast('');
    setCustomPrevious('');
    setShowCustomForm(false);

    // Trigger analysis instantly
    triggerEventAnalysis(newEvent);
  };

  // Filter events based on search query and impact selection
  const filteredEvents = newsEvents.filter(evt => {
    const matchesSearch = evt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          evt.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesImpact = impactFilter === 'ALL' || evt.impact === impactFilter;
    return matchesSearch && matchesImpact;
  });

  return (
    <div className="min-h-screen bg-[#040609] text-slate-300 flex flex-col font-sans antialiased selection:bg-amber-500/10 selection:text-amber-400">
      
      {/* 1. TOP DOCK STREAMING TICKER */}
      <div className="bg-[#020305] border-b border-slate-900 px-6 py-2 flex items-center justify-between gap-4 overflow-hidden shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">LIVE QUOTE HUB:</span>
        </div>
        
        {/* Quote tape */}
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none py-1 text-[11px] font-mono flex-1 px-4">
          {Object.keys(prices).length === 0 ? (
            <span className="text-slate-600 text-[10px]">Interlocking institutional liquidity feeds...</span>
          ) : (
            Object.entries(prices).map(([symbol, rawData]) => {
              const data = rawData as PriceData;
              const isUp = (data?.change ?? 0) >= 0;
              const dec = symbol === 'BTCUSD' ? 0 : symbol === 'XAUUSD' ? 2 : 4;
              return (
                <div key={symbol} className="flex items-center gap-1.5 whitespace-nowrap bg-slate-950/40 border border-slate-900/60 px-2.5 py-1 rounded-md">
                  <span className="text-slate-400 font-bold">{symbol}</span>
                  <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(data?.price ?? 0).toFixed(dec)}
                  </span>
                  <span className={`text-[9px] font-bold flex items-center ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {isUp ? '+' : ''}{(data?.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* WebSocket Signal Status */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-slate-500 font-mono tracking-wider">WS LINK:</span>
          <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
            wsStatus === 'CONNECTED' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : wsStatus === 'RECONNECTING'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {wsStatus}
          </span>
        </div>
      </div>

      {/* 2. PRIMARY SYSTEM HEADER */}
      <header className="px-6 py-4 bg-slate-950/80 border-b border-slate-900/80 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Cpu className="w-5 h-5 animate-pulse" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-lg tracking-wider text-white">JARVIS</h1>
              <span className="font-mono text-[9px] font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500 text-slate-950">NEWS COGNITIVE LAB</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Macro Debate Panel & Interactive Probability Analyzer</p>
          </div>
        </div>

        {/* Clocks & Indicators */}
        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Live System Sync</span>
            <span className="text-slate-300 font-semibold flex items-center gap-1.5 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              SENSORS ENGAGED
            </span>
          </div>

          <div className="flex flex-col items-end border-l border-slate-900 pl-5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Universal Clock</span>
            <span className="text-slate-200 font-bold text-[11px] tracking-wide">
              {utcTime.getUTCHours().toString().padStart(2, '0')}:
              {utcTime.getUTCMinutes().toString().padStart(2, '0')}:
              {utcTime.getUTCSeconds().toString().padStart(2, '0')} <span className="text-amber-500 font-bold">UTC</span>
            </span>
          </div>

          <div className="flex flex-col items-end border-l border-slate-900 pl-5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Brain Cores</span>
            <span className="text-amber-400 text-[10px] font-semibold tracking-tight uppercase">2 ACTIVE SYNAPSE NODES</span>
          </div>
        </div>
      </header>

      {/* 3. PRIMARY AREA WORKSPACE */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-y-auto">
        
        {/* LEFT COLUMN: CATALYST NEWS FEED (col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Stats Panel */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-900 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Economic Events Listed</span>
                <span className="text-lg font-display font-black text-white">{newsEvents.length || '...'} Release Triggers</span>
              </div>
            </div>
            
            <button
              onClick={loadEconomicCalendar}
              disabled={isNewsLoading}
              className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Refresh News Stream"
            >
              <RefreshCw className={`w-4 h-4 ${isNewsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* AI Cognitive Cores Routing Panel */}
          <div className="bg-slate-950/80 border border-slate-900/60 rounded-xl p-4.5 shadow-lg space-y-3.5">
            <div className="flex items-center gap-2.5 border-b border-slate-900/80 pb-2">
              <div className="relative">
                <Cpu className="w-4 h-4 text-amber-500" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <div>
                <span className="text-[10.5px] font-mono font-bold text-white uppercase tracking-wider block">AI COGNITIVE ROUTING CONTROLLER</span>
                <span className="text-[8.5px] font-mono text-slate-500 block leading-none">Allocate specific model nodes for news panel debates</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Dr. Vance Model Selector */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-mono font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></span>
                  Dr. Vance (Macro Hawk)
                </label>
                <select
                  value={selectedPrimaryModel}
                  onChange={e => setSelectedPrimaryModel(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-900/80 rounded-lg text-[10.5px] text-slate-300 focus:outline-none focus:border-amber-500/50 font-mono font-medium"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Preferred)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (High Availability)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Advanced)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                </select>
              </div>

              {/* Silas Thorne Model Selector */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-mono font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                  Silas Thorne (SMC Quant)
                </label>
                <select
                  value={selectedSecondaryModel}
                  onChange={e => setSelectedSecondaryModel(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-900/80 rounded-lg text-[10.5px] text-slate-300 focus:outline-none focus:border-amber-500/50 font-mono font-medium"
                >
                  <option value="llama-3.3-70b-versatile">Llama-3.3 70B (Groq / Default)</option>
                  <option value="llama-3.1-8b-instant">Llama-3.1 8B (Groq Free)</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B (Groq Free)</option>
                  <option value="gemma2-9b-it">Gemma-2 9B (Groq Free)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Injector Button / Trigger */}
          <div className="border border-dashed border-slate-800/80 p-3 rounded-xl hover:border-amber-500/30 transition-all">
            {!showCustomForm ? (
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full py-2.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-[10px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Deploy Custom Headline Analysis
              </button>
            ) : (
              <motion.form 
                onSubmit={handleDeployCustomNews}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-2 font-sans"
              >
                <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Custom News Deployer
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowCustomForm(false)}
                    className="text-[9px] text-slate-500 hover:text-white uppercase font-mono"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] font-mono font-bold uppercase text-slate-500">Headline/Release Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Trump Announces Sudden Tariffs on Major US Trading Allies..."
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono font-bold uppercase text-slate-500">Currency/Country</label>
                    <select
                      value={customCountry}
                      onChange={e => setCustomCountry(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    >
                      <option value="USD">USD (United States)</option>
                      <option value="EUR">EUR (Eurozone)</option>
                      <option value="GBP">GBP (United Kingdom)</option>
                      <option value="JPY">JPY (Japan)</option>
                      <option value="CAD">CAD (Canada)</option>
                      <option value="AUD">AUD (Australia)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono font-bold uppercase text-slate-500">Impact Tier</label>
                    <select
                      value={customImpact}
                      onChange={e => setCustomImpact(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    >
                      <option value="High">🔴 HIGH Impact</option>
                      <option value="Medium">🟡 MEDIUM Impact</option>
                      <option value="Low">⚪ LOW Impact</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono font-bold uppercase text-slate-500">Forecast Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 0.2%"
                      value={customForecast}
                      onChange={e => setCustomForecast(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono font-bold uppercase text-slate-500">Previous Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 0.3%"
                      value={customPrevious}
                      onChange={e => setCustomPrevious(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono font-bold uppercase text-slate-500">Scheduled Date</label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono font-bold uppercase text-slate-500">Scheduled Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 12:30pm"
                      value={customTime}
                      onChange={e => setCustomTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 text-slate-950 font-mono font-bold text-[10px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 hover:bg-amber-400 transition-all cursor-pointer"
                >
                  <Cpu className="w-3 h-3" /> Inject & Synthesize Now
                </button>
              </motion.form>
            )}
          </div>

          {/* MAIN ECONOMIC NEWS RELEASES CONTAINER */}
          <div className="bg-slate-950/60 border border-slate-900/80 rounded-xl p-4 shadow-xl backdrop-blur-sm space-y-4">
            
            {/* Header controls inside feed */}
            <div className="flex flex-col gap-2 border-b border-slate-900 pb-3">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">MACROECONOMIC CATALYST FEED</span>
              
              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by country or release title..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-800"
                />
              </div>

              {/* Impact filter tabs */}
              <div className="flex bg-[#030507] p-0.5 rounded-lg border border-slate-900 text-[9px] font-mono font-bold tracking-wider">
                {(['ALL', 'High', 'Medium', 'Low'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setImpactFilter(tab)}
                    className={`flex-1 py-1 rounded transition-all cursor-pointer ${
                      impactFilter === tab 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab === 'ALL' ? 'ALL IMPACT' : tab.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* List of releases */}
            {isNewsLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-xs text-slate-500 font-mono">Aggregating global central bank schedules...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-20 text-center text-slate-600 space-y-2">
                <Globe className="w-6 h-6 text-slate-800 mx-auto" />
                <p className="text-xs font-mono">No matching economic releases located in feed.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredEvents.map((evt, idx) => {
                  const isActive = selectedEvent?.title === evt.title;
                  const isHigh = evt.impact === 'High';
                  const isMedium = evt.impact === 'Medium';
                  
                  return (
                    <motion.div
                      key={`${evt.title}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => triggerEventAnalysis(evt)}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-300 cursor-pointer flex flex-col gap-2.5 relative group ${
                        isActive
                          ? 'bg-gradient-to-br from-[#121926] to-[#0a101d] border-amber-500/40 shadow-md'
                          : 'bg-slate-950/40 border-slate-900/80 hover:bg-[#070b12] hover:border-slate-800'
                      }`}
                    >
                      {/* Top info row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                            {evt.country}
                          </span>
                          <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                            isHigh 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : isMedium 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            {isHigh && <Flame className="w-2.5 h-2.5 animate-pulse text-rose-400" />}
                            {evt.impact}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                          <span>F: <span className="text-slate-300">{evt.forecast}</span></span>
                          <span className="text-slate-800">|</span>
                          <span>P: <span className="text-slate-300">{evt.previous}</span></span>
                        </div>
                      </div>

                      {/* Headline Title */}
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-bold font-sans transition-colors ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                          {evt.title}
                        </p>
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isActive ? 'text-amber-400 translate-x-1' : 'text-slate-600 group-hover:text-slate-400'
                        }`} />
                      </div>

                      {/* Scheduled Time Badges with Bangladesh Local Time */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-900/40 pt-2 mt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-2.5 h-2.5 text-slate-600" />
                          <span>{evt.date || 'Today'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-2.5 h-2.5 text-amber-500/80" />
                          <span>{evt.time || 'TBD'}</span>
                          {evt.date && evt.time && (
                            <span className="text-[8px] bg-amber-500/5 border border-amber-500/25 text-amber-400 px-1.5 py-0.2 rounded font-bold scale-95 ml-1">
                              BDT: {formatEventTimes(evt.date, evt.time).bdt.split(' at ')[1].split(' (')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Static informational card */}
          <div className="bg-slate-950/20 border border-slate-900 p-4 rounded-xl text-[10px] text-slate-500 font-mono flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              WARNING: News events create severe volatility sweeps. Direct high frequency feeds may experience latency expansion of up to 450ms. Never maintain limit triggers across major releases without trailing parameters.
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: ACTIVE DEBATE & PROBABILITY FORECAST (col-span-7) */}
        <div ref={analysisPanelRef} className="lg:col-span-7 space-y-6">
          
          <AnimatePresence mode="wait">
            {!selectedEvent ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-slate-900/20 border border-slate-900/60 rounded-xl p-16 text-center space-y-4 shadow-xl backdrop-blur-sm"
              >
                <Compass className="w-12 h-12 text-slate-700 animate-spin mx-auto" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-400">JARVIS SENSORS STANDBY</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Select any macroeconomic catalyst release from the left panel feed, or deploy your own custom news to trigger the live debate and probability analysis.
                </p>
              </motion.div>
            ) : isAnalyzing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-[#070b12]/60 border border-slate-900 rounded-xl p-16 text-center space-y-5 shadow-2xl backdrop-blur-md"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin"></div>
                  <Cpu className="w-6 h-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">Synapse Core Alignment in Progress</h3>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Connecting Dr. Vance & Silas Thorne to aggregate historical reaction parameters for <b>{selectedEvent.title}</b>...
                  </p>
                </div>
                <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </motion.div>
            ) : analysisData ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                
                {/* ACTIVE CATALYST DEBRIEFING HEADER CARD */}
                <div className="bg-gradient-to-r from-slate-950 via-[#0a0f18] to-slate-950 border border-slate-900 p-5 rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase tracking-widest">
                        ACTIVE CATALYST DISSECTION
                      </span>
                      <span className="text-slate-600 font-mono text-[9px]">|</span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Triggered just now
                      </span>
                    </div>

                    {/* Speech Player Trigger */}
                    <button
                      onClick={isPlayingSpeech ? stopDebateSpeech : startDebateSpeech}
                      className={`px-3 py-1.5 rounded-lg font-mono font-bold text-[9.5px] uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPlayingSpeech 
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      }`}
                    >
                      {isPlayingSpeech ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          Stop Talking
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          🔊 Play AI Panel Debate
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      {selectedEvent.country} // {selectedEvent.impact.toUpperCase()} IMPACT TARGET
                    </span>
                    <h2 className="text-lg font-display font-black text-white leading-tight">
                      {selectedEvent.title}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px] font-mono">
                    <div className="bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-900">
                      <span className="text-slate-500 text-[9px] block uppercase">Forecast</span>
                      <span className="font-bold text-slate-200">{selectedEvent.forecast}</span>
                    </div>
                    <div className="bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-900">
                      <span className="text-slate-500 text-[9px] block uppercase">Previous</span>
                      <span className="font-bold text-slate-200">{selectedEvent.previous}</span>
                    </div>
                    <div className="bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-900">
                      <span className="text-slate-500 text-[9px] block uppercase">Consensus Bias</span>
                      <span className={`font-black uppercase flex items-center gap-1 ${
                        analysisData.consensusBias === 'BULLISH' 
                          ? 'text-emerald-400' 
                          : analysisData.consensusBias === 'BEARISH' 
                            ? 'text-rose-400' 
                            : 'text-amber-400'
                      }`}>
                        {analysisData.consensusBias === 'BULLISH' && <TrendingUp className="w-3 h-3" />}
                        {analysisData.consensusBias === 'BEARISH' && <TrendingDown className="w-3 h-3" />}
                        {analysisData.consensusBias}
                      </span>
                    </div>
                    <div className="bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-900">
                      <span className="text-slate-500 text-[9px] block uppercase">Danger Rating</span>
                      <span className="font-bold text-rose-400">
                        {selectedEvent.impact === 'High' ? 'CRITICAL HIGH' : selectedEvent.impact === 'Medium' ? 'ELEVATED' : 'STABLE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ADVANCED SUGGESTION & VOLATILITY TIMING RADAR */}
                <div className="bg-gradient-to-br from-[#020509] via-[#080e1a] to-[#020509] border border-amber-500/25 p-5 rounded-2xl shadow-2xl space-y-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                        DECISION CONGRUENCE & VOLATILITY TIMING
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono text-slate-500 bg-slate-950 border border-slate-900 px-2 py-0.5 rounded uppercase tracking-wider">
                      Target Currency: {selectedEvent.country}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    
                    {/* Recommendation Badge */}
                    <div className="md:col-span-5 bg-slate-950/40 border border-slate-900/80 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[9.5px] text-slate-500 font-mono font-bold uppercase tracking-wider">SYSTEM SUGGESTION</span>
                      
                      {(() => {
                        const bias = analysisData.consensusBias;
                        const bullP = analysisData.probabilities.bullishExpansion;
                        const bearP = analysisData.probabilities.bearishSweep;
                        
                        let verdict: 'STRONG BUY' | 'BUY' | 'WAIT' | 'SELL' | 'STRONG SELL' = 'WAIT';
                        let colorClass = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
                        let icon = <Clock className="w-5 h-5 text-amber-400" />;
                        let subtext = 'Consolidation expected. Wait for high-volume open.';

                        if (bias === 'BULLISH') {
                          if (bullP >= 60) {
                            verdict = 'STRONG BUY';
                            colorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
                            icon = <ArrowUpRight className="w-6 h-6 text-emerald-400" />;
                            subtext = 'Heavy institutional buy orders detected. High expansion potential.';
                          } else {
                            verdict = 'BUY';
                            colorClass = 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
                            icon = <TrendingUp className="w-5 h-5 text-emerald-500" />;
                            subtext = 'Moderate bullish structural support. Align with lower TF confirmation.';
                          }
                        } else if (bias === 'BEARISH') {
                          if (bearP >= 60) {
                            verdict = 'STRONG SELL';
                            colorClass = 'text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
                            icon = <ArrowDownRight className="w-6 h-6 text-rose-400" />;
                            subtext = 'Severe liquidity distribution. Expected sweep of sell-side pools.';
                          } else {
                            verdict = 'SELL';
                            colorClass = 'text-rose-500 border-rose-500/20 bg-rose-500/5';
                            icon = <TrendingDown className="w-5 h-5 text-rose-500" />;
                            subtext = 'Bearish trend bias valid. Restructure positions on premium test.';
                          }
                        } else {
                          verdict = 'WAIT';
                          colorClass = 'text-amber-400 border-amber-500/25 bg-amber-500/10';
                          icon = <Clock className="w-5 h-5 text-amber-400 animate-pulse" />;
                          subtext = 'High volatility range expansion. Sit on hands during initial sweep.';
                        }

                        return (
                          <div className="flex flex-col items-center space-y-2 w-full">
                            <div className={`px-4.5 py-3 rounded-xl border flex items-center gap-2.5 font-display font-black text-sm tracking-widest ${colorClass}`}>
                              {icon}
                              {verdict}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-medium px-2 max-w-[220px]">
                              {subtext}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Dual-Time Volatility Scheduler */}
                    <div className="md:col-span-7 space-y-3">
                      <span className="text-[9.5px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
                        EXPECTED VOLATILITY SWEEP WINDOW
                      </span>

                      {(() => {
                        const sched = formatEventTimes(selectedEvent.date, selectedEvent.time);
                        return (
                          <div className="space-y-3 text-xs font-mono">
                            {/* International / UTC Time */}
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-900 flex items-start gap-3">
                              <Globe className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                                  INTERNATIONAL TIME (UTC/GMT)
                                </span>
                                <p className="text-slate-200 font-bold text-[11px] leading-tight">
                                  {sched.utc}
                                </p>
                              </div>
                            </div>

                            {/* Bangladesh Time */}
                            <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/15 flex items-start gap-3">
                              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                                  BANGLADESH LOCAL TIME (BDT)
                                </span>
                                <p className="text-amber-300 font-black text-[11px] leading-tight">
                                  {sched.bdt}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* INTELLIGENT DEVIATION SCENARIO MODELER */}
                <div className="bg-slate-950/80 border border-slate-900 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-900/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                        INTELLIGENT DEVIATION SCENARIO MODELER
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 border border-slate-900 rounded uppercase tracking-wider">
                      Interactive Simulation Mode
                    </span>
                  </div>

                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans max-w-2xl">
                    Economic releases rarely match the forecast exactly. Toggle simulated outcome results below to pre-plan your execution triggers for both bullish and bearish structural deviations.
                  </p>

                  {/* Toggle switches */}
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 border border-slate-900 rounded-xl">
                    {(['ABOVE', 'BELOW', 'INLINE'] as const).map((dev) => {
                      const isActive = simulatedDeviation === dev;
                      let label = "ACTUAL > FORECAST";
                      let colorClass = "text-slate-400 hover:text-slate-200";
                      
                      if (dev === 'BELOW') {
                        label = "ACTUAL < FORECAST";
                      } else if (dev === 'INLINE') {
                        label = "ACTUAL = FORECAST";
                      }

                      if (isActive) {
                        if (dev === 'ABOVE') {
                          colorClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold shadow-[0_0_12px_rgba(16,185,129,0.1)]";
                        } else if (dev === 'BELOW') {
                          colorClass = "bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold shadow-[0_0_12px_rgba(239,68,68,0.1)]";
                        } else {
                          colorClass = "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold shadow-[0_0_12px_rgba(245,158,11,0.1)]";
                        }
                      }

                      return (
                        <button
                          key={dev}
                          onClick={() => setSimulatedDeviation(dev)}
                          className={`py-2 text-[9.5px] font-mono font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${colorClass}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Simulated Output details */}
                  {(() => {
                    const sim = getSimulatedScenario(selectedEvent.title, selectedEvent.country, simulatedDeviation);
                    
                    const isAboveActive = simulatedDeviation === 'ABOVE';
                    const isBelowActive = simulatedDeviation === 'BELOW';
                    
                    return (
                      <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl space-y-4">
                        {/* Scenario title header */}
                        <div className="flex items-center justify-between border-b border-slate-900/50 pb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                            <span className="text-[11px] font-bold text-white uppercase font-sans">
                              {sim.scenarioName}
                            </span>
                          </div>
                          <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${
                            isAboveActive 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : isBelowActive 
                                ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' 
                                : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                          }`}>
                            Projected Path: {simulatedDeviation} Consensus
                          </span>
                        </div>

                        {/* Summary of impact */}
                        <p className="text-[10.5px] text-slate-300 leading-relaxed font-sans bg-[#02050a]/40 p-3 rounded-lg border border-slate-900/60">
                          {sim.summary}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* BIASES & STEPS */}
                          <div className="space-y-3.5">
                            <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block border-b border-slate-900/40 pb-1">
                              ALGORITHMIC PRICE-DELIVERY PATH
                            </span>

                            <div className="space-y-2">
                              {sim.steps.map((st, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2.5 text-[10.5px] font-sans text-slate-300 leading-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></span>
                                  <span>{st}</span>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-[#020408] border border-slate-900/80 p-2.5 rounded-lg flex flex-col justify-between">
                                <span className="text-[8px] text-slate-500 font-mono font-bold uppercase tracking-wider block">DXY BIAS</span>
                                <span className={`text-[10px] font-mono font-bold uppercase ${
                                  sim.dxyBias.includes('BULLISH') || sim.dxyBias.includes('STRENGTH') ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {sim.dxyBias}
                                </span>
                              </div>
                              <div className="bg-[#020408] border border-slate-900/80 p-2.5 rounded-lg flex flex-col justify-between">
                                <span className="text-[8px] text-slate-500 font-mono font-bold uppercase tracking-wider block">GOLD / RISK ASSETS</span>
                                <span className={`text-[10px] font-mono font-bold uppercase ${
                                  sim.goldBias.includes('BULLISH') || sim.goldBias.includes('SUPPORT') || sim.goldBias.includes('EXPANSION') ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {sim.goldBias}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* SCALPING PLAYBOOK */}
                          <div className="bg-slate-950/60 border border-slate-900/80 p-4 rounded-xl space-y-3">
                            <span className="text-[9px] text-amber-400 font-mono font-bold uppercase tracking-wider block flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-amber-500" />
                              REAL-TIME SCALPING PLAYBOOK
                            </span>

                            <div className="space-y-2 text-[10.5px] font-sans">
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500">Execution Trigger:</span>
                                <span className="text-slate-200 font-semibold">{sim.playbook.entry}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500">Suggested Stop Loss:</span>
                                <span className="text-rose-400 font-bold">{sim.playbook.sl}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                <span className="text-slate-500">Projected Target (TP):</span>
                                <span className="text-emerald-400 font-bold">{sim.playbook.tp}</span>
                              </div>
                              <div className="flex items-start gap-1.5 text-[9.5px] font-mono text-slate-500 mt-1 leading-normal">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
                                <span>{sim.playbook.caution}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* DOUBLE COLUMN: PROBABILITIES & TARGETS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* QUANT MATHEMATICAL DESK (Probabilities) */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 shadow-lg space-y-4">
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-500" />
                      SYSTEM PROBABILITY ESTIMATES
                    </h3>

                    <div className="space-y-3.5 font-sans">
                      {/* Bullish Expansion */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Bullish Expansion Probability</span>
                          <span className="text-emerald-400 font-bold">{analysisData.probabilities.bullishExpansion}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analysisData.probabilities.bullishExpansion}%` }}></div>
                        </div>
                      </div>

                      {/* Bearish Sweep */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Bearish Stop Sweep Likelihood</span>
                          <span className="text-rose-400 font-bold">{analysisData.probabilities.bearishSweep}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${analysisData.probabilities.bearishSweep}%` }}></div>
                        </div>
                      </div>

                      {/* Volatility Danger Index */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Spread Slippage / Volatility Index</span>
                          <span className="text-amber-400 font-bold">{analysisData.probabilities.volatilityDangerIndex}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${analysisData.probabilities.volatilityDangerIndex}%` }}></div>
                        </div>
                      </div>

                      {/* Liquidity Grab Likelihood */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Prior Liquidity Hunt Likelihood</span>
                          <span className="text-indigo-400 font-bold">{analysisData.probabilities.liquidityGrabProb}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${analysisData.probabilities.liquidityGrabProb}%` }}></div>
                        </div>
                      </div>

                      {/* Rate Policy Shift */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Central Bank Statement Pivot Prob</span>
                          <span className="text-cyan-400 font-bold">{analysisData.probabilities.interestRateShiftProb}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${analysisData.probabilities.interestRateShiftProb}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LIQUIDITY & PRICE TARGETS */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 shadow-lg flex flex-col justify-between gap-4">
                    <div className="space-y-4">
                      <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-500" />
                        INSTITUTIONAL TARGET MAP
                      </h3>

                      <div className="space-y-3 font-mono text-xs">
                        {/* Upper Target */}
                        <div className="flex items-start gap-2 bg-slate-900/35 p-2.5 rounded-lg border border-slate-900">
                          <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Upper Expansion Target</span>
                            <span className="text-slate-200 font-bold">{analysisData.targets.upperTarget}</span>
                          </div>
                        </div>

                        {/* Lower Target */}
                        <div className="flex items-start gap-2 bg-slate-900/35 p-2.5 rounded-lg border border-slate-900">
                          <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Lower Stop Sweep Target</span>
                            <span className="text-slate-200 font-bold">{analysisData.targets.lowerTarget}</span>
                          </div>
                        </div>

                        {/* Core Magnet */}
                        <div className="flex items-start gap-2 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/10">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9.5px] text-amber-500/90 block uppercase font-bold">Core Liquidity Pool / OB Zone</span>
                            <span className="text-amber-400 font-bold">{analysisData.targets.liquidityZone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9.5px] font-mono text-slate-500 flex items-center gap-1.5 border-t border-slate-900 pt-2.5">
                      <Scale className="w-3 h-3 text-slate-600" />
                      <span>Consensus validated by dual network nodes.</span>
                    </div>
                  </div>

                </div>

                {/* THE PANEL DEBATE DIALOGUE WORKSPACE (Dr. Marcus Vance vs Silas Thorne) */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div>
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-amber-500" />
                        LIVE PANEL INTEL TRANSCRIPT
                      </h3>
                      <p className="text-[9.5px] text-slate-500 font-sans mt-0.5">Macro Policy Specialist vs SMC Algorithmic Trader debate</p>
                    </div>

                    <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                      SECURE FEED
                    </span>
                  </div>

                  {/* Panelists intro heads */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-900/30 p-3 rounded-xl border border-slate-900 text-xs">
                    <div className="flex items-center gap-2.5 border-r border-slate-900 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        MH
                      </div>
                      <div>
                        <span className="font-bold text-slate-200 block">Dr. Marcus Vance</span>
                        <span className="text-[8.5px] text-indigo-400 font-mono font-bold uppercase tracking-wide">Macro Hawk Core</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pl-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        SQ
                      </div>
                      <div>
                        <span className="font-bold text-slate-200 block">Silas Thorne</span>
                        <span className="text-[8.5px] text-emerald-400 font-mono font-bold uppercase tracking-wide">SMC Quant Core</span>
                      </div>
                    </div>
                  </div>

                  {/* Dialogue Stream */}
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {analysisData.debateTranscript.map((turn, idx) => {
                      const isMacro = turn.speaker === 'Macro Hawk';
                      const isSpeaking = activeSpeechTurn === idx;
                      
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`flex gap-3 text-xs leading-relaxed p-3.5 rounded-xl border transition-all duration-300 ${
                            isSpeaking
                              ? 'bg-amber-500/5 border-amber-500/35 shadow-inner scale-[1.01]'
                              : 'bg-[#030508]/40 border-slate-900/60'
                          }`}
                        >
                          {/* Left icon */}
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-mono font-black text-xs border ${
                            isMacro 
                              ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400' 
                              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {isMacro ? 'MH' : 'SQ'}
                          </div>

                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-mono font-bold text-[9px] uppercase tracking-wider ${
                                isMacro ? 'text-indigo-400' : 'text-emerald-400'
                              }`}>
                                {turn.speaker} // Specialist Node
                              </span>
                              
                              {isSpeaking && (
                                <span className="text-[8px] font-mono text-amber-400 animate-pulse font-bold tracking-widest uppercase flex items-center gap-1">
                                  <Volume2 className="w-2.5 h-2.5 animate-bounce" /> Vocalizing...
                                </span>
                              )}
                            </div>
                            <p className="text-slate-300 leading-relaxed font-sans">{turn.text}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* MACRO IMPACT NARRATIVE SUMMARY */}
                <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl shadow-xl space-y-2.5">
                  <span className="text-amber-500 font-mono font-bold uppercase text-[9px] block tracking-widest">
                    SYSTEM ANALYTICAL WRAP-UP
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {analysisData.macroImpactAnalysis}
                  </p>
                </div>

              </motion.div>
            ) : null}
          </AnimatePresence>

        </div>

      </main>

      {/* 4. UNIFIED INSTITUTIONAL FOOTER */}
      <footer className="border-t border-slate-950 bg-[#020305] px-6 py-4 text-center text-[10px] text-slate-500 font-mono shrink-0">
        <p>© 2026 JARVIS COGNITIVE CODESYSTEMS. ADVANCED NEWS ANALYSIS DECK.</p>
        <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-600">
          Economic calendar events are compiled dynamically via deep-learning semantic parsing. PERSISTENCE LAYER CACHED ON CLIENT CONTEXT.
        </p>
      </footer>

    </div>
  );
}
