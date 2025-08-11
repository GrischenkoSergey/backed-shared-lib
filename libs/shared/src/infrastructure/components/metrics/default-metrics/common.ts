import { cpus, totalmem, freemem } from 'os';
import type { CpuInfo } from 'os';

const MILLISECOND = 1 / 1e3;
const MICROSECOND = 1 / 1e6;

export interface ProcessCpuUsageData {
  system: number;
  user: number;
  systemP: number;
  userP: number;
}

export interface MemoryData {
  used: number;
  free: number;
  usedP: number;
  freeP: number;
}

export enum METRIC_NAMES {
  PROCESS_CPU_TIME = 'process.cpu.time',
  PROCESS_CPU_UTILIZATION = 'process.cpu.utilization',
  PROCESS_MEMORY_USAGE = 'process.memory.usage',
}

export enum ATTRIBUTE_NAMES {
  PROCESS_CPU_STATE = 'process.cpu.state',
  WORKER_ID = 'workerId',
}

export enum CPU_LABELS {
  USER = 'user',
  SYSTEM = 'system'
}

export enum MEMORY_LABELS {
  FREE = 'free',
  USED = 'used',
}

let prevOsData: { time: number; cpus: CpuInfo[] } = {
  time: Date.now(),
  cpus: cpus(),
};

let prevProcData: { time: number; usage: NodeJS.CpuUsage } = {
  time: Date.now(),
  usage: process.cpuUsage(),
};

export async function getProcessCpuUsageData(): Promise<ProcessCpuUsageData> {
  const currentTime = Date.now();
  const currentUsage = process.cpuUsage();
  const prevUsage = prevProcData.usage;
  const timeElapsed = (currentTime - prevProcData.time) * 1000;
  const cpusTimeElapsed = timeElapsed * prevOsData.cpus.length;
  const user = currentUsage.user * MICROSECOND;
  const system = currentUsage.system * MICROSECOND;
  const userP = (currentUsage.user - prevUsage.user) / cpusTimeElapsed;
  const systemP = (currentUsage.system - prevUsage.system) / cpusTimeElapsed;

  prevProcData = { time: currentTime, usage: currentUsage };

  return {
    user,
    system,
    userP,
    systemP,
  };
}

export function getMemoryData(): MemoryData {
  const total = totalmem();
  const free = freemem();
  const used = total - free;
  const freeP = free / total;
  const usedP = used / total;

  return {
    used: used,
    free: free,
    usedP: usedP,
    freeP: freeP,
  };
}

export function getProcessMemoryData(): number {
  if (process.memoryUsage.rss) {
    return process.memoryUsage.rss();
  }
  return process.memoryUsage().rss;
}
