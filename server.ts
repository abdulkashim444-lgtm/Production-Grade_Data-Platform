/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import http from "http";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  DataPlatformEvent,
  SimulatorState,
  DatabaseState,
  QueryResult,
  SystemLog,
  FctDailyUserActivity,
  SparkBatchAggregation
} from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// ==========================================
// IN-MEMORY SIMULATION STATE & DATABASES
// ==========================================

const simulatorState: SimulatorState = {
  isRunning: true,
  eps: 2,
  anomaly: "none",
  metrics: {
    totalIngested: 0,
    totalProcessed: 0,
    totalErrors: 0,
    ingestionLatency: 12,
    processingLatency: 420,
    cpuUtilization: 14,
    memoryUsage: 135, // MB
  },
};

const dbState: DatabaseState = {
  raw_events: [],
  raw_event_aggregates: [],
  fct_daily_user_activity: [],
};

// System event log buffer
let systemLogs: SystemLog[] = [];
let nextEventId = 1;

function addLog(
  service: SystemLog["service"],
  level: SystemLog["level"],
  message: string
) {
  const log: SystemLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    service,
    level,
    message,
  };
  systemLogs.push(log);
  if (systemLogs.length > 300) {
    systemLogs.shift();
  }
}

// Seed initial logs
addLog("ingestion-api", "success", "Ingestion Gateway microservice initialized on port 4000");
addLog("kafka-broker", "success", "Kafka server running. ZooKeeper cluster connected.");
addLog("kafka-broker", "info", "Created topics: raw-events (partitions: 3), processed-events (partitions: 3)");
addLog("stream-processor", "success", "Spark Structured Streaming job listening to topic 'raw-events'");
addLog("warehouse", "success", "PostgreSQL target data warehouse connected (schema active)");
addLog("ml-service", "success", "FastAPI ML Server running on port 8000; Random Forest model model.pkl loaded");
addLog("analytics-api", "success", "FastAPI Analytics Server running on port 8001 serving dashboard");

// Kafka temporary buffer (un-aggregated events)
let kafkaQueue: DataPlatformEvent[] = [];

// Spark Batch counter
let sparkBatchId = 100;

// ==========================================
// SEED INITIAL HISTORIC DATA
// ==========================================
function seedInitialData() {
  const now = new Date();
  const eventTypes: Array<DataPlatformEvent["event"]> = ["page_view", "search", "add_to_cart", "purchase"];
  const users = ["usr_a1b2c3", "usr_d4e5f6", "usr_g7h8i9", "usr_j0k1l2", "usr_m3n4o5"];

  // Seed raw events for the last 2 days
  for (let i = 24 * 60; i > 0; i -= 10) {
    const timestamp = new Date(now.getTime() - i * 60 * 1000);
    const userId = users[Math.floor(Math.random() * users.length)];
    const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    let value = 0;
    if (event === "add_to_cart") value = Number((Math.random() * 50 + 10).toFixed(2));
    if (event === "purchase") value = Number((Math.random() * 200 + 15).toFixed(2));

    const ev: DataPlatformEvent = {
      id: `ev_${nextEventId++}`,
      userId,
      event,
      value,
      timestamp: timestamp.toISOString(),
      ingestedAt: new Date(timestamp.getTime() + 12).toISOString(),
    };
    dbState.raw_events.push(ev);
  }

  // Seed 1-minute aggregations
  const aggIntervals = 40;
  for (let i = aggIntervals; i > 0; i--) {
    const start = new Date(now.getTime() - i * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 1000);
    const eventsInPeriod = ["page_view", "search", "add_to_cart", "purchase"];

    eventsInPeriod.forEach((evt) => {
      const count = Math.floor(Math.random() * 20 + 5);
      let valSum = 0;
      if (evt === "purchase") valSum = Number((count * (Math.random() * 100 + 10)).toFixed(2));
      else if (evt === "add_to_cart") valSum = Number((count * (Math.random() * 30 + 5)).toFixed(2));

      dbState.raw_event_aggregates.push({
        window_start: start.toISOString(),
        window_end: end.toISOString(),
        event: evt,
        event_count: count,
        total_value: valSum,
      });
    });
  }

  // Run dbt initially
  runDbtTransformsInternal();
  simulatorState.metrics.totalIngested = dbState.raw_events.length;
  simulatorState.metrics.totalProcessed = dbState.raw_events.length;
}

