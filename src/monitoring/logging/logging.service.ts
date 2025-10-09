import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: any;
  stack?: string;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private readonly logsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.logsDir = this.configService.get('LOGS_DIR', 'logs');
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  async getRecentLogs(count: number = 100): Promise<LogEntry[]> {
    try {
      const logFile = path.join(this.logsDir, 'combined.log');
      
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines
        .slice(-count)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: line,
            };
          }
        })
        .reverse();
    } catch (error) {
      this.logger.error('Failed to read logs', error);
      return [];
    }
  }

  async getErrorLogs(count: number = 50): Promise<LogEntry[]> {
    try {
      const errorLogFile = path.join(this.logsDir, 'error.log');
      
      if (!fs.existsSync(errorLogFile)) {
        return [];
      }

      const content = fs.readFileSync(errorLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines
        .slice(-count)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return {
              timestamp: new Date().toISOString(),
              level: 'error',
              message: line,
            };
          }
        })
        .reverse();
    } catch (error) {
      this.logger.error('Failed to read error logs', error);
      return [];
    }
  }

  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<LogEntry[]> {
    const logs = await this.getRecentLogs(1000);
    
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  async clearOldLogs(olderThanDays: number = 30) {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      // This is a simplified implementation
      // In production, you might want to use log rotation libraries
      this.logger.log(`Clearing logs older than ${cutoffDate.toISOString()}`);
    } catch (error) {
      this.logger.error('Failed to clear old logs', error);
    }
  }
}