/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie
} from "recharts";
import { 
  Activity, 
  Layers, 
  Database, 
  Server, 
  Play, 
  Pause, 
  Sliders, 
  AlertTriangle, 
  Terminal, 
  RefreshCw, 
  LayoutGrid, 
  Heart,
  Cpu,
  BarChart3,
  Menu,
  Search,
  Bell,
  Mail,
  Settings,
  FolderTree,
  Download,
  Copy,
  Check,
  Send,
  HelpCircle,
  Plus,
  ArrowRight,
  Sparkles,
  DatabaseZap,
  GitPullRequest,
  ChevronDown,
  X,
  FileCode,
  User,
  Lightbulb
} from "lucide-react";
import { SimulatorState, SystemLog, CodeFileBlueprint, QueryResult } from "./types";
import ArchitectureMap from "./components/ArchitectureMap";

// Dashboard performance history item type
interface PerformanceDataPoint {
  time: string;
  eps: number;
  cpu: number;
}

// Sparklines mini chart datasets
const miniBarData1 = [
  { value: 30 }, { value: 45 }, { value: 35 }, { value: 60 }, { value: 40 }, { value: 75 }, { value: 50 }
];
const miniAreaData2 = [
  { value: 20 }, { value: 35 }, { value: 30 }, { value: 55 }, { value: 45 }, { value: 70 }, { value: 65 }
];
const miniLineData3 = [
  { value: 80 }, { value: 75 }, { value: 85 }, { value: 70 }, { value: 90 }, { value: 80 }, { value: 95 }
];
const miniBarData4 = [
  { value: 15 }, { value: 30 }, { value: 25 }, { value: 45 }, { value: 35 }, { value: 55 }, { value: 40 }
];