// Transform raw events to marts (dbt) in-memory
function runDbtTransformsInternal() {
  const userMap = new Map<string, FctDailyUserActivity>();

  dbState.raw_events.forEach((ev) => {
    if (ev.event === "error_event") return;
    const dateStr = ev.timestamp.substring(0, 10); // YYYY-MM-DD
    const key = `${ev.userId}_${dateStr}`;

    if (!userMap.has(key)) {
      userMap.set(key, {
        user_id: ev.userId,
        activity_date: dateStr,
        total_events: 0,
        total_purchase_value: 0,
        purchase_count: 0,
      });
    }

    const activity = userMap.get(key)!;
    activity.total_events += 1;
    if (ev.event === "purchase") {
      activity.purchase_count += 1;
      activity.total_purchase_value = Number((activity.total_purchase_value + ev.value).toFixed(2));
    }
  });

  dbState.fct_daily_user_activity = Array.from(userMap.values());
}

seedInitialData();

// ==========================================
// LIVE SIMULATION TICK (Every 2 seconds)
// ==========================================
setInterval(() => {
  if (!simulatorState.isRunning) return;

  const countToGenerate = Math.max(1, Math.round(simulatorState.eps * 2));
  const eventTypes: Array<DataPlatformEvent["event"]> = ["page_view", "search", "add_to_cart", "purchase"];
  const users = ["usr_a1b2c3", "usr_d4e5f6", "usr_g7h8i9", "usr_j0k1l2", "usr_m3n4o5", "usr_k6s7t8"];

  const anomaly = simulatorState.anomaly;
  let cpu = 10 + Math.random() * 8;
  let mem = 135 + Math.random() * 5;

  if (anomaly === "black_friday") {
    cpu += 30;
    mem += 20;
  } else if (anomaly === "iot_malfunction") {
    cpu += 50;
    mem += 45;
  } else if (anomaly === "ad_campaign") {
    cpu += 15;
    mem += 10;
  }

  simulatorState.metrics.cpuUtilization = Math.round(cpu);
  simulatorState.metrics.memoryUsage = Math.round(mem);

  for (let i = 0; i < countToGenerate; i++) {
    const userId = users[Math.floor(Math.random() * users.length)];
    let event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    let value = 0;

    // Apply anomaly modifiers
    if (anomaly === "black_friday") {
      // 50% are purchases, values are 2x higher!
      event = Math.random() < 0.5 ? "purchase" : "add_to_cart";
      value = event === "purchase" 
        ? Number((Math.random() * 400 + 40).toFixed(2)) 
        : Number((Math.random() * 100 + 20).toFixed(2));
    } else if (anomaly === "iot_malfunction") {
      // Tons of rapid error events
      event = Math.random() < 0.8 ? "error_event" : "page_view";
      value = 0;
    } else if (anomaly === "ad_campaign") {
      // Heavy navigation search and page views
      event = Math.random() < 0.4 ? "search" : "page_view";
      value = 0;
    } else {
      // Normal values
      if (event === "add_to_cart") value = Number((Math.random() * 50 + 10).toFixed(2));
      if (event === "purchase") value = Number((Math.random() * 200 + 15).toFixed(2));
    }

    const newEvent: DataPlatformEvent = {
      id: `ev_${nextEventId++}`,
      userId,
      event,
      value,
      timestamp: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
    };

    if (event === "error_event") {
      simulatorState.metrics.totalErrors++;
      addLog("ingestion-api", "error", `Validation Error: Bad client payload on partition ${Math.floor(Math.random() * 3)}. Malformed device payload.`);
    } else {
      // Success Ingest
      simulatorState.metrics.totalIngested++;
      dbState.raw_events.push(newEvent);
      kafkaQueue.push(newEvent);

      // Keep Raw Events table size bounded to last 1000 for server health
      if (dbState.raw_events.length > 1000) {
        dbState.raw_events.shift();
      }

      if (Math.random() < 0.15) {
        addLog(
          "ingestion-api",
          "info",
          `POST /ingest/events from User ${userId} accepted. Action: ${event} ($${value})`
        );
      }
    }
  }
}, 2000);

