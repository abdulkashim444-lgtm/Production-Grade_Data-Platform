/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { 
  Server, 
  Database, 
  Cpu, 
  Activity, 
  LineChart, 
  AlertTriangle, 
  Play, 
  Pause,
  Layers,
  Sparkles,
  RefreshCw,
  GitPullRequest
} from "lucide-react";
import { SimulatorState } from "../types";

interface NodeProps {
  key?: React.Key;
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  status: "idle" | "running" | "anomaly" | "error";
}

function ArchNode({ id, label, sublabel, x, y, active, onClick, icon, status }: NodeProps) {
  const getStatusColor = () => {
    if (status === "error") return "border-red-200 bg-red-50/80 text-red-600 shadow-red-100/30";
    if (status === "anomaly") return "border-amber-200 bg-amber-50/80 text-amber-600 shadow-amber-100/30";
    if (status === "running") return "border-emerald-200 bg-emerald-50/80 text-emerald-600 shadow-emerald-100/30";
    return "border-[#e2e1ee] bg-white text-slate-500 shadow-sm";
  };

  return (
    <foreignObject x={x - 85} y={y - 45} width={170} height={100} className="overflow-visible">
      <div
        id={`node-${id}`}
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.015)] relative ${getStatusColor()} ${
          active 
            ? "ring-4 ring-indigo-50 border-[#7c3aed] bg-indigo-50/10 scale-105 shadow-md" 
            : "hover:border-[#a855f7] hover:scale-[1.02]"
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`p-1.5 rounded-lg ${active ? "bg-[#7c3aed]/10 text-[#7c3aed]" : "bg-slate-50 text-slate-500"}`}>{icon}</div>
          <span className="font-sans font-bold text-xs tracking-tight text-[#1e1931]">{label}</span>
        </div>
        <span className="font-mono text-[9px] text-[#7c7793] font-medium leading-none">{sublabel}</span>
        
        {/* Status indicator badge */}
        <div className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            status === "error" ? "bg-red-400" : status === "anomaly" ? "bg-amber-400" : "bg-emerald-400"
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            status === "error" ? "bg-red-500" : status === "anomaly" ? "bg-amber-500" : "bg-emerald-500"
          }`}></span>
        </div>
      </div>
    </foreignObject>
  );
}

interface ArchitectureMapProps {
  state: SimulatorState;
  activeService: string;
  setActiveService: (service: string) => void;
}

export default function ArchitectureMap({ state, activeService, setActiveService }: ArchitectureMapProps) {
  // Coordinates for architectural workflow paths
  const nodes = [
    {
      id: "ingestion-api",
      label: "Ingestion API",
      sublabel: "Node.js Gateway :4000",
      x: 140,
      y: 110,
      icon: <Server className="h-4 w-4" />,
      status: state.anomaly === "iot_malfunction" ? "error" : state.isRunning ? "running" : "idle",
    },
    {
      id: "kafka-broker",
      label: "Kafka Broker",
      sublabel: "Topic: raw-events :9092",
      x: 350,
      y: 110,
      icon: <Layers className="h-4 w-4" />,
      status: state.anomaly === "iot_malfunction" ? "error" : state.anomaly === "black_friday" ? "anomaly" : state.isRunning ? "running" : "idle",
    },
    {
      id: "stream-processor",
      label: "Spark Stream",
      sublabel: "Micro-batch Aggregator",
      x: 560,
      y: 110,
      icon: <Activity className="h-4 w-4" />,
      status: state.anomaly === "iot_malfunction" ? "error" : state.isRunning ? "running" : "idle",
    },
    {
      id: "warehouse",
      label: "Postgres Warehouse",
      sublabel: "Relational DB :5432",
      x: 770,
      y: 110,
      icon: <Database className="h-4 w-4" />,
      status: state.isRunning ? "running" : "idle",
    },
    {
      id: "dbt",
      label: "dbt Transforms",
      sublabel: "Analytics Core Marts",
      x: 980,
      y: 60,
      icon: <GitPullRequest className="h-4 w-4" />,
      status: state.isRunning ? "running" : "idle",
    },
    {
      id: "ml-service",
      label: "FastAPI ML Model",
      sublabel: "Propensity RF :8000",
      x: 980,
      y: 160,
      icon: <Cpu className="h-4 w-4" />,
      status: state.isRunning ? "running" : "idle",
    },
    {
      id: "analytics-api",
      label: "Analytics API",
      sublabel: "FastAPI Queries :8001",
      x: 1200,
      y: 110,
      icon: <LineChart className="h-4 w-4" />,
      status: state.isRunning ? "running" : "idle",
    },
  ];

  // Dynamic variables for travel pulses
  const getPulseColor = () => {
    if (state.anomaly === "iot_malfunction") return "#ef4444"; // red
    if (state.anomaly === "black_friday") return "#f59e0b"; // amber gold
    return "#6366f1"; // indigo
  };

  const getDuration = () => {
    if (!state.isRunning) return 0;
    const base = 4;
    // Scale speed inversely with Events Per Second (EPS)
    return Math.max(1.2, base - state.eps * 0.35);
  };

  const pulseColor = getPulseColor();
  const pulseDuration = getDuration();

  return (
    <div className="relative w-full h-[320px] bg-white rounded-2xl border border-[#eef0f6] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden flex flex-col justify-between">
      {/* Topology Header Panel */}
      <div className="flex items-center justify-between z-10">
        <div>
          <span className="font-mono text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider">Infrastructure Orchestration</span>
          <h2 className="font-sans font-extrabold text-lg text-[#1e1931]">Live Data Pipeline Topology</h2>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-700 font-sans text-[10px] font-semibold">Normal Active</span>
          </div>
          {state.anomaly !== "none" && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-sans text-[10px] font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
              <span className="capitalize">{state.anomaly.replace("_", " ")} Anomaly Spike</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Pipeline Canvas */}
      <div className="flex-1 w-full relative">
        <svg viewBox="0 0 1340 220" className="w-full h-full" preserveAspectRatio="xMinYMid meet">
          {/* Defs for gradients and markers */}
          <defs>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
            </linearGradient>
            
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* CONNECTIONS (PATHS) */}
          {/* Data Sources to Ingestion API */}
          <line x1="10" y1="110" x2="55" y2="110" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
          
          {/* Ingestion API -> Kafka Broker */}
          <path d="M 225 110 L 265 110" stroke="url(#edge-gradient)" strokeWidth="3" />
          {state.isRunning && (
            <circle r="4.5" fill={pulseColor} filter="url(#glow-filter)">
              <animateMotion dur={`${pulseDuration}s`} repeatCount="indefinite" path="M 225 110 L 265 110" />
            </circle>
          )}

          {/* Kafka Broker -> Spark Stream */}
          <path d="M 435 110 L 475 110" stroke="url(#edge-gradient)" strokeWidth="3" />
          {state.isRunning && (
            <circle r="4.5" fill={pulseColor} filter="url(#glow-filter)">
              <animateMotion dur={`${pulseDuration * 0.9}s`} repeatCount="indefinite" path="M 435 110 L 475 110" />
            </circle>
          )}

          {/* Spark Stream -> Postgres Warehouse */}
          <path d="M 645 110 L 685 110" stroke="url(#edge-gradient)" strokeWidth="3" />
          {state.isRunning && (
            <circle r="4.5" fill={pulseColor} filter="url(#glow-filter)">
              <animateMotion dur={`${pulseDuration * 0.8}s`} repeatCount="indefinite" path="M 645 110 L 685 110" />
            </circle>
          )}

          {/* Postgres Warehouse -> dbt Transforms */}
          <path d="M 855 110 Q 895 110, 895 60 L 895 60" stroke="#cbd5e1" strokeWidth="2" />
          {state.isRunning && (
            <circle r="3.5" fill="#a855f7" opacity="0.8">
              <animateMotion dur="4s" repeatCount="indefinite" path="M 855 110 Q 895 110, 895 60" />
            </circle>
          )}

          {/* Postgres Warehouse -> FastAPI ML */}
          <path d="M 855 110 Q 895 110, 895 160 L 895 160" stroke="#cbd5e1" strokeWidth="2" />
          {state.isRunning && (
            <circle r="3.5" fill="#a855f7" opacity="0.8">
              <animateMotion dur="4s" repeatCount="indefinite" path="M 855 110 Q 895 110, 895 160" />
            </circle>
          )}

          {/* dbt transforms and ML outputs to Analytics API */}
          <path d="M 1065 60 Q 1105 60, 1115 110" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M 1065 160 Q 1105 160, 1115 110" stroke="#cbd5e1" strokeWidth="2" />

          {state.isRunning && (
            <>
              <circle r="3.5" fill="#10b981" opacity="0.7">
                <animateMotion dur="3.5s" repeatCount="indefinite" path="M 1065 60 Q 1105 60, 1115 110" />
              </circle>
              <circle r="3.5" fill="#10b981" opacity="0.7">
                <animateMotion dur="3.5s" repeatCount="indefinite" path="M 1065 160 Q 1105 160, 1115 110" />
              </circle>
            </>
          )}

          {/* Analytics API to React Dashboard Endpoints */}
          <line x1="1285" y1="110" x2="1330" y2="110" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />

          {/* NODE INSTANCES */}
          {nodes.map((node) => (
            <ArchNode
              key={node.id}
              id={node.id}
              label={node.label}
              sublabel={node.sublabel}
              x={node.x}
              y={node.y}
              active={activeService === node.id}
              onClick={() => setActiveService(node.id)}
              icon={node.icon}
              status={node.status as any}
            />
          ))}
        </svg>
      </div>

      {/* Interactive Tooltip Helper */}
      <div className="text-center font-sans text-[10px] text-[#7c7793] font-medium mb-1 select-none">
        💡 Pro-Tip: Click any service block on the visual map above to target its live systems manager logs and options.
      </div>
    </div>
  );
}
