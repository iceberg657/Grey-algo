import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Timer, Clock, AlertTriangle, CheckCircle2, Flame, ShieldAlert, Sparkles } from 'lucide-react';
import { SignalData } from '../types';

interface SignalCountdownTimerProps {
  signal: SignalData;
  messageTimestamp?: number;
  variant?: 'badge' | 'hud' | 'both';
  className?: string;
}

/**
 * Calculates the validity duration in milliseconds for a signal based on its
 * explicit expirationTime string or timeframe conventions.
 */
export function getSignalValidityDurationMs(signal: SignalData, defaultTimeframe = 'M5'): number {
  if (signal.expirationTime) {
    const text = signal.expirationTime.toLowerCase();
    
    // Check for explicit hour declarations
    const hourMatch = text.match(/(\d+)\s*(?:hours?|hrs?|h\b)/);
    if (hourMatch) {
      return parseInt(hourMatch[1], 10) * 3600 * 1000;
    }
    
    // Check for explicit minute declarations
    const minMatch = text.match(/(\d+)\s*(?:minutes?|mins?|m\b)/);
    if (minMatch) {
      return parseInt(minMatch[1], 10) * 60 * 1000;
    }
    
    // Check for explicit day declarations
    const dayMatch = text.match(/(\d+)\s*(?:days?|d\b)/);
    if (dayMatch) {
      return parseInt(dayMatch[1], 10) * 24 * 3600 * 1000;
    }
  }

  // Fallback to institutional timeframe duration conventions
  const tf = (signal.timeframe || defaultTimeframe || 'M5').toUpperCase();
  if (tf.includes('M1')) return 10 * 60 * 1000; // 10 minutes for M1 scalps
  if (tf.includes('M5')) return 15 * 60 * 1000; // 15 minutes for M5 sniper setups
  if (tf.includes('M15')) return 30 * 60 * 1000; // 30 minutes for M15 setups
  if (tf.includes('M30')) return 45 * 60 * 1000; // 45 minutes for M30 setups
  if (tf.includes('H1')) return 2 * 60 * 60 * 1000; // 2 hours for H1 day trades
  if (tf.includes('H4')) return 8 * 60 * 60 * 1000; // 8 hours for H4 structural setups
  if (tf.includes('D1') || tf.includes('DAILY')) return 24 * 60 * 60 * 1000; // 24 hours for daily setups
  
  return 15 * 60 * 1000; // Default 15 min institutional sniper execution window
}

export const SignalCountdownTimer: React.FC<SignalCountdownTimerProps> = ({
  signal,
  messageTimestamp,
  variant = 'hud',
  className = ''
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    // Ticks every second for real-time countdown updates
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startTime = signal.timestamp || messageTimestamp || now;
  const durationMs = getSignalValidityDurationMs(signal);
  const expiryTime = startTime + durationMs;
  const timeLeftMs = Math.max(0, expiryTime - now);
  const isExpired = timeLeftMs <= 0;
  const percentRemaining = isExpired ? 0 : Math.min(100, Math.max(0, (timeLeftMs / durationMs) * 100));
  const isWarning = !isExpired && (timeLeftMs <= 3 * 60 * 1000 || percentRemaining <= 25);
  const isFresh = !isExpired && percentRemaining > 50;

  // Format digital countdown string
  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const timeFormatted = isExpired
    ? '00:00'
    : hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const expiryClockStr = new Date(expiryTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const durationMinStr = Math.round(durationMs / 60000);

  // Badge Variant (Compact Pill for Header)
  if (variant === 'badge') {
    return (
      <span
        id={`signal-timer-badge-${signal.id || 'curr'}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all duration-300 ${
          isExpired
            ? 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/30 text-rose-600 dark:text-rose-400'
            : isWarning
            ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse'
            : 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
        } ${className}`}
        title={`Signal valid until ${expiryClockStr} (${durationMinStr}m max shelf life)`}
      >
        <Timer className={`w-3 h-3 ${isWarning ? 'animate-spin' : ''}`} />
        <span>{isExpired ? 'STALE / EXPIRED' : `${timeFormatted} REMAINING`}</span>
      </span>
    );
  }

  // Full HUD Variant
  return (
    <div
      id={`signal-countdown-hud-${signal.id || 'curr'}`}
      className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur-md transition-all duration-300 ${
        isExpired
          ? 'bg-rose-500/[0.06] dark:bg-rose-950/30 border-rose-500/30'
          : isWarning
          ? 'bg-amber-500/[0.06] dark:bg-amber-950/30 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
          : 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/20'
      } ${className}`}
    >
      {/* Background ambient pulse for warning state */}
      {isWarning && (
        <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none" />
      )}

      {/* Top row: Status header & Big Digital Timer */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm transition-colors ${
              isExpired
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : isWarning
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isExpired ? (
              <ShieldAlert className="w-5 h-5" />
            ) : isWarning ? (
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            ) : isFresh ? (
              <Flame className="w-5 h-5 text-emerald-500" />
            ) : (
              <Timer className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                  isExpired
                    ? 'text-rose-600 dark:text-rose-400'
                    : isWarning
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isExpired
                  ? 'SIGNAL EXPIRED & STALE'
                  : isWarning
                  ? 'EXPIRING SOON • STALENESS RISK'
                  : 'ACTIVE EXECUTION WINDOW'}
              </span>
              <span className="text-slate-400 dark:text-slate-600 text-xs">•</span>
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {isExpired ? 'Cutoff Reached' : `${Math.round(percentRemaining)}% Fresh`}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
              {isExpired
                ? 'Validity window elapsed. Price momentum has degraded — invalidate or re-analyze.'
                : isWarning
                ? 'Orderbook momentum is decaying. Enter immediately or wait for fresh structural trigger.'
                : `Optimal sniper entry range. Valid for ${durationMinStr}m from signal creation.`}
            </p>
          </div>
        </div>

        {/* Digital Countdown Display */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-2xl sm:text-3xl font-black tracking-tight ${
                isExpired
                  ? 'text-rose-600 dark:text-rose-400 line-through opacity-80'
                  : isWarning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {timeFormatted}
            </span>
            {!isExpired && (
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                left
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500">
            {isExpired ? `Expired at ${expiryClockStr}` : `Expires: ${expiryClockStr}`}
          </span>
        </div>
      </div>

      {/* Middle row: Visual Freshness & Decay Progress Bar */}
      <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: `${percentRemaining}%` }}
          animate={{ width: `${percentRemaining}%` }}
          transition={{ ease: 'linear', duration: 0.5 }}
          className={`h-full rounded-full transition-colors ${
            isExpired
              ? 'bg-rose-500'
              : isWarning
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
          }`}
        />
      </div>

      {/* Bottom row: Telemetry metadata pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px]">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Timeframe: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{signal.timeframe || 'M5'}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-400" />
            <span>Shelf Life: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{durationMinStr} mins</strong></span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          {isExpired ? (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
              <ShieldAlert className="w-3 h-3" />
              Do Not Chase Stale Prices
            </span>
          ) : isWarning ? (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              Execute or Invalidate Soon
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              Optimal Sniper Window Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