// ==========================================
// SPARK AGGREGATION TICK (Every 10 seconds)
// ==========================================
setInterval(() => {
  if (!simulatorState.isRunning || kafkaQueue.length === 0) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 10000).toISOString();
  const windowEnd = now.toISOString();

  // Perform aggregations on the queue
  const aggregations: Record<string, { count: number; valSum: number }> = {};

  kafkaQueue.forEach((ev) => {
    if (!aggregations[ev.event]) {
      aggregations[ev.event] = { count: 0, valSum: 0 };
    }
    aggregations[ev.event].count += 1;
    aggregations[ev.event].valSum = Number((aggregations[ev.event].valSum + ev.value).toFixed(2));
  });

  const countProcessed = kafkaQueue.length;
  kafkaQueue = []; // Reset queue

  // Append aggregations to postgres simulation table
  Object.keys(aggregations).forEach((evt) => {
    const agg = aggregations[evt];
    dbState.raw_event_aggregates.push({
      window_start: windowStart,
      window_end: windowEnd,
      event: evt,
      event_count: agg.count,
      total_value: agg.valSum,
    });
  });

  // Limit aggregates list
  if (dbState.raw_event_aggregates.length > 200) {
    dbState.raw_event_aggregates.splice(0, dbState.raw_event_aggregates.length - 200);
  }

  simulatorState.metrics.totalProcessed += countProcessed;
  sparkBatchId++;

  addLog(
    "stream-processor",
    "success",
    `Spark Stream Micro-Batch #${sparkBatchId} completed. Consumed ${countProcessed} records from Kafka 'raw-events'. Committed to database warehouse table 'raw_event_aggregates'.`
  );

  addLog(
    "warehouse",
    "info",
    `JDBC Batch Insert: Committed aggregates for [${Object.keys(aggregations).join(", ")}] to warehouse.`
  );
}, 10000);

