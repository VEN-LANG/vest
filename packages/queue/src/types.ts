/*
|--------------------------------------------------------------------------
| Queue Types and Interfaces
|--------------------------------------------------------------------------
|
| This file contains all the type definitions for the queue system.
|
*/

export interface SerializedJob {
  id: string;
  uuid: string;
  displayName: string;
  job: string; // Job class name
  data: string; // JSON serialized payload (may be encrypted)
  queue: string;
  attempts: number;
  maxTries: number;
  maxExceptions: number;
  exceptionCount: number;
  timeout: number;
  backoff: number | number[];
  retryUntil: number | null;
  encrypted: boolean;
  createdAt: number;
  availableAt: number;
  reservedAt: number | null;
}

export interface FailedJob {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
  failedAt: Date;
}

export interface QueueDriverInterface {
  size(queue?: string): Promise<number>;
  push(job: SerializedJob, queue?: string): Promise<string>;
  later(delay: number, job: SerializedJob, queue?: string): Promise<string>;
  pop(queue?: string): Promise<SerializedJob | null>;
  delete(job: SerializedJob, queue?: string): Promise<void>;
  release(job: SerializedJob, delay: number, queue?: string): Promise<void>;
  clear(queue?: string): Promise<number>;
  getJobs(queue?: string): Promise<SerializedJob[]>;
}

export interface FailedJobsInterface {
  logFailed(connection: string, queue: string, job: SerializedJob, exception: Error): Promise<void>;
  getFailedJobs(): Promise<any[]>;
  retryFailed(uuid: string): Promise<boolean>;
  forgetFailed(uuid: string): Promise<boolean>;
  flushFailed(): Promise<number>;
}

export interface JobOptions {
  queue?: string;
  connection?: string;
  delay?: number;
  tries?: number;
  timeout?: number;
  backoff?: number | number[];
  retryUntil?: Date;
  uniqueId?: string;
  uniqueFor?: number;
}

export interface ScheduleFrequency {
  expression: string;
  timezone?: string;
}

export interface ScheduledTask {
  name: string;
  command: string | (() => Promise<void>);
  frequency: ScheduleFrequency;
  description?: string;
  withoutOverlapping?: boolean;
  onOneServer?: boolean;
  evenInMaintenanceMode?: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "released";

export interface WorkerOptions {
  connection?: string;
  queue?: string | string[];
  delay?: number;
  memory?: number;
  timeout?: number;
  sleep?: number;
  maxTries?: number;
  maxJobs?: number;
  maxTime?: number;
  force?: boolean;
  stopWhenEmpty?: boolean;
  rest?: number;
  verbose?: boolean;
  /** Horizon worker ID — enables Cache-based pause/resume/stop signals from the dashboard. */
  workerId?: string;
}

export interface JobEvent {
  connectionName: string;
  job: SerializedJob;
}

export interface JobProcessingEvent extends JobEvent {}

export interface JobProcessedEvent extends JobEvent {}

export interface JobFailedEvent extends JobEvent {
  exception: Error;
}

export interface JobExceptionOccurredEvent extends JobEvent {
  exception: Error;
}
