/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { 
  Server, 
  Layers, 
  Activity, 
  Database, 
  GitPullRequest, 
  Cpu, 
  FolderTree, 
  Terminal, 
  ArrowRight, 
  RefreshCw, 
  Play, 
  Pause, 
  Copy, 
  Check, 
  Download, 
  Send, 
  FileCode, 
  DatabaseZap,
  HelpCircle,
  Lightbulb
} from "lucide-react";
import { 
  SimulatorState, 
  DataPlatformEvent, 
  QueryResult, 
  SystemLog, 
  CodeFileBlueprint 
} from "../types";

interface SystemsTabsProps {
  state: SimulatorState;
  logs: SystemLog[];
  activeService: string;
  setActiveService: (service: string) => void;
  triggerRefresh: () => void;
}

export default function SystemsTabs({ state, logs, activeService, setActiveService, triggerRefresh }: SystemsTabsProps) {
  // Tabs: ingestion-api, kafka-broker, stream-processor, warehouse, dbt, ml-service, blueprints, coach
  const tabs = [
    { id: "ingestion-api", label: "Ingestion Gateway", icon: <Server className="h-4 w-4" /> },
    { id: "kafka-broker", label: "Kafka Topics", icon: <Layers className="h-4 w-4" /> },
    { id: "stream-processor", label: "Spark Processor", icon: <Activity className="h-4 w-4" /> },
    { id: "warehouse", label: "SQL Data Warehouse", icon: <Database className="h-4 w-4" /> },
    { id: "dbt", label: "dbt Transformations", icon: <GitPullRequest className="h-4 w-4" /> },
    { id: "ml-service", label: "ML FastAPI", icon: <Cpu className="h-4 w-4" /> },
    { id: "blueprints", label: "Source Scaffold", icon: <FolderTree className="h-4 w-4" /> },
    { id: "coach", label: "Architect AI Coach", icon: <Terminal className="h-4 w-4" /> },
  ];

  // Manual Event Ingestion form state
  const [ingestUserId, setIngestUserId] = useState("usr_dev999");
  const [ingestEvent, setIngestEvent] = useState<"page_view" | "search" | "add_to_cart" | "purchase">("purchase");
  const [ingestValue, setIngestValue] = useState("129.50");
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // PostgreSQL Query console state
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM raw_events ORDER BY id DESC LIMIT 10");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // dbt transformation states
  const [dbtRunning, setDbtRunning] = useState(false);
  const [dbtTerminalLogs, setDbtTerminalLogs] = useState<string[]>([]);

  // ML Service Propensity Prediction state
  const [predictEvents, setPredictEvents] = useState("8");
  const [predictValue, setPredictValue] = useState("45.00");
  const [prediction, setPrediction] = useState<{ will_purchase: boolean; probability: number } | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);

  // Blueprints Scaffold explorer state
  const [blueprints, setBlueprints] = useState<CodeFileBlueprint[]>([]);
  const [selectedFile, setSelectedFile] = useState<CodeFileBlueprint | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Gemini AI Coach state
  const [coachPrompt, setCoachPrompt] = useState("");
  const [coachChat, setCoachChat] = useState<Array<{ role: "user" | "model"; text: string }>>([
    {
      role: "model",
      text: "Welcome! I'm your Principal Data Architect. I designed this streaming platform (Express Ingestion -> Kafka topics -> Spark Micro-batches -> PostgreSQL Warehouse -> dbt marts -> FastAPI RF predictor). Ask me anything about scaling, partitions, Spark watermarks, Kubernetes HPAs, CI/CD, or customizing the configurations!",
    },
  ]);
  const [coachLoading, setCoachLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch blueprints on load
  useEffect(() => {
    fetch("/api/blueprints")
      .then((r) => r.json())
      .then((data) => {
        setBlueprints(data);
        if (data.length > 0) setSelectedFile(data[0]);
      });
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachChat]);

  // Execute mock PostgreSQL query
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
    } catch (e: any) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: "Network error executing query context.",
      });
    } finally {
      setQueryLoading(false);
    }
  };

  // Handle Manual Ingest POST
  const handleManualIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngestStatus("Sending request...");
    try {
      const res = await fetch("/api/ingest/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: ingestUserId,
          event: ingestEvent,
          value: parseFloat(ingestValue) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIngestStatus(`Success! Event ${data.event.id} published to topic raw-events.`);
        triggerRefresh();
        setTimeout(() => setIngestStatus(null), 5000);
      } else {
        setIngestStatus(`Failed: ${data.error}`);
      }
    } catch (err) {
      setIngestStatus("Network failure posting event gateway.");
    }
  };

  // Run dbt transformations
  const handleRunDbt = async () => {
    setDbtRunning(true);
    setDbtTerminalLogs(["$ dbt run --profiles-dir ."]);
    try {
      const res = await fetch("/api/dbt/run", { method: "POST" });
      const data = await res.json();
      
      // Animate log output line by line
      let index = 0;
      const interval = setInterval(() => {
        if (index < data.logs.length) {
          setDbtTerminalLogs((prev) => [...prev, data.logs[index]]);
          index++;
        } else {
          clearInterval(interval);
          setDbtRunning(false);
          triggerRefresh();
        }
      }, 350);
    } catch (err) {
      setDbtTerminalLogs((prev) => [...prev, "Fatal: DBT process timed out. Warehouse connection interrupted."]);
      setDbtRunning(false);
    }
  };

  // Run ML Prediction PROPENSITY
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

  // Ask Architect Coach Chat
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
        { role: "model", text: "Error connecting to AI Server. Please ensure your Gemini key is loaded." },
      ]);
    } finally {
      setCoachLoading(false);
    }
  };

  // Copy code contents
  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // Trigger download of complete scaffold repo ZIP
  const handleDownloadZip = async () => {
    setZipping(true);
    const zip = new JSZip();

    // Populate zip with blueprints matching directory structure
    blueprints.forEach((file) => {
      zip.file(file.path, file.content);
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "data-platform-scaffold.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Zipping error:", err);
    } finally {
      setZipping(false);
    }
  };

  // Helper for rendering log rows
  const getLogColorClass = (level: SystemLog["level"]) => {
    if (level === "error") return "text-red-400 font-medium";
    if (level === "warn") return "text-amber-400 font-medium";
    if (level === "success") return "text-emerald-400 font-medium";
    return "text-slate-300";
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 bg-white rounded-2xl border border-[#eef0f6] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.015)] min-h-[580px]">
      
      {/* Side Tabs Rail */}
      <div className="w-full md:w-[240px] bg-[#fbf9ff] border-r border-[#eef0f6] p-4 flex flex-col justify-between">
        <div className="space-y-1">
          <span className="font-mono text-[9px] text-[#7c7793] font-bold uppercase tracking-wider px-3">System Nodes</span>
          <nav className="space-y-1 mt-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveService(tab.id);
                  if (tab.id === "warehouse" && !queryResult) {
                    handleRunQuery(); // fetch initial table SQL
                  }
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-sans font-semibold transition-all duration-200 ${
                  activeService === tab.id
                    ? "bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] text-white shadow-md shadow-purple-500/10"
                    : "text-[#5a5278] hover:bg-slate-100/80 hover:text-[#1e1931]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Scaffold CTA Box */}
        <div className="hidden md:block p-3.5 rounded-xl border border-[#eef0f6] bg-white shadow-sm mt-6">
          <span className="font-sans font-bold text-[11px] text-[#7c3aed] flex items-center gap-1">
            <FolderTree className="h-3.5 w-3.5" /> Scaffolding Available
          </span>
          <p className="text-[10px] text-[#7c7793] mt-1 leading-relaxed font-medium">
            Need a production-ready repository? Download the full multi-service workspace as a ZIP instantly.
          </p>
          <button
            onClick={handleDownloadZip}
            disabled={zipping}
            className="w-full mt-3 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 font-mono text-[10px] rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            {zipping ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            <span>{zipping ? "Packaging..." : "Download Scaffold.zip"}</span>
          </button>
        </div>
      </div>

      {/* Primary Systems Display Workspace */}
      <div className="flex-1 p-6 flex flex-col min-h-0">
        
        {/* ==========================================
            TAB: INGESTION API
            ========================================== */}
        {activeService === "ingestion-api" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">Gateway Layer</span>
                <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">Ingestion REST API Gateway</h3>
                <p className="text-xs text-[#7c7793] font-medium mt-1">
                  Node.js Express microservice accepting real-time JSON web payloads over HTTP, validating schema constraints, and pushing to Kafka topics.
                </p>
              </div>
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-mono text-[10px] font-semibold">
                HTTP Endpoint: POST /api/ingest/events
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Event Injector Form */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.005)]">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <DatabaseZap className="h-4.5 w-4.5 text-[#ec4899]" />
                  <h4 className="font-sans font-bold text-sm text-[#1e1931]">Interactive REST Event Injector</h4>
                </div>
                <form onSubmit={handleManualIngest} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-[#7c7793] uppercase font-bold">UserId Identifier</label>
                    <input
                      type="text"
                      required
                      value={ingestUserId}
                      onChange={(e) => setIngestUserId(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-purple-500/5 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-[#7c7793] uppercase font-bold">Event Action</label>
                      <select
                        value={ingestEvent}
                        onChange={(e: any) => setIngestEvent(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-purple-500/5 font-sans font-medium"
                      >
                        <option value="page_view">page_view</option>
                        <option value="search">search</option>
                        <option value="add_to_cart">add_to_cart</option>
                        <option value="purchase">purchase</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#7c7793] uppercase font-bold">Transaction Value ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ingestValue}
                        onChange={(e) => setIngestValue(e.target.value)}
                        disabled={ingestEvent === "page_view" || ingestEvent === "search"}
                        className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-purple-500/5 font-mono disabled:opacity-40"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 font-sans text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Send HTTP Request</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
                {ingestStatus && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl font-mono text-[10px] text-indigo-700">
                    {ingestStatus}
                  </div>
                )}
              </div>

              {/* API Schema documentation & Logs */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.005)] flex flex-col justify-between">
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#1e1931] mb-2.5 flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-[#7c3aed]" /> Payloads Validation Schema
                  </h4>
                  <pre className="font-mono text-[10px] text-[#db2777] bg-[#fff0f6] p-3.5 rounded-xl overflow-x-auto border border-[#fce7f3]/60">
{`{
  "userId": "string (required)",
  "event": "page_view | add_to_cart | purchase | search (required)",
  "value": "float (optional, default 0.0)",
  "timestamp": "ISO8601 string (optional)"
}`}
                  </pre>
                  <p className="text-[10px] text-[#7c7793] font-medium mt-3 leading-relaxed">
                    Gatekeepers reject malformed parameters (e.g. invalid actions or missing identifiers) with <code className="bg-red-50 text-red-600 px-1 py-0.5 rounded border border-red-100">HTTP 400 Bad Request</code> and drop telemetry tracking before publishing to topics.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="font-mono text-[9px] text-[#7c7793] font-bold uppercase block mb-1.5">Live Gateway Latency</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl font-extrabold text-emerald-600">{state.metrics.ingestionLatency}ms</span>
                    <span className="text-[10px] text-[#7c7793] font-medium font-sans">average HTTP turnaround time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: KAFKA TOPICS
            ========================================== */}
        {activeService === "kafka-broker" && (
          <div className="space-y-6">
            <div>
              <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">Message Queueing</span>
              <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">Apache Kafka Distributed Message Broker</h3>
              <p className="text-xs text-[#7c7793] font-medium mt-1">
                Serves as a fault-tolerant message pipeline to decouple high-volume ingestion endpoints from resource-intensive streaming engines.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Topic Cards */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.005)]">
                <h4 className="font-sans font-bold text-sm text-[#1e1931] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Layers className="h-4 w-4 text-[#7c3aed]" /> Topic: <span className="font-mono text-[#a855f7] font-bold">raw-events</span>
                </h4>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-[#7c7793] font-sans font-semibold">Partitions:</span>
                    <span className="text-[#1e1931] font-bold">3</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-[#7c7793] font-sans font-semibold">Replication Factor:</span>
                    <span className="text-[#1e1931] font-bold">1 (dev-mode)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7c7793] font-sans font-semibold">ZooKeeper Sync:</span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[10px]">Green Active</span>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#7c7793] font-sans font-semibold">Consumer Lag Offset:</span>
                    <span className={`font-extrabold px-2 py-0.5 rounded-md ${state.eps > 6 ? "text-amber-700 bg-amber-50 border border-amber-100" : "text-emerald-700 bg-emerald-50 border border-emerald-100"} text-[10px]`}>
                      {state.eps > 6 ? "15 offsets" : "0 offsets"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Partition Details */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl col-span-2 flex flex-col justify-between shadow-[0_4px_15px_rgba(0,0,0,0.005)]">
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#1e1931] mb-3">Topic Partitions & Broker Allocations</h4>
                  <div className="space-y-2.5">
                    {[
                      { p: 0, leader: "Broker-1", replicas: "1,2", isr: "1,2", endOffset: 12502 + Math.round(state.metrics.totalIngested * 0.3) },
                      { p: 1, leader: "Broker-2", replicas: "2,3", isr: "2,3", endOffset: 12450 + Math.round(state.metrics.totalIngested * 0.35) },
                      { p: 2, leader: "Broker-3", replicas: "3,1", isr: "3,1", endOffset: 12510 + Math.round(state.metrics.totalIngested * 0.35) },
                    ].map((row) => (
                      <div key={row.p} className="flex items-center justify-between p-3 rounded-xl bg-white font-mono text-[10px] border border-[#eef0f6] shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-[#7c3aed]">Partition #{row.p}</span>
                          <span className="text-[#7c7793] font-medium">Leader: {row.leader}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[#7c7793] font-medium">ISR: [{row.isr}]</span>
                          <span className="text-slate-800 font-bold bg-slate-50 border border-slate-150 px-2 py-0.5 rounded">Offset: {row.endOffset}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-[#7c7793] font-medium mt-3 leading-relaxed font-sans">
                  The producer partitions keys uniformly based on the hash of the <code>userId</code> parameter, ensuring ordered event delivery and scalable multi-consumer processing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: STREAM PROCESSOR (SPARK)
            ========================================== */}
        {activeService === "stream-processor" && (
          <div className="space-y-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">Streaming Engine</span>
                <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">Spark Structured Streaming Processor</h3>
                <p className="text-xs text-[#7c7793] font-medium mt-1">
                  Executes micro-batch analytics workloads over slide windows of data (1 minute tumbling) with robust watermarking logic for late-arriving events.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#7c3aed]/5 border border-[#7c3aed]/25 px-3 py-1.5 rounded-xl text-[#7c3aed] font-mono text-[11px] font-bold shadow-sm">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Watermark: 2 minutes lag max</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Micro batch configurations */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.005)]">
                <h4 className="font-sans font-bold text-sm text-[#1e1931] flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-[#ec4899]" /> Active Streaming Job Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-white rounded-xl border border-[#eef0f6] shadow-sm">
                    <span className="text-[#7c7793] font-sans font-semibold text-[10px] block mb-1">Micro-batch Frequency</span>
                    <span className="text-[#1e1931] font-extrabold">10 seconds</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#eef0f6] shadow-sm">
                    <span className="text-[#7c7793] font-sans font-semibold text-[10px] block mb-1">Trigger Execution Time</span>
                    <span className="text-emerald-600 font-extrabold">{state.metrics.processingLatency}ms</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#eef0f6] shadow-sm">
                    <span className="text-[#7c7793] font-sans font-semibold text-[10px] block mb-1">Throughput Rate</span>
                    <span className="text-[#7c3aed] font-extrabold">~{(state.eps * 1).toFixed(1)} events/sec</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#eef0f6] shadow-sm">
                    <span className="text-[#7c7793] font-sans font-semibold text-[10px] block mb-1">State Stores size</span>
                    <span className="text-slate-700 font-extrabold">2.4 MB (in-memory)</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100/60 flex items-start gap-2.5 text-[10px] leading-relaxed text-[#7c3aed] font-sans font-medium">
                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#a855f7]" />
                  <span>
                    Spark aggregates raw transactional clicks inside tumbling 1-minute window intervals to build running aggregate totals before committing to Postgres.
                  </span>
                </div>
              </div>

              {/* Spark Code Snippet Preview */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.005)] flex flex-col justify-between">
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#1e1931] mb-2.5">Micro-Batch Aggregation Model</h4>
                  <pre className="font-mono text-[10px] text-[#db2777] bg-[#fff0f6] p-3.5 rounded-xl overflow-x-auto border border-[#fce7f3]/60 max-h-[160px]">
{`# Sliding aggregations over event stream
agg_df = parsed_df \\
    .withWatermark("timestamp", "2 minutes") \\
    .groupBy(
        window(col("timestamp"), "1 minute"), 
        col("event")
    ) \\
    .agg(
        count("*").alias("event_count"), 
        _sum("value").alias("total_value")
    )`}
                  </pre>
                </div>
                <p className="text-[10px] text-[#7c7793] font-medium mt-3 font-sans leading-relaxed">
                  In production, the Spark job executes on an auto-scaling cluster with checkpoint directories hosted on cloud stores to recover state automatically during nodes failures.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: POSTGRES WAREHOUSE
            ========================================== */}
        {activeService === "warehouse" && (
          <div className="space-y-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">OLAP Store</span>
                <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">PostgreSQL Target Data Warehouse</h3>
                <p className="text-xs text-[#7c7793] font-medium mt-1">
                  Relational analytical engine housing structured star-schema tables and window-aggregates committed directly by our processing streams.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleRunQuery("SELECT * FROM raw_events ORDER BY id DESC LIMIT 50")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-[#7c3aed]/10 hover:text-[#7c3aed] text-slate-700 font-mono text-[10px] rounded-lg transition-colors border border-slate-200/50 font-bold"
                >
                  raw_events
                </button>
                <button
                  onClick={() => handleRunQuery("SELECT * FROM raw_event_aggregates ORDER BY window_start DESC LIMIT 20")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-[#7c3aed]/10 hover:text-[#7c3aed] text-slate-700 font-mono text-[10px] rounded-lg transition-colors border border-slate-200/50 font-bold"
                >
                  raw_aggregates
                </button>
                <button
                  onClick={() => handleRunQuery("SELECT * FROM fct_daily_user_activity LIMIT 20")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-[#7c3aed]/10 hover:text-[#7c3aed] text-slate-700 font-mono text-[10px] rounded-lg transition-colors border border-slate-200/50 font-bold"
                >
                  daily_activity_mart
                </button>
              </div>
            </div>

            {/* SQL Terminal Console */}
            <div className="bg-[#120d24] border border-[#211a3d] rounded-2xl overflow-hidden flex flex-col shadow-lg">
              <div className="bg-[#0b0718] px-4 py-3 border-b border-[#211a3d] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-xs font-semibold text-slate-300">warehouse-analytics-terminal_v2</span>
                </div>
                <div className="font-mono text-[10px] text-slate-500">
                  Read Only Console Connection: postgres://postgres:***@localhost:5432/warehouse
                </div>
              </div>

              {/* Query editor */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunQuery();
                }}
                className="p-4 bg-[#18122f] border-b border-[#211a3d] flex flex-col md:flex-row gap-3 items-stretch"
              >
                <input
                  type="text"
                  required
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter SELECT query statement..."
                  className="flex-1 px-3 py-2 bg-[#0c081a] border border-[#211a3d] rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 placeholder-slate-700"
                />
                <button
                  type="submit"
                  disabled={queryLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  {queryLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{queryLoading ? "Executing..." : "Run SQL Query"}</span>
                </button>
              </form>

              {/* Query result output box */}
              <div className="p-4 overflow-x-auto min-h-[160px] max-h-[300px]">
                {queryLoading && (
                  <div className="flex flex-col items-center justify-center h-[140px] gap-2 font-mono text-xs text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                    <span>Processing relational join buffers...</span>
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
                      <span>Execution Time: {queryResult.executionTimeMs}ms</span>
                      <span>Total Rows: {queryResult.rowCount} rows fetched</span>
                    </div>

                    {queryResult.rows.length === 0 ? (
                      <div className="text-center font-mono text-xs text-slate-500 py-6">
                        No rows matching selection query found.
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
                                    {typeof val === "number" && col.includes("value") ? `$${val.toFixed(2)}` : String(val)}
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

                {!queryResult && !queryLoading && (
                  <div className="flex flex-col items-center justify-center h-[140px] font-mono text-xs text-slate-500 py-4 select-none text-center">
                    <span>Press the play button above or click quick-fill presets to query PostgreSQL tables.</span>
                    <span className="text-[10px] mt-1 text-slate-600">Supported: Group by events, filters, timestamps and limits.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: DBT TRANSFORMATIONS
            ========================================== */}
        {activeService === "dbt" && (
          <div className="space-y-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">ELT layer</span>
                <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">dbt (Data Build Tool) Models & Marts</h3>
                <p className="text-xs text-[#7c7793] font-medium mt-1">
                  Transforms raw database schemas into clean analytics-ready dimensional models for business intelligence engines.
                </p>
              </div>
              <button
                onClick={handleRunDbt}
                disabled={dbtRunning}
                className="px-5 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 text-white font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${dbtRunning ? "animate-spin" : ""}`} />
                <span>{dbtRunning ? "Compiling & Running Models..." : "Run dbt run && test"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Models List */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.005)]">
                <h4 className="font-sans font-bold text-sm text-[#1e1931] border-b border-slate-100 pb-2.5">DAG Dependency Structure</h4>
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#eef0f6] shadow-sm">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-bold text-[9px]">SOURCE</span>
                    <span className="text-[#1e1931] font-bold text-[11px]">raw_events</span>
                  </div>
                  <div className="flex justify-center h-4">
                    <div className="w-0.5 h-full bg-purple-200"></div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#eef0f6] shadow-sm">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-bold text-[9px]">STAGING</span>
                    <span className="text-[#1e1931] font-bold text-[11px]">stg_events.sql</span>
                    <span className="text-[#7c7793] text-[9px] font-medium font-sans">Unique test verified</span>
                  </div>
                  <div className="flex justify-center h-4">
                    <div className="w-0.5 h-full bg-purple-200"></div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#eef0f6] shadow-sm">
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-md font-bold text-[9px]">MART</span>
                    <span className="text-[#1e1931] font-bold text-[11px]">fct_daily_user_activity.sql</span>
                    <span className="text-[#7c3aed] text-[9px] font-medium font-sans">Aggregated daily aggregates</span>
                  </div>
                </div>
              </div>

              {/* Terminal compiler logs */}
              <div className="bg-[#120d24] border border-[#211a3d] rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg">
                <div className="bg-[#0b0718] px-4 py-2.5 border-b border-[#211a3d] flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400">dbt CLI Compiler Logs</span>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>
                <div className="bg-[#0c081a] p-4 font-mono text-[10px] text-emerald-400 space-y-1.5 overflow-y-auto min-h-[180px] max-h-[220px]">
                  {dbtTerminalLogs.length === 0 ? (
                    <div className="text-slate-500 text-center py-10 select-none">
                      Click the run button above to compile dbt staging and mart models and run constraints validation checks.
                    </div>
                  ) : (
                    dbtTerminalLogs.map((log, index) => (
                      <div key={index} className="leading-relaxed">
                        {log}
                      </div>
                    ))
                  )}
                </div>
                <p className="p-3.5 bg-[#18122f] border-t border-[#211a3d] text-[10px] text-[#7c7793] font-medium leading-relaxed font-sans">
                  The dbt DAG compiles automatically inside orchestration schedules (e.g. Airflow) to load incremental updates into PostgreSQL.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: ML FASTAPI SERVICE
            ========================================== */}
        {activeService === "ml-service" && (
          <div className="space-y-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">Inference Endpoint</span>
                <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">FastAPI ML Model Serving</h3>
                <p className="text-xs text-[#7c7793] font-medium mt-1">
                  Trains a random forest customer classifier periodically on daily marts, exposing high-frequency prediction APIs on port 8000.
                </p>
              </div>
              <div className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-mono text-[10px] font-semibold">
                REST Endpoint: POST /api/predict
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prediction form */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.005)]">
                <h4 className="font-sans font-bold text-sm text-[#1e1931] mb-2 flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-[#7c3aed]" /> Customer Purchase Propensity Playground
                </h4>
                <form onSubmit={handleRunPrediction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-[#7c7793] uppercase font-bold">Customer Total Events</label>
                      <input
                        type="number"
                        required
                        value={predictEvents}
                        onChange={(e) => setPredictEvents(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-purple-500/5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#7c7793] uppercase font-bold">Total Transaction value ($)</label>
                      <input
                        type="number"
                        required
                        value={predictValue}
                        onChange={(e) => setPredictValue(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-purple-500/5 font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={predictLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 font-sans text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    {predictLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    <span>{predictLoading ? "Scoring Payload..." : "Execute Prediction Inference"}</span>
                  </button>
                </form>
              </div>

              {/* Prediction results */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-5 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.005)] flex flex-col justify-between">
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#1e1931] mb-3">Model Prediction Classification</h4>
                  {prediction ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3.5 rounded-xl border bg-white border-[#eef0f6] shadow-sm">
                        <span className="font-sans text-xs text-[#7c7793] font-semibold">Class Label Output:</span>
                        <span className={`font-mono font-bold text-sm px-3 py-1 rounded-md ${
                          prediction.will_purchase 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" 
                            : "bg-slate-100 text-slate-500 border border-slate-200/60"
                        }`}>
                          {prediction.will_purchase ? "Will Purchase (TRUE)" : "Unlikely Purchase (FALSE)"}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px] text-[#7c7793] font-bold">
                          <span>Classification Propensity Score:</span>
                          <span className="text-[#1e1931]">{Math.round(prediction.probability * 100)}% Confidence</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#f3f1fb] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              prediction.will_purchase ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
                            }`}
                            style={{ width: `${prediction.probability * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center font-mono text-xs text-slate-400 py-10 select-none">
                      Submit the parameters of events and values in the left form to calculate custom random forest prediction outputs.
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-[#7c7793] font-semibold">
                  <span>Engine: Scikit-learn Classifier</span>
                  <span>Accuracy Target: ~89%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: CODE COMPILER SCAFFOLD
            ========================================== */}
        {activeService === "blueprints" && (
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">Scaffold Explorer</span>
                <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">Production-Grade Starter Codebase</h3>
                <p className="text-xs text-[#7c7793] font-medium mt-1">
                  View and inspect the complete modular folder architecture of this system, and download the full workspace ready for Docker and Kubernetes configurations.
                </p>
              </div>
              <button
                onClick={handleDownloadZip}
                disabled={zipping}
                className="px-5 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 text-white font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {zipping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span>{zipping ? "Creating ZIP Package..." : "Download Complete Blueprint ZIP"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
              {/* File tree */}
              <div className="bg-[#fcfbfe] border border-[#eef0f6] p-4 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.005)] space-y-3 max-h-[360px] overflow-y-auto">
                <span className="font-mono text-[10px] text-[#7c7793] font-bold uppercase block border-b border-slate-100 pb-1.5">Repository Directory</span>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {blueprints.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
                        selectedFile?.path === file.path
                          ? "bg-purple-50 text-[#7c3aed] border border-purple-100/60 font-bold"
                          : "text-[#5a5278] hover:bg-slate-50 hover:text-[#1e1931]"
                      }`}
                    >
                      <FileCode className="h-4 w-4 shrink-0 text-[#7c7793]" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code viewer */}
              <div className="bg-[#120d24] border border-[#211a3d] rounded-2xl overflow-hidden col-span-2 flex flex-col min-h-[300px] shadow-lg">
                {selectedFile ? (
                  <>
                    <div className="bg-[#0b0718] px-4 py-3 border-b border-[#211a3d] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-slate-300">{selectedFile.path}</span>
                        <span className="text-[9px] text-[#7c7793] font-sans mt-0.5">{selectedFile.description}</span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="p-1.5 hover:bg-[#1f183c] text-slate-400 hover:text-white rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedFile ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto font-mono text-[10px] text-slate-300 bg-[#0c081a] leading-relaxed flex-1 max-h-[280px]">
                      <pre className="whitespace-pre-wrap">{selectedFile.content}</pre>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center flex-1 font-mono text-xs text-slate-500">
                    Loading architectural files repository...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: ARCHITECT AI COACH
            ========================================== */}
        {activeService === "coach" && (
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            <div>
              <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">Expert Advisory</span>
              <h3 className="font-sans font-extrabold text-xl text-[#1e1931]">Lead Data Platform Architect Coach</h3>
              <p className="text-xs text-[#7c7793] font-medium mt-1">
                Consult with Principal Data Architect Gemini in real time to configure partitions, troubleshoot container pipelines, scale Spark streaming operations, or optimize dbt models.
              </p>
            </div>

            {/* Chat Room */}
            <div className="bg-white border border-[#eef0f6] rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-[350px]">
              
              {/* Chat messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[260px] bg-[#fdfcff]/40">
                {coachChat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl border text-xs leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] border-[#7c3aed] text-white font-sans font-medium"
                          : "bg-[#f4f3f9] border-[#e2e1ee] text-slate-800 font-sans"
                      }`}
                    >
                      <span className={`font-mono text-[9px] font-bold block mb-1 ${
                        msg.role === "user" ? "text-purple-100" : "text-[#7c3aed]"
                      }`}>
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
                      <span>Gemini Architect thinking... compiling design recommendations...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Preset suggestion helpers */}
              <div className="px-4 py-2.5 border-t border-slate-100 bg-[#fbf9ff] flex flex-wrap gap-1.5 items-center">
                <span className="font-mono text-[8px] text-[#7c7793] uppercase font-bold mr-1">Ask:</span>
                {[
                  "How to partition Kafka?",
                  "Configure Spark trigger interval?",
                  "Kubernetes autoscaling setup?",
                  "Scale analytics-api Postgres queries?"
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
                  placeholder="Ask a technical architecture or configuration question..."
                  className="flex-1 px-3 py-2 bg-white border border-[#e2e1ee] rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7c3aed] placeholder-[#7c7793]/70 font-sans font-medium"
                />
                <button
                  type="submit"
                  disabled={coachLoading || !coachPrompt.trim()}
                  className="px-4.5 py-2 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-95 disabled:opacity-40 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
