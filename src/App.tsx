import React, { useState, useEffect, useRef } from 'react';
import { PriceData, Trade, ScanResult, SignalItem, NewsEvent, NewsAnalysis, ChatMessage } from './types';
import { Sparkles, Monitor, PlusCircle } from 'lucide-react';

// Sub-components
import Header from './components/Header';
import Watchlist from './components/Watchlist';
import Mt5Integration from './components/Mt5Integration';
import SmcScanner from './components/SmcScanner';
import EconomicCalendar from './components/EconomicCalendar';
import JournalCalculator from './components/JournalCalculator';
import ChatDrawer from './components/ChatDrawer';

// Premium SMC Upgrades
import CurrencyStrength from './components/CurrencyStrength';
import SmcStructureCanvas from './components/SmcStructureCanvas';
import FibSizer from './components/FibSizer';
import SmcBacktester from './components/SmcBacktester';

export default function App() {
  // --- STREAMLINED TABS ---
  const [activeTab, setActiveTab] = useState<'terminal' | 'scanner' | 'calendar' | 'journal'>('terminal');

  // --- GENERAL STATE ---
  const [hasApiKey, setHasApiKey] = useState(true);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [isPricesLoading, setIsPricesLoading] = useState(true);

  // --- TRADINGVIEW & CHART SELECTION ---
  const [selectedPair, setSelectedPair] = useState<string>('BTCUSD');
  const [chartType, setChartType] = useState<'tradingview' | 'smc_map'>('tradingview');

  // --- SCANNER STATE ---
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15m');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // --- SIGNALS STATE ---
  const [signals, setSignals] = useState<SignalItem[]>([]);

  // --- NEWS STATE ---
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [newsAnalysis, setNewsAnalysis] = useState<NewsAnalysis | null>(null);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  // --- CHAT MODULE ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- SIMULATED MT5 CONNECTION ---
  const [mt5Connected, setMt5Connected] = useState(false);
  const [mt5AccountNumber, setMt5AccountNumber] = useState('5092147');
  const [mt5Broker, setMt5Broker] = useState('FTMO-Demo Server');
  const [mt5Leverage, setMt5Leverage] = useState('1:100');
  const [showMt5Settings, setShowMt5Settings] = useState(false);

  // --- JOURNAL STATE ---
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journalPair, setJournalPair] = useState('BTCUSD');
  const [journalDir, setJournalDir] = useState<'BUY' | 'SELL'>('BUY');
  const [journalEntry, setJournalEntry] = useState('');
  const [journalSL, setJournalSL] = useState('');
  const [journalTP, setJournalTP] = useState('');
  const [journalOutcome, setJournalOutcome] = useState<'WIN' | 'LOSS' | 'PENDING'>('PENDING');
  const [journalPnl, setJournalPnl] = useState('');
  const [journalSession, setJournalSession] = useState<'TOKYO' | 'LONDON' | 'NEW YORK' | 'SYDNEY'>('NEW YORK');
  const [journalNotes, setJournalNotes] = useState('');
  const [journalError, setJournalError] = useState('');

  // --- RISK CALCULATOR STATE ---
  const [riskBalance, setRiskBalance] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [riskSLPips, setRiskSLPips] = useState('40');
  const [riskPair, setRiskPair] = useState('BTCUSD');
  const [calculatorResult, setCalculatorResult] = useState<{
    riskAmount: number;
    lotSize: number;
    multiplier: number;
  } | null>(null);

  const [utcTime, setUtcTime] = useState<Date>(new Date());

  // --- INITIALIZE & RESTORE ---
  useEffect(() => {
    // Check key status
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setHasApiKey(data.hasApiKey))
      .catch(() => setHasApiKey(false));

    // Restore Journal Trades from localStorage
    const savedTrades = localStorage.getItem('jarvis_trades_v6_clean');
    if (savedTrades) {
      try {
        setTrades(JSON.parse(savedTrades));
      } catch (e) {
        console.error('Failed to parse saved journal trades');
      }
    } else {
      setTrades([]);
    }

    // Restore MT5 State
    const savedMt5Conn = localStorage.getItem('jarvis_mt5_connected');
    if (savedMt5Conn === 'true') {
      setMt5Connected(true);
    }

    // Restore Signals
    const savedSignals = localStorage.getItem('jarvis_signals_v6_clean');
    if (savedSignals) {
      try {
        setSignals(JSON.parse(savedSignals));
      } catch (e) {
        console.error('Failed to parse saved signals');
      }
    } else {
      const defaultSignals: SignalItem[] = [
        { id: 'sig-1', timestamp: 'Just now', pair: 'BTCUSD', dir: 'BUY', entry: 61250.00, sl: 60500.00, tp1: 62500.00, tp2: 63800.00, rrRatio: '1:1.6', confidence: 82, status: 'ACTIVE' },
        { id: 'sig-2', timestamp: '2 hours ago', pair: 'XAUUSD', dir: 'SELL', entry: 2320.50, sl: 2326.00, tp1: 2311.00, tp2: 2305.00, rrRatio: '1:1.7', confidence: 79, status: 'ACTIVE' }
      ];
      setSignals(defaultSignals);
    }

    // Initialize Chat with nice introduction
    setChatMessages([
      { role: 'assistant', content: "### JARVIS INTELLIGENCE OPERATIONAL\n\nI am your institutional Smart Money Concepts (SMC) mentor. I can identify local market order block anomalies, formulate dynamic leverage ratios, and output risk parameters. What asset shall we analyze today?" }
    ]);

    // Fetch initial prices
    fetchPrices();

    // Direct Browser-to-Coinbase Live WebSocket connection for zero latency real-time feeds
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        
        ws.onopen = () => {
          console.log('Connected to Coinbase Live WebSocket for zero-lag spot rates');
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'subscribe',
              product_ids: ['BTC-USD'],
              channels: ['ticker']
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ticker' && data.price && data.product_id === 'BTC-USD') {
              const wsPrice = parseFloat(data.price);
              if (!isNaN(wsPrice) && wsPrice > 0) {
                setPrices(prev => {
                  const btc = prev['BTCUSD'];
                  if (!btc) return prev;
                  let tickDir: 'up' | 'down' | 'stable' = btc.tickDir;
                  if (wsPrice > btc.price) tickDir = 'up';
                  else if (wsPrice < btc.price) tickDir = 'down';

                  // Dynamic high/low
                  const high = Math.max(btc.high, wsPrice);
                  const low = btc.low === 0 ? wsPrice : Math.min(btc.low, wsPrice);
                  const change = wsPrice - btc.prevClose;
                  const changePercent = btc.prevClose !== 0 ? (change / btc.prevClose) * 100 : 0;

                  return {
                    ...prev,
                    'BTCUSD': {
                      ...btc,
                      price: wsPrice,
                      high,
                      low,
                      change,
                      changePercent,
                      tickDir,
                      isSimulated: false
                    }
                  };
                });
              }
            }
          } catch (e) {
            // ignore JSON errors
          }
        };

        ws.onclose = () => {
          console.warn('Coinbase WebSocket closed. Reconnecting in 3s...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.error('Coinbase WebSocket error:', err);
          ws?.close();
        };
      } catch (err) {
        console.error('Failed to create Coinbase WebSocket:', err);
      }
    };

    connectWebSocket();

    // UTC timer
    const clockInterval = setInterval(() => {
      setUtcTime(new Date());
    }, 1000);

    // Live price update loop (every 1.5 seconds for extreme institutional reactivity)
    const priceInterval = setInterval(() => {
      fetchPrices();
    }, 1500);

    return () => {
      clearInterval(clockInterval);
      clearInterval(priceInterval);
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Scroll chat bottom effect
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatting]);

  // --- ACTIONS ---
  const saveTradesToStorage = (updatedTrades: Trade[]) => {
    setTrades(updatedTrades);
    localStorage.setItem('jarvis_trades_v6_clean', JSON.stringify(updatedTrades));
  };

  const handleSeedDemoTrades = () => {
    const demoTrades: Trade[] = [
      { id: 't-1', date: '2026-06-25', pair: 'XAUUSD', dir: 'BUY', entry: 2315.40, sl: 2311.00, tp: 2325.00, outcome: 'WIN', pnl: 240, session: 'NEW YORK', notes: 'SMC order block retest was perfect.' },
      { id: 't-2', date: '2026-06-26', pair: 'BTCUSD', dir: 'SELL', entry: 61500.00, sl: 62200.00, tp: 60200.00, outcome: 'WIN', pnl: 390, session: 'LONDON', notes: 'Macro liquidity sweep of weekly highs.' },
      { id: 't-3', date: '2026-06-26', pair: 'EURUSD', dir: 'BUY', entry: 1.08450, sl: 1.08200, tp: 1.08900, outcome: 'LOSS', pnl: -120, session: 'NEW YORK', notes: 'Invalidated on local news spike.' }
    ];
    saveTradesToStorage(demoTrades);
  };

  // --- POSITION SIZING LOGIC ---
  useEffect(() => {
    const bal = parseFloat(riskBalance) || 0;
    const pct = parseFloat(riskPercent) || 0;
    const slPips = parseFloat(riskSLPips) || 0;
    if (bal <= 0 || pct <= 0 || slPips <= 0) {
      setCalculatorResult(null);
      return;
    }

    const riskAmount = (bal * pct) / 100;
    let lotSize = 0;
    let multiplier = 10; // Default Standard Forex pip multiplier

    if (riskPair === 'XAUUSD') {
      multiplier = 10;
      lotSize = riskAmount / (slPips * multiplier);
    } else if (riskPair === 'BTCUSD') {
      multiplier = 1;
      lotSize = riskAmount / (slPips * multiplier);
    } else if (riskPair.includes('JPY')) {
      multiplier = 9.0;
      lotSize = riskAmount / (slPips * multiplier);
    } else {
      multiplier = 10;
      lotSize = riskAmount / (slPips * multiplier);
    }

    setCalculatorResult({
      riskAmount: Number(riskAmount.toFixed(2)),
      lotSize: Number(Math.max(0.01, lotSize).toFixed(3)),
      multiplier
    });
  }, [riskBalance, riskPercent, riskSLPips, riskPair]);

  // --- FETCH PRICES ---
  const fetchPrices = async () => {
    try {
      const response = await fetch(`/api/prices?_nocache=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.prices) {
          setPrices(prev => {
            const updated: Record<string, PriceData> = {};
            for (const [key, val] of Object.entries(data.prices)) {
              const castedVal = val as PriceData;
              const prevPrice = prev[key]?.price;
              let tickDir: 'up' | 'down' | 'stable' = 'stable';
              if (prevPrice) {
                if (castedVal.price > prevPrice) tickDir = 'up';
                else if (castedVal.price < prevPrice) tickDir = 'down';
              }
              updated[key] = { ...castedVal, tickDir };
            }
            return updated;
          });
          setLastUpdateTime(new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.warn('Live pricing fetch check handled gracefully:', e);
    } finally {
      setIsPricesLoading(false);
    }
  };

  // --- TRIGGER SCAN ---
  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: selectedPair, timeframe: selectedTimeframe })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setScanResult(data.data);

        // Generate clean signal card
        const parsed: ScanResult = data.data;
        const newSig: SignalItem = {
          id: `sig-${Date.now()}`,
          timestamp: 'Just now',
          pair: selectedPair,
          dir: parsed.verdict.includes('BUY') ? 'BUY' : 'SELL',
          entry: parsed.tradeSetup.entry,
          sl: parsed.tradeSetup.sl,
          tp1: parsed.tradeSetup.tp1,
          tp2: parsed.tradeSetup.tp2,
          rrRatio: parsed.tradeSetup.rrRatio,
          confidence: parsed.confidence,
          status: 'ACTIVE'
        };
        setSignals(prev => [newSig, ...prev.slice(0, 9)]);
      }
    } catch (e) {
      console.error('Scanner fetch failed');
    } finally {
      setIsScanning(false);
    }
  };

  // --- ANALYZE FOREX CALENDAR ---
  const handleAnalyzeNews = async () => {
    setIsNewsLoading(true);
    setNewsAnalysis(null);
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success) {
        setNewsEvents(data.rawEvents || []);
        setNewsAnalysis(data.analysis || null);
      }
    } catch (e) {
      console.error('News analyzer failed');
    } finally {
      setIsNewsLoading(false);
    }
  };

  // --- SEND CHAT COMPANION MESSAGE ---
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput('');
    setIsChatting(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory,
          context: { prices, activePair: selectedPair }
        })
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Failed to communicate with intelligence node. Please verify server state." }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Error: No connection available." }]);
    } finally {
      setIsChatting(false);
    }
  };

  // --- MANUAL TRADE LOGGING ---
  const handleLogTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJournalError('');

    const entry = parseFloat(journalEntry);
    const sl = parseFloat(journalSL);
    const tp = parseFloat(journalTP);
    const pnl = parseFloat(journalPnl) || 0;

    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) {
      setJournalError('Please enter valid numeric values for Entry, Stop Loss, and Take Profit.');
      return;
    }

    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      pair: journalPair,
      dir: journalDir,
      entry,
      sl,
      tp,
      outcome: journalOutcome,
      pnl: journalOutcome === 'PENDING' ? 0 : pnl,
      session: journalSession,
      notes: journalNotes || 'Manual Entry'
    };

    saveTradesToStorage([newTrade, ...trades]);
    setJournalEntry('');
    setJournalSL('');
    setJournalTP('');
    setJournalPnl('');
    setJournalNotes('');
  };

  const handleDeleteTrade = (id: string) => {
    saveTradesToStorage(trades.filter(t => t.id !== id));
  };

  const handleUseSignal = (sig: SignalItem) => {
    setJournalPair(sig.pair);
    setJournalDir(sig.dir);
    setJournalEntry(sig.entry.toString());
    setJournalSL(sig.sl.toString());
    setJournalTP(sig.tp1.toString());
    setRiskPair(sig.pair);
    setActiveTab('journal');
  };

  const handleSetEntryLevel = (price: number) => {
    setJournalPair(selectedPair);
    setJournalEntry(price.toFixed(selectedPair.includes('USD') && !selectedPair.includes('XAU') ? 2 : 4));
    setRiskPair(selectedPair);
  };

  const handleSetCalculatedSl = (slPips: number) => {
    setRiskSLPips(slPips.toString());
  };

  const handleAddSimulatedTrade = (trade: Trade) => {
    saveTradesToStorage([trade, ...trades]);
  };

  // --- MAP SYMBOLS FOR TRADINGVIEW IFRAME ---
  const getTradingViewSymbol = (symbol: string) => {
    switch (symbol) {
      case 'XAUUSD': return 'OANDA:XAUUSD';
      case 'BTCUSD': return 'COINBASE:BTCUSD';
      case 'EURUSD': return 'FX:EURUSD';
      case 'GBPUSD': return 'FX:GBPUSD';
      case 'USDJPY': return 'FX:USDJPY';
      case 'GBPJPY': return 'FX:GBPJPY';
      default: return 'COINBASE:BTCUSD';
    }
  };

  // --- MT5 SIMULATED CONNECTIVITY ---
  const handleToggleMt5 = () => {
    const next = !mt5Connected;
    setMt5Connected(next);
    localStorage.setItem('jarvis_mt5_connected', next ? 'true' : 'false');
  };

  // Compute stats on logged trades
  const computeStats = () => {
    const completed = trades.filter(t => t.outcome !== 'PENDING');
    const total = completed.length;
    const wins = completed.filter(t => t.outcome === 'WIN');
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const totalPnl = completed.reduce((acc, t) => acc + t.pnl, 0);
    return { total, winRate, totalPnl };
  };

  const stats = computeStats();

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-300 flex flex-col font-sans antialiased selection:bg-amber-500/10 selection:text-amber-400">
      
      {/* 1. Header Component */}
      <Header 
        utcTime={utcTime} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenChat={() => setShowChatDrawer(true)} 
      />

      {/* 2. Primary Area Workspace */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* ================= TERMINAL TAB ================= */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Watchlist and MT5 Columns (col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              <Watchlist 
                prices={prices} 
                selectedPair={selectedPair} 
                setSelectedPair={setSelectedPair} 
                lastUpdateTime={lastUpdateTime} 
              />

              <Mt5Integration
                mt5Connected={mt5Connected}
                onToggleMt5={handleToggleMt5}
                mt5Broker={mt5Broker}
                setMt5Broker={setMt5Broker}
                mt5AccountNumber={mt5AccountNumber}
                setMt5AccountNumber={setMt5AccountNumber}
                mt5Leverage={mt5Leverage}
                setMt5Leverage={setMt5Leverage}
                showMt5Settings={showMt5Settings}
                setShowMt5Settings={setShowMt5Settings}
              />

              <CurrencyStrength prices={prices} />
            </div>

            {/* Live Chart Container & Active Signals List (col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Interactive TradingView frame & SMC Structure Toggle */}
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                
                {/* Active pair header with high-fidelity Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/85 pb-4 mb-4 gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-display font-bold text-white tracking-tight">{selectedPair} TERMINAL FEED</span>
                    <span className={`text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border uppercase ${
                      chartType === 'tradingview' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {chartType === 'tradingview' ? 'TradingView Live Stream' : 'SMC Map HUD'}
                    </span>
                  </div>

                  {/* Switcher Controls */}
                  <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-850">
                    <button
                      onClick={() => setChartType('tradingview')}
                      className={`px-3 py-1 text-[9.5px] font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                        chartType === 'tradingview' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      LIVE STREAM
                    </button>
                    <button
                      onClick={() => setChartType('smc_map')}
                      className={`px-3 py-1 text-[9.5px] font-mono font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                        chartType === 'smc_map' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SMC MAP DESK
                    </button>
                  </div>
                </div>

                {/* Conditional Chart Rendering */}
                {chartType === 'tradingview' ? (
                  <div className="w-full bg-[#030712] rounded-xl border border-slate-950 overflow-hidden relative shadow-inner">
                    {prices[selectedPair]?.isMarketClosed && (
                      <div className="absolute top-4 left-4 z-10 bg-amber-500/15 border border-amber-500/25 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase">
                          GLOBAL TRADING DESK CLOSED (WEEKEND FLAT)
                        </span>
                      </div>
                    )}
                    <iframe
                      key={selectedPair}
                      id="tradingview-live-widget"
                      src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview-live-widget&symbol=${getTradingViewSymbol(selectedPair)}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=111827&theme=dark&style=1&timezone=Etc%2FUTC&locale=en`}
                      className="w-full h-[450px] border-none"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <SmcStructureCanvas 
                    selectedPair={selectedPair} 
                    selectedTimeframe={selectedTimeframe} 
                    onSetEntry={handleSetEntryLevel}
                    currentPrice={prices[selectedPair]?.price}
                  />
                )}

                <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-sans gap-2 border-t border-slate-800/60 pt-3.5">
                  <span>✨ Click any Order Block boundaries on the SMC map to set entry thresholds.</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Feed Engine: Jarvis Quant</span>
                </div>
              </div>

              {/* Signals Quick Action Hub */}
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 shadow-xl backdrop-blur-sm">
                <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Active Institutional Signals</span>
                  <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">Deploy values instantly</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {signals.map(sig => (
                    <div key={sig.id} className="p-4 bg-slate-950/45 border border-slate-850 hover:border-slate-800 rounded-xl flex flex-col justify-between gap-3 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                            sig.dir === 'BUY' 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                          }`}>
                            {sig.dir}
                          </span>
                          <span className="text-xs font-bold text-slate-100 font-mono">{sig.pair}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">{sig.timestamp}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-[10px] border-t border-slate-900/60 pt-3 text-slate-400 font-mono">
                        <div>
                          <span className="text-[8px] text-slate-600 block font-bold uppercase tracking-wider mb-0.5">Entry</span>
                          <span className="text-slate-200 font-semibold">{sig.entry}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-600 block font-bold uppercase tracking-wider mb-0.5">Stop loss</span>
                          <span className="text-rose-400/90">{sig.sl}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-600 block font-bold uppercase tracking-wider mb-0.5">Take profit</span>
                          <span className="text-emerald-400/90">{sig.tp1}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-600 block font-bold uppercase tracking-wider mb-0.5">R:R Ratio</span>
                          <span className="text-amber-400 font-bold">{sig.rrRatio}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1 border-t border-slate-900/40 pt-3">
                        <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Confidence: <span className="text-slate-300">{sig.confidence}%</span></span>
                        <button
                          onClick={() => handleUseSignal(sig)}
                          className="px-3 py-1 bg-amber-500/5 hover:bg-amber-500 border border-amber-500/20 hover:border-amber-400 text-amber-400 hover:text-slate-950 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-colors duration-200 flex items-center gap-1"
                        >
                          <PlusCircle className="w-3 h-3" />
                          Deploy Signal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= AI SCANNER TAB ================= */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <SmcScanner
              selectedPair={selectedPair}
              setSelectedPair={setSelectedPair}
              selectedTimeframe={selectedTimeframe}
              setSelectedTimeframe={setSelectedTimeframe}
              isScanning={isScanning}
              onTriggerScan={handleTriggerScan}
              scanResult={scanResult}
              onUseSignal={handleUseSignal}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FibSizer selectedPair={selectedPair} onSetCalculatedSl={handleSetCalculatedSl} currentPrice={prices[selectedPair]?.price} />
              
              <div className="bg-slate-900/60 border border-slate-800/60 p-5 rounded-xl shadow-xl backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/85 pb-3">
                  <div>
                    <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">Institutional OTE Entry Theory</h4>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">Premium vs. Discount allocation guide</p>
                  </div>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    Optimal R:R
                  </span>
                </div>
                
                <div className="space-y-3.5 text-xs text-slate-400 leading-relaxed font-sans">
                  <p>
                    Smart Money Concepts (SMC) dictates that executing trades in the <strong className="text-rose-400 font-medium">Premium Zone</strong> (upper 50% of a structural trading range) yields low-probability buy setups and high-probability short setups.
                  </p>
                  <p>
                    Conversely, executing trades in the <strong className="text-emerald-400 font-medium">Discount Zone</strong> (lower 50% of the trading range) yields premium long opportunities, as you buy at wholesale value.
                  </p>
                  <p>
                    By targeting the absolute sweet spot known as the **Optimal Trade Entry (OTE)** zones between the <strong className="text-amber-400 font-mono">0.618 and 0.790</strong> Fibonacci levels, institutional traders achieve extremely tight stop-loss thresholds and massive risk-to-reward ratios.
                  </p>
                  
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-850/60 text-slate-500 text-[10px] font-mono leading-normal">
                    <span>💡 Operational Pro-Tip: Update the Swing High & Swing Low anchors dynamically based on the latest 15m structural high/low impulse to check local OTE retracement mitigation targets.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ECONOMIC CALENDAR TAB ================= */}
        {activeTab === 'calendar' && (
          <EconomicCalendar
            newsEvents={newsEvents}
            newsAnalysis={newsAnalysis}
            isNewsLoading={isNewsLoading}
            onAnalyzeNews={handleAnalyzeNews}
          />
        )}

        {/* ================= JOURNAL & CALCULATOR TAB ================= */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            <JournalCalculator
              riskPair={riskPair}
              setRiskPair={setRiskPair}
              riskPercent={riskPercent}
              setRiskPercent={setRiskPercent}
              riskBalance={riskBalance}
              setRiskBalance={setRiskBalance}
              riskSLPips={riskSLPips}
              setRiskSLPips={setRiskSLPips}
              calculatorResult={calculatorResult}
              journalPair={journalPair}
              setJournalPair={setJournalPair}
              journalDir={journalDir}
              setJournalDir={setJournalDir}
              journalEntry={journalEntry}
              setJournalEntry={setJournalEntry}
              journalSL={journalSL}
              setJournalSL={setJournalSL}
              journalTP={journalTP}
              setJournalTP={setJournalTP}
              journalOutcome={journalOutcome}
              setJournalOutcome={setJournalOutcome}
              journalPnl={journalPnl}
              setJournalPnl={setJournalPnl}
              journalSession={journalSession}
              setJournalSession={setJournalSession}
              journalNotes={journalNotes}
              setJournalNotes={setJournalNotes}
              journalError={journalError}
              onLogTradeSubmit={handleLogTradeSubmit}
              trades={trades}
              onDeleteTrade={handleDeleteTrade}
              onSeedDemoTrades={handleSeedDemoTrades}
              onClearAllTrades={() => saveTradesToStorage([])}
              stats={stats}
            />

            <SmcBacktester 
              selectedPair={selectedPair} 
              onAddSimulatedTrade={handleAddSimulatedTrade} 
            />
          </div>
        )}

      </main>

      {/* 3. AI Co-Pilot Chat Slideover Drawer */}
      <ChatDrawer
        isOpen={showChatDrawer}
        onClose={() => setShowChatDrawer(false)}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isChatting={isChatting}
        onSendChat={handleSendChat}
        chatBottomRef={chatBottomRef}
      />

      {/* 4. Unified Institutional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-5 text-center text-[10px] text-slate-500 font-mono shrink-0">
        <p>© 2026 JARVIS QUANTUM TRADING ALLIANCE. SECURE SYSTEM ACCESS.</p>
        <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-600">
          Spot feeds are polled in real-time from financial streams. All log entries and settings persist strictly in user browser local database.
        </p>
      </footer>

    </div>
  );
}