export default function App() {
  // Sidebar navigation toggling
  const [activeTab, setActiveTab] = useState<"dashboard" | "topology" | "controls" | "sql" | "scaffolds" | "coach">("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Core simulator telemetry variables
  const [state, setState] = useState<SimulatorState>({
    isRunning: true,
    eps: 2.0,
    anomaly: "none",
    metrics: {
      totalIngested: 0,
      totalProcessed: 0,
      totalErrors: 0,
      ingestionLatency: 12,
      processingLatency: 420,
      cpuUtilization: 14,
      memoryUsage: 135,
    },
  });

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [perfHistory, setPerfHistory] = useState<PerformanceDataPoint[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // SQL console interactive query states
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM raw_events ORDER BY id DESC LIMIT 10");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // dbt transformation logs & triggers
  const [dbtRunning, setDbtRunning] = useState(false);
  const [dbtTerminalLogs, setDbtTerminalLogs] = useState<string[]>([]);

  // ML Predicter playground states
  const [predictEvents, setPredictEvents] = useState("12");
  const [predictValue, setPredictValue] = useState("245.50");
  const [prediction, setPrediction] = useState<{ will_purchase: boolean; probability: number } | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);

  // Blueprint Code Explorer states
  const [blueprints, setBlueprints] = useState<CodeFileBlueprint[]>([]);
  const [selectedFile, setSelectedFile] = useState<CodeFileBlueprint | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Gemini Platform AI Advisor Coach chat state
  const [coachPrompt, setCoachPrompt] = useState("");
  const [coachChat, setCoachChat] = useState<Array<{ role: "user" | "model"; text: string }>>([
    {
      role: "model",
      text: "Welcome Nikolai! I'm your Lead Platform Architect Coach. I designed this entire serverless event pipeline for Lector. Ask me anything about scaling Kafka brokers, Spark tumbling windows, PostgreSQL indexing, ML deployments, or how to download the Docker codebase scaffolds!",
    },
  ]);
  const [coachLoading, setCoachLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Interactive transaction list & manual payload injection modal
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [injectUserId, setInjectUserId] = useState("usr_kashim77");
  const [injectEvent, setInjectEvent] = useState<"page_view" | "search" | "add_to_cart" | "purchase">("purchase");
  const [injectValue, setInjectValue] = useState("185.00");
  const [injectLoading, setInjectLoading] = useState(false);
  const [injectSuccessMessage, setInjectSuccessMessage] = useState<string | null>(null);

  // Local state for table search in Order Status
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);

  // Simulated Orders buffer that matches the mockup table style and adds custom transactions
  const [simulatedOrders, setSimulatedOrders] = useState<Array<{
    invoice: string;
    customer: string;
    from: string;
    price: number;
    status: "Process" | "Open" | "On Hold" | "Completed" | "Pending";
  }>>([
    { invoice: "12386", customer: "Charly Dues", from: "Brazil", price: 299, status: "Process" },
    { invoice: "12386", customer: "Marko", from: "Italy", price: 2642, status: "Open" },
    { invoice: "12386", customer: "Daniyel Orak", from: "Russia", price: 981, status: "On Hold" },
    { invoice: "12386", customer: "Belgin Basturk", from: "Korea", price: 369, status: "Process" },
    { invoice: "12386", customer: "Sarti Onuska", from: "Japan", price: 1240, status: "Completed" },
    { invoice: "12401", customer: "Abdul Kashim", from: "USA", price: 432, status: "Completed" },
    { invoice: "12402", customer: "Sven Ghran", from: "Sweden", price: 185, status: "Open" },
    { invoice: "12403", customer: "Yoshi Tanaka", from: "Japan", price: 920, status: "On Hold" }
  ]);

  // Sync simulator telemetry from real-time endpoints
  const fetchRealtimeData = useCallback(async () => {
    try {
      const res = await fetch("/api/metrics/realtime");
      if (!res.ok) return;
      const data = await res.json();
      
      setState(data.state);
      setLogs(data.logs);

      // Append throughput timeline (keep last 15 ticks)
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setPerfHistory((prev) => {
        const next = [...prev, { time: nowStr, eps: data.state.eps, cpu: data.state.metrics.cpuUtilization }];
        if (next.length > 15) next.shift();
        return next;
      });
    } catch (e) {
      console.error("Failed to query simulation state metrics:", e);
    }
  }, []);

  // Poll simulator backend and fetch blueprints codebase on startup
  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 2000);

    // Fetch blueprint files list
    fetch("/api/blueprints")
      .then((r) => r.json())
      .then((data) => {
        setBlueprints(data);
        if (data.length > 0) setSelectedFile(data[0]);
      })
      .catch((err) => console.error("Error pulling blueprints:", err));

    return () => clearInterval(interval);
  }, [fetchRealtimeData]);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachChat]);

  // Handle Simulation control modifiers
  const handleUpdateControls = async (updates: Partial<SimulatorState>) => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isRunning: updates.isRunning !== undefined ? updates.isRunning : state.isRunning,
          eps: updates.eps !== undefined ? parseFloat(updates.eps as any) : state.eps,
          anomaly: updates.anomaly !== undefined ? updates.anomaly : state.anomaly,
        }),
      });
      const data = await res.json();
      setState(data.state);
    } catch (err) {
      console.error("Error setting controls:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Execute relational database SQL queries
  const handleRunQuery = async (queryStr?: string) => {
    const q = queryStr || sqlQuery;
    if (queryStr) setSqlQuery(queryStr);
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const res = await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: q }),
      });
      const data = await res.json();
      setQueryResult(data);
    } catch (e) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: "Database Connection Interrupted. Ensure Postgres service is live.",
      });
    } finally {
      setQueryLoading(false);
    }
  };

  // Run dbt build compiling DAG
  const handleRunDbt = async () => {
    setDbtRunning(true);
    setDbtTerminalLogs(["$ dbt run --profiles-dir ."]);
    try {
      const res = await fetch("/api/dbt/run", { method: "POST" });
      const data = await res.json();
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < data.logs.length) {
          setDbtTerminalLogs((prev) => [...prev, data.logs[index]]);
          index++;
        } else {
          clearInterval(interval);
          setDbtRunning(false);
          fetchRealtimeData();
        }
      }, 350);
    } catch (err) {
      setDbtTerminalLogs((prev) => [...prev, "Fatal: dbt execution failed. Check profiles.yml configuration."]);
      setDbtRunning(false);
    }
  };

  // Score payload in ML model predictor playground
  const handleRunPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredictLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_events: parseInt(predictEvents) || 0,
          total_purchase_value: parseFloat(predictValue) || 0.0,
        }),
      });
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPredictLoading(false);
    }
  };

  // Chat conversation with AI platform coach Gemini
  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachPrompt.trim()) return;

    const userMsg = coachPrompt;
    setCoachPrompt("");
    setCoachChat((prev) => [...prev, { role: "user", text: userMsg }]);
    setCoachLoading(true);

    try {
      const history = coachChat.map((c) => ({ role: c.role, text: c.text }));
      const res = await fetch("/api/gemini/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg, history }),
      });
      const data = await res.json();
      setCoachChat((prev) => [...prev, { role: "model", text: data.reply || data.error }]);
    } catch (err) {
      setCoachChat((prev) => [
        ...prev,
        { role: "model", text: "Service unavailable. Please verify process.env.GEMINI_API_KEY is configured in your backend." },
      ]);
    } finally {
      setCoachLoading(false);
    }
  };

  // Manual event injector publishing directly to gateway REST API
  const handleManualInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setInjectLoading(true);
    setInjectSuccessMessage(null);
    try {
      const res = await fetch("/api/ingest/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: injectUserId,
          event: injectEvent,
          value: parseFloat(injectValue) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInjectSuccessMessage(`Successfully ingested transaction! Published as Event ID: ${data.event.id} to raw-events topic.`);
        
        // Append user to simulated order table live as well!
        if (injectEvent === "purchase" || injectEvent === "add_to_cart") {
          setSimulatedOrders((prev) => [
            {
              invoice: Math.floor(12400 + Math.random() * 100).toString(),
              customer: injectUserId,
              from: "Local Terminal",
              price: parseFloat(injectValue) || 0,
              status: "Process"
            },
            ...prev
          ]);
        }

        fetchRealtimeData();
        setTimeout(() => {
          setShowInjectModal(false);
          setInjectSuccessMessage(null);
        }, 3000);
      } else {
        setInjectSuccessMessage(`Validation Refused: ${data.error}`);
      }
    } catch (err) {
      setInjectSuccessMessage("Payload failed. Ensure backend service REST API is running.");
    } finally {
      setInjectLoading(false);
    }
  };

  // Packaging entire microservices blueprint template codebase to ZIP
  const handleDownloadScaffoldZip = async () => {
    setZipping(true);
    const zip = new JSZip();
    blueprints.forEach((file) => {
      zip.file(file.path, file.content);
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "lector-data-platform-scaffold.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Zipping scaffold failed:", err);
    } finally {
      setZipping(false);
    }
  };

  const handleCopyScaffoldCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // Convert real-time event percentages for Donut chart representation
  // Youtube = purchase, Facebook = page_view + search, Direct = add_to_cart
  const getTrafficShare = () => {
    const total = state.metrics.totalIngested || 1;
    const purchases = Math.round((state.metrics.totalProcessed * 0.1) + 42);
    const carts = Math.round((state.metrics.totalProcessed * 0.2) + 24);
    const views = total - purchases - carts;

    const purchasePercent = Math.min(90, Math.max(10, Math.round((purchases / total) * 100)));
    const cartPercent = Math.min(90, Math.max(10, Math.round((carts / total) * 100)));
    const viewPercent = Math.max(10, 100 - purchasePercent - cartPercent);

    return [
      { name: "Youtube (Purchases)", value: purchasePercent, color: "#ec4899" },
      { name: "Facebook (Views/Search)", value: viewPercent, color: "#a855f7" },
      { name: "Direct (Cart Actions)", value: cartPercent, color: "#f59e0b" }
    ];
  };

  // Table rows filtered by search
  const filteredOrders = simulatedOrders.filter((order) => {
    const term = tableSearch.toLowerCase();
    return (
      order.customer.toLowerCase().includes(term) ||
      order.from.toLowerCase().includes(term) ||
      order.invoice.toLowerCase().includes(term) ||
      order.status.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#f5f4fa] text-[#1e1931] flex font-sans antialiased">
      
      {/* ----------------------------------------------------------------------
          1. LEFT SIDEBAR (REPLICATING THE LECTOR DESIGN THEME)
          ---------------------------------------------------------------------- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#eef0f6] flex flex-col justify-between transition-transform duration-300 xl:translate-x-0 ${
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div>
          {/* Lector Brand header with specific logo accent style */}
          <div className="h-20 px-6 border-b border-[#eef0f6] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Custom SVG logo mimicking the uptrend grid icon in yellow-orange */}
              <div className="h-9 w-9 bg-gradient-to-tr from-[#ec4899] to-[#7c3aed] rounded-xl flex items-center justify-center shadow-md shadow-pink-500/10">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7-5.3 5.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-sans font-extrabold text-xl tracking-tight text-[#1e1931]">Lector.</span>
            </div>
            
            {/* Small close button for mobile screens */}
            <button onClick={() => setMobileSidebarOpen(false)} className="xl:hidden p-1 text-slate-400 hover:text-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items list */}
          <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            <div className="space-y-1">
              <span className="font-mono text-[9px] text-[#7c7793] font-bold uppercase tracking-wider px-3">Active Platforms</span>
              <nav className="space-y-1.5 mt-2">
                {[
                  { id: "dashboard", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
                  { id: "topology", label: "System Map (UI Elements)", icon: <Layers className="h-4 w-4" /> },
                  { id: "controls", label: "Widgets & Form Controls", icon: <Sliders className="h-4 w-4" /> },
                  { id: "sql", label: "SQL Tables & Analytics", icon: <Database className="h-4 w-4" /> },
                  { id: "coach", label: "AI Architect Coach (E-mail)", icon: <Mail className="h-4 w-4" /> },
                  { id: "scaffolds", label: "Scaffold Editors", icon: <FolderTree className="h-4 w-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs font-sans font-bold transition-all duration-150 ${
                      activeTab === item.id
                        ? "bg-[#7c3aed]/5 text-[#7c3aed] border-l-4 border-[#7c3aed] shadow-sm font-extrabold"
                        : "text-[#5a5278] hover:bg-slate-50 hover:text-[#1e1931]"
                    }`}
                  >
                    <span className={`${activeTab === item.id ? "text-[#7c3aed]" : "text-[#7c7793]"}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Aesthetic-only list mimicking other sections from the mockup */}
            <div className="space-y-1">
              <span className="font-mono text-[9px] text-[#7c7793] font-bold uppercase tracking-wider px-3">General Pages</span>
              <nav className="space-y-1 mt-2">
                {[
                  { label: "Form Elements", tab: "controls" },
                  { label: "Editors & Code", tab: "scaffolds" },
                  { label: "Charts", tab: "dashboard" },
                  { label: "Tables", tab: "sql" },
                  { label: "Popups & Modals", tab: "sql" },
                  { label: "Documentation", tab: "scaffolds" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(item.tab as any)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-sans text-[#7c7793] font-medium rounded-lg text-left hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <span>{item.label}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase scale-90">Sim</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Scaffold Bundle Box */}
        <div className="p-4 border-t border-[#eef0f6]">
          <div className="p-3.5 bg-gradient-to-br from-[#7c3aed]/5 to-[#ec4899]/5 rounded-2xl border border-purple-100/50">
            <span className="font-sans font-bold text-[11px] text-[#7c3aed] flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> System Bundle Ready
            </span>
            <p className="text-[10px] text-[#7c7793] mt-1 leading-relaxed font-medium">
              Want the full modular Node/Spark/Postgres deployment codebase?
            </p>
            <button
              onClick={handleDownloadScaffoldZip}
              disabled={zipping}
              className="w-full mt-2.5 py-1.5 px-2.5 bg-white border border-[#e2e1ee] hover:bg-slate-50 text-slate-700 font-mono text-[9px] rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              {zipping ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              <span>{zipping ? "Packaging..." : "Download Scaffold.zip"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main viewport area */}
      <div className="flex-1 xl:pl-64 flex flex-col min-h-screen">
        
        {/* ----------------------------------------------------------------------
            2. TOP HEADER NAVBAR
            ---------------------------------------------------------------------- */}
        <header className="h-20 bg-white border-b border-[#eef0f6] px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_15px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-4">
            {/* Hamburger button for mobile devices */}
            <button onClick={() => setMobileSidebarOpen(true)} className="xl:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50">
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Custom search box mimicking the mockup layout */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#fdfcff] border border-[#e2e1ee] rounded-xl text-xs text-[#7c7793] w-64 shadow-inner">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search parameters or logs..." className="bg-transparent outline-none w-full placeholder-slate-400 font-sans" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Stream State Indicator Light */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#f5f4fa] border border-[#e2e1ee] rounded-xl text-[10px] font-mono font-bold">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${state.isRunning ? "bg-emerald-400" : "bg-red-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${state.isRunning ? "bg-emerald-500" : "bg-red-500"}`}></span>
              </span>
              <span className="text-[#4b4369]">{state.isRunning ? "PIPELINE ACTIVE" : "PIPELINE PAUSED"}</span>
            </div>

            {/* Interactive Alerts Bell mimicking notifications indicator */}
            <div className="relative">
              <button className="p-2 hover:bg-slate-50 rounded-xl border border-transparent hover:border-[#e2e1ee] transition-all text-slate-500 hover:text-[#7c3aed]">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1 right-1 h-4 w-4 bg-[#ec4899] text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">2</span>
              </button>
            </div>

            {/* Email Icon mimicking support requests / AI responses counter */}
            <div className="relative">
              <button onClick={() => setActiveTab("coach")} className="p-2 hover:bg-slate-50 rounded-xl border border-transparent hover:border-[#e2e1ee] transition-all text-slate-500 hover:text-[#7c3aed]">
                <Mail className="h-4.5 w-4.5" />
                <span className="absolute top-1 right-1 h-4 w-4 bg-[#7c3aed] text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">1</span>
              </button>
            </div>

            {/* Settings Quick Access Icon */}
            <button onClick={() => setActiveTab("controls")} className="p-2 hover:bg-slate-50 rounded-xl border border-transparent hover:border-[#e2e1ee] text-slate-500 hover:text-slate-800 transition-all">
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Divider */}
            <div className="h-6 w-[1px] bg-[#eef0f6]"></div>

            {/* User Profile Info with Status Pill */}
            <div className="flex items-center gap-2">
              <div className="relative h-9 w-9">
                <div className="h-full w-full bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  N
                </div>
                {/* Active Green status indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <span className="text-[11px] font-bold text-[#1e1931] block">Nikolai</span>
                <span className="text-[9px] font-mono text-[#7c7793] font-semibold block uppercase">Lead Architect</span>
              </div>
            </div>

          </div>
        </header>

        {/* ----------------------------------------------------------------------
            3. MAIN CONTENT BODY WORKSPACE
            ---------------------------------------------------------------------- */}
        <main className="flex-1 p-6 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* ==================================================================
                VIEW 1: MOCKUP DASHBOARD (Active View)
                ================================================================== */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Top Section Grid: Main Line Area Chart & Donut Traffic Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Main Chart Block */}
                  <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] lg:col-span-2 flex flex-col justify-between">
                    <div>
                      {/* Top Header Section identical to mockup */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#7c7793] uppercase tracking-wider">Dashboard</span>
                          <h2 className="text-sm font-sans font-extrabold text-[#1e1931] mt-0.5">Overview of Latest Month</h2>
                        </div>
                        {/* Selector tabs mimicking Lector DAILY / WEEKLY / MONTHLY / YEARLY togglers */}
                        <div className="flex items-center gap-4 text-[10px] font-sans font-bold text-[#7c7793]">
                          <button className="hover:text-[#7c3aed] transition-colors">DAILY</button>
                          <button className="hover:text-[#7c3aed] transition-colors">WEEKLY</button>
                          <button className="text-[#7c3aed] border-b-2 border-[#7c3aed] pb-1 font-extrabold">MONTHLY</button>
                          <button className="hover:text-[#7c3aed] transition-colors">YEARLY</button>
                        </div>
                      </div>

                      {/* Cumulative earnings and monthly sales metrics display */}
                      <div className="flex items-center gap-10 mt-6">
                        <div>
                          <span className="text-[22px] font-sans font-extrabold text-[#1e1931] tracking-tight block">
                            ${(state.metrics.totalIngested * 12.5 + 3468.96).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-[#7c7793] font-medium block mt-1">Current Month Earnings</span>
                        </div>
                        <div>
                          <span className="text-[22px] font-sans font-extrabold text-[#1e1931] tracking-tight block">
                            {Math.floor(state.metrics.totalProcessed * 0.1) + 82}
                          </span>
                          <span className="text-[10px] text-[#7c7793] font-medium block mt-1">Current Month Sales</span>
                        </div>
                        <button
                          onClick={() => setActiveTab("controls")}
                          className="px-4 py-2 bg-gradient-to-r from-[#ec4899] to-[#db2777] hover:opacity-95 text-white font-sans text-[10px] font-bold rounded-xl transition-all shadow-sm shadow-pink-500/10 cursor-pointer ml-auto"
                        >
                          Last Month Summary
                        </button>
                      </div>
                    </div>

                    {/* Smooth Area Chart reproducing mockup aesthetic */}
                    <div className="h-64 w-full mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={perfHistory.length > 0 ? perfHistory : [
                          { time: "Jan", eps: 2, cpu: 12 },
                          { time: "Feb", eps: 4, cpu: 18 },
                          { time: "Mar", eps: 3, cpu: 15 },
                          { time: "Apr", eps: 7, cpu: 28 },
                          { time: "May", eps: 5, cpu: 20 },
                          { time: "Jun", eps: 9, cpu: 35 }
                        ]}>
                          <defs>
                            <linearGradient id="colorPink" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.98)", borderColor: "#eef0f6", borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.02)" }}
                            itemStyle={{ fontSize: "10px", fontFamily: "sans-serif" }}
                          />
                          {/* Main orange-pink area curve */}
                          <Area type="monotone" dataKey="eps" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorPink)" />
                          {/* Complementary purple area curve */}
                          <Area type="monotone" dataKey="cpu" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorPurple)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Bottom KPI Indicator circles row exactly as in mockup */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#eef0f6]">
                      {[
                        { label: "Wallet Balance", val: `$${((state.metrics.totalIngested * 4.2) + 4567.53).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "bg-pink-500 text-pink-500", text: "pink" },
                        { label: "Referral Earning", val: `$${((state.metrics.totalIngested * 1.8) + 1689.53).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "bg-[#7c3aed] text-[#7c3aed]", text: "purple" },
                        { label: "Estimate Sales", val: `$${((state.metrics.totalIngested * 2.5) + 2851.53).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "bg-blue-500 text-blue-500", text: "blue" },
                        { label: "Earning", val: `$${((state.metrics.totalIngested * 15.5) + 52567.53).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "bg-amber-500 text-amber-500", text: "orange" }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${item.color.replace("text-", "bg-")}/10`}>
                            <svg className={`h-4.5 w-4.5 ${item.color.split(" ")[1]}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#7c7793] font-semibold block">{item.label}</span>
                            <span className="text-xs font-sans font-extrabold text-[#1e1931] block mt-0.5">{item.val}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Right Traffic Pie Chart Block */}
                  <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#7c7793] uppercase tracking-wider">Traffic</span>
                      <h2 className="text-sm font-sans font-extrabold text-[#1e1931] mt-0.5">Actions Distribution Share</h2>
                      <p className="text-[11px] text-[#7c7793] font-medium mt-1">Ingested events mapped to social acquisition acquisition funnels</p>
                    </div>

                    {/* Recharts Pie Chart representing Donut */}
                    <div className="h-48 w-full mt-6 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getTrafficShare()}
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getTrafficShare().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xs text-[#7c7793] font-bold uppercase tracking-wider">Total</span>
                        <span className="text-base font-sans font-extrabold text-[#1e1931] mt-0.5">{state.metrics.totalIngested}</span>
                      </div>
                    </div>

                    {/* Percentage Legends styled precisely as in mockup */}
                    <div className="space-y-3.5 mt-6 pt-6 border-t border-[#eef0f6]">
                      {getTrafficShare().map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-[10px] font-sans font-bold text-[#4b4369]">{entry.name.split(" ")[0]}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-sans font-extrabold text-[#1e1931]">{entry.value}%</span>
                            <span className="text-[9px] text-[#7c7793] font-mono">({entry.name.match(/\(([^)]+)\)/)?.[1] || "Share"})</span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                </div>

                {/* 2. Middle Row: 4 Small Colored cards with mini sparkline charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Card 1: Revenue Status (Pink-to-Purple Gradient) */}
                  <div className="bg-gradient-to-tr from-[#ec4899] via-[#db2777] to-[#7c3aed] text-white p-5 rounded-2xl border border-transparent shadow-[0_4px_20px_rgba(236,72,153,0.15)] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">Revenue Status</span>
                        <span className="text-xl font-extrabold mt-1 block">${(state.metrics.totalIngested * 1.5 + 432).toFixed(2)}</span>
                        <span className="text-[10px] block mt-0.5 opacity-85">Window Agg commits: {state.metrics.totalProcessed}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-md uppercase">Ingest</span>
                    </div>
                    {/* Micro bar graph */}
                    <div className="h-10 w-full mt-4 flex items-end">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={miniBarData1}>
                          <Bar dataKey="value" fill="#ffffff" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card 2: Page View (Purple Gradient) */}
                  <div className="bg-gradient-to-tr from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] text-white p-5 rounded-2xl border border-transparent shadow-[0_4px_20px_rgba(124,58,237,0.15)] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">Page View</span>
                        <span className="text-xl font-extrabold mt-1 block">{state.metrics.totalIngested + 1250}</span>
                        <span className="text-[10px] block mt-0.5 opacity-85">Accepted web requests</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-md uppercase">HTTP</span>
                    </div>
                    {/* Micro Area wave */}
                    <div className="h-10 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={miniAreaData2}>
                          <Area type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={1.5} fill="#ffffff" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card 3: Bounce Rate (Cyan Gradient) */}
                  <div className="bg-gradient-to-tr from-[#06b6d4] to-[#0ea5e9] text-white p-5 rounded-2xl border border-transparent shadow-[0_4px_20px_rgba(6,182,212,0.15)] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">Latency Score</span>
                        <span className="text-xl font-extrabold mt-1 block">{state.metrics.ingestionLatency}ms</span>
                        <span className="text-[10px] block mt-0.5 opacity-85">REST API Turnaround</span>
                      </div>
                      {/* Interactive selector dropdown resembling mockup */}
                      <select className="bg-white/25 text-white text-[9px] font-sans font-bold border border-white/20 py-0.5 px-2 rounded-md focus:outline-none cursor-pointer">
                        <option value="mon" className="text-slate-800 font-bold">Monthly</option>
                        <option value="day" className="text-slate-800 font-bold">Daily</option>
                      </select>
                    </div>
                    {/* Micro line graph */}
                    <div className="h-10 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={miniLineData3}>
                          <Line type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card 4: Revenue Status (Orange-to-Yellow Gradient) */}
                  <div className="bg-gradient-to-tr from-[#f97316] to-[#f59e0b] text-white p-5 rounded-2xl border border-transparent shadow-[0_4px_20px_rgba(249,115,22,0.15)] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">Pipeline velocity</span>
                        <span className="text-xl font-extrabold mt-1 block">{state.eps.toFixed(1)} EPS</span>
                        <span className="text-[10px] block mt-0.5 opacity-85">Generated transactions rate</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-md uppercase">Velo</span>
                    </div>
                    {/* Micro bar graph */}
                    <div className="h-10 w-full mt-4 flex items-end">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={miniBarData4}>
                          <Bar dataKey="value" fill="#ffffff" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* 3. Bottom Row Section: Recent Activities Logs Timeline & Order Status table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Recent Activities Logs Timeline */}
                  <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[480px]">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#7c7793] uppercase tracking-wider">Telemetry Logs</span>
                          <h2 className="text-sm font-sans font-extrabold text-[#1e1931] mt-0.5">Recent Activities</h2>
                        </div>
                        <button
                          onClick={fetchRealtimeData}
                          className="p-1.5 bg-slate-50 border border-slate-200/50 text-slate-500 hover:text-[#7c3aed] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Staggered vertical timeline identical to mockup */}
                      <div className="space-y-5">
                        {logs.slice(-5).reverse().map((log, idx) => {
                          const getColors = () => {
                            if (log.level === "error") return { border: "border-red-500 bg-red-50 text-red-500", dot: "bg-red-500" };
                            if (log.level === "warn") return { border: "border-amber-500 bg-amber-50 text-amber-500", dot: "bg-amber-500" };
                            if (log.level === "success") return { border: "border-emerald-500 bg-emerald-50 text-emerald-500", dot: "bg-emerald-500" };
                            return { border: "border-[#7c3aed] bg-purple-50 text-[#7c3aed]", dot: "bg-[#7c3aed]" };
                          };
                          const col = getColors();
                          return (
                            <div key={log.id} className="flex gap-4 items-start relative group">
                              {/* Left line segment */}
                              {idx < 4 && (
                                <div className="absolute left-3.5 top-8 bottom-0 w-[2px] bg-slate-100 group-last:hidden"></div>
                              )}
                              
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2 font-mono text-[9px] font-bold ${col.border}`}>
                                {log.service === "ingestion-api" ? "REST" : log.service === "kafka-broker" ? "KAF" : log.service === "stream-processor" ? "SPK" : "DB"}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-sans font-bold text-[#1e1931]">{log.service.toUpperCase().replace("-", " ")}</span>
                                  <span className="text-[8px] text-[#7c7793] font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                                </div>
                                <p className="text-[10px] text-[#7c7793] font-medium leading-relaxed mt-1">{log.message}</p>
                              </div>
                            </div>
                          );
                        })}
                        {logs.length === 0 && (
                          <div className="text-slate-400 font-mono text-[10px] text-center py-24">
                            Waiting for pipeline events logs...
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[9px] font-sans text-slate-400 mt-6 leading-relaxed">
                      * Operations logs stream automatically at 2 second interval buffers matching current broker lag offsets.
                    </p>
                  </div>

                  {/* Right Column: Order Status Table */}
                  <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] lg:col-span-2 flex flex-col justify-between">
                    <div>
                      {/* Table Header with Search and ADD button mimicking mockup */}
                      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#7c7793] uppercase tracking-wider">OLAP Relational Database</span>
                          <h2 className="text-sm font-sans font-extrabold text-[#1e1931] mt-0.5">Order Status</h2>
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                          {/* Search box */}
                          <input
                            type="text"
                            placeholder="Search orders..."
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            className="px-3 py-1.5 bg-[#fcfbfe] border border-[#e2e1ee] rounded-xl text-[11px] focus:outline-none focus:border-[#7c3aed]"
                          />
                          {/* Add manual event trigger button */}
                          <button
                            onClick={() => setShowInjectModal(true)}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#ec4899] to-[#7c3aed] text-white font-sans text-[10px] font-bold rounded-xl flex items-center gap-1.5 hover:opacity-95 transition-all shadow-sm cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                      {/* Custom Table displaying simulated transactions and newly injected payloads */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-sans text-xs">
                          <thead>
                            <tr className="border-b border-[#eef0f6] text-[#7c7793] font-bold uppercase tracking-wider text-[9px] bg-slate-50/50">
                              <th className="p-3">Invoice</th>
                              <th className="p-3">Customers</th>
                              <th className="p-3">From</th>
                              <th className="p-3">Price</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrders.slice((tablePage - 1) * 5, tablePage * 5).map((row, idx) => {
                              const getStatusPill = (status: string) => {
                                if (status === "Process" || status === "Pending") return "bg-pink-50 text-[#ec4899] border-pink-100";
                                if (status === "Open") return "bg-purple-50 text-[#7c3aed] border-purple-100";
                                if (status === "On Hold") return "bg-blue-50 text-blue-600 border-blue-100";
                                return "bg-emerald-50 text-emerald-700 border-emerald-100";
                              };
                              return (
                                <tr key={idx} className="border-b border-[#eef0f6] hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                                  <td className="p-3 font-mono text-slate-500">{row.invoice}</td>
                                  <td className="p-3 font-bold text-slate-900">{row.customer}</td>
                                  <td className="p-3 text-slate-500">{row.from}</td>
                                  <td className="p-3 font-mono font-bold text-slate-800">${row.price.toFixed(2)}</td>
                                  <td className="p-3">
                                    <span className={`px-3 py-1 rounded-lg border text-[10px] font-bold inline-block ${getStatusPill(row.status)}`}>
                                      {row.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredOrders.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400 font-mono">
                                  No transaction records matching query parameter scope.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination indicators conforming exactly to mockup style */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#eef0f6]">
                      <span className="text-[10px] text-[#7c7793] font-medium font-sans">
                        Showing {(tablePage - 1) * 5 + 1} to {Math.min(filteredOrders.length, tablePage * 5)} of {filteredOrders.length} entries
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                          className="px-2 py-1 text-[11px] font-bold bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/50 rounded-lg cursor-pointer transition-colors"
                        >
                          Prev
                        </button>
                        {[...Array(Math.ceil(filteredOrders.length / 5))].map((_, pageIdx) => (
                          <button
                            key={pageIdx}
                            onClick={() => setTablePage(pageIdx + 1)}
                            className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] cursor-pointer transition-colors ${
                              tablePage === pageIdx + 1
                                ? "bg-[#7c3aed] text-white"
                                : "bg-transparent text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {pageIdx + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setTablePage((p) => Math.min(Math.ceil(filteredOrders.length / 5), p + 1))}
                          className="px-2 py-1 text-[11px] font-bold bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/50 rounded-lg cursor-pointer transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              </motion.div>
            )}

            {/* ==================================================================
                VIEW 2: TOPOLOGY SYSTEM ARCHITECTURE MAP
                ================================================================== */}
            {activeTab === "topology" && (
              <motion.div
                key="topology"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-left">
                  <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#7c3aed] uppercase tracking-wider">Visual Infrastructure Layout</span>
                      <h2 className="text-xl font-sans font-extrabold text-[#1e1931]">System Topology Pipeline</h2>
                      <p className="text-xs text-[#7c7793] font-medium mt-1">
                        Live visual graph of Express API Gateway, Apache Kafka Topics, Spark Streaming, and Postgres Warehouse connection buffers. Click on any node to configure, monitor, or execute SQL queries.
                      </p>
                    </div>
                    {/* State indicators */}
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 bg-purple-50 text-[#7c3aed] rounded-xl text-[10px] font-mono font-bold border border-purple-100">
                        THROUGHPUT: {state.eps} EPS
                      </div>
                      <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-mono font-bold border border-emerald-100">
                        ANOMALY STATE: {state.anomaly.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-[#fcfbfe] border border-slate-100 rounded-2xl p-4 overflow-x-auto shadow-inner">
                    <ArchitectureMap
                      state={state}
                      activeService="ingestion-api"
                      setActiveService={() => {}}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==================================================================
                VIEW 3: WIDGETS & CONTROLS & FORM CONFIGURATIONS
                ================================================================== */}
            {activeTab === "controls" && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
              >
                
                {/* Simulation Control Card */}
                <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                      <Sliders className="h-5 w-5 text-[#7c3aed]" />
                      <h3 className="font-sans font-extrabold text-sm text-[#1e1931]">Data Stream Velocity Controller</h3>
                    </div>
                    <p className="text-xs text-[#7c7793] leading-relaxed font-medium">
                      Configure the frequency rate metrics of the REST payload ingestion nodes. Raising EPS pushes thousands of microservice request events into Apache Kafka queues live, generating simulation loads on the Spark consumer trigger intervals.
                    </p>

                    {/* Velocity Slider */}
                    <div className="mt-8 space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold font-mono">
                        <span className="text-[#7c7793]">STREAM DISPATCH RATE:</span>
                        <span className="text-[#7c3aed] bg-[#7c3aed]/5 px-2.5 py-1 rounded-md text-xs font-extrabold">{state.eps.toFixed(1)} EPS</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={state.eps}
                        disabled={!state.isRunning}
                        onChange={(e) => handleUpdateControls({ eps: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#7c3aed] disabled:opacity-40"
                      />
                      <div className="flex justify-between font-mono text-[9px] text-[#7c7793] font-bold">
                        <span>0.5 EPS (LITE)</span>
                        <span>5.0 EPS (STANDARD)</span>
                        <span>10.0 EPS (STRESS LOAD)</span>
                      </div>
                    </div>

                    {/* Run / Stop toggle */}
                    <div className="mt-8 p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-[#1e1931] block">Global Thread Scheduler</span>
                        <span className="text-[10px] text-[#7c7793] block font-medium">Pause ingestion loops instantly</span>
                      </div>
                      <button
                        onClick={() => handleUpdateControls({ isRunning: !state.isRunning })}
                        className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                          state.isRunning
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                            : "bg-red-600 text-white shadow-md shadow-red-500/10"
                        }`}
                      >
                        {state.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        <span>{state.isRunning ? "ACTIVE" : "PAUSED"}</span>
                      </button>
                    </div>

                  </div>

                  <div className="pt-6 border-t border-[#eef0f6] flex items-center gap-2 mt-6">
                    <Lightbulb className="h-4.5 w-4.5 text-[#ec4899] shrink-0" />
                    <p className="text-[10px] text-[#7c7793] font-medium leading-relaxed">
                      Protip: Stress test Postgres table locks by pushing 10.0 EPS while running custom relational aggregations or dbt transform builds.
                    </p>
                  </div>
                </div>

                {/* Anomaly Injector Form Panel */}
                <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <h3 className="font-sans font-extrabold text-sm text-[#1e1931]">Anomaly Malfunction Injector</h3>
                    </div>
                    <p className="text-xs text-[#7c7793] leading-relaxed font-medium">
                      Simulate network disruptions, server failures, and holiday spikes to evaluate how Spark Structured Streaming processes late events and dbt staging constraints enforce data integrity validation.
                    </p>

                    {/* Selector */}
                    <div className="space-y-4 mt-8">
                      <label className="text-[10px] font-mono font-bold text-[#7c7793] block uppercase">Select Anomaly Profile:</label>
                      <div className="grid grid-cols-2 gap-3.5">
                        {[
                          { id: "none", label: "Normal Load", desc: "Uniform user session distributions" },
                          { id: "black_friday", label: "Black Friday", desc: "Purchase transactions spike 400%" },
                          { id: "iot_malfunction", label: "IoT Device Fault", desc: "Validation errors payload drops" },
                          { id: "ad_campaign", label: "Viral Ad Spike", desc: "Heavy navigational searches" }
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleUpdateControls({ anomaly: item.id as any })}
                            disabled={!state.isRunning}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all disabled:opacity-40 ${
                              state.anomaly === item.id
                                ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/10 font-bold"
                                : "bg-white border-[#eef0f6] hover:border-amber-200"
                            }`}
                          >
                            <span className="text-xs text-[#1e1931] block font-bold">{item.label}</span>
                            <span className="text-[9px] text-[#7c7793] block font-medium mt-0.5 leading-tight">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  <div className="pt-6 border-t border-[#eef0f6] mt-6 flex justify-between text-[10px] font-mono text-slate-500 font-bold">
                    <span>Broker Health Check: Passed</span>
                    <span className="text-emerald-600">Secure SSL active</span>
                  </div>
                </div>

              </motion.div>
            )}

            {/* ==================================================================
                VIEW 4: SQL TABLES & ANALYTICS CLIENT
                ================================================================== */}
            {activeTab === "sql" && (
              <motion.div
                key="sql"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                {/* Core analytical selector buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-[10px] text-[#7c7793] font-bold uppercase mr-1">Pre-built Table Schemas:</span>
                  <button
                    onClick={() => handleRunQuery("SELECT * FROM raw_events ORDER BY id DESC LIMIT 20")}
                    className="px-3 py-1.5 bg-white border border-[#e2e1ee] hover:bg-purple-50 hover:text-[#7c3aed] text-slate-700 font-mono text-[10px] rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    SELECT FROM raw_events
                  </button>
                  <button
                    onClick={() => handleRunQuery("SELECT * FROM raw_event_aggregates ORDER BY window_start DESC LIMIT 15")}
                    className="px-3 py-1.5 bg-white border border-[#e2e1ee] hover:bg-purple-50 hover:text-[#7c3aed] text-slate-700 font-mono text-[10px] rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    SELECT FROM raw_event_aggregates
                  </button>
                  <button
                    onClick={() => handleRunQuery("SELECT * FROM fct_daily_user_activity LIMIT 15")}
                    className="px-3 py-1.5 bg-white border border-[#e2e1ee] hover:bg-purple-50 hover:text-[#7c3aed] text-slate-700 font-mono text-[10px] rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    SELECT FROM fct_daily_user_activity
                  </button>
                </div>

                {/* SQL terminal client */}
                <div className="bg-[#120d24] border border-[#211a3d] rounded-2xl overflow-hidden flex flex-col shadow-lg">
                  {/* Panel Header */}
                  <div className="bg-[#0b0718] px-4 py-3 border-b border-[#211a3d] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4.5 w-4.5 text-emerald-400" />
                      <span className="font-mono text-xs font-semibold text-slate-300">lector_olap_data_warehouse_v2</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>
                  </div>

                  {/* Query Input block */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRunQuery();
                    }}
                    className="p-4 bg-[#18122f] border-b border-[#211a3d] flex flex-col md:flex-row gap-3 items-stretch"
                  >
                    <input
                      type="text"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="Enter SELECT SQL query statements..."
                      className="flex-1 px-3 py-2.5 bg-[#0c081a] border border-[#211a3d] rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 placeholder-slate-700"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      {queryLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      <span>{queryLoading ? "Executing..." : "Run Query"}</span>
                    </button>
                  </form>

                  {/* Query results output viewport */}
                  <div className="p-4 overflow-x-auto min-h-[180px] max-h-[300px] bg-[#0c081a]">
                    {queryLoading && (
                      <div className="flex flex-col items-center justify-center h-[140px] gap-2 font-mono text-xs text-slate-500">
                        <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                        <span>Scanning partitioned indexes... compiling query context...</span>
                      </div>
                    )}

                    {queryResult && queryResult.error && (
                      <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-xs font-mono text-red-400">
                        {queryResult.error}
                      </div>
                    )}

                    {queryResult && !queryResult.error && (
                      <div className="space-y-3">
                        <div className="flex justify-between font-mono text-[10px] text-slate-500 border-b border-[#211a3d] pb-2">
                          <span>Execution speed: {queryResult.executionTimeMs}ms</span>
                          <span>Total records: {queryResult.rowCount} rows fetched</span>
                        </div>

                        {queryResult.rows.length === 0 ? (
                          <div className="text-slate-500 text-center py-6 font-mono text-[11px]">
                            Query executed successfully. Result set is empty.
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse font-mono text-[11px] text-slate-300">
                            <thead>
                              <tr className="border-b border-[#211a3d] text-slate-400 bg-[#0b0718]">
                                {queryResult.columns.map((col) => (
                                  <th key={col} className="p-2.5 font-bold uppercase tracking-wider text-[10px]">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-[#211a3d]/40 hover:bg-[#1f183c]/50">
                                  {queryResult.columns.map((col) => {
                                    const val = row[col];
                                    return (
                                      <td key={col} className="p-2.5 truncate max-w-[200px]">
                                        {typeof val === "number" && (col.includes("value") || col.includes("price")) ? `$${val.toFixed(2)}` : String(val)}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {!queryLoading && !queryResult && (
                      <div className="text-slate-500 font-mono text-xs text-center py-12">
                        Execute a SELECT query above or run a pre-built table template to view active Postgres database records.
                      </div>
                    )}
                  </div>
                </div>

                {/* dbt transform workflow card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
                  
                  {/* Dependency graph outline */}
                  <div className="bg-white border border-[#eef0f6] rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
                    <h4 className="font-sans font-bold text-sm text-[#1e1931] border-b border-slate-100 pb-2">dbt DAG Dependency Structure</h4>
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#eef0f6] shadow-sm">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-bold text-[9px]">SOURCE</span>
                        <span className="text-[#1e1931] font-bold text-[11px]">postgres.raw_events</span>
                      </div>
                      <div className="flex justify-center h-4">
                        <div className="w-0.5 h-full bg-purple-200"></div>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#eef0f6] shadow-sm">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-bold text-[9px]">STAGING MODEL</span>
                        <span className="text-[#1e1931] font-bold text-[11px]">stg_events.sql</span>
                        <span className="text-[#7c7793] text-[9px] font-sans font-medium">uniqueness verified</span>
                      </div>
                      <div className="flex justify-center h-4">
                        <div className="w-0.5 h-full bg-purple-200"></div>
                      </div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#eef0f6] shadow-sm">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-md font-bold text-[9px]">MART</span>
                        <span className="text-[#1e1931] font-bold text-[11px]">fct_daily_user_activity.sql</span>
                        <span className="text-[#7c3aed] text-[9px] font-sans font-medium">materialized incremental</span>
                      </div>
                    </div>
                  </div>

                  {/* Terminal output logs */}
                  <div className="bg-[#120d24] border border-[#211a3d] rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg">
                    <div className="bg-[#0b0718] px-4 py-2.5 border-b border-[#211a3d] flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-400">dbt CLI transform builder</span>
                      <button
                        onClick={handleRunDbt}
                        disabled={dbtRunning}
                        className="px-4 py-1.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white font-sans text-[10px] font-bold rounded-lg cursor-pointer transition-colors hover:opacity-95 disabled:opacity-50"
                      >
                        {dbtRunning ? "Running..." : "dbt run"}
                      </button>
                    </div>
                    <div className="bg-[#0c081a] p-4 font-mono text-[10px] text-emerald-400 space-y-1.5 overflow-y-auto h-[180px]">
                      {dbtTerminalLogs.length === 0 ? (
                        <div className="text-slate-500 text-center py-10 select-none">
                          Click "dbt run" above to compile incremental warehouse marts and execute integrity constraints.
                        </div>
                      ) : (
                        dbtTerminalLogs.map((logStr, lIdx) => (
                          <div key={lIdx} className="leading-relaxed">{logStr}</div>
                        ))
                      )}
                    </div>
                    <p className="p-3 bg-[#18122f] border-t border-[#211a3d] text-[10px] text-[#7c7793] font-medium leading-relaxed font-sans">
                      The dbt transformations automatically map active PostgreSQL raw schemas into optimized dimensional reports.
                    </p>
                  </div>

                </div>

                {/* ML Classifier Predictor Card */}
                <div className="bg-white border border-[#eef0f6] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                    <Cpu className="h-5 w-5 text-[#7c3aed]" />
                    <h3 className="font-sans font-extrabold text-sm text-[#1e1931]">Scikit-Learn ML Propensity Playground</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <form onSubmit={handleRunPrediction} className="space-y-4">
                      <p className="text-xs text-[#7c7793] leading-relaxed font-medium">
                        Trains an online Random Forest propensity algorithm based on cumulative user clicks and monetary transaction values. Exposes FastAPI inferences.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-mono font-bold text-[#7c7793] uppercase block">Cumulative clicks count:</label>
                          <input
                            type="number"
                            required
                            value={predictEvents}
                            onChange={(e) => setPredictEvents(e.target.value)}
                            className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono font-bold text-[#7c7793] uppercase block">Purchase cart value ($):</label>
                          <input
                            type="number"
                            required
                            value={predictValue}
                            onChange={(e) => setPredictValue(e.target.value)}
                            className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed]"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={predictLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 font-sans text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        {predictLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        <span>Execute Prediction Scoring</span>
                      </button>
                    </form>

                    <div className="p-4 bg-slate-50 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <div>
                        <h4 className="text-[11px] font-mono font-bold text-[#7c7793] uppercase block">Inference Classification Output:</h4>
                        {prediction ? (
                          <div className="space-y-4 mt-3">
                            <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-slate-100 shadow-sm">
                              <span className="text-[11px] font-sans text-[#7c7793] font-bold">Class Label:</span>
                              <span className={`font-mono font-extrabold text-xs px-2.5 py-1 rounded-md ${
                                prediction.will_purchase 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}>
                                {prediction.will_purchase ? "Will Purchase (TRUE)" : "Unlikely Purchase (FALSE)"}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between font-mono text-[9px] text-[#7c7793] font-bold">
                                <span>Propensity Confidence:</span>
                                <span className="text-[#1e1931]">{Math.round(prediction.probability * 100)}%</span>
                              </div>
                              <div className="w-full h-2 bg-[#f3f1fb] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${prediction.will_purchase ? "bg-emerald-500" : "bg-purple-500"}`}
                                  style={{ width: `${prediction.probability * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center font-mono text-[11px] text-slate-400 py-10">
                            Submit click volume constraints in form to execute Scikit-Learn predictions.
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-[#7c7793] mt-4 pt-3 border-t border-slate-100">
                        <span>Framework: Scikit-learn Random Forest</span>
                        <span>Inference: FastAPI</span>
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* ==================================================================
                VIEW 5: AI PLATFORM ADVISOR COACH CHAT
                ================================================================== */}
            {activeTab === "coach" && (
              <motion.div
                key="coach"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 flex-1 flex flex-col min-h-[500px]"
              >
                <div className="text-left">
                  <span className="text-[10px] font-mono font-bold text-[#7c3aed] uppercase tracking-wider">Expert Advisory Workspace</span>
                  <h2 className="text-xl font-sans font-extrabold text-[#1e1931]">Platform Lead Architect Advisor</h2>
                  <p className="text-xs text-[#7c7793] font-medium mt-1">
                    Consult with our Principal Data Architect AI Coach to scale Kafka topics replication, tune Spark sliding watermarks, configure PostgreSQL indexing, or deploy on Kubernetes clusters.
                  </p>
                </div>

                {/* Chat window panel */}
                <div className="bg-white border border-[#eef0f6] rounded-2xl shadow-sm flex flex-col overflow-hidden flex-1 min-h-[380px]">
                  
                  {/* Messages window */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[360px] bg-[#fdfcff]/40">
                    {coachChat.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl border text-xs leading-relaxed text-left shadow-sm ${
                            msg.role === "user"
                              ? "bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] border-[#7c3aed] text-white font-sans font-medium"
                              : "bg-[#f4f3f9] border-[#e2e1ee] text-slate-800 font-sans"
                          }`}
                        >
                          <span className={`font-mono text-[9px] font-bold block mb-1 ${msg.role === "user" ? "text-purple-100" : "text-[#7c3aed]"}`}>
                            {msg.role === "user" ? "YOU (Lead Engineer)" : "GEMINI PLATFORM COACH (Principal)"}
                          </span>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {coachLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#f4f3f9] border border-[#e2e1ee] p-3.5 rounded-2xl max-w-[85%] flex items-center gap-2 font-mono text-[11px] text-[#7c7793] shadow-sm font-medium">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#7c3aed]" />
                          <span>Gemini architect is analyzing database models... compiling recommendations...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggestion questions chips */}
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-[#fbf9ff] flex flex-wrap gap-1.5 items-center">
                    <span className="font-mono text-[8px] text-[#7c7793] uppercase font-bold mr-1">Ask chip:</span>
                    {[
                      "How to scale Kafka brokers?",
                      "Tweak Spark stream trigger interval?",
                      "dbt incremental tables architecture?"
                    ].map((txt) => (
                      <button
                        key={txt}
                        onClick={() => setCoachPrompt(txt)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#e2e1ee] text-slate-600 rounded-lg font-mono text-[9px] transition-colors shadow-sm cursor-pointer"
                      >
                        {txt}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleAskCoach} className="p-3 bg-white border-t border-[#eef0f6] flex gap-2">
                    <input
                      type="text"
                      required
                      value={coachPrompt}
                      onChange={(e) => setCoachPrompt(e.target.value)}
                      placeholder="Ask the AI Lead Platform Architect an engineering query..."
                      className="flex-1 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] placeholder-[#7c7793]/70 font-sans font-medium"
                    />
                    <button
                      type="submit"
                      className="px-4.5 py-2 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>

                </div>
              </motion.div>
            )}

            {/* ==================================================================
                VIEW 6: SCROLL SCCODE BLUEPRINTS EXPLORER
                ================================================================== */}
            {activeTab === "scaffolds" && (
              <motion.div
                key="scaffolds"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 flex-1 flex flex-col min-h-[500px]"
              >
                <div className="text-left">
                  <span className="text-[10px] font-mono font-bold text-[#7c3aed] uppercase tracking-wider">Repository Scaffold Bundle</span>
                  <h2 className="text-xl font-sans font-extrabold text-[#1e1931]">Docker, Kubernetes, and Core Code files</h2>
                  <p className="text-xs text-[#7c7793] font-medium mt-1">
                    Download complete ready-to-run microservices repository containing Express gateways, Kafka partitions setups, SparkStructuredStreaming jobs, dbt build chains, and FastAPI classifiers.
                  </p>
                </div>

                {/* Explorer grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 text-left">
                  
                  {/* File tree browser */}
                  <div className="bg-white border border-[#eef0f6] p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-3 max-h-[380px] overflow-y-auto">
                    <span className="font-mono text-[10px] text-[#7c7793] font-bold uppercase block border-b border-slate-50 pb-1.5">Repository Directory</span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {blueprints.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => setSelectedFile(file)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                            selectedFile?.path === file.path
                              ? "bg-purple-50 text-[#7c3aed] border-l-4 border-[#7c3aed] font-bold"
                              : "text-[#5a5278] hover:bg-slate-50 hover:text-[#1e1931]"
                          }`}
                        >
                          <FileCode className="h-4 w-4 shrink-0 text-[#7c7793]" />
                          <span className="truncate">{file.path}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected code file viewer */}
                  <div className="bg-[#120d24] border border-[#211a3d] rounded-2xl overflow-hidden col-span-2 flex flex-col min-h-[300px] shadow-lg">
                    {selectedFile ? (
                      <>
                        <div className="bg-[#0b0718] px-4 py-3 border-b border-[#211a3d] flex items-center justify-between">
                          <div className="flex flex-col text-left">
                            <span className="font-mono text-xs font-semibold text-slate-300">{selectedFile.path}</span>
                            <span className="text-[9px] text-[#7c7793] font-sans mt-0.5">{selectedFile.description}</span>
                          </div>
                          <button
                            onClick={handleCopyScaffoldCode}
                            className="p-1.5 hover:bg-[#1f183c] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Copy to clipboard"
                          >
                            {copiedFile ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="p-4 overflow-y-auto font-mono text-[10px] text-slate-300 bg-[#0c081a] leading-relaxed flex-1 max-h-[300px] text-left">
                          <pre className="whitespace-pre-wrap">{selectedFile.content}</pre>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-500 py-10">
                        Select a scaffold file from the left directory to preview codebase files.
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* ----------------------------------------------------------------------
          4. INTERACTIVE PAYLOAD INJECTOR DIALOG MODAL (MOCKUP TRIGGER)
          ---------------------------------------------------------------------- */}
      {showInjectModal && (
        <div className="fixed inset-0 bg-[#0b0718]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#eef0f6] rounded-2xl shadow-xl max-w-md w-full overflow-hidden text-left"
          >
            <div className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DatabaseZap className="h-5 w-5" />
                <h3 className="font-sans font-bold text-sm">Interactive HTTP Event Ingestion</h3>
              </div>
              <button onClick={() => setShowInjectModal(false)} className="text-white/80 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualInject} className="p-6 space-y-4">
              <p className="text-xs text-[#7c7793] leading-relaxed font-medium">
                Submit an HTTP POST web payload mimicking the Rest API Gateway client payloads. Validation schema constraints will evaluate parameter parameters.
              </p>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#7c7793] uppercase block">User ID Identifier:</label>
                <input
                  type="text"
                  required
                  value={injectUserId}
                  onChange={(e) => setInjectUserId(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#7c7793] uppercase block">Event Type Action:</label>
                  <select
                    value={injectEvent}
                    onChange={(e: any) => setInjectEvent(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] font-sans font-semibold"
                  >
                    <option value="page_view">page_view</option>
                    <option value="search">search</option>
                    <option value="add_to_cart">add_to_cart</option>
                    <option value="purchase">purchase</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#7c7793] uppercase block">Transaction Price ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={injectValue}
                    onChange={(e) => setInjectValue(e.target.value)}
                    disabled={injectEvent === "page_view" || injectEvent === "search"}
                    className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] disabled:opacity-40 font-mono"
                  />
                </div>
              </div>

              {injectSuccessMessage && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-mono text-[#7c3aed] leading-relaxed">
                  {injectSuccessMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={injectLoading}
                className="w-full py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 text-white font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-55"
              >
                {injectLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>Submit HTTP POST payload</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
