import winston from 'winston';
import { config } from '../config/environment';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.metadata && Object.keys(info.metadata).length
        ? ` | ${JSON.stringify(info.metadata)}`
        : ''
    }`
  )
);

// Create format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Create logger with configurations
const logger = winston.createLogger({
  level: config.server.logLevel || 'info',
  levels,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
    }),
  ],
});

export default logger; 