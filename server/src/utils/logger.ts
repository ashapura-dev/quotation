type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_COLORS = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
};

const RESET_COLOR = "\x1b[0m";

class Logger {
  private level: LogLevel = "info";

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && ["debug", "info", "warn", "error"].includes(envLevel)) {
      this.level = envLevel as LogLevel;
    } else if (process.env.NODE_ENV !== "production") {
      this.level = "debug";
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, meta: unknown[]): string {
    const timestamp = new Date().toISOString();
    const formattedMeta = meta.length
      ? ` ${meta
          .map((m) => {
            if (m instanceof Error) {
              return JSON.stringify({ name: m.name, message: m.message, stack: m.stack });
            }
            return typeof m === "object" ? JSON.stringify(m) : String(m);
          })
          .join(" ")}`
      : "";

    if (process.env.NODE_ENV === "production") {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(meta.length ? { meta } : {}),
      });
    }

    const color = LEVEL_COLORS[level];
    return `[${timestamp}] ${color}${level.toUpperCase()}${RESET_COLOR}: ${message}${formattedMeta}`;
  }

  debug(message: string, ...meta: unknown[]) {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, ...meta: unknown[]) {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, ...meta: unknown[]) {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  error(message: string, error?: unknown, ...meta: unknown[]) {
    if (this.shouldLog("error")) {
      const errorMeta = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
      const combinedMeta = errorMeta !== undefined ? [errorMeta, ...meta] : meta;
      console.error(this.formatMessage("error", message, combinedMeta));
    }
  }
}

export const logger = new Logger();