// ==========================================
// CUSTOM MOCK SQL QUERY PROCESSOR (SAFE)
// ==========================================
function executeMockQuery(sql: string): QueryResult {
  const start = Date.now();
  const cleanSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

  // Basic SQL pattern routing
  if (!cleanSql.startsWith("select")) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Date.now() - start,
      error: "Syntax Error: Only SELECT queries are permitted in this analytics read terminal.",
    };
  }

  let table = "";
  if (cleanSql.includes("from raw_events")) table = "raw_events";
  else if (cleanSql.includes("from raw_event_aggregates")) table = "raw_event_aggregates";
  else if (cleanSql.includes("from fct_daily_user_activity")) table = "fct_daily_user_activity";

  if (!table) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Date.now() - start,
      error: "Database Error: Relation not found. Supported tables are: raw_events, raw_event_aggregates, fct_daily_user_activity",
    };
  }

  let data: any[] = [];
  if (table === "raw_events") data = [...dbState.raw_events];
  else if (table === "raw_event_aggregates") data = [...dbState.raw_event_aggregates];
  else if (table === "fct_daily_user_activity") data = [...dbState.fct_daily_user_activity];

  // Apply basic filters
  if (cleanSql.includes("where")) {
    const whereMatch = sql.match(/where\s+([a-z0-9_'"\s\-=<>!]+)/i);
    if (whereMatch) {
      const clause = whereMatch[1].toLowerCase().replace(/['"]/g, "").trim();
      // Simple parse: "event = purchase"
      if (clause.includes("event") && clause.includes("purchase")) {
        data = data.filter((x) => x.event === "purchase");
      } else if (clause.includes("event") && clause.includes("add_to_cart")) {
        data = data.filter((x) => x.event === "add_to_cart");
      } else if (clause.includes("value") && clause.includes(">")) {
        const val = parseFloat(clause.split(">")[1].trim());
        if (!isNaN(val)) data = data.filter((x) => x.value > val);
      } else if (clause.includes("user_id") || clause.includes("userid")) {
        const parts = clause.split("=");
        const uid = parts[1]?.trim().replace(/['"]/g, "");
        if (uid) data = data.filter((x) => x.userId?.toLowerCase() === uid || x.user_id?.toLowerCase() === uid);
      }
    }
  }

  // Handle simple GROUP BY or aggregate aggregates
  const hasCount = cleanSql.includes("count(");
  const hasSum = cleanSql.includes("sum(");

  if (cleanSql.includes("group by")) {
    if (table === "raw_events") {
      // GROUP BY event
      if (cleanSql.includes("group by event")) {
        const groups: Record<string, { event: string; count: number; total_value: number }> = {};
        data.forEach((x) => {
          if (!groups[x.event]) groups[x.event] = { event: x.event, count: 0, total_value: 0 };
          groups[x.event].count++;
          groups[x.event].total_value = Number((groups[x.event].total_value + x.value).toFixed(2));
        });
        const rows = Object.values(groups);
        return {
          columns: ["event", "count", "total_value"],
          rows,
          rowCount: rows.length,
          executionTimeMs: Date.now() - start,
        };
      }
    }
  }

  // Order By
  if (cleanSql.includes("order by")) {
    if (cleanSql.includes("id desc")) {
      data.sort((a, b) => b.id.localeCompare(a.id));
    } else if (cleanSql.includes("timestamp desc") || cleanSql.includes("window_start desc") || cleanSql.includes("activity_date desc")) {
      data.sort((a, b) => {
        const dateA = a.timestamp || a.window_start || a.activity_date;
        const dateB = b.timestamp || b.window_start || b.activity_date;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }
  } else {
    // Default desc order for events/marts for cleaner UI views
    data.sort((a, b) => {
      const dateA = a.timestamp || a.window_start || a.activity_date;
      const dateB = b.timestamp || b.window_start || b.activity_date;
      if (dateA && dateB) return new Date(dateB).getTime() - new Date(dateA).getTime();
      return 0;
    });
  }

  // Limit
  let limit = 50;
  const limitMatch = cleanSql.match(/limit\s+(\d+)/);
  if (limitMatch) {
    limit = parseInt(limitMatch[1]);
  }
  const slicedData = data.slice(0, limit);

  // Extract columns
  let columns: string[] = [];
  if (slicedData.length > 0) {
    columns = Object.keys(slicedData[0]);
  } else {
    columns = table === "raw_events" 
      ? ["id", "userId", "event", "value", "timestamp", "ingestedAt"]
      : table === "raw_event_aggregates"
      ? ["window_start", "window_end", "event", "event_count", "total_value"]
      : ["user_id", "activity_date", "total_events", "total_purchase_value", "purchase_count"];
  }

  return {
    columns,
    rows: slicedData,
    rowCount: slicedData.length,
    executionTimeMs: Date.now() - start,
  };
}

// ==========================================
// CODE BLUEPRINT DATABASE FOR PORTFOLIO SCAFFOLDING
// ==========================================

const codeBlueprints = [
  {
    path: "README.md",
    language: "markdown",
    description: "Data Platform architectural system overview and quickstart runbook.",
    content: `# Enterprise-Grade Real-Time Data Platform

An end-to-end cloud-native data architecture featuring real-time event streaming, micro-batch processing, a modern data warehouse, dbt analytics, machine learning prediction, and visual monitoring.

## Architecture Topology
\`\`\`
[Data Sources] (APIs/Simulators)
       │ (REST JSON Payload)
       ▼
[Ingestion API Gateway] (NodeJS / Express / Cluster)
       │ (High Throughput / Non-blocking)
       ▼
[Apache Kafka Message Broker] (Partitioned topics: raw-events, processed-events)
       │
       ▼
[Spark Structured Streaming] (PySpark State Aggregator, 1-min slide)
       │
       ▼
[Data Warehouse PostgreSQL] (Primary Star-Schema Mart targets)
    ┌──┴─────────────────────────┐
    ▼                            ▼
[dbt Transforms]            [ML model FastAPI]
(staging -> analytics marts)   (FastAPI serving Classifier)
    │                            │
    ▼                            ▼
[Analytics Gateway]          [User Inferences]
(Node queries / GraphQL)      (React client UI)
\`\`\`

## System Components
1. **services/ingestion-api**: Receives events from edge networks, performs JSON schema validations, and publishes immediately to Partition Kafka queues.
2. **services/stream-processor**: Streaming jobs executing real-time aggregations (sliding windows) to bound latency under 2 seconds.
3. **dbt-project**: Compiles raw staging data into optimized dimensional analytical models for warehouse queries.
4. **services/ml-service**: Uses pre-trained Random Forest model file \`model.pkl\` to serve prediction calls for customer purchase propensities.
5. **services/analytics-api**: Low-latency aggregated gateway exposing metrics to analytical tools.

## Run Locally with Docker Compose
\`\`\`bash
docker-compose up --build -d
docker exec kafka kafka-topics --create --topic raw-events --bootstrap-server localhost:9092
\`\`\`
`
  },
  {
    path: "infra/docker-compose.yml",
    language: "yaml",
    description: "Multiclass services orchestration file targeting local dev testing.",
    content: `version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    networks:
      - datanetwork

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - datanetwork

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: warehouse
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - datanetwork

  ingestion-api:
    build: ../services/ingestion-api
    ports:
      - "4000:4000"
    environment:
      KAFKA_BROKER: kafka:9092
    depends_on:
      - kafka
    networks:
      - datanetwork

  stream-processor:
    build: ../services/stream-processor
    depends_on:
      - kafka
      - postgres
    environment:
      KAFKA_BROKER: kafka:9092
      DATABASE_URL: jdbc:postgresql://postgres:5432/warehouse
    networks:
      - datanetwork

  ml-service:
    build: ../services/ml-service
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    networks:
      - datanetwork

networks:
  datanetwork:
    driver: bridge
`
  },
  {
    path: "services/ingestion-api/index.js",
    language: "javascript",
    description: "High-performance Node Express gateway publishing directly to Kafka cluster.",
    content: `const express = require('express');
const { Kafka } = require('kafkajs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'ingestion-gateway',
  brokers: [kafkaBroker]
});
const producer = kafka.producer();

// JSON validation middleware
function validateEvent(req, res, next) {
  const { userId, event, value } = req.body;
  if (!userId || !event) {
    return res.status(400).json({ error: 'Missing mandatory parameters userId or event.' });
  }
  const validEvents = ['page_view', 'add_to_cart', 'purchase', 'search'];
  if (!validEvents.includes(event)) {
    return res.status(400).json({ error: 'Unsupported action event type.' });
  }
  next();
}

app.post('/ingest/events', validateEvent, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      timestamp: req.body.timestamp || new Date().toISOString(),
      ingested_at: new Date().toISOString()
    };

    await producer.send({
      topic: 'raw-events',
      messages: [{
        key: payload.userId,
        value: JSON.stringify(payload)
      }]
    });

    res.status(202).json({
      status: 'accepted',
      id: \`ev_\${Date.now()}_\${Math.random().toString(36).substr(2, 4)}\`
    });
  } catch (err) {
    console.error('Kafka Ingest Error:', err);
    res.status(500).json({ error: 'Internal server failure publishing broker queue.' });
  }
});

async function run() {
  await producer.connect();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(\`Ingestion Service API serving on port \${PORT}\`);
  });
}

run().catch(console.error);
`
  },
  {
    path: "services/stream-processor/streaming_job.py",
    language: "python",
    description: "PySpark Job processing raw-events stream, sliding analytics and JDBC commit.",
    content: `from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, window, count, sum as _sum
from pyspark.sql.types import StructType, StringType, DoubleType, TimestampType
import os

kafka_broker = os.getenv("KAFKA_BROKER", "localhost:9092")
db_url = os.getenv("DATABASE_URL", "jdbc:postgresql://postgres:5432/warehouse")

spark = SparkSession.builder \\
    .appName("RealTimeEventStreamProcessor") \\
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,org.postgresql:postgresql:42.6.0") \\
    .getOrCreate()

schema = StructType() \\
    .add("userId", StringType()) \\
    .add("event", StringType()) \\
    .add("value", DoubleType()) \\
    .add("timestamp", TimestampType())

# Read raw stream from Kafka
raw_df = spark.readStream \\
    .format("kafka") \\
    .option("kafka.bootstrap.servers", kafka_broker) \\
    .option("subscribe", "raw-events") \\
    .load()

# Deserialize JSON
parsed_df = raw_df.select(
    from_json(col("value").cast("string"), schema).alias("data")
).select("data.*")

# Sliding 1-min window aggregation with 2-min watermark limit
agg_df = parsed_df \\
    .withWatermark("timestamp", "2 minutes") \\
    .groupBy(window(col("timestamp"), "1 minute"), col("event")) \\
    .agg(count("*").alias("event_count"), _sum("value").alias("total_value"))

# JDBC Batch Commit Writer
def write_to_postgres(batch_df, batch_id):
    batch_df.write \\
        .format("jdbc") \\
        .option("url", db_url) \\
        .option("dbtable", "raw_event_aggregates") \\
        .option("user", "postgres") \\
        .option("password", "postgres") \\
        .mode("append") \\
        .save()

# Start sliding aggregator stream
query = agg_df.writeStream \\
    .outputMode("update") \\
    .foreachBatch(write_to_postgres) \\
    .trigger(processingTime="10 seconds") \\
    .start()

# Start parallel Raw Event loader stream for DBT consumption
raw_write = parsed_df.writeStream \\
    .format("jdbc") \\
    .foreachBatch(lambda df, epoch: df.write.format("jdbc")
        .option("url", db_url)
        .option("dbtable", "raw_events")
        .option("user", "postgres")
        .option("password", "postgres")
        .mode("append").save()) \\
    .start()

query.awaitTermination()
`
  },
  {
    path: "infra/init.sql",
    language: "sql",
    description: "Database warehouse schema, constraints, index and initial tables seeding.",
    content: `-- PostgreSQL Warehouse Schema Init

CREATE TABLE IF NOT EXISTS raw_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    event VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION DEFAULT 0.0,
    event_timestamp TIMESTAMP NOT NULL,
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_event_aggregates (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    event VARCHAR(50) NOT NULL,
    event_count BIGINT NOT NULL,
    total_value DOUBLE PRECISION DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_raw_events_timestamp ON raw_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_events_user_id ON raw_events(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_event_aggregates_start ON raw_event_aggregates(window_start);
`
  },
  {
    path: "dbt-project/models/staging/stg_events.sql",
    language: "sql",
    description: "DBT staging model - filters null and standardizes schema types.",
    content: `select
    id,
    user_id,
    event,
    value,
    event_timestamp::timestamp as event_timestamp
from {{ source('raw', 'raw_events') }}
where user_id is not null
`
  },
  {
    path: "dbt-project/models/staging/schema.yml",
    language: "yaml",
    description: "DBT schema testing configuration targeting staging validations.",
    content: `version: 2
sources:
  - name: raw
    database: warehouse
    schema: public
    tables:
      - name: raw_events

models:
  - name: stg_events
    columns:
      - name: id
        tests:
          - unique
          - not_null
      - name: event
        tests:
          - accepted_values:
              values: ['page_view', 'add_to_cart', 'purchase', 'search']
`
  },
  {
    path: "dbt-project/models/marts/fct_daily_user_activity.sql",
    language: "sql",
    description: "DBT Dimensional Analytics mart for daily aggregated activity profiles.",
    content: `with events as (
    select * from {{ ref('stg_events') }}
)

select
    user_id,
    date_trunc('day', event_timestamp) as activity_date,
    count(*) as total_events,
    sum(case when event = 'purchase' then value else 0 end) as total_purchase_value,
    count(case when event = 'purchase' then 1 end) as purchase_count
from events
group by 1, 2
`
  },
  {
    path: "services/ml-service/main.py",
    language: "python",
    description: "FastAPI server serving RandomForest classifier inferences.",
    content: `from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os

app = FastAPI(title="Data Platform Propensity Classifier")

# Fallback basic weights if pickle is not generated during dev
class PredictRequest(BaseModel):
    total_events: int
    total_purchase_value: float

@app.post("/predict")
def predict(req: PredictRequest):
    # Simulated Random Forest inference decision
    val = req.total_purchase_value
    events = req.total_events
    
    # Classification logic
    will_purchase = bool(events > 5 or val > 25.0 or (events > 2 and val > 5.0))
    
    # Probability confidence curve
    prob_score = 1.0 / (1.0 + os.math.exp(-(0.4 * events + 0.15 * val - 2.0)))
    
    return {
        "will_purchase": will_purchase,
        "probability": round(float(prob_score), 4),
        "model_engine": "RandomForestClassifier",
        "version": "1.0.4"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "engine": "scikit-learn"}
`
  },
  {
    path: "infra/k8s/ml-service-deployment.yaml",
    language: "yaml",
    description: "Production Kubernetes Pod replication configuration.",
    content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
  namespace: data-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-service
  template:
    metadata:
      labels:
        app: ml-service
    spec:
      containers:
        - name: ml-service
          image: ghcr.io/yourusername/ml-service:v1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: ml-service
  namespace: data-platform
spec:
  selector:
    app: ml-service
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
`
  }
];

// ==========================================
// API ROUTING ENDPOINTS
// ==========================================

// Get simulation metrics & databases
app.get("/api/metrics/realtime", (req, res) => {
  res.json({
    state: simulatorState,
    db: {
      raw_events_count: dbState.raw_events.length,
      raw_event_aggregates_count: dbState.raw_event_aggregates.length,
      fct_daily_user_activity_count: dbState.fct_daily_user_activity.length,
    },
    logs: systemLogs.slice(-40), // Return last 40 logs
  });
});

// Update simulator controls
app.post("/api/state", (req, res) => {
  const { isRunning, eps, anomaly } = req.body;
  if (typeof isRunning === "boolean") simulatorState.isRunning = isRunning;
  if (typeof eps === "number") simulatorState.eps = Math.max(0.1, Math.min(10, eps));
  if (anomaly) {
    simulatorState.anomaly = anomaly;
    addLog(
      "ingestion-api",
      anomaly === "none" ? "info" : "warn",
      `Simulation Modifier altered to: [${anomaly.toUpperCase()}]. Changing stream ingestion profiles.`
    );
  }
  res.json({ status: "success", state: simulatorState });
});

// Ingest custom event from REST form
app.post("/api/ingest/events", (req, res) => {
  const { userId, event, value } = req.body;
  if (!userId || !event) {
    return res.status(400).json({ error: "Missing required parameters: userId and event" });
  }

  const validEvents = ["page_view", "add_to_cart", "purchase", "search"];
  if (!validEvents.includes(event)) {
    return res.status(400).json({ error: "Invalid event type." });
  }

  const newEvent: DataPlatformEvent = {
    id: `ev_${nextEventId++}`,
    userId,
    event: event as any,
    value: Number(value) || 0,
    timestamp: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
  };

  dbState.raw_events.push(newEvent);
  kafkaQueue.push(newEvent);
  simulatorState.metrics.totalIngested++;

  addLog(
    "ingestion-api",
    "success",
    `REST Direct API Call: Event '${event}' ingested successfully from client User ${userId}`
  );

  res.status(202).json({ status: "accepted", event: newEvent });
});

// Execute warehouse read-only query console
app.post("/api/db/query", (req, res) => {
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: "Missing SQL string parameter." });
  }

  const result = executeMockQuery(sql);
  res.json(result);
});

// Run dbt compiler transformations manually
app.post("/api/dbt/run", (req, res) => {
  addLog("dbt", "info", "Executing 'dbt run --profiles-dir .' with parallel threads = 4...");
  
  setTimeout(() => {
    runDbtTransformsInternal();
    addLog("dbt", "success", "Model compilation OK: built stg_events, fct_daily_user_activity.");
    addLog("dbt", "success", "dbt test passes. Enforced constraints verified: [unique_id: PASS, accepted_values_event: PASS].");
    res.json({
      status: "success",
      logs: [
        "07:33:01 [INFO] Found 3 models, 4 tests, 1 source, 1 seed",
        "07:33:02 [INFO] Concurrency: 4 threads",
        "07:33:03 [INFO] Start model stg_events [STAGING] ................... [OK in 0.15s]",
        "07:33:04 [INFO] Start model fct_daily_user_activity [MART] ........... [OK in 0.32s]",
        "07:33:04 [INFO] Start test unique_stg_events_id ..................... [PASS in 0.08s]",
        "07:33:05 [INFO] Start test accepted_values_stg_events_event ......... [PASS in 0.09s]",
        "07:33:05 [INFO] Finished dbt run. built 2 models, 2 tests passed successfully."
      ],
      updatedCount: dbState.fct_daily_user_activity.length
    });
  }, 1000);
});

// Serve ML inferences Propensity endpoint
app.post("/api/predict", (req, res) => {
  const { total_events, total_purchase_value } = req.body;
  const events = Number(total_events) || 0;
  const val = Number(total_purchase_value) || 0.0;

  const will_purchase = events > 5 || val > 25.0 || (events > 2 && val > 5.0);
  const prob_score = 1.0 / (1.0 + Math.exp(-(0.4 * events + 0.15 * val - 2.0)));

  addLog(
    "ml-service",
    "info",
    `Inference served: PredictRequest(events=${events}, purchase_value=$${val}) -> WillPurchase=${will_purchase} (Confidence: ${Math.round(prob_score * 100)}%)`
  );

  res.json({
    will_purchase,
    probability: Number(prob_score.toFixed(4)),
    model_engine: "RandomForestClassifier",
    version: "1.0.4",
  });
});

// Gemini LLM Architectural Coach chat API
app.post("/api/gemini/coach", async (req, res) => {
  const { prompt, history } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt string is required." });
  }

  if (!ai) {
    return res.json({
      reply: "Gemini API integration is ready to assist you. To ask questions about our data pipeline architectures, scaling, or Docker configurations, please set up a valid `GEMINI_API_KEY` in your workspace Secrets configuration panel! This AI Assistant is pre-wired to act as your Principal Data Platform Coach."
    });
  }

  try {
    const systemInstruction = 
      "You are the Principal Lead Data Platform Architect. You designed this specific real-time pipeline (Node.js REST Gateway -> Kafka message broker -> Spark Structured Streaming sliding windows -> Postgres Data Warehouse -> dbt transformations -> scikit-learn RF predicting propensity models with FastAPI -> React visual dashboards). " +
      "Help the user configure, optimize, scale, deploy, or troubleshoot their production platform. Give concise, highly production-ready answers. Focus on technical, operational recommendations (e.g. K8s HPA, Docker, Spark parameters, Kafka partitions, SQLAlchemy query speeds, dbt model incremental configurations). Do not use flowery sales-pitch terms. Keep it factual and helpful.";

    // Convert history objects to parts/messages
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Gemini Coach Error:", error);
    res.status(500).json({ error: "Failed to communicate with Gemini Coach: " + error.message });
  }
});

// Serve list of source files
app.get("/api/blueprints", (req, res) => {
  res.json(codeBlueprints);
});

// ==========================================
// VITE INTEGRATION FOR ASSET HOSTING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Data Platform Architect Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
