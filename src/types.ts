/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DataPlatformEvent {
  id: string;
  userId: string;
  event: 'page_view' | 'add_to_cart' | 'purchase' | 'search' | 'error_event';
  value: number;
  timestamp: string;
  ingestedAt: string;
}

export interface KafkaTopicPartition {
  topic: string;
  partition: number;
  leader: string;
  replicas: number[];
  isr: number[];
  offset: number;
  highWatermark: number;
}

export interface KafkaTopicStats {
  topic: string;
  partitions: KafkaTopicPartition[];
  messageCount: number;
  lag: number;
}

export interface SparkBatchAggregation {
  window_start: string;
  window_end: string;
  event: string;
  event_count: number;
  total_value: number;
}

export interface FctDailyUserActivity {
  user_id: string;
  activity_date: string;
  total_events: number;
  total_purchase_value: number;
  purchase_count: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  service: 'ingestion-api' | 'kafka-broker' | 'stream-processor' | 'warehouse' | 'dbt' | 'ml-service' | 'analytics-api';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface SimulatorState {
  isRunning: boolean;
  eps: number;
  anomaly: 'none' | 'black_friday' | 'iot_malfunction' | 'ad_campaign';
  metrics: {
    totalIngested: number;
    totalProcessed: number;
    totalErrors: number;
    ingestionLatency: number;
    processingLatency: number;
    cpuUtilization: number;
    memoryUsage: number;
  };
}

export interface DatabaseState {
  raw_events: DataPlatformEvent[];
  raw_event_aggregates: SparkBatchAggregation[];
  fct_daily_user_activity: FctDailyUserActivity[];
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface CodeFileBlueprint {
  path: string;
  language: string;
  description: string;
  content: string;
}
