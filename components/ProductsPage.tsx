
import React, { useState } from 'react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { UserMetadata } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ProductsPageProps {
    onBack: () => void;
    onLogout: () => void;
    userMetadata: UserMetadata | null;
}

interface Product {
    id: string;
    name: string;
    description: string;
    type: 'Indicator' | 'Bot' | 'Strategy';
    platform: 'TradingView' | 'MetaTrader 5' | 'Python';
    version: string;
    code: string;
}

const PRODUCTS: Product[] = [
    {
        id: 'ga-confluence-order-blocks',
        name: 'GreyAlpha Confluence Order Blocks',
        description: 'Advanced indicator for detecting order blocks with confluence. Features normalized zones and ATR-based height calculations.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v6.0',
        code: `//@version=6

indicator("Confluence Order Blocks", overlay=true, max_boxes_count=50, max_labels_count=50)

// ═══════════════════════════════════════════════════════════════════════════════
// INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

use_normalized_zones = input.bool(true,  "Normalize All Zone Heights",   group="Universal Zone Settings")
zone_height_method   = input.string("ATR Based", "Zone Height Method",   group="Universal Zone Settings", options=["ATR Based","Fixed Percentage"])
zone_height_atr_mult = input.float(0.75, "Zone Height (ATR Multiplier)", group="Universal Zone Settings", minval=0.1, maxval=3.0,  step=0.05)
// ... (Code truncated, please paste full code here)`
    },
    {
        id: 'ga-aer-vn',
        name: 'GreyAlpha Adaptive Regime Filter + Divergence (AER-VN)',
        description: 'Adaptive Regime Filter with Divergence detection. Uses Efficiency Ratio and Volatility Normalization to filter out market noise.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v6.0',
        code: `// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © KeyAlgos
//@version=6
indicator("Adaptive Regime Filter + Divergence (AER-VN) [KEYALGOS]", shorttitle="AER+Div [KEYALGOS]", overlay=false, format=format.price, precision=2)

// ========================================================================= //
// =============================== INPUTS ================================== //
// ========================================================================= //
grp_er    = "Efficiency Ratio Settings"
length    = input.int(10, title="ER Lookback (N)", minval=2, group=grp_er)
baseEr    = input.float(0.25, title="Base ER Threshold", step=0.05, minval=0.05, maxval=0.8, group=grp_er)
maxErCap  = input.float(0.65, title="Max Threshold Cap", step=0.05, minval=0.1, maxval=0.99, group=grp_er)

grp_vol   = "Volatility Normalization"
atrLength = input.int(14, title="ATR Length", minval=1, group=grp_vol)
// ... (Code truncated, please paste full code here)`
    },
    {
        id: 'ga-supertrend-cluster',
        name: 'GreyAlpha SuperTrend Cluster',
        description: 'A cluster of SuperTrend indicators providing a weighted agreement for bullish or bearish trends. Includes live cluster strength gradient.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v6.0',
        code: `// This work is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
// https://creativecommons.org/licenses/by-nc-sa/4.0/
// © Zeiierman {
//@version=6
indicator('SuperTrend Cluster (Zeiierman)', max_labels_count = 200, overlay = true, max_bars_back = 2000, behind_chart = false)
//}

// ~~ Tooltips {
var string t1  = "Minimum weighted agreement required for the bullish or bearish cluster to become valid. Higher values demand stronger alignment across the SuperTrend set."
var string t2  = "Selects which one of the five SuperTrend members is used as the base reference for flip markers, label placement, and final direction alignment."
var string t3  = "Colors the candles and bars using the live cluster strength gradient. When disabled, chart candles keep their default chart colors."
var string t4  = "Shows or hides the Bull Cluster and Bear Cluster labels when the selected base SuperTrend flips."
// ... (Code truncated, please paste full code here)`
    },
    {
        id: 'ga-algo-trend-system-tg',
        name: 'GreyAlpha Algo Trend System TG',
        description: 'Algorithmic Trend System with Telegram integration. Uses ATR and Cloud EMAs for trend calculation and fixed dollar distance for SL/TP.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v5.0',
        code: `//@version=5
indicator("Algo Trend System TG", overlay=true, max_lines_count=50, max_labels_count=50)

// ==========================================
// 1. SETTINGS & INPUTS
// ==========================================
atrPeriod = input.int(10, "ATR Period for Trend Calculation")
factor = input.float(3.0, "Trend Sensitivity Factor", step=0.1)
cloudFast = input.int(50, "Cloud Fast EMA")
cloudSlow = input.int(150, "Cloud Slow EMA")

// Fixed Dollar Distance Settings
sl_dist  = input.float(20.0, "Stop Loss Distance ($)") 
tp1_dist = input.float(10.0, "TP 1 Distance ($)")
tp2_dist = input.float(20.0, "TP 2 Distance ($)")
tp3_dist = input.float(30.0, "TP 3 Distance ($)")

// --- Telegram Settings (Supports up to 5 Groups) ---
useChat1 = input.bool(false, "Use Chat 1 (Optional)", group="Telegram Settings")
chatID1  = input.string("", "Telegram Chat ID 1", group="Telegram Settings")
// ... (Code truncated, please paste full code here)`
    },
    {
        id: 'ga-trend-catcher',
        name: 'GreyAlpha Trend Catcher',
        description: 'A classic trend-following system using EMA crossovers with visual buy/sell signals. Perfect for identifying trend reversals on H1 and H4 timeframes.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.2',
        code: `//@version=5
indicator("GreyAlpha Trend Catcher", overlay=true)

// GreyAlpha Theme
bgcolor(color.new(#0f172a, 90))
barcolor(close > open ? color.green : color.blue)

// Settings
fastLen = input.int(9, "Fast EMA")
slowLen = input.int(21, "Slow EMA")

// Calculation
fast = ta.ema(close, fastLen)
slow = ta.ema(close, slowLen)

// Plotting
plot(fast, color=color.new(color.green, 0), title="Fast EMA")
plot(slow, color=color.new(color.red, 0), title="Slow EMA")

// Logic
longCondition = ta.crossover(fast, slow)
shortCondition = ta.crossunder(fast, slow)

// Visuals
plotshape(longCondition, title="Buy Signal", location=location.belowbar, color=color.green, style=shape.labelup, text="BUY", textcolor=color.white)
plotshape(shortCondition, title="Sell Signal", location=location.abovebar, color=color.red, style=shape.labeldown, text="SELL", textcolor=color.white)

alertcondition(longCondition, title="GA Buy Alert", message="GreyAlpha Trend Catcher: BUY Detected")
alertcondition(shortCondition, title="GA Sell Alert", message="GreyAlpha Trend Catcher: SELL Detected")`
    },
    {
        id: 'ga-institutional-order-block',
        name: 'GreyAlpha Institutional Order Block Finder',
        description: 'Advanced TradingView indicator that detects institutional order blocks (OBs) and fair value gaps (FVGs) to highlight high-probability reversal zones.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v2.1',
        code: `//@version=5
indicator("GreyAlpha Institutional Order Block Finder", overlay=true, max_boxes_count=50)

// GreyAlpha Theme
bgcolor(color.new(#0f172a, 90))

// Settings
obLookback = input.int(10, "OB Lookback Period")
showFVG = input.bool(true, "Show Fair Value Gaps")

// Order Block Logic (Simplified for demonstration)
bullishOB = close[1] < open[1] and close > open and close > high[1]
bearishOB = close[1] > open[1] and close < open and close < low[1]

// Draw OB Boxes
if bullishOB
    box.new(left=bar_index[1], top=high[1], right=bar_index+5, bottom=low[1], border_color=color.green, bgcolor=color.new(color.green, 80))
if bearishOB
    box.new(left=bar_index[1], top=high[1], right=bar_index+5, bottom=low[1], border_color=color.red, bgcolor=color.new(color.red, 80))

// FVG Logic
bullishFVG = low > high[2] and close > open
bearishFVG = high < low[2] and close < open

if showFVG and bullishFVG
    box.new(left=bar_index[2], top=low, right=bar_index, bottom=high[2], border_color=color.blue, bgcolor=color.new(color.blue, 85))
if showFVG and bearishFVG
    box.new(left=bar_index[2], top=low[2], right=bar_index, bottom=high, border_color=color.orange, bgcolor=color.new(color.orange, 85))`
    },
    {
        id: 'ga-multi-tf-dashboard',
        name: 'GreyAlpha Multi-Timeframe Trend Dashboard',
        description: 'A comprehensive TradingView dashboard that displays the current trend across 5 different timeframes simultaneously using EMA alignment.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.5',
        code: `//@version=5
indicator("GreyAlpha Multi-TF Trend Dashboard", overlay=true)

// Settings
emaLength = input.int(50, "Trend EMA Length")

// Get TF Data
tf1 = request.security(syminfo.tickerid, "5", close > ta.ema(close, emaLength))
tf2 = request.security(syminfo.tickerid, "15", close > ta.ema(close, emaLength))
tf3 = request.security(syminfo.tickerid, "60", close > ta.ema(close, emaLength))
tf4 = request.security(syminfo.tickerid, "240", close > ta.ema(close, emaLength))
tf5 = request.security(syminfo.tickerid, "D", close > ta.ema(close, emaLength))

// Dashboard Table
var table dash = table.new(position.top_right, 2, 6, bgcolor=color.new(#0f172a, 10), border_color=color.gray, border_width=1)

if barstate.islast
    table.cell(dash, 0, 0, "Timeframe", text_color=color.white)
    table.cell(dash, 1, 0, "Trend", text_color=color.white)
    
    table.cell(dash, 0, 1, "5m", text_color=color.white)
    table.cell(dash, 1, 1, tf1 ? "BULL" : "BEAR", text_color=tf1 ? color.green : color.red)
    
    table.cell(dash, 0, 2, "15m", text_color=color.white)
    table.cell(dash, 1, 2, tf2 ? "BULL" : "BEAR", text_color=tf2 ? color.green : color.red)
    
    table.cell(dash, 0, 3, "1H", text_color=color.white)
    table.cell(dash, 1, 3, tf3 ? "BULL" : "BEAR", text_color=tf3 ? color.green : color.red)
    
    table.cell(dash, 0, 4, "4H", text_color=color.white)
    table.cell(dash, 1, 4, tf4 ? "BULL" : "BEAR", text_color=tf4 ? color.green : color.red)
    
    table.cell(dash, 0, 5, "Daily", text_color=color.white)
    table.cell(dash, 1, 5, tf5 ? "BULL" : "BEAR", text_color=tf5 ? color.green : color.red)`
    },
    {
        id: 'ga-volatility-beast',
        name: 'GreyAlpha Volatility Beast',
        description: 'Captures explosive moves by detecting Bollinger Band squeezes followed by aggressive breakouts. Best used for scalping on 5m and 15m charts.',
        type: 'Strategy',
        platform: 'TradingView',
        version: 'v2.0',
        code: `//@version=5
indicator("GreyAlpha Volatility Beast", overlay=true)

// GreyAlpha Theme
bgcolor(color.new(#0f172a, 90))
barcolor(close > open ? color.green : color.blue)

// Settings
length = input.int(20, "BB Length")
mult = input.float(2.0, "BB Mult")

// Calculations
[middle, upper, lower] = ta.bb(close, length, mult)
plot(upper, color=color.new(color.blue, 50), title="Upper Band")
plot(lower, color=color.new(color.blue, 50), title="Lower Band")

// Breakout Logic
bullishBreak = close > upper and close[1] <= upper[1]
bearishBreak = close < lower and close[1] >= lower[1]

// Volume Filter (Optional)
volSpike = volume > ta.sma(volume, 20) * 1.5

// Visuals
plotshape(bullishBreak and volSpike, title="Volatility Buy", location=location.belowbar, color=color.yellow, style=shape.triangleup, size=size.small, text="BREAK", textcolor=color.yellow)
plotshape(bearishBreak and volSpike, title="Volatility Sell", location=location.abovebar, color=color.purple, style=shape.triangledown, size=size.small, text="BREAK", textcolor=color.purple)

bgcolor(bullishBreak ? color.new(color.green, 90) : bearishBreak ? color.new(color.red, 90) : na)`
    },
    {
        id: 'mt5-neural-bot-v1',
        name: 'GreyAlpha MT5 Neural Bot',
        description: 'Advanced MetaTrader 5 bot using neural network models to predict high-probability reversals. Includes automated risk management and trailing stops.',
        type: 'Bot',
        platform: 'MetaTrader 5',
        version: 'v4.2.0',
        code: `// MT5 Neural Bot Code Placeholder
// This is a compiled .ex5 file in production.
// Contact admin for the full binary file.
#property copyright "GreyAlpha Quantitative Team"
#property link      "https://grey-one.vercel.app"
#property version   "4.20"
#property strict

input double RiskPercent = 1.0;
input int    NeuralThreshold = 85;

// Neural Network Logic Initialization...
// [Proprietary Code Redacted]`
    },
    {
        id: 'ga-liquidity-grabber',
        name: 'GreyAlpha Liquidity Grabber',
        description: 'Identifies liquidity sweeps and institutional order blocks. Essential for SMC (Smart Money Concepts) traders.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `//@version=5
indicator("GreyAlpha Liquidity Grabber", overlay=true)

// GreyAlpha Theme
bgcolor(color.new(#0f172a, 90))
barcolor(close > open ? color.green : color.blue)

// SMC Logic for Liquidity Sweeps...
// [Indicator Code]`
    },
    {
        id: 'ga-omni-sweep',
        name: 'Omni Sweep',
        description: 'Nexus Liquidity Engine - Multi-TF. Identifies liquidity sweeps across multiple timeframes (H1, M15, M5, M1) with optional trend filtering.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `//@version=6
indicator("Nexus Liquidity Engine - Multi-TF", overlay=true, max_lines_count=500, max_labels_count=500)

// GreyAlpha Theme
bgcolor(color.new(#0f172a, 90))
barcolor(close > open ? color.green : color.blue)

// --- הגדרות פילטר מגמה ---
group_filter = "Trend Filter Settings"
use_trend_filter = input.bool(false, "Enable Trend Following Mode?", group=group_filter)
ema_len = input.int(50, "Trend EMA Length", minval=1, group=group_filter)

// --- הגדרות תצוגה ---
group_h1  = "H1 Settings"
show_h1   = input.bool(true, "Show H1 Liquidity?", group=group_h1)
h1_pivot  = input.int(15, "H1 Pivot Strength", minval=1, group=group_h1)

group_m15 = "M15 Settings"
show_m15  = input.bool(true, "Show M15 Liquidity?", group=group_m15)
m15_pivot = input.int(10, "M15 Pivot Strength", minval=1, group=group_m15)

group_m5  = "M5 Settings"
show_m5   = input.bool(true, "Show M5 Liquidity?", group=group_m5)
m5_pivot  = input.int(5, "M5 Pivot Strength", minval=1, group=group_m5)

group_m1  = "M1 Settings"
show_m1   = input.bool(true, "Show M1 Liquidity?", group=group_m1)
m1_pivot  = input.int(3, "M1 Pivot Strength", minval=1, group=group_m1)

// --- זיהוי מגמה ---
ema_trend = ta.ema(close, ema_len)
is_uptrend = close > ema_trend
is_downtrend = close < ema_trend

should_show_sweep(is_high_sweep) =>
    bool result = true
    if use_trend_filter
        if is_high_sweep
            result := is_downtrend
        else
            result := is_uptrend
    result

// --- שליפת נתונים מרחוק ---
[h1_hi, h1_hi_t, h1_lo, h1_lo_t] = request.security(syminfo.tickerid, "60", [ta.pivothigh(h1_pivot, h1_pivot), time[h1_pivot], ta.pivotlow(h1_pivot, h1_pivot), time[h1_pivot]], lookahead=barmerge.lookahead_on)
[m15_hi, m15_hi_t, m15_lo, m15_lo_t] = request.security(syminfo.tickerid, "15", [ta.pivothigh(m15_pivot, m15_pivot), time[m15_pivot], ta.pivotlow(m15_pivot, m15_pivot), time[m15_pivot]], lookahead=barmerge.lookahead_on)
[m5_hi, m5_hi_t, m5_lo, m5_lo_t] = request.security(syminfo.tickerid, "5", [ta.pivothigh(m5_pivot, m5_pivot), time[m5_pivot], ta.pivotlow(m5_pivot, m5_pivot), time[m5_pivot]], lookahead=barmerge.lookahead_on)

m1_hi = ta.pivothigh(m1_pivot, m1_pivot)
m1_hi_t = time[m1_pivot]
m1_lo = ta.pivotlow(m1_pivot, m1_pivot)
m1_lo_t = time[m1_pivot]

// משתני זיכרון
var float act_h1_hi = na, var int act_h1_hi_t = na
var float act_h1_lo = na, var int act_h1_lo_t = na
var float act_m15_hi = na, var int act_m15_hi_t = na
var float act_m15_lo = na, var int act_m15_lo_t = na
var float act_m5_hi = na, var int act_m5_hi_t = na
var float act_m5_lo = na, var int act_m5_lo_t = na
var float act_m1_hi = na, var int act_m1_hi_t = na
var float act_m1_lo = na, var int act_m1_lo_t = na

// עדכון רמות
if show_h1
    if not na(h1_hi)
        act_h1_hi := h1_hi
        act_h1_hi_t := h1_hi_t
    if not na(h1_lo)
        act_h1_lo := h1_lo
        act_h1_lo_t := h1_lo_t

if show_m15
    if not na(m15_hi)
        act_m15_hi := m15_hi
        act_m15_hi_t := m15_hi_t
    if not na(m15_lo)
        act_m15_lo := m15_lo
        act_m15_lo_t := m15_lo_t

if show_m5
    if not na(m5_hi)
        act_m5_hi := m5_hi
        act_m5_hi_t := m5_hi_t
    if not na(m5_lo)
        act_m5_lo := m5_lo
        act_m5_lo_t := m5_lo_t

if show_m1
    if not na(m1_hi)
        act_m1_hi := m1_hi
        act_m1_hi_t := int(m1_hi_t)
    if not na(m1_lo)
        act_m1_lo := m1_lo
        act_m1_lo_t := int(m1_lo_t)

// --- ניקוי רמות שנפרצו בסגירה ---
if not na(act_h1_hi) and close > act_h1_hi
    act_h1_hi := na
if not na(act_h1_lo) and close < act_h1_lo
    act_h1_lo := na
if not na(act_m15_hi) and close > act_m15_hi
    act_m15_hi := na
if not na(act_m15_lo) and close < act_m15_lo
    act_m15_lo := na
if not na(act_m5_hi) and close > act_m5_hi
    act_m5_hi := na
if not na(act_m5_lo) and close < act_m5_lo
    act_m5_lo := na
if not na(act_m1_hi) and close > act_m1_hi
    act_m1_hi := na
if not na(act_m1_lo) and close < act_m1_lo
    act_m1_lo := na

// --- זיהוי Sweep וציור חצים ---

// H1 (אדום/ירוק)
if show_h1 and not na(act_h1_hi) and high > act_h1_hi and close < act_h1_hi and should_show_sweep(true)
    line.new(act_h1_hi_t, act_h1_hi, time, high, xloc=xloc.bar_time, color=color.red, width=2, style=line.style_arrow_right)
    label.new(bar_index, high, "H1 SWEEP", color=color.red, textcolor=color.white, style=label.style_label_down, size=size.small)
    act_h1_hi := na
if show_h1 and not na(act_h1_lo) and low < act_h1_lo and close > act_h1_lo and should_show_sweep(false)
    line.new(act_h1_lo_t, act_h1_lo, time, low, xloc=xloc.bar_time, color=color.green, width=2, style=line.style_arrow_right)
    label.new(bar_index, low, "H1 SWEEP", color=color.green, textcolor=color.white, style=label.style_label_up, size=size.small)
    act_h1_lo := na

// M15 (כתום/תכלת)
if show_m15 and not na(act_m15_hi) and high > act_m15_hi and close < act_m15_hi and should_show_sweep(true)
    line.new(act_m15_hi_t, act_m15_hi, time, high, xloc=xloc.bar_time, color=color.orange, width=2, style=line.style_arrow_right)
    label.new(bar_index, high, "M15 SWEEP", color=color.orange, textcolor=color.white, style=label.style_label_down, size=size.small)
    act_m15_hi := na
if show_m15 and not na(act_m15_lo) and low < act_m15_lo and close > act_m15_lo and should_show_sweep(false)
    line.new(act_m15_lo_t, act_m15_lo, time, low, xloc=xloc.bar_time, color=color.teal, width=2, style=line.style_arrow_right)
    label.new(bar_index, low, "M15 SWEEP", color=color.teal, textcolor=color.white, style=label.style_label_up, size=size.small)
    act_m15_lo := na

// M1 (בורדו/כחול נייבי)
if show_m1 and not na(act_m1_hi) and high > act_m1_hi and close < act_m1_hi and should_show_sweep(true)
    line.new(act_m1_hi_t, act_m1_hi, time, high, xloc=xloc.bar_time, color=color.maroon, width=1, style=line.style_arrow_right)
    label.new(bar_index, high, "M1 SWEEP", color=color.maroon, textcolor=color.white, style=label.style_label_down, size=size.tiny)
    act_m1_hi := na
if show_m1 and not na(act_m1_lo) and low < act_m1_lo and close > act_m1_lo and should_show_sweep(false)
    line.new(act_m1_lo_t, act_m1_lo, time, low, xloc=xloc.bar_time, color=color.navy, width=1, style=line.style_arrow_right)
    label.new(bar_index, low, "M1 SWEEP", color=color.navy, textcolor=color.white, style=label.style_label_up, size=size.tiny)
    act_m1_lo := na

// --- תצוגת רמות יעד ---
plot(show_h1 ? act_h1_hi : na, "H1 Hi", color=color.new(color.gray, 70), style=plot.style_linebr)
plot(show_h1 ? act_h1_lo : na, "H1 Lo", color=color.new(color.gray, 70), style=plot.style_linebr)
plot(show_m1 ? act_m1_hi : na, "M1 Hi", color=color.new(color.maroon, 80), style=plot.style_linebr)
plot(show_m1 ? act_m1_lo : na, "M1 Lo", color=color.new(color.navy, 80), style=plot.style_linebr)`
    },
    {
        id: 'ga-supertrend-destur',
        name: 'Supertrend Destur',
        description: 'Multi-Supertrend system with VWAP and RSI divergence detection. Provides trend-following signals and reversal alerts.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `//@version=6
indicator("Supertrend Destur", overlay=true)

// GreyAlpha Theme
bgcolor(color.new(#0f172a, 90))
barcolor(close > open ? color.green : color.blue)

// ─── GİRDİLER ───
atr1 = input.int(12,    title="ST1 ATR")
fac1 = input.float(3.0, title="ST1 Faktör")
atr2 = input.int(10,    title="ST2 ATR")
fac2 = input.float(1.0, title="ST2 Faktör")
atr3 = input.int(11,    title="ST3 ATR")
fac3 = input.float(2.0, title="ST3 Faktör")
atr4 = input.int(10,    title="ST4 ATR")
fac4 = input.float(3.0, title="ST4 Faktör")

// ─── SUPERTREND ───
[st1, dir1] = ta.supertrend(fac1, atr1)
[st2, dir2] = ta.supertrend(fac2, atr2)
[st3, dir3] = ta.supertrend(fac3, atr3)
[st4, dir4] = ta.supertrend(fac4, atr4)

st1 := barstate.isfirst ? na : st1
st2 := barstate.isfirst ? na : st2
st3 := barstate.isfirst ? na : st3
st4 := barstate.isfirst ? na : st4

bodyMiddle = plot(barstate.isfirst ? na : (open + close) / 2, display=display.none)

// ─── ST1 ───
up1   = plot(dir1 < 0 ? st1 : na, "ST1 Up",   color=color.new(#4CAF50, 0),  style=plot.style_linebr, linewidth=2)
down1 = plot(dir1 < 0 ? na : st1, "ST1 Down", color=color.new(#D32F2F, 0),  style=plot.style_linebr, linewidth=2)
fill(bodyMiddle, up1,   color=color.new(#4CAF50, 84), fillgaps=false)
fill(bodyMiddle, down1, color=color.new(#D32F2F, 84), fillgaps=false)

// ─── ST2 ───
up2   = plot(dir2 < 0 ? st2 : na, "ST2 Up",   color=color.new(#4CAF50, 30), style=plot.style_linebr, linewidth=1)
down2 = plot(dir2 < 0 ? na : st2, "ST2 Down", color=color.new(#E53935, 30), style=plot.style_linebr, linewidth=1)
fill(bodyMiddle, up2,   color=color.new(#4CAF50, 91), fillgaps=false)
fill(bodyMiddle, down2, color=color.new(#E53935, 91), fillgaps=false)

// ─── ST3 ───
up3   = plot(dir3 < 0 ? st3 : na, "ST3 Up",   color=color.new(#4CAF50, 55), style=plot.style_linebr, linewidth=1)
down3 = plot(dir3 < 0 ? na : st3, "ST3 Down", color=color.new(#EF5350, 55), style=plot.style_linebr, linewidth=1)
fill(bodyMiddle, up3,   color=color.new(#4CAF50, 93), fillgaps=false)
fill(bodyMiddle, down3, color=color.new(#EF5350, 93), fillgaps=false)

// ─── ST4 ───
up4   = plot(dir4 < 0 ? st4 : na, "ST4 Up",   color=color.new(#4CAF50, 15), style=plot.style_linebr, linewidth=2)
down4 = plot(dir4 < 0 ? na : st4, "ST4 Down", color=color.new(#FF6F00, 15), style=plot.style_linebr, linewidth=2)
fill(bodyMiddle, up4,   color=color.new(#4CAF50, 92), fillgaps=false)
fill(bodyMiddle, down4, color=color.new(#FF6F00, 92), fillgaps=false)

// ─── VWAP ───
[vwapVal, _, _] = ta.vwap(hlc3, false, 1)
vwapColor = dir1 < 0 ? color.new(#4CAF50, 0) : color.new(#FF1744, 0)
plot(vwapVal, title="VWAP", color=vwapColor, linewidth=2, display=display.all)

// ─── RSI AYI DİVERJANSI ───
rsiVal = ta.rsi(close, 14)

var bool firedThisTrend = false
newUptrend = dir1[1] > 0 and dir1 < 0
if newUptrend
    firedThisTrend := false

bearDiv = not firedThisTrend                     and
          dir1 < 0                               and
          rsiVal >= 70                           and
          close >= ta.highest(close, 50) * 0.995 and
          rsiVal < ta.highest(rsiVal, 50) * 0.92

if bearDiv
    firedThisTrend := true

plotshape(bearDiv,
     title    = "RSI Ayı Diverjansı",
     location = location.abovebar,
     style    = shape.triangledown,
     color    = color.new(#FF1744, 0),
     size     = size.large)

// ─── AL/SAT — label.new ile ATR offset ───
atrVal     = ta.atr(14)
buySignal  = dir1[1] > 0 and dir1 < 0
sellSignal = dir1[1] < 0 and dir1 > 0

if buySignal
    label.new(bar_index, low - atrVal * 3,
         text      = "Buy",
         color     = color.new(#4CAF50, 0),
         textcolor = color.white,
         style     = label.style_label_up,
         size      = size.small)

if sellSignal
    label.new(bar_index, high + atrVal * 2,
         text      = "Sell",
         color     = color.new(#D32F2F, 0),
         textcolor = color.white,
         style     = label.style_label_down,
         size      = size.small)

// ─── ST4 NOKTA SİNYALLERİ ───
plotshape(dir4[1] > 0 and dir4 < 0, location=location.belowbar, style=shape.circle, color=color.new(#4CAF50, 0), size=size.tiny)
plotshape(dir4[1] < 0 and dir4 > 0, location=location.abovebar, style=shape.circle, color=color.new(#FF6F00, 0), size=size.tiny)

// ─── ALARMLAR ───
alertcondition(buySignal,  title="Al",  message="Supertrend Destur — Al Sinyali")
alertcondition(sellSignal, title="Sat", message="Supertrend Destur — Sat Sinyali")
alertcondition(bearDiv,    title="RSI Ayı Diverjansı", message="Dönüş Riski — RSI Diverjansı")
alertcondition(dir1[1] != dir1, title="Trend Değişimi", message="ST1 Trend Değişti")
alertcondition(close > vwapVal and dir1 < 0, title="VWAP Üstü + Boğa", message="Fiyat VWAP üzerinde")
alertcondition(close < vwapVal and dir1 > 0, title="VWAP Altı + Ayı",  message="Fiyat VWAP altında")`
    },
    {
        id: 'isv-200-pro',
        name: 'ISV-200 - PRO',
        description: 'Selective Structure indicator using Bollinger Bands 200 for basis and pivot point analysis.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v3.0',
        code: `//@version=6
indicator(title="ISV-200 - PRO (Selective Structure)", shorttitle="ISV-200-PRO-V3", overlay=true, max_lines_count=500)

// GreyAlpha Theme
bgcolor(color.new(#0f172a, 90))
barcolor(close > open ? color.green : color.blue)

// ==========================================
// 1. BOLLINGER BANDS 200 (MA 200 là đường Basis)
// ==========================================
grp_bb = "--- BOLLINGER BANDS ---"
bb_length = input.int(200, "BB Length", group=grp_bb)
bb_mult   = input.float(2.0, "BB StdDev", group=grp_bb)
[basis, upper, lower] = ta.bb(close, bb_length, bb_mult)

plot(basis, "MA 200 (Basis)", color=#2196f3, linewidth=2, display=display.all - display.status_line)
plot(upper, "Upper BB", color=#4caf50, linewidth=2, display=display.all - display.status_line)
plot(lower, "Lower BB", color=#009688, linewidth=2, display=display.all - display.status_line)

// ==========================================
// 2. CẤU HÌNH & BỘ LỌC KHOẢNG CÁCH
// ==========================================
lookback = input.int(12, "Độ rộng Pivot")
max_dist = input.int(100, "Khoảng cách tối đa giữa 2 điểm (nến)")

var float p1_v_l = na, var int p1_i_l = na
var float p2_v_l = na, var int p2_i_l = na

var float p1_v_h = na, var int p1_i_h = na
var float p2_v_h = na, var int p2_i_h = na

pl = ta.pivotlow(low, lookback, lookback)
ph = ta.pivothigh(high, lookback, lookback)

// --- XỬ LÝ 2 ĐÁY ---
if not na(pl)
    p1_v_l := p2_v_l, p1_i_l := p2_i_l
    p2_v_l := pl,     p2_i_l := bar_index - lookback
    
    if not na(p1_v_l)
        // Điều kiện 1: Đáy 2 phải thấp hơn Đáy 1
        is_lower_low = p2_v_l < p1_v_l
        // Điều kiện 2: Đáy 2 chạm hoặc vượt BB Lower
        p2_hit_bb = p2_v_l <= lower[bar_index - p2_i_l]
        // Điều kiện 3: Đáy 1 phải nằm DƯỚI MA 200 (Basis)
        p1_below_ma = p1_v_l < basis[bar_index - p1_i_l]
        // Điều kiện 4: Khoảng cách không quá xa
        dist_ok = (p2_i_l - p1_i_l) <= max_dist
        
        if is_lower_low and p2_hit_bb and p1_below_ma and dist_ok
            line.new(p1_i_l, p1_v_l, p2_i_l, p2_v_l, color=#26a69a, width=2)

// --- XỬ LÝ 2 ĐỈNH ---
if not na(ph)
    p1_v_h := p2_v_h, p1_i_h := p2_i_h
    p2_v_h := ph,     p2_i_h := bar_index - lookback
    
    if not na(p1_v_h)
        // Điều kiện 1: Đỉnh 2 phải cao hơn Đỉnh 1
        is_higher_high = p2_v_h > p1_v_h
        // Điều kiện 2: Đỉnh 2 chạm hoặc vượt BB Upper
        p2_hit_bb = p2_v_h >= upper[bar_index - p2_i_h]
        // Điều kiện 3: Đỉnh 1 phải nằm TRÊN MA 200 (Basis)
        p1_above_ma = p1_v_h > basis[bar_index - p1_i_h]
        // Điều kiện 4: Khoảng cách không quá xa
        dist_ok = (p2_i_h - p1_i_h) <= max_dist
        
        if is_higher_high and p2_hit_bb and p1_above_ma and dist_ok
            line.new(p1_i_h, p1_v_h, p2_i_h, p2_v_h, color=#ef5350, width=2)

// ==========================================
// 3. HIỂN THỊ
// ==========================================
plotshape(pl, "P Low", shape.circle, location.belowbar, #00897b, offset=-lookback, size=size.tiny)
plotshape(ph, "P High", shape.circle, location.abovebar, #f44336, offset=-lookback, size=size.tiny)`
    },
    {
        id: 'dynamic-rr-strategy-btc-15m',
        name: 'Dynamic R:R Strategy - BTC 15m Optimized',
        description: 'Dynamic R:R Strategy optimized for BTC 15m Trend Following. Features auto-snap planner, ATR/Swing SL, and multiple TP ratios.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v6.0',
        code: `//@version=6
// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © LuxAlgo

indicator("Dynamic R:R Strategy - BTC 15m Optimized", overlay = true, max_labels_count = 10, max_lines_count = 10, max_boxes_count = 10)

// --- Constants ---
const string G1 = "Strategy Logic (BTC 15m)"
const string G2 = "Trade Setup"
const string G3 = "Stop Loss Settings"
const string G4 = "Take Profit Ratios"
const string G5 = "Position Sizing"
const string G6 = "Visuals"

// --- Inputs ---
// Signal Inputs (Optimized for 15m BTC Trend Following)
useSignals     = input.bool(true, "Enable Strategy Signals", group = G1)
emaFastLen     = input.int(20, "Fast EMA (Signal)", minval = 1, group = G1)
emaSlowLen     = input.int(50, "Slow EMA (Signal)", minval = 1, group = G1)
trendLen       = input.int(200, "Trend Filter EMA", minval = 1, group = G1)
rsiLen         = input.int(14, "RSI Filter Length", minval = 1, group = G1)
rsiOverbought  = input.int(60, "RSI Bullish Threshold", minval = 50, group = G1)
rsiOversold    = input.int(40, "RSI Bearish Threshold", maxval = 50, group = G1)

// Planner Inputs
autoSnap       = input.bool(true, "Auto-Snap Planner to Latest Signal", group = G2)
tradeTypeInput = input.string("Long", "Manual Direction", options = ["Long", "Short"], group = G2)
entrySource    = input.string("Last Price", "Entry Price", options = ["Last Price", "Manual"], group = G2)
manualEntry    = input.float(0.0, "Manual Entry Price", minval = 0.0, group = G2)

slMethod       = input.string("ATR", "SL Calculation", options = ["ATR", "Swing High/Low"], group = G3)
atrLength      = input.int(14, "ATR Length", minval = 1, group = G3)
atrMult        = input.float(1.5, "ATR Multiplier (Tight for BTC)", minval = 0.1, step = 0.1, group = G3)
swingLookback  = input.int(5, "Swing Lookback (15m)", minval = 2, group = G3)

tp1Ratio       = input.float(1.0, "TP 1 Ratio (R:R)", minval = 0.1, group = G4)
tp2Ratio       = input.float(2.0, "TP 2 Ratio (R:R)", minval = 0.1, group = G4)
tp3Ratio       = input.float(3.0, "TP 3 Ratio (R:R)", minval = 0.1, group = G4)

accountSize    = input.float(10000.0, "Account Balance", minval = 1.0, group = G5)
riskPct        = input.float(1.0, "Risk Percentage (%)", minval = 0.01, group = G5)
contractSize   = input.float(1.0, "Contract Size / Multiplier", minval = 1.0, group = G5)

longColor      = input.color(color.new(#089981, 0), "Long Color", group = G6)
shortColor     = input.color(color.new(#f23645, 0), "Short Color", group = G6)
slColor        = input.color(color.new(#787b86, 0), "SL Color", group = G6)
transp         = input.int(85, "Fill Transparency", group = G6)
textColor      = chart.fg_color

// --- Strategy Signal Logic (Trend + Momentum Filter) ---
float emaFast   = ta.ema(close, emaFastLen)
float emaSlow   = ta.ema(close, emaSlowLen)
float emaTrend  = ta.ema(close, trendLen)
float rsi       = ta.rsi(close, rsiLen)

// Entry Conditions: 1. EMA Cross | 2. Above/Below Trend EMA | 3. RSI Momentum
bool longSignal  = ta.crossover(emaFast, emaSlow) and close > emaTrend and rsi > rsiOverbought
bool shortSignal = ta.crossunder(emaFast, emaSlow) and close < emaTrend and rsi < rsiOversold

plotshape(useSignals and longSignal, "Buy Signal", shape.triangleup, location.belowbar, color.new(longColor, 0), size = size.small)
plotshape(useSignals and shortSignal, "Sell Signal", shape.triangledown, location.abovebar, color.new(shortColor, 0), size = size.small)

// --- Planner Persistence ---
var string activeTradeType = tradeTypeInput
var float  activeEntry     = 0.0
var float  activeATR       = 0.0
var float  activeSwingSL   = 0.0

// Capture Signal Data
if useSignals and (longSignal or shortSignal)
    activeTradeType := longSignal ? "Long" : "Short"
    activeEntry     := close
    activeATR       := ta.atr(atrLength)
    activeSwingSL   := longSignal ? ta.lowest(low, swingLookback) : ta.highest(high, swingLookback)

// --- Visualization Objects ---
var line entryLine  = line.new(na, na, na, na, color = textColor, style = line.style_dashed)
var line slLine     = line.new(na, na, na, na, color = slColor, width = 2)
var line tp3Line    = line.new(na, na, na, na)
var box riskBox     = box.new(na, na, na, na, border_color = #00000000)
var box rewardBox   = box.new(na, na, na, na, border_color = #00000000)
var label entryLabel = label.new(na, na, "", color = #00000000, textcolor = textColor, style = label.style_label_left, size = size.small)
var label slLabel    = label.new(na, na, "", color = #00000000, textcolor = slColor, style = label.style_label_left, size = size.small)
var label tp1Label   = label.new(na, na, "", color = #00000000, style = label.style_label_left, size = size.small)
var label tp2Label   = label.new(na, na, "", color = #00000000, style = label.style_label_left, size = size.small)
var label tp3Label   = label.new(na, na, "", color = #00000000, style = label.style_label_left, size = size.small)
var table dash       = table.new(position.top_right, 2, 4, bgcolor = chart.bg_color, border_color = slColor, border_width = 1, frame_color = slColor, frame_width = 1)

if barstate.islast
    // Final Decision Logic
    string finalType = autoSnap and activeEntry > 0 ? activeTradeType : tradeTypeInput
    float  finalEntry = autoSnap and activeEntry > 0 ? activeEntry : (entrySource == "Last Price" ? close : manualEntry)
    float  finalATR   = autoSnap and activeEntry > 0 ? activeATR : ta.atr(atrLength)
    
    float finalSL = na
    if slMethod == "ATR"
        finalSL := finalType == "Long" ? finalEntry - (finalATR * atrMult) : finalEntry + (finalATR * atrMult)
    else
        finalSL := autoSnap and activeEntry > 0 ? activeSwingSL : (finalType == "Long" ? ta.lowest(low, swingLookback) : ta.highest(high, swingLookback))

    // Calculations
    float riskDist = math.abs(finalEntry - finalSL)
    float tp1 = finalType == "Long" ? finalEntry + (riskDist * tp1Ratio) : finalEntry - (riskDist * tp1Ratio)
    float tp2 = finalType == "Long" ? finalEntry + (riskDist * tp2Ratio) : finalEntry - (riskDist * tp2Ratio)
    float tp3 = finalType == "Long" ? finalEntry + (riskDist * tp3Ratio) : finalEntry - (riskDist * tp3Ratio)

    float riskAmount = accountSize * (riskPct / 100)
    float posSize    = riskDist > 0 ? (riskAmount / (riskDist * contractSize)) : 0
    
    color dirColor  = finalType == "Long" ? longColor : shortColor
    color riskColor = color.new(slColor, transp)
    color gainColor = color.new(dirColor, transp)
    
    int extendBars = 20
    int startBar   = bar_index
    int endBar     = bar_index + extendBars

    // Update Elements
    entryLine.set_xy1(startBar, finalEntry)
    entryLine.set_xy2(endBar, finalEntry)
    entryLabel.set_xy(endBar, finalEntry)
    entryLabel.set_text("Entry: " + str.tostring(finalEntry, format.mintick))

    slLine.set_xy1(startBar, finalSL)
    slLine.set_xy2(endBar, finalSL)
    slLabel.set_xy(endBar, finalSL)
    slLabel.set_text("SL: " + str.tostring(finalSL, format.mintick))

    tp1Label.set_xy(endBar, tp1)
    tp1Label.set_text("TP 1 (" + str.tostring(tp1Ratio) + "R): " + str.tostring(tp1, format.mintick))
    tp1Label.set_textcolor(dirColor)
    tp2Label.set_xy(endBar, tp2)
    tp2Label.set_text("TP 2 (" + str.tostring(tp2Ratio) + "R): " + str.tostring(tp2, format.mintick))
    tp2Label.set_textcolor(dirColor)
    tp3Label.set_xy(endBar, tp3)
    tp3Label.set_text("TP 3 (" + str.tostring(tp3Ratio) + "R): " + str.tostring(tp3, format.mintick))
    tp3Label.set_textcolor(dirColor)
    
    tp3Line.set_xy1(startBar, tp3)
    tp3Line.set_xy2(endBar, tp3)
    tp3Line.set_color(dirColor)

    riskBox.set_lefttop(startBar, finalType == "Long" ? finalEntry : finalSL)
    riskBox.set_rightbottom(endBar, finalType == "Long" ? finalSL : finalEntry)
    riskBox.set_bgcolor(riskColor)
    rewardBox.set_lefttop(startBar, finalType == "Long" ? tp3 : finalEntry)
    rewardBox.set_rightbottom(endBar, finalType == "Long" ? finalEntry : tp3)
    rewardBox.set_bgcolor(gainColor)

    // Table
    table.cell(dash, 0, 0, "Signal Planner", text_color = textColor)
    table.merge_cells(dash, 0, 0, 1, 0)
    table.cell(dash, 0, 1, "Risk (" + str.tostring(riskPct) + "%)", text_color = slColor, text_halign = text.align_left)
    table.cell(dash, 1, 1, str.tostring(riskAmount, "#.##"), text_color = textColor, text_halign = text.align_right)
    table.cell(dash, 0, 2, "Qty", text_color = dirColor, text_halign = text.align_left)
    table.cell(dash, 1, 2, str.tostring(posSize, "#.####"), text_color = dirColor, text_halign = text.align_right)
    table.cell(dash, 0, 3, "Reward (3R)", text_color = dirColor, text_halign = text.align_left)
    table.cell(dash, 1, 3, str.tostring(riskAmount * tp3Ratio, "#.##"), text_color = dirColor, text_halign = text.align_right)

// --- Alerts ---
if longSignal
    alert("BTC Buy Signal Detected! Price: " + str.tostring(close, format.mintick), alert.freq_once_per_bar_close)

if shortSignal
    alert("BTC Sell Signal Detected! Price: " + str.tostring(close, format.mintick), alert.freq_once_per_bar_close)`
    },
    {
        id: 'knn-supertrend-horizon',
        name: 'KNN Supertrend Horizon [LuxAlgo]',
        description: 'Machine learning-based Supertrend using K-Nearest Neighbors (KNN) to classify trends, featuring 3D rejection orbs and dynamic dashboards.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v6.0',
        code: `// This work is licensed under a Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0) https://creativecommons.org/licenses/by-nc-sa/4.0/
// © LuxAlgo

//@version=6
indicator("KNN Supertrend Horizon [LuxAlgo]", "LuxAlgo - KNN Supertrend Horizon", overlay = true, max_bars_back = 2001, max_labels_count = 500, format = format.price)

//---------------------------------------------------------------------------------------------------------------------}
// Constants 
//---------------------------------------------------------------------------------------------------------------------{
color BULL_COLOR = #089981
color BEAR_COLOR = #f23645
string BAR_CHAR  = "▬▬▬▬▬▬▬▬▬▬"

// Table Constants
DATA                    = #DBDBDB
HEADERS                 = #808080
BACKGROUND              = #161616
BORDERS                 = #2E2E2E
TOP_RIGHT               = 'Top Right'
BOTTOM_RIGHT            = 'Bottom Right'
BOTTOM_LEFT             = 'Bottom Left'
TINY                    = 'Tiny'
SMALL                   = 'Small'
NORMAL                  = 'Normal'
LARGE                   = 'Large'
HUGE                    = 'Huge'

//---------------------------------------------------------------------------------------------------------------------}
// Inputs
//---------------------------------------------------------------------------------------------------------------------{
string GRP_ML    = "Machine Learning Settings"
int neighborsK   = input.int(10, "K-Neighbors", minval = 1, maxval = 50, group = GRP_ML)
int windowSize   = input.int(500, "Search Window", minval = 100, maxval = 2000, group = GRP_ML)

string GRP_STR   = "Supertrend Settings"
int atrLenInput  = input.int(10, "ATR Length", minval = 1, group = GRP_STR)
float factorInput = input.float(3.0, "Factor", minval = 0.01, step = 0.1, group = GRP_STR)

string GRP_FIL    = "Noise Filter Settings"
bool smoothSource = input.bool(true, "Smooth Price Input", group = GRP_FIL)
int smoothLenVal  = input.int(10, "Smoothing Length", minval = 1, group = GRP_FIL)
float mlBuffer    = input.float(5.0, "ML Confidence Buffer (%)", minval = 0.0, maxval = 20.0, step = 0.5, group = GRP_FIL)

string GRP_SIG    = "Rejection Signal Settings"
bool showBubbles  = input.bool(true, "Show 3D Rejection Orbs", group = GRP_SIG)
float rejMult     = input.float(1.5, "Min Wick-to-Body Multiplier", minval = 1.0, maxval = 5.0, step = 0.1, group = GRP_SIG)
int bubbleGap     = input.int(5, "Min Bubble Gap (Bars)", minval = 1, maxval = 20, group = GRP_SIG)

string GRP_VIS   = "Visual Settings"
color bullColInput = input.color(BULL_COLOR, "Uptrend Color", group = GRP_VIS)
color bearColInput = input.color(BEAR_COLOR, "Downtrend Color", group = GRP_VIS)
int smoothLen      = input.int(20, "Liquid Smoothness", minval = 1, group = GRP_VIS)
float vibrancy     = input.float(1.5, "Vibrancy", minval = 1.0, maxval = 3.0, step = 0.1, group = GRP_VIS)
bool colorCandles  = input.bool(true, "Gradient Candle Coloring", group = GRP_VIS)

string GRP_DB          = "Dashboard Settings"
bool showDashboard     = input.bool(true, "Show Dashboard", group = GRP_DB)
string dashboardPos    = input.string(TOP_RIGHT, "Position", options = [TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT], group = GRP_DB)
string dashboardSize   = input.string(SMALL, "Size", options = [TINY, SMALL, NORMAL, LARGE, HUGE], group = GRP_DB)

//---------------------------------------------------------------------------------------------------------------------}
// Variables & Helper Functions
//---------------------------------------------------------------------------------------------------------------------{
var parsedDashboardPosition = switch dashboardPos
    TOP_RIGHT       => position.top_right
    BOTTOM_RIGHT    => position.bottom_right
    BOTTOM_LEFT     => position.bottom_left

var parsedDashboardSize     = switch dashboardSize
    TINY            => size.tiny
    SMALL           => size.small
    NORMAL          => size.normal
    LARGE           => size.large
    HUGE            => size.huge

// Table Helper Functions
cell(table t_able, int column, int row, string data, color = #FFFFFF, align = text.align_right, color background = na, float height = 0) => 
    t_able.cell(column, row, data, text_color = color, text_size = parsedDashboardSize, text_halign = align, bgcolor = background, height = height)

divider(table t_able, int row, int lastColumn) =>    
    string rowDivider = '━━━━━━━━━━━━━━━━━━━━━━'
    t_able.merge_cells(0, row, lastColumn, row)
    cell(t_able, 0, row, rowDivider, align = text.align_center, height = 0.5, color = BORDERS)

// Formatting Helpers
formatDynamicVolume(vol) =>
    vol >= 1000000000 ? str.format("{0,number,#.##}B", vol / 1000000000) :
     vol >= 1000000 ? str.format("{0,number,#.##}M", vol / 1000000) :
     vol >= 1000 ? str.format("{0,number,#.#}K", vol / 1000) :
     str.tostring(vol, "#")

getDynamicSizeValue() =>
    float avgVol = ta.sma(volume, 100)
    float stdVol = ta.stdev(volume, 100)
    float zScore = (volume - avgVol) / nz(stdVol, 1)
    int sz = int(math.max(8, math.min(30, 14 + (zScore * 2))))
    sz

//---------------------------------------------------------------------------------------------------------------------}
// Core ML Engine (KNN)
//---------------------------------------------------------------------------------------------------------------------{
float src = smoothSource ? ta.hma(close, smoothLenVal) : close
float f1 = ta.rsi(src, 14)
float f2 = (ta.atr(14) / src) * 100
[st_val, st_dir] = ta.supertrend(factorInput, atrLenInput)
int targetTrend = st_dir < 0 ? 1 : -1

var float mlProb = 50.0
if bar_index > windowSize
    float bullVotes = 0.0
    float bearVotes = 0.0
    float[] dists = array.new_float(0)
    for i = 1 to windowSize
        float d = math.sqrt(math.pow(f1 - f1[i], 2) + math.pow(f2 - f2[i], 2))
        array.push(dists, d)
    float[] sortedDists = array.copy(dists)
    array.sort(sortedDists)
    float threshold = array.get(sortedDists, math.min(neighborsK - 1, array.size(sortedDists) - 1))
    for i = 0 to array.size(dists) - 1
        if array.get(dists, i) <= threshold
            if targetTrend[i+1] > 0
                bullVotes += 1
            else
                bearVotes += 1
    mlProb := (bullVotes / (bullVotes + bearVotes)) * 100

float smoothedProb = ta.ema(mlProb, smoothLen)
var bool mlBullish = false
if smoothedProb > 50 + mlBuffer
    mlBullish := true
else if smoothedProb < 50 - mlBuffer
    mlBullish := false

float intensity    = mlBullish ? (smoothedProb - 50) * 2 : (50 - smoothedProb) * 2
float glowPower    = math.pow(math.max(0, intensity) / 100, vibrancy) * 100

// Colors
color bullGlow = color.from_gradient(glowPower, 0, 100, color.new(bullColInput, 100), color.new(bullColInput, 75))
color bearGlow = color.from_gradient(glowPower, 0, 100, color.new(bearColInput, 100), color.new(bearColInput, 75))
color candleBull = color.from_gradient(glowPower, 0, 100, color.new(bullColInput, 85), color.new(bullColInput, 20))
color candleBear = color.from_gradient(glowPower, 0, 100, color.new(bearColInput, 85), color.new(bearColInput, 20))

//---------------------------------------------------------------------------------------------------------------------}
// Rejection Detection & Visuals
//---------------------------------------------------------------------------------------------------------------------{
float atrRef    = ta.atr(14)
float bodySize  = math.abs(close - open)
float upperWick = high - math.max(open, close)
float lowerWick = math.min(open, close) - low
var int lastBubbleBar = 0

bool isBearRejection = not mlBullish and high > st_val and close < st_val and upperWick > bodySize * rejMult and (bar_index - lastBubbleBar >= bubbleGap)
bool isBullRejection = mlBullish and low < st_val and close > st_val and lowerWick > bodySize * rejMult and (bar_index - lastBubbleBar >= bubbleGap)

int currentBubbleSize = getDynamicSizeValue()
string bubbleText     = formatDynamicVolume(volume)
float stemOffset      = atrRef * 1.5
float orbLayerGap     = atrRef * 0.05

render3DOrbWithLabel(int barIdx, float yCenter, string txt, int baseSize, color themeColor, float offset, bool isBull) =>
    label.new(barIdx, yCenter - (offset * 1.5), style = label.style_circle, color = color.new(color.black, 80), size = baseSize + 2, yloc = yloc.price)
    label.new(barIdx, yCenter, style = label.style_circle, color = color.new(themeColor, 70), size = baseSize + 1, yloc = yloc.price)
    label.new(barIdx, yCenter, style = label.style_circle, color = color.new(themeColor, 15), size = baseSize, yloc = yloc.price)
    label.new(barIdx, yCenter + (offset * 0.5), style = label.style_circle, color = color.new(color.white, 85), size = int(baseSize * 0.7), yloc = yloc.price)
    label.new(barIdx, yCenter + offset, style = label.style_circle, color = color.new(color.white, 40), size = int(baseSize * 0.2), yloc = yloc.price)
    float labelY = isBull ? yCenter - (offset * 8.0) : yCenter + (offset * 8.0)
    label.new(barIdx, labelY, text = txt, style = isBull ? label.style_label_up : label.style_label_down, color = color.new(color.black, 40), textcolor = color.white, size = size.small, yloc = yloc.price)

if showBubbles and isBullRejection
    line.new(bar_index, low, bar_index, low - stemOffset, color = color.new(bullColInput, 60), style = line.style_dashed)
    render3DOrbWithLabel(bar_index, low - stemOffset, bubbleText, currentBubbleSize, bullColInput, orbLayerGap, true)
    lastBubbleBar := bar_index

if showBubbles and isBearRejection
    line.new(bar_index, high, bar_index, high + stemOffset, color = color.new(bearColInput, 60), style = line.style_dashed)
    render3DOrbWithLabel(bar_index, high + stemOffset, bubbleText, currentBubbleSize, bearColInput, orbLayerGap, false)
    lastBubbleBar := bar_index

plotchar(mlBullish, "Bull Glow", BAR_CHAR, location.bottom, bullGlow, size = size.large)
plotchar(not mlBullish, "Bear Glow", BAR_CHAR, location.top, bearGlow, size = size.large)
plot(st_val, "ML Supertrend", mlBullish ? color.new(bullColInput, 60) : color.new(bearColInput, 60), 2, plot.style_linebr)
barcolor(colorCandles ? (mlBullish ? candleBull : candleBear) : na, title = "Gradient Candles")

//---------------------------------------------------------------------------------------------------------------------}
// Dashboard Display
//---------------------------------------------------------------------------------------------------------------------{
var int barsSinceChange = 0
barsSinceChange := ta.change(mlBullish) ? 0 : barsSinceChange + 1

if showDashboard and barstate.islast
    var table t_able = table.new(parsedDashboardPosition, 2, 9, bgcolor = BACKGROUND, frame_color = BORDERS, frame_width = 1)
    
    t_able.merge_cells(0, 0, 1, 0)
    cell(t_able, 0, 0, "KNN Supertrend Horizon [LuxAlgo]", color = DATA, align = text.align_center)
    divider(t_able, 1, 1)

    cell(t_able, 0, 2, "Trend Direction", HEADERS, text.align_left)
    cell(t_able, 1, 2, mlBullish ? "Bullish" : "Bearish", mlBullish ? BULL_COLOR : BEAR_COLOR)

    cell(t_able, 0, 3, "ML Confidence", HEADERS, text.align_left)
    cell(t_able, 1, 3, str.tostring(smoothedProb, "#.#") + "%", DATA)

    divider(t_able, 4, 1)

    cell(t_able, 0, 5, "Bars In Trend", HEADERS, text.align_left)
    cell(t_able, 1, 5, str.tostring(barsSinceChange), DATA)

    cell(t_able, 0, 6, "ST Distance", HEADERS, text.align_left)
    float distPct = (math.abs(close - st_val) / close) * 100
    cell(t_able, 1, 6, str.tostring(distPct, "#.##") + "%", DATA)

    divider(t_able, 7, 1)

    cell(t_able, 0, 8, "Rel. Volatility", HEADERS, text.align_left)
    cell(t_able, 1, 8, str.tostring(f2, "#.##") + "%", DATA)

//---------------------------------------------------------------------------------------------------------------------}`
    },
    {
        id: 'ga-dynamic-liquidity-zones',
        name: 'Dynamic Liquidity Zones',
        description: 'Advanced liquidity detection system that identifies equal highs (EQH) and equal lows (EQL) with volume-weighted analysis. Features dynamic zone extension, sweep detection, and label consolidation.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
//@version=6
indicator("Dynamic Liquidity Zones", "Liquidity Zones", overlay = true, max_lines_count = 500, max_labels_count = 500, max_boxes_count = 500)

// --- Constants ---
const string G1 = "Liquidity Detection"
const string G2 = "Visuals"
const color BULL_COLOR = #089981
const color BEAR_COLOR = #f23645

// --- Inputs ---
int leftLenInput    = input.int(10, "Pivot Left Length", minval = 1, group = G1, tooltip = "Number of bars to the left required for a pivot.")
int rightLenInput   = input.int(2, "Pivot Right Length", minval = 1, group = G1, tooltip = "Number of bars to the right required for a pivot.")
float thresholdPct  = input.float(0.03, "Equality Threshold (%)", minval = 0, step = 0.01, group = G1, tooltip = "Maximum percentage difference to consider two highs/lows 'equal'.")
int maxZones        = input.int(60, "Max Active Zones", minval = 1, maxval = 100, group = G1, tooltip = "Maximum number of active (unswept) liquidity lines to track. Increase for 1m charts.")

color bullColor     = input.color(BULL_COLOR, "Bullish Zone Color", group = G2)
color bearColor     = input.color(BEAR_COLOR, "Bearish Zone Color", group = G2)
int zoneTransp      = input.int(85, "Zone Transparency", minval = 0, maxval = 100, group = G2)
bool showMidline    = input.bool(false, "Show Midline", group = G2)
color midlineColor  = input.color(#787b86, "Midline Color", group = G2)
bool showVolume     = input.bool(true, "Show Volume", group = G2)
bool deleteOnSweep  = input.bool(false, "Delete on Sweep", group = G2)

// --- Types ---
type LiquidityZone
    box   id
    line  midline
    label lbl
    label b1     
    label b2     
    label v1     
    label v2     
    float sweepLevel
    float totalVol 
    int   createdIdx 
    bool  isHigh
    bool  isSwept

type PivotPoint
    float price
    int   idx
    float vol

// --- Storage ---
var activeZones     = array.new<LiquidityZone>()
var historicalHighs = array.new<PivotPoint>()
var historicalLows  = array.new<PivotPoint>()

// --- Functions ---
f_formatVol(float v) =>
    string res = ""
    if v >= 1000000
        res := str.format("{0,number,#.#}M", v / 1000000)
    else if v >= 1000
        res := str.format("{0,number,#.#}K", v / 1000)
    else
        res := str.tostring(v, "#")
    res

method update(LiquidityZone zone, bool deleteOnSweep) =>
    bool shouldRemove = false
    if not zone.isSwept
        // Extend to current bar
        box.set_right(zone.id, bar_index)
        if not na(zone.midline)
            line.set_x2(zone.midline, bar_index)
        label.set_x(zone.lbl, bar_index)
        
        // Sweep check starts the bar AFTER confirmation to handle 1m volatility
        if bar_index > zone.createdIdx
            bool sweepOccurred = zone.isHigh ? high > zone.sweepLevel : low < zone.sweepLevel
            
            if sweepOccurred
                zone.isSwept := true
                shouldRemove := true
                if deleteOnSweep
                    box.delete(zone.id)
                    line.delete(zone.midline)
                    label.delete(zone.lbl)
                    label.delete(zone.b1)
                    label.delete(zone.b2)
                    label.delete(zone.v1)
                    label.delete(zone.v2)
                else
                    box.set_bgcolor(zone.id, color.new(chart.fg_color, 95))
                    box.set_border_color(zone.id, color.new(chart.fg_color, 80))
                    if not na(zone.midline)
                        line.set_color(zone.midline, color.new(chart.fg_color, 80))
                    
                    label.set_textcolor(zone.lbl, color.new(chart.fg_color, 75))
                    string volStr = showVolume ? str.format(" ({0})", f_formatVol(zone.totalVol)) : ""
                    label.set_text(zone.lbl, "Swept " + (zone.isHigh ? "EQH" : "EQL") + volStr)
                    
                    label.set_color(zone.b1, color.new(chart.fg_color, 85))
                    label.set_color(zone.b2, color.new(chart.fg_color, 85))
                    label.set_text(zone.v1, "")
                    label.set_text(zone.v2, "")
    
    shouldRemove

f_consolidateLabels(array<LiquidityZone> zones) =>
    int sz = zones.size()
    if sz > 0
        for i = 0 to sz - 1
            LiquidityZone z = zones.get(i)
            if not z.isSwept
                label.set_text(z.lbl, "")
        
        array<int> processed = array.new<int>()
        for i = 0 to sz - 1
            if processed.includes(i) or zones.get(i).isSwept
                continue
            
            LiquidityZone base = zones.get(i)
            processed.push(i)
            float clusterVol = base.totalVol
            int clusterCount = 1
            
            if i < sz - 1
                for j = i + 1 to sz - 1
                    if processed.includes(j)
                        continue
                    
                    LiquidityZone comp = zones.get(j)
                    if comp.isSwept
                        continue
                        
                    if base.isHigh == comp.isHigh and math.abs(base.sweepLevel - comp.sweepLevel) / base.sweepLevel * 100 <= thresholdPct * 3
                        clusterVol += comp.totalVol
                        clusterCount += 1
                        processed.push(j)
            
            string typeStr  = base.isHigh ? "EQH" : "EQL"
            string countStr = clusterCount > 1 ? str.format("{0}x ", clusterCount) : ""
            string volStr   = showVolume ? str.format(" ({0})", f_formatVol(clusterVol)) : ""
            label.set_text(base.lbl, countStr + typeStr + volStr)

// --- Detection Logic ---
float pH = ta.pivothigh(leftLenInput, rightLenInput)
float pL = ta.pivotlow(leftLenInput, rightLenInput)

// Handle Highs (EQH)
if not na(pH)
    int currentPivotIdx = bar_index - rightLenInput
    float currentVol = volume[rightLenInput]
    
    if historicalHighs.size() > 0
        for i = 0 to historicalHighs.size() - 1
            PivotPoint prev = historicalHighs.get(i)
            float diff = math.abs(pH - prev.price) / prev.price * 100
            
            if diff <= thresholdPct
                float top    = math.max(pH, prev.price)
                float bottom = math.min(pH, prev.price)
                float mid    = (top + bottom) / 2
                float totalVol = prev.vol + currentVol
                
                box b = box.new(prev.idx, top, bar_index, bottom, border_color = bearColor, bgcolor = color.new(bearColor, zoneTransp))
                line ml = showMidline ? line.new(prev.idx, mid, bar_index, mid, color = midlineColor, style = line.style_dashed) : na
                
                label lb = label.new(bar_index, mid, "", color = #00000000, textcolor = bearColor, style = label.style_label_left, size = size.small)
                label b1 = label.new(prev.idx, prev.price, "", color = bearColor, style = label.style_circle, size = size.small)
                label b2 = label.new(currentPivotIdx, pH, "", color = bearColor, style = label.style_circle, size = size.small)
                label v1 = showVolume ? label.new(prev.idx, prev.price, f_formatVol(prev.vol), color = #00000000, textcolor = bearColor, style = label.style_label_down, size = size.small) : na
                label v2 = showVolume ? label.new(currentPivotIdx, pH, f_formatVol(currentVol), color = #00000000, textcolor = bearColor, style = label.style_label_down, size = size.small) : na
                
                activeZones.push(LiquidityZone.new(b, ml, lb, b1, b2, v1, v2, top, totalVol, bar_index, true, false))
                break 
    
    historicalHighs.unshift(PivotPoint.new(pH, currentPivotIdx, currentVol))
    if historicalHighs.size() > 50
        historicalHighs.pop()

// Handle Lows (EQL)
if not na(pL)
    int currentPivotIdx = bar_index - rightLenInput
    float currentVol = volume[rightLenInput]
    
    if historicalLows.size() > 0
        for i = 0 to historicalLows.size() - 1
            PivotPoint prev = historicalLows.get(i)
            float diff = math.abs(pL - prev.price) / prev.price * 100
            
            if diff <= thresholdPct
                float top    = math.max(pL, prev.price)
                float bottom = math.min(pL, prev.price)
                float mid    = (top + bottom) / 2
                float totalVol = prev.vol + currentVol
                
                box b = box.new(prev.idx, top, bar_index, bottom, border_color = bullColor, bgcolor = color.new(bullColor, zoneTransp))
                line ml = showMidline ? line.new(prev.idx, mid, bar_index, mid, color = midlineColor, style = line.style_dashed) : na
                
                label lb = label.new(bar_index, mid, "", color = #00000000, textcolor = bullColor, style = label.style_label_left, size = size.small)
                label b1 = label.new(prev.idx, prev.price, "", color = bullColor, style = label.style_circle, size = size.small)
                label b2 = label.new(currentPivotIdx, pL, "", color = bullColor, style = label.style_circle, size = size.small)
                label v1 = showVolume ? label.new(prev.idx, prev.price, f_formatVol(prev.vol), color = #00000000, textcolor = bullColor, style = label.style_label_up, size = size.small) : na
                label v2 = showVolume ? label.new(currentPivotIdx, pL, f_formatVol(currentVol), color = #00000000, textcolor = bullColor, style = label.style_label_up, size = size.small) : na
                
                activeZones.push(LiquidityZone.new(b, ml, lb, b1, b2, v1, v2, bottom, totalVol, bar_index, false, false))
                break
    
    historicalLows.unshift(PivotPoint.new(pL, currentPivotIdx, currentVol))
    if historicalLows.size() > 50
        historicalLows.pop()

// --- Manage Active Zones ---
if activeZones.size() > 0
    // 1. Process active updates and identify swept zones
    for i = activeZones.size() - 1 to 0
        LiquidityZone zone = activeZones.get(i)
        bool swept = zone.update(deleteOnSweep)
        if swept
            activeZones.remove(i)
    
    // 2. Enforce limit by removing OLDEST zones only if still over capacity
    while activeZones.size() > maxZones
        activeZones.remove(0)
    
    // 3. Consolidate labels for remaining live zones
    if activeZones.size() > 0
        f_consolidateLabels(activeZones)`
    },
    {
        id: 'institutional-edge-toolkit',
        name: 'Institutional Edge Toolkit [CLEVER]',
        description: 'Advanced market structure and PD Array toolkit. Features BOS/MSS detection, Fair Value Gaps (FVG), Order Blocks (OB), Liquidity Sweeps (EQH/EQL), Inducement (IDM), and AMD (Accumulation, Manipulation, Distribution) sessions.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v6.0',
        code: `// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © theclevertrader2000

//@version=6
indicator('Institutional Edge Toolkit [CLEVER]', overlay = true, max_lines_count = 500, max_boxes_count = 500, max_labels_count = 500)

// --- Settings ---
group_structure = 'Market Structure'
group_arrays = 'PD Arrays (FVG/OB)'
length = input.int(5, 'Swing Lookback', group = group_structure)
showBOS = input.bool(true, 'Show BOS/MSS', group = group_structure)
bosBullColor = input.color(color.rgb(0, 248, 252), 'BOS/MSS Bullish Color', group = group_structure)
bosBearColor = input.color(color.rgb(139, 16, 240), 'BOS/MSS Bearish Color', group = group_structure)
showSwingPoints = input.bool(false, 'Show Swing Points', group = group_structure)
swingShape = input.string('Labels', 'Swing Point Shape', options = ['Labels', 'Circles', 'Triangles', 'Diamonds'], group = group_structure)
swingHighColor = input.color(color.rgb(172, 0, 252), 'Swing High Color', group = group_structure)
swingLowColor = input.color(color.rgb(0, 229, 250), 'Swing Low Color', group = group_structure)

showFVG = input.bool(true, 'Show FVG', group = group_arrays)
fvg_atr_mult = input.float(0.5, 'FVG Min Size (ATR)', minval = 0.1, step = 0.1, group = group_arrays)
showOB = input.bool(true, 'Show Order Blocks', group = group_arrays)
ob_atr_mult = input.float(2.0, 'OB Min Displacement (ATR)', minval = 0.1, step = 0.1, group = group_arrays, tooltip = 'Higher = Fewer, Stronger OBs')
ob_extend = input.int(10, 'Order Block Extension (Bars)', minval = 1, group = group_arrays)

fvgBullColor = input.color(color.new(#0ba6ed, 85), 'Bullish FVG', group = group_arrays)
fvgBearColor = input.color(color.new(#ad01fc, 85), 'Bearish FVG', group = group_arrays)
obBullColor = input.color(color.new(#00d6f7, 80), 'Bullish OB', group = group_arrays)
obBearColor = input.color(color.new(#ee00ff, 80), 'Bearish OB', group = group_arrays)

// --- Definitions ---
// Swing High/Low
ph = ta.pivothigh(high, length, length)
pl = ta.pivotlow(low, length, length)

// Variables to track structure
var float prevHigh = na
var float prevLow = na
var int prevHighIndex = na
var int prevLowIndex = na
var bool highBroken = true
var bool lowBroken = true

// Trend State: 1 = Bullish, -1 = Bearish
var int trend = 0

// helper for styles
get_shape_style(isHigh) =>
    switch swingShape
        'Labels' => isHigh ? label.style_none : label.style_none
        'Circles' => label.style_circle
        'Triangles' => isHigh ? label.style_triangledown : label.style_triangleup
        'Diamonds' => label.style_diamond
        => label.style_none

// --- Market Structure Logic ---
if not na(ph)
    // Draw Pivot
    if showSwingPoints
        sty = get_shape_style(true)
        txt = swingShape == 'Labels' ? 'PH' : ''
        label.new(bar_index[length], ph, txt, style = sty, color = swingHighColor, textcolor = swingHighColor, size = size.tiny)

    prevHigh := ph
    prevHighIndex := bar_index[length]
    highBroken := false // New high found, reset broken flag
    highBroken

if not na(pl)
    // New Swing Low found
    if showSwingPoints
        sty = get_shape_style(false)
        txt = swingShape == 'Labels' ? 'PL' : ''
        label.new(bar_index[length], pl, txt, style = sty, color = swingLowColor, textcolor = swingLowColor, size = size.tiny, yloc = yloc.belowbar)

    prevLow := pl
    prevLowIndex := bar_index[length]
    lowBroken := false // New low found, reset broken flag
    lowBroken

// Check breaks of structure on every bar close
// Bullish Break (BOS or MSS)
if not na(prevHigh) and not highBroken and close > prevHigh and ta.crossover(close, prevHigh)
    txt = trend == 1 ? 'BOS' : 'MSS'
    if showBOS
        line.new(prevHighIndex, prevHigh, bar_index, prevHigh, color = bosBullColor, style = line.style_dashed)
        mid_x = math.round(math.avg(prevHighIndex, bar_index))
        label.new(mid_x, prevHigh, txt, style = label.style_none, textcolor = bosBullColor, size = size.small)
    trend := 1 // Identified Upward Break
    highBroken := true // Mark as broken
    highBroken

// Bearish Break
if not na(prevLow) and not lowBroken and close < prevLow and ta.crossunder(close, prevLow)
    txt = trend == -1 ? 'BOS' : 'MSS'
    if showBOS
        line.new(prevLowIndex, prevLow, bar_index, prevLow, color = bosBearColor, style = line.style_dashed)
        mid_x = math.round(math.avg(prevLowIndex, bar_index))
        label.new(mid_x, prevLow, txt, style = label.style_none, textcolor = bosBearColor, size = size.small)
    trend := -1
    lowBroken := true // Mark as broken
    lowBroken

// --- Fair Value Gaps (FVG) ---
// Detection at close of bar.
isBullFVG = low > high[2] and close[1] > open[1]
isBearFVG = high < low[2] and close[1] < open[1]

// ATR for Filters (Moved Up)
atr_val = ta.atr(14)

// FVG Filter: Gap Size > ATR * mult
gapSizeBull = low - high[2]
gapSizeBear = low[2] - high
isValidBullFVG = isBullFVG and gapSizeBull > atr_val * fvg_atr_mult
isValidBearFVG = isBearFVG and gapSizeBear > atr_val * fvg_atr_mult

if showFVG
    if isValidBullFVG
        // Draw box covering the formation + small extension (5 bars)
        box.new(bar_index[2], high[2], bar_index + 5, low, border_color = color.new(color.green, 90), bgcolor = fvgBullColor, text = 'FVG', text_color = color.new(color.white, 20), text_size = size.tiny, text_halign = text.align_center, text_valign = text.align_center)

    if isValidBearFVG
        box.new(bar_index[2], low[2], bar_index + 5, high, border_color = color.new(color.red, 90), bgcolor = fvgBearColor, text = 'FVG', text_color = color.new(color.white, 20), text_size = size.tiny, text_halign = text.align_center, text_valign = text.align_center)

// --- Order Blocks (OB) ---
// Filter: Displacement candle body must be > ATR * multiplier
displacement_size = math.abs(close[1] - open[1])
isStrongDisplacement = displacement_size > atr_val * ob_atr_mult

if showOB and isStrongDisplacement
    if isBullFVG
        int obIndex = na
        for i = 2 to 5 by 1
            if close[i] < open[i] // Found a red candle
                obIndex := i
                break

        // Strict Check: Displacement (close[1]) must be above OB High
        if not na(obIndex) and close[1] > high[obIndex]
            box.new(bar_index[obIndex], high[obIndex], bar_index + ob_extend, low[obIndex], border_color = color.new(color.blue, 90), bgcolor = obBullColor, text = 'OB+', text_color = color.new(color.white, 50))

    if isBearFVG
        int obIndex = na
        for i = 2 to 5 by 1
            if close[i] > open[i] // Found a green candle
                obIndex := i
                break

        // Strict Check: Displacement (close[1]) must be below OB Low
        if not na(obIndex) and close[1] < low[obIndex]
            box.new(bar_index[obIndex], high[obIndex], bar_index + ob_extend, low[obIndex], border_color = color.new(color.orange, 90), bgcolor = obBearColor, text = 'OB-', text_color = color.new(color.white, 50))

// --- Equal Highs/Lows (EQH/EQL) ---
if not na(ph) and not na(prevHigh) and math.abs(ph - prevHigh) < high * 0.001
    label.new(bar_index[length], ph, 'EQH', style = label.style_triangledown, color = swingHighColor, size = size.tiny)

if not na(pl) and not na(prevLow) and math.abs(pl - prevLow) < low * 0.001
    label.new(bar_index[length], pl, 'EQL', style = label.style_triangleup, color = swingLowColor, size = size.tiny, yloc = yloc.belowbar)

// --- Inducement (IDM) ---
group_idm = 'Inducement'
showIDM = input.bool(true, 'Show Inducement (IDM)', group = group_idm)
idmColor = input.color(color.orange, 'IDM Color', group = group_idm)

// Track if IDM found in current leg
var bool idmFound = false

// Reset IDM on Trend Change (BOS/MSS)
// We need to capture the MOMENT trend changes.
// The variables 'highBroken' and 'lowBroken' are set to true upon BOS.
// We can use the 'chart state' of 'trend' changing as the trigger.
bool trendChanged = trend != trend[1]
if trendChanged
    idmFound := false
    idmFound

// Check for IDM formation
if showIDM and not idmFound
    if trend == 1 // Bullish Trend -> Look for first Swing Low (Pullback)
        if not na(pl) // IDM Found
            label.new(bar_index[length], pl, 'IDM', style = label.style_label_up, color = color.new(idmColor, 100), textcolor = idmColor, size = size.small, yloc = yloc.belowbar)
            idmFound := true
            idmFound

    if trend == -1 // Bearish Trend -> Look for first Swing High (Pullback)
        if not na(ph) // IDM Found
            label.new(bar_index[length], ph, 'IDM', style = label.style_label_down, color = color.new(idmColor, 100), textcolor = idmColor, size = size.small)
            idmFound := true
            idmFound

// --- AMD (Accumulation, Manipulation, Distribution) ---
group_amd = 'AMD Strategy'
showAMD = input.bool(true, 'Show AMD Sessions', group = group_amd)
// Default to NYC Midnight Open / Asian Range (e.g., 18:00 - 00:00 EST)
amd_sess_time = input.session('1800-0000', 'Accumulation Time (NY)', group = group_amd)
amd_col_acc = input.color(color.new(color.gray, 85), 'Accumulation Color', group = group_amd)
amd_col_man = input.color(color.new(color.purple, 80), 'Manipulation Color', group = group_amd)
amd_col_dist = input.color(color.new(color.blue, 80), 'Distribution Color', group = group_amd)

// Check if we are in the accumulation session
bool in_amd_sess = not na(time(timeframe.period, amd_sess_time))

// Track High/Low of the session
var float amd_high = na
var float amd_low = na
var int amd_start_idx = na

if in_amd_sess
    if not in_amd_sess[1] // Start of session
        amd_high := high
        amd_low := low
        amd_start_idx := bar_index
        amd_start_idx
    else
        amd_high := math.max(amd_high, high)
        amd_low := math.min(amd_low, low)
        amd_low

// At end of session (first bar OUT of session), draw the box
if not in_amd_sess and in_amd_sess[1] and showAMD
    // Accumulation Phase Box
    box.new(amd_start_idx, amd_high, bar_index, amd_low, border_color = color.gray, bgcolor = amd_col_acc, text = 'Accumulation', text_color = color.gray, text_size = size.tiny, text_halign = text.align_center, text_valign = text.align_bottom)

// Manipulation / Distribution Logic (Zone)
var box manip_box_bull = na
var box manip_box_bear = na
var box dist_box_bull = na // Distribution after Bearish Manipulation
var box dist_box_bear = na // Distribution after Bullish Manipulation

// Reset boxes at start of new session
if in_amd_sess and not in_amd_sess[1]
    manip_box_bull := na
    manip_box_bear := na
    dist_box_bull := na
    dist_box_bear := na
    dist_box_bear

// Check for breakout AFTER session
if not in_amd_sess and not na(amd_high)
    // --- Bullish Manipulation (Breakout ABOVE Acc High) ---
    if high > amd_high
        if na(manip_box_bull)
            // Start detection: Draw box from Acc High to High
            manip_box_bull := box.new(bar_index, amd_high, bar_index, high, border_color = amd_col_man, bgcolor = amd_col_man, text = 'Manipulation', text_color = color.white, text_size = size.tiny)
            manip_box_bull
        else // Update existing box
            float top = box.get_top(manip_box_bull)
            if high > top
                box.set_top(manip_box_bull, high)
            box.set_right(manip_box_bull, bar_index)

    // Check for Bearish Distribution (After Bullish Manipulation, price breaks BELOW Acc Low)
    if not na(manip_box_bull) and low < amd_low
        if na(dist_box_bear)
            dist_box_bear := box.new(bar_index, amd_low, bar_index, low, border_color = amd_col_dist, bgcolor = amd_col_dist, text = 'Distribution', text_color = color.white, text_size = size.tiny, text_valign = text.align_bottom)
            dist_box_bear
        else
            float bot = box.get_bottom(dist_box_bear)
            if low < bot
                box.set_bottom(dist_box_bear, low)
            box.set_right(dist_box_bear, bar_index)

    // --- Bearish Manipulation (Breakout BELOW Acc Low) ---
    if low < amd_low
        if na(manip_box_bear)
            manip_box_bear := box.new(bar_index, amd_low, bar_index, low, border_color = amd_col_man, bgcolor = amd_col_man, text = 'Manipulation', text_color = color.white, text_size = size.tiny, text_valign = text.align_bottom)
            manip_box_bear
        else // Update existing box
            float bot = box.get_bottom(manip_box_bear)
            if low < bot
                box.set_bottom(manip_box_bear, low)
            box.set_right(manip_box_bear, bar_index)

    // Check for Bullish Distribution (After Bearish Manipulation, price breaks ABOVE Acc High)
    if not na(manip_box_bear) and high > amd_high
        if na(dist_box_bull)
            dist_box_bull := box.new(bar_index, amd_high, bar_index, high, border_color = amd_col_dist, bgcolor = amd_col_dist, text = 'Distribution', text_color = color.white, text_size = size.tiny)
            dist_box_bull
        else
            float top = box.get_top(dist_box_bull)
            if high > top
                box.set_top(dist_box_bull, high)
            box.set_right(dist_box_bull, bar_index)
`
    },
    {
        id: 'volume-profile-heatmap-keyalgos',
        name: 'Volume Profile Heatmap [KEYALGOS]',
        description: 'Advanced volume profile visualization that creates a heatmap of trading activity. Features customizable value areas, bullish/bearish volume filtering, and dynamic color gradients to highlight high liquidity zones.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v6.0',
        code: `//@version=6
indicator('Volume Profile Heatmap [KEYALGOS]', overlay=true, max_bars_back=500)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// INPUTS
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

grp_calc = 'Calculation Settings'
lookback = input.int(100, minval=10, maxval=300, title='Lookback Period', group=grp_calc, 
     tooltip='Number of bars to calculate Volume Profile.')
num_rows = input.int(24, minval=10, maxval=24, title='Profile Rows (Max 24)', group=grp_calc,
     tooltip='Pine Script limit: 64 plots max. This script uses 25 plots for levels + 5 reference = 30. DO NOT EXCEED 24.')
va_percent = input.int(68, minval=5, maxval=95, title='Value Area %', group=grp_calc)
volume_type = input.string('Both', title='Volume Type', options=['Both', 'Bullish', 'Bearish'], group=grp_calc)

grp_col = 'Color Settings'
color_high_vol = input.color(color.new(#FF0000, 60), title='High Volume Color', group=grp_col)  // Red @ 40% opacity
color_low_vol = input.color(color.new(#FFFFE0, 90), title='Low Volume Color', group=grp_col)   // Light Yellow @ 10% opacity
color_poc = input.color(color.orange, title='POC Line', group=grp_col)
color_vah = input.color(color.blue, title='VAH/VAL Lines', group=grp_col)
color_extreme = input.color(color.gray, title='Extreme Lines', group=grp_col)

show_poc = input.bool(true, title='Show POC')
show_va_lines = input.bool(true, title='Show Value Area Lines')
show_extremes = input.bool(true, title='Show Profile Extremes')

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// CALCULATIONS
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

float profile_high = ta.highest(lookback)
float profile_low = ta.lowest(lookback)
float price_range = profile_high - profile_low

float[] volumes = array.new_float(num_rows, 0.0)
float row_height = price_range > 0 ? price_range / num_rows : 0.0

if price_range > 0
    // Reset volumes
    for r = 0 to num_rows - 1
        array.set(volumes, r, 0.0)
    
    // Build histogram
    for i = 0 to lookback - 1
        bool is_bullish = close[i] >= open[i]
        bool include_vol = volume_type == 'Both' ? true : (volume_type == 'Bullish' ? is_bullish : not is_bullish)
        
        if include_vol and volume[i] > 0
            int start_row = int(math.floor((low[i] - profile_low) / row_height))
            int end_row = int(math.ceil((high[i] - profile_low) / row_height))
            start_row := math.max(0, start_row)
            end_row := math.min(num_rows - 1, end_row)
            
            float vol_per_row = volume[i] / (end_row - start_row + 1)
            for j = start_row to end_row
                array.set(volumes, j, array.get(volumes, j) + vol_per_row)

// Find POC and VA
float max_vol = array.max(volumes)
int poc_idx = array.indexof(volumes, max_vol)
float poc_level = profile_low + poc_idx * row_height

float total_vol = array.sum(volumes)
float target_vol = total_vol * va_percent / 100.0
int va_up = poc_idx
int va_down = poc_idx
float acc_vol = max_vol

while acc_vol < target_vol and (va_up < num_rows - 1 or va_down > 0)
    float v_up = va_up < num_rows - 1 ? array.get(volumes, va_up + 1) : 0.0
    float v_down = va_down > 0 ? array.get(volumes, va_down - 1) : 0.0
    if v_up >= v_down
        va_up += 1
        acc_vol += v_up
    else
        va_down -= 1
        acc_vol += v_down

float vah_level = profile_low + va_up * row_height
float val_level = profile_low + va_down * row_height

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// HEATMAP - 24 BANDS MAX (Pine Script 64 plot limit)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Helper to get color for specific row based on volume intensity
getRowColor(idx) =>
    if idx >= num_rows
        color.new(color.gray, 100)
    else
        float vol = array.get(volumes, idx)
        float ratio = max_vol > 0 ? vol / max_vol : 0.0
        color.from_gradient(ratio, 0.0, 1.0, color_low_vol, color_high_vol)

// Calculate level prices
float l0 = profile_low + 0 * row_height
float l1 = profile_low + 1 * row_height
float l2 = profile_low + 2 * row_height
float l3 = profile_low + 3 * row_height
float l4 = profile_low + 4 * row_height
float l5 = profile_low + 5 * row_height
float l6 = profile_low + 6 * row_height
float l7 = profile_low + 7 * row_height
float l8 = profile_low + 8 * row_height
float l9 = profile_low + 9 * row_height
float l10 = profile_low + 10 * row_height
float l11 = profile_low + 11 * row_height
float l12 = profile_low + 12 * row_height
float l13 = profile_low + 13 * row_height
float l14 = profile_low + 14 * row_height
float l15 = profile_low + 15 * row_height
float l16 = profile_low + 16 * row_height
float l17 = profile_low + 17 * row_height
float l18 = profile_low + 18 * row_height
float l19 = profile_low + 19 * row_height
float l20 = profile_low + 20 * row_height
float l21 = profile_low + 21 * row_height
float l22 = profile_low + 22 * row_height
float l23 = profile_low + 23 * row_height
float l24 = profile_low + 24 * row_height

// Declare all level plots (must be constant references)
p0 = plot(l0, '', color=color.new(color.gray, 100), editable=false)
p1 = plot(l1, '', color=color.new(color.gray, 100), editable=false)
p2 = plot(l2, '', color=color.new(color.gray, 100), editable=false)
p3 = plot(l3, '', color=color.new(color.gray, 100), editable=false)
p4 = plot(l4, '', color=color.new(color.gray, 100), editable=false)
p5 = plot(l5, '', color=color.new(color.gray, 100), editable=false)
p6 = plot(l6, '', color=color.new(color.gray, 100), editable=false)
p7 = plot(l7, '', color=color.new(color.gray, 100), editable=false)
p8 = plot(l8, '', color=color.new(color.gray, 100), editable=false)
p9 = plot(l9, '', color=color.new(color.gray, 100), editable=false)
p10 = plot(l10, '', color=color.new(color.gray, 100), editable=false)
p11 = plot(l11, '', color=color.new(color.gray, 100), editable=false)
p12 = plot(l12, '', color=color.new(color.gray, 100), editable=false)
p13 = plot(l13, '', color=color.new(color.gray, 100), editable=false)
p14 = plot(l14, '', color=color.new(color.gray, 100), editable=false)
p15 = plot(l15, '', color=color.new(color.gray, 100), editable=false)
p16 = plot(l16, '', color=color.new(color.gray, 100), editable=false)
p17 = plot(l17, '', color=color.new(color.gray, 100), editable=false)
p18 = plot(l18, '', color=color.new(color.gray, 100), editable=false)
p19 = plot(l19, '', color=color.new(color.gray, 100), editable=false)
p20 = plot(l20, '', color=color.new(color.gray, 100), editable=false)
p21 = plot(l21, '', color=color.new(color.gray, 100), editable=false)
p22 = plot(l22, '', color=color.new(color.gray, 100), editable=false)
p23 = plot(l23, '', color=color.new(color.gray, 100), editable=false)
p24 = plot(l24, '', color=color.new(color.gray, 100), editable=false)

// Fill each band with volume-derived color (heatmap effect)
fill(p0, p1, color=getRowColor(0), title='Band 0')
fill(p1, p2, color=getRowColor(1), title='Band 1')
fill(p2, p3, color=getRowColor(2), title='Band 2')
fill(p3, p4, color=getRowColor(3), title='Band 3')
fill(p4, p5, color=getRowColor(4), title='Band 4')
fill(p5, p6, color=getRowColor(5), title='Band 5')
fill(p6, p7, color=getRowColor(6), title='Band 6')
fill(p7, p8, color=getRowColor(7), title='Band 7')
fill(p8, p9, color=getRowColor(8), title='Band 8')
fill(p9, p10, color=getRowColor(9), title='Band 9')
fill(p10, p11, color=getRowColor(10), title='Band 10')
fill(p11, p12, color=getRowColor(11), title='Band 11')
fill(p12, p13, color=getRowColor(12), title='Band 12')
fill(p13, p14, color=getRowColor(13), title='Band 13')
fill(p14, p15, color=getRowColor(14), title='Band 14')
fill(p15, p16, color=getRowColor(15), title='Band 15')
fill(p16, p17, color=getRowColor(16), title='Band 16')
fill(p17, p18, color=getRowColor(17), title='Band 17')
fill(p18, p19, color=getRowColor(18), title='Band 18')
fill(p19, p20, color=getRowColor(19), title='Band 19')
fill(p20, p21, color=getRowColor(20), title='Band 20')
fill(p21, p22, color=getRowColor(21), title='Band 21')
fill(p22, p23, color=getRowColor(22), title='Band 22')
fill(p23, p24, color=getRowColor(23), title='Band 23')

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// REFERENCE LINES
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

plot(show_poc ? poc_level : na, 'POC', color=color_poc, linewidth=2)
plot(show_va_lines ? vah_level : na, 'VAH', color=color_vah, linewidth=1)
plot(show_va_lines ? val_level : na, 'VAL', color=color_vah, linewidth=1)
plot(show_extremes ? profile_high : na, 'High', color=color_extreme, linewidth=1, style=plot.style_linebr)
plot(show_extremes ? profile_low : na, 'Low', color=color_extreme, linewidth=1, style=plot.style_linebr)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// END
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////`
    },
    {
        id: 'ga-confluence-order-blocks',
        name: 'GreyAlpha Confluence Order Blocks',
        description: 'Identifies and merges Order Blocks across multiple timeframes with strength rating and session context. [GREYALPHA]',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `//@version=6

indicator("Confluence Order Blocks", overlay=true, max_boxes_count=50, max_labels_count=50)

// ═══════════════════════════════════════════════════════════════════════════════
// INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

use_normalized_zones = input.bool(true,  "Normalize All Zone Heights",   group="Universal Zone Settings")
zone_height_method   = input.string("ATR Based", "Zone Height Method",   group="Universal Zone Settings", options=["ATR Based","Fixed Percentage"])
zone_height_atr_mult = input.float(0.75, "Zone Height (ATR Multiplier)", group="Universal Zone Settings", minval=0.1, maxval=3.0,  step=0.05)
zone_height_percent  = input.float(0.3,  "Zone Height (% of Price)",     group="Universal Zone Settings", minval=0.05, maxval=2.0, step=0.05)

swing_length      = input.int(7,    "Swing Detection Length",  group="Order Block Detection", minval=3, maxval=20)
lookback          = input.int(20,   "Order Block Lookback",    group="Order Block Detection", minval=5, maxval=50)
displacement_mult = input.float(1.3,"Displacement Multiplier", group="Order Block Detection", minval=0.5, maxval=5.0, step=0.1)
max_obs           = input.int(5,    "Max Order Blocks",        group="Order Block Detection", minval=1, maxval=10)

tf1            = input.timeframe("5", "Timeframe 1", group="Multi-Timeframe Confluence")
tf2            = input.timeframe("10", "Timeframe 2", group="Multi-Timeframe Confluence")
tf3            = input.timeframe("15", "Timeframe 3", group="Multi-Timeframe Confluence")
min_confluence = input.int(2, "Minimum Timeframe Confluence", group="Multi-Timeframe Confluence", minval=2, maxval=3)
proximity_atr_mult = input.float(5.0, "Proximity Tolerance (x ATR14)", group="Multi-Timeframe Confluence", minval=0.5, maxval=10.0, step=0.5)

enable_strength_rating = input.bool(true,  "Enable Strength Rating",  group="Strength Rating")
min_strength_filter    = input.float(0.0,  "Minimum Strength Filter", group="Strength Rating", minval=0.0, maxval=10.0, step=0.5)

show_bullish = input.bool(true, "Show Bullish OBs", inline="bull", group="Visualization")
bull_color   = input.color(color.new(color.green, 85), "",       inline="bull", group="Visualization")
bull_border  = input.color(color.new(color.green, 30), "Border", inline="bull", group="Visualization")

show_bearish = input.bool(true, "Show Bearish OBs", inline="bear", group="Visualization")
bear_color   = input.color(color.new(color.red, 85), "",       inline="bear", group="Visualization")
bear_border  = input.color(color.new(color.red, 30), "Border", inline="bear", group="Visualization")

show_labels    = input.bool(true, "Show Labels",               group="Visualization")
show_info      = input.bool(true, "Show Extended Info Labels", group="Extended Info Labels")
info_text_size = input.string("Large", "Info Text Size",       group="Extended Info Labels", options=["Tiny","Small","Normal","Large","Huge"])

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

get_text_size() =>
    switch info_text_size
        "Tiny"   => size.tiny
        "Small"  => size.small
        "Normal" => size.normal
        "Large"  => size.large
        "Huge"   => size.huge
        =>          size.large

calc_pips(price_diff) =>
    is_gold   = str.contains(syminfo.ticker, "XAU") or str.contains(syminfo.ticker, "GOLD")
    pip_value = is_gold ? 0.01 : syminfo.mintick * 10
    math.round(price_diff / pip_value)

normalize_zone(original_top, original_bottom, atr_val) =>
    if use_normalized_zones
        target_height = zone_height_method == "ATR Based" ? atr_val * zone_height_atr_mult : close * (zone_height_percent / 100.0)
        original_mid  = (original_top + original_bottom) / 2.0
        [original_mid + target_height / 2.0, original_mid - target_height / 2.0]
    else
        [original_top, original_bottom]

get_session(bar_time) =>
    t = hour(bar_time, "GMT") * 60 + minute(bar_time, "GMT")
    string s = "Other"
    if t >= 480 and t < 1020
        s := "London"
    else if t >= 780 and t < 1320
        s := "NY"
    else if t >= 0 and t < 540
        s := "Asian"
    s

session_int(s) =>
    s == "London" ? 1 : s == "NY" ? 2 : s == "Asian" ? 3 : 0

session_str(i) =>
    i == 1 ? "London" : i == 2 ? "NY" : i == 3 ? "Asian" : "Other"

calculate_ob_strength(displacement, zone_height, session_name, atr_val) =>
    if not enable_strength_rating
        5.0
    else
        disp_score = 0.0
        if atr_val > 0
            r = displacement / atr_val
            disp_score := r >= 3.0 ? 3.0 : r >= 2.0 ? 2.5 : r >= 1.5 ? 2.0 : r >= 1.0 ? 1.5 : 1.0
        else
            disp_score := 1.0

        sess_score = session_name == "London" or session_name == "NY" ? 2.0 : session_name == "Asian" ? 1.0 : 0.5

        zone_score = 0.0
        if atr_val > 0
            zr = zone_height / atr_val
            zone_score := zr >= 0.5 and zr <= 2.0 ? 3.0 : zr >= 0.3 and zr <= 3.0 ? 2.0 : 1.0
        else
            zone_score := 1.5

        math.min(math.max(disp_score + sess_score + 2.0 + zone_score, 0.0), 10.0)

// ═══════════════════════════════════════════════════════════════════════════════
// STATELESS HTF DETECTION
// Returns the newest OB on the current HTF bar. NO VAR STATE.
// ═══════════════════════════════════════════════════════════════════════════════

detect_htf_bull() =>
    float ob_top = na
    float ob_bot = na
    float ob_str = 0.0
    int   ob_ses = 0

    swing_low_val = ta.pivotlow(low, swing_length, swing_length)
    if not na(swing_low_val)
        bool found = false
        for i = swing_length + 1 to swing_length + lookback
            if not found
                if close[i] < open[i]
                    rng  = high[i] - low[i]
                    disp = swing_low_val - low[i]
                    if rng > 0 and disp > rng * displacement_mult
                        ob_top  := high[i]
                        ob_bot  := low[i]
                        sess    = get_session(time[i])
                        ob_ses  := session_int(sess)
                        ob_str  := calculate_ob_strength(close - ob_bot, ob_top - ob_bot, sess, ta.atr(14))
                        found   := true

    [ob_top, ob_bot, ob_str, ob_ses]

detect_htf_bear() =>
    float ob_top = na
    float ob_bot = na
    float ob_str = 0.0
    int   ob_ses = 0

    swing_high_val = ta.pivothigh(high, swing_length, swing_length)
    if not na(swing_high_val)
        bool found = false
        for i = swing_length + 1 to swing_length + lookback
            if not found
                if close[i] > open[i]
                    rng  = high[i] - low[i]
                    disp = high[i] - swing_high_val
                    if rng > 0 and disp > rng * displacement_mult
                        ob_top  := high[i]
                        ob_bot  := low[i]
                        sess    = get_session(time[i])
                        ob_ses  := session_int(sess)
                        ob_str  := calculate_ob_strength(ob_top - close, ob_top - ob_bot, sess, ta.atr(14))
                        found   := true

    [ob_top, ob_bot, ob_str, ob_ses]

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST.SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

[b_t1, b_b1, b_s1, b_e1] = request.security(syminfo.tickerid, tf1, detect_htf_bull(), lookahead=barmerge.lookahead_off)
[b_t2, b_b2, b_s2, b_e2] = request.security(syminfo.tickerid, tf2, detect_htf_bull(), lookahead=barmerge.lookahead_off)
[b_t3, b_b3, b_s3, b_e3] = request.security(syminfo.tickerid, tf3, detect_htf_bull(), lookahead=barmerge.lookahead_off)

[r_t1, r_b1, r_s1, r_e1] = request.security(syminfo.tickerid, tf1, detect_htf_bear(), lookahead=barmerge.lookahead_off)
[r_t2, r_b2, r_s2, r_e2] = request.security(syminfo.tickerid, tf2, detect_htf_bear(), lookahead=barmerge.lookahead_off)
[r_t3, r_b3, r_s3, r_e3] = request.security(syminfo.tickerid, tf3, detect_htf_bear(), lookahead=barmerge.lookahead_off)

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL VAR PERSISTENCE (Maintains state independently of chart TF)
// ═══════════════════════════════════════════════════════════════════════════════

var float bull_top1 = na, var float bull_bot1 = na, var float bull_str1 = 0.0, var int bull_ses1 = 0
var float bull_top2 = na, var float bull_bot2 = na, var float bull_str2 = 0.0, var int bull_ses2 = 0
var float bull_top3 = na, var float bull_bot3 = na, var float bull_str3 = 0.0, var int bull_ses3 = 0

var float bear_top1 = na, var float bear_bot1 = na, var float bear_str1 = 0.0, var int bear_ses1 = 0
var float bear_top2 = na, var float bear_bot2 = na, var float bear_str2 = 0.0, var int bear_ses2 = 0
var float bear_top3 = na, var float bear_bot3 = na, var float bear_str3 = 0.0, var int bear_ses3 = 0

// Update state when new HTF zones arrive
if not na(b_t1)
    bull_top1 := b_t1, bull_bot1 := b_b1, bull_str1 := b_s1, bull_ses1 := b_e1
if not na(b_t2)
    bull_top2 := b_t2, bull_bot2 := b_b2, bull_str2 := b_s2, bull_ses2 := b_e2
if not na(b_t3)
    bull_top3 := b_t3, bull_bot3 := b_b3, bull_str3 := b_s3, bull_ses3 := b_e3

if not na(r_t1)
    bear_top1 := r_t1, bear_bot1 := r_b1, bear_str1 := r_s1, bear_ses1 := r_e1
if not na(r_t2)
    bear_top2 := r_t2, bear_bot2 := r_b2, bear_str2 := r_s2, bear_ses2 := r_e2
if not na(r_t3)
    bear_top3 := r_t3, bear_bot3 := r_b3, bear_str3 := r_s3, bear_ses3 := r_e3

// Mitigate state
if not na(bull_bot1) and close < bull_bot1
    bull_top1 := na, bull_bot1 := na
if not na(bull_bot2) and close < bull_bot2
    bull_top2 := na, bull_bot2 := na
if not na(bull_bot3) and close < bull_bot3
    bull_top3 := na, bull_bot3 := na

if not na(bear_top1) and close > bear_top1
    bear_top1 := na, bear_bot1 := na
if not na(bear_top2) and close > bear_top2
    bear_top2 := na, bear_bot2 := na
if not na(bear_top3) and close > bear_top3
    bear_top3 := na, bear_bot3 := na

// ═══════════════════════════════════════════════════════════════════════════════
// PROXIMITY-BASED CONFLUENCE CHECK
// ═══════════════════════════════════════════════════════════════════════════════

zones_confluent(top_a, bot_a, top_b, bot_b, atr_val) =>
    valid = not na(top_a) and not na(bot_a) and not na(top_b) and not na(bot_b)
    if valid
        mid_a     = (top_a + bot_a) / 2.0
        mid_b     = (top_b + bot_b) / 2.0
        tolerance = atr_val * proximity_atr_mult
        math.abs(mid_a - mid_b) <= tolerance
    else
        false

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITION & ARRAYS
// ═══════════════════════════════════════════════════════════════════════════════

type OB
    box    b
    label  l
    label  info_label
    float  top
    float  bot
    int    bar_idx
    bool   bullish
    string session
    int    creation_time
    float  strength
    int    confluence_count

var array<OB> bull_obs = array.new<OB>()
var array<OB> bear_obs = array.new<OB>()

atr_value = ta.atr(14)

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

is_mitigated(ob) =>
    result = false
    if barstate.isconfirmed
        result := ob.bullish ? close < ob.bot : close > ob.top
    result

clean_obs(obs) =>
    if array.size(obs) > 0
        for i = array.size(obs) - 1 to 0
            if i < array.size(obs)
                ob = array.get(obs, i)
                if is_mitigated(ob)
                    box.delete(ob.b)
                    if not na(ob.l)
                        label.delete(ob.l)
                    if not na(ob.info_label)
                        label.delete(ob.info_label)
                    array.remove(obs, i)

limit_size(obs, max_size) =>
    while array.size(obs) > max_size
        old = array.shift(obs)
        box.delete(old.b)
        if not na(old.l)
            label.delete(old.l)
        if not na(old.info_label)
            label.delete(old.info_label)

update_boxes(obs) =>
    if array.size(obs) > 0
        for i = 0 to array.size(obs) - 1
            ob = array.get(obs, i)
            box.set_right(ob.b, bar_index + 20)
            if show_info and not na(ob.info_label)
                age           = bar_index - ob.creation_time
                pips          = calc_pips(ob.top - ob.bot)
                distance_pips = calc_pips(math.abs(close - (ob.top + ob.bot) / 2.0))
                zone_type     = ob.bullish ? "Merged Bullish OB" : "Merged Bearish OB"
                info_text     = zone_type + " ||| " + str.tostring(ob.confluence_count) + " timeframes ||| Strength: " + str.tostring(math.round(ob.strength * 10) / 10) + "/10 ||| " + ob.session + " ||| Age: " + str.tostring(age) + " bars ||| " + str.tostring(pips) + " pips ||| " + str.tostring(distance_pips) + " pips away"
                label.set_text(ob.info_label, info_text)
                mid_price = (ob.top + ob.bot) / 2.0
                label.set_xy(ob.info_label, bar_index + 25, mid_price)
                label.set_style(ob.info_label, label.style_label_left)
                label.set_textalign(ob.info_label, text.align_left)

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLUENCE MERGE & DRAWING
// ═══════════════════════════════════════════════════════════════════════════════

if barstate.isconfirmed

    // ─── BULLISH ──────────────────────────────────────────────────────────────
    if show_bullish

        float m_top = na
        float m_bot = na
        float m_str = 0.0
        int   m_ses = 0
        int   m_cnt = 0

        if not na(bull_top1)
            m_top := bull_top1
            m_bot := bull_bot1
            m_str := bull_str1
            m_ses := bull_ses1
            m_cnt := 1

        if not na(bull_top2)
            if na(m_top)
                m_top := bull_top2
                m_bot := bull_bot2
                m_str := bull_str2
                m_ses := bull_ses2
                m_cnt := 1
            else if zones_confluent(m_top, m_bot, bull_top2, bull_bot2, atr_value)
                m_top := math.max(m_top, bull_top2)
                m_bot := math.min(m_bot, bull_bot2)
                m_str := math.max(m_str, bull_str2)
                m_cnt += 1

        if not na(bull_top3)
            if na(m_top)
                m_top := bull_top3
                m_bot := bull_bot3
                m_str := bull_str3
                m_ses := bull_ses3
                m_cnt := 1
            else if zones_confluent(m_top, m_bot, bull_top3, bull_bot3, atr_value)
                m_top := math.max(m_top, bull_top3)
                m_bot := math.min(m_bot, bull_bot3)
                m_str := math.max(m_str, bull_str3)
                m_cnt += 1

        if m_cnt >= min_confluence and not na(m_top) and m_str >= min_strength_filter

            bool already_exists = false
            if array.size(bull_obs) > 0
                for k = 0 to array.size(bull_obs) - 1
                    existing = array.get(bull_obs, k)
                    ex_mid   = (existing.top + existing.bot) / 2.0
                    new_mid  = (m_top + m_bot) / 2.0
                    if math.abs(ex_mid - new_mid) < atr_value * 0.5
                        already_exists := true

            if not already_exists
                ob_session = session_str(m_ses)
                [norm_top, norm_bot] = normalize_zone(m_top, m_bot, atr_value)

                b = box.new(bar_index, norm_top, bar_index + 20, norm_bot,
                     border_color=bull_border, bgcolor=bull_color, border_width=2, extend=extend.right)

                label l = na
                if show_labels
                    l := label.new(bar_index, norm_bot, "Bull OB",
                         color=color.new(color.green, 20), textcolor=color.white,
                         style=label.style_label_up, size=size.small)

                label info_l = na
                if show_info
                    pips          = calc_pips(norm_top - norm_bot)
                    distance_pips = calc_pips(math.abs(close - (norm_top + norm_bot) / 2.0))
                    info_text     = "Merged Bullish OB ||| " + str.tostring(m_cnt) + " timeframes ||| Strength: " + str.tostring(math.round(m_str * 10) / 10) + "/10 ||| " + ob_session + " ||| Age: 0 bars ||| " + str.tostring(pips) + " pips ||| " + str.tostring(distance_pips) + " pips away"
                    mid_price     = (norm_top + norm_bot) / 2.0
                    info_l := label.new(bar_index + 25, mid_price, info_text,
                         color=color.new(color.green, 100), textcolor=color.new(color.green, 0),
                         style=label.style_label_left, size=get_text_size(), textalign=text.align_left)

                array.push(bull_obs, OB.new(b, l, info_l, norm_top, norm_bot, bar_index, true, ob_session, bar_index, m_str, m_cnt))

    // ─── BEARISH ──────────────────────────────────────────────────────────────
    if show_bearish

        float m_top = na
        float m_bot = na
        float m_str = 0.0
        int   m_ses = 0
        int   m_cnt = 0

        if not na(bear_top1)
            m_top := bear_top1
            m_bot := bear_bot1
            m_str := bear_str1
            m_ses := bear_ses1
            m_cnt := 1

        if not na(bear_top2)
            if na(m_top)
                m_top := bear_top2
                m_bot := bear_bot2
                m_str := bear_str2
                m_ses := bear_ses2
                m_cnt := 1
            else if zones_confluent(m_top, m_bot, bear_top2, bear_bot2, atr_value)
                m_top := math.max(m_top, bear_top2)
                m_bot := math.min(m_bot, bear_bot2)
                m_str := math.max(m_str, bear_str2)
                m_cnt += 1

        if not na(bear_top3)
            if na(m_top)
                m_top := bear_top3
                m_bot := bear_bot3
                m_str := bear_str3
                m_ses := bear_ses3
                m_cnt := 1
            else if zones_confluent(m_top, m_bot, bear_top3, bear_bot3, atr_value)
                m_top := math.max(m_top, bear_top3)
                m_bot := math.min(m_bot, bear_bot3)
                m_str := math.max(m_str, bear_str3)
                m_cnt += 1

        if m_cnt >= min_confluence and not na(m_top) and m_str >= min_strength_filter

            bool already_exists = false
            if array.size(bear_obs) > 0
                for k = 0 to array.size(bear_obs) - 1
                    existing = array.get(bear_obs, k)
                    ex_mid   = (existing.top + existing.bot) / 2.0
                    new_mid  = (m_top + m_bot) / 2.0
                    if math.abs(ex_mid - new_mid) < atr_value * 0.5
                        already_exists := true

            if not already_exists
                ob_session = session_str(m_ses)
                [norm_top, norm_bot] = normalize_zone(m_top, m_bot, atr_value)

                b = box.new(bar_index, norm_top, bar_index + 20, norm_bot,
                     border_color=bear_border, bgcolor=bear_color, border_width=2, extend=extend.right)

                label l = na
                if show_labels
                    l := label.new(bar_index, norm_top, "Bear OB",
                         color=color.new(color.red, 20), textcolor=color.white,
                         style=label.style_label_down, size=size.small)

                label info_l = na
                if show_info
                    pips          = calc_pips(norm_top - norm_bot)
                    distance_pips = calc_pips(math.abs(close - (norm_top + norm_bot) / 2.0))
                    info_text     = "Merged Bearish OB ||| " + str.tostring(m_cnt) + " timeframes ||| Strength: " + str.tostring(math.round(m_str * 10) / 10) + "/10 ||| " + ob_session + " ||| Age: 0 bars ||| " + str.tostring(pips) + " pips ||| " + str.tostring(distance_pips) + " pips away"
                    mid_price     = (norm_top + norm_bot) / 2.0
                    info_l := label.new(bar_index + 25, mid_price, info_text,
                         color=color.new(color.red, 100), textcolor=color.new(color.red, 0),
                         style=label.style_label_left, size=get_text_size(), textalign=text.align_left)

                array.push(bear_obs, OB.new(b, l, info_l, norm_top, norm_bot, bar_index, false, ob_session, bar_index, m_str, m_cnt))

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE
// ═══════════════════════════════════════════════════════════════════════════════

clean_obs(bull_obs)
clean_obs(bear_obs)
limit_size(bull_obs, max_obs)
limit_size(bear_obs, max_obs)
update_boxes(bull_obs)
update_boxes(bear_obs)
`
    },
    {
        id: 'ga-adaptive-regime-filter',
        name: 'GreyAlpha Adaptive Regime Filter + Divergence (AER-VN)',
        description: 'Advanced efficiency ratio based regime filter with zero-lag divergence detection. [GREYALPHA]',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © KeyAlgos
//@version=6
indicator("Adaptive Regime Filter + Divergence (AER-VN) [KEYALGOS]", shorttitle="AER+Div [KEYALGOS]", overlay=false, format=format.price, precision=2)

// ========================================================================= //
// =============================== INPUTS ================================== //
// ========================================================================= //
grp_er    = "Efficiency Ratio Settings"
length    = input.int(10, title="ER Lookback (N)", minval=2, group=grp_er)
baseEr    = input.float(0.25, title="Base ER Threshold", step=0.05, minval=0.05, maxval=0.8, group=grp_er)
maxErCap  = input.float(0.65, title="Max Threshold Cap", step=0.05, minval=0.1, maxval=0.99, group=grp_er)

grp_vol   = "Volatility Normalization"
atrLength = input.int(14, title="ATR Length", minval=1, group=grp_vol)
atrMeanLen= input.int(50, title="ATR Mean Lookback", minval=5, group=grp_vol)

grp_div   = "Divergence Settings"
divLength = input.int(10, title="Swing Definition Length", minval=3, group=grp_div)

// Marker Toggles
showReg   = input.bool(true, title="Show Regular Div Markers", group=grp_div)
showHid   = input.bool(true, title="Show Hidden Div Markers", group=grp_div)

// Line Toggles
showRegBearLine = input.bool(true, title="Line: Regular Bearish", group=grp_div)
showRegBullLine = input.bool(true, title="Line: Regular Bullish", group=grp_div)
showHidBearLine = input.bool(true, title="Line: Hidden Bearish", group=grp_div)
showHidBullLine = input.bool(true, title="Line: Hidden Bullish", group=grp_div)

grp_vis   = "Visuals"
showBars  = input.bool(true, title="Color Price Bars", group=grp_vis)

// ========================================================================= //
// ======================= CORE AER + VOLATILITY =========================== //
// ========================================================================= //

float displacement = math.abs(close - close[length])
float pathDistance = math.sum(math.abs(close - close[1]), length)
float er = pathDistance != 0 ? (displacement / pathDistance) : 0.0

float currentAtr = ta.atr(atrLength)
float meanAtr    = ta.sma(currentAtr, atrMeanLen)
float atrRatio   = meanAtr != 0 ? (currentAtr / meanAtr) : 1.0

float rawThreshold     = baseEr * atrRatio
float dynamicThreshold = math.min(rawThreshold, maxErCap)

// ========================================================================= //
// ======================= REGIME CLASSIFICATION =========================== //
// ========================================================================= //

bool isTrending  = er > dynamicThreshold
bool isUptrend   = isTrending and (close > close[length])
bool isDowntrend = isTrending and (close < close[length])

bool isNonTrending   = er <= dynamicThreshold
bool isChop          = isNonTrending and (currentAtr > meanAtr)
bool isConsolidation = isNonTrending and (currentAtr <= meanAtr)

color colUp   = color.new(color.teal, 0)
color colDown = color.new(color.maroon, 0)
color colChop = color.new(color.orange, 0)
color colCons = color.new(color.gray, 0)

color regimeColor = switch
    isUptrend       => colUp
    isDowntrend     => colDown
    isChop          => colChop
    isConsolidation => colCons
    => color.gray

barcolor(showBars ? regimeColor : na)

// ========================================================================= //
// ================== ZERO-LAG DIVERGENCE DETECTION ======================== //
// ========================================================================= //

bool swingHighConfirm = (close[1] == ta.highest(close, divLength)[1]) and (close < close[1])
bool swingLowConfirm  = (close[1] == ta.lowest(close, divLength)[1])  and (close > close[1])

var float lastHighPrice = na
var float lastHighER    = na
var int   lastHighBar   = na

var float lastLowPrice  = na
var float lastLowER     = na
var int   lastLowBar    = na

bool regBear = false
bool regBull = false
bool hidBear = false
bool hidBull = false

if swingHighConfirm
    float currentHighPrice = close[1]
    float currentHighER    = er[1]
    int   currentHighBar   = bar_index[1]
    
    if not na(lastHighPrice)
        // Reg Bearish: Price Higher High, ER Lower High
        if (currentHighPrice > lastHighPrice) and (currentHighER < lastHighER)
            regBear := true
            if showRegBearLine
                line.new(lastHighBar, lastHighER, currentHighBar, currentHighER, color=color.red, style=line.style_dotted, width=2)
                
        // Hidden Bearish: Price Lower High, ER Higher High
        if (currentHighPrice < lastHighPrice) and (currentHighER > lastHighER)
            hidBear := true
            if showHidBearLine
                line.new(lastHighBar, lastHighER, currentHighBar, currentHighER, color=color.orange, style=line.style_dotted, width=2)
            
    lastHighPrice := currentHighPrice
    lastHighER    := currentHighER
    lastHighBar   := currentHighBar

if swingLowConfirm
    float currentLowPrice = close[1]
    float currentLowER    = er[1]
    int   currentLowBar   = bar_index[1]
    
    if not na(lastLowPrice)
        // Reg Bullish: Price Lower Low, ER Higher Low
        if (currentLowPrice < lastLowPrice) and (currentLowER > lastLowER)
            regBull := true
            if showRegBullLine
                line.new(lastLowBar, lastLowER, currentLowBar, currentLowER, color=color.lime, style=line.style_dotted, width=2)
                
        // Hidden Bullish: Price Higher Low, ER Lower Low
        if (currentLowPrice > lastLowPrice) and (currentLowER < lastLowER)
            hidBull := true
            if showHidBullLine
                line.new(lastLowBar, lastLowER, currentLowBar, currentLowER, color=color.aqua, style=line.style_dotted, width=2)
            
    lastLowPrice := currentLowPrice
    lastLowER    := currentLowER
    lastLowBar   := currentLowBar

// ========================================================================= //
// ============================== PLOTTING ================================= //
// ========================================================================= //

// Base Oscillator
plot(er, title="Efficiency Ratio", color=regimeColor, linewidth=2, style=plot.style_line)
plot(dynamicThreshold, title="Dynamic Threshold", color=color.new(color.white, 50), linewidth=1, style=plot.style_cross)
hline(baseEr, title="Base Threshold", color=color.new(color.gray, 50), linestyle=hline.style_dotted)

// Divergence Visuals (Shapes exactly on the ER line, set to tiny)
plotshape(showReg and regBear ? er[1] : na, title="Regular Bearish", location=location.absolute, color=color.red, style=shape.circle, size=size.tiny, offset=-1)
plotshape(showReg and regBull ? er[1] : na, title="Regular Bullish", location=location.absolute, color=color.lime, style=shape.circle, size=size.tiny, offset=-1)

plotshape(showHid and hidBear ? er[1] : na, title="Hidden Bearish", location=location.absolute, color=color.orange, style=shape.circle, size=size.tiny, offset=-1)
plotshape(showHid and hidBull ? er[1] : na, title="Hidden Bullish", location=location.absolute, color=color.aqua, style=shape.circle, size=size.tiny, offset=-1)

// Dashboard States
plotchar(isUptrend, title="State: Uptrend", char="", color=colUp, display=display.data_window)
plotchar(isDowntrend, title="State: Downtrend", char="", color=colDown, display=display.data_window)
plotchar(isChop, title="State: Choppiness", char="", color=colChop, display=display.data_window)
plotchar(isConsolidation, title="State: Consol", char="", color=colCons, display=display.data_window)

// Alerts
alertcondition(regBear, title="Regular Bearish Divergence", message="ER Bearish Divergence Detected")
alertcondition(regBull, title="Regular Bullish Divergence", message="ER Bullish Divergence Detected")
`
    },
    {
        id: 'ga-supertrend-cluster',
        name: 'GreyAlpha SuperTrend Cluster (Zeiierman)',
        description: 'Multi-SuperTrend cluster analysis with weighted consensus and dynamic visualization. [GREYALPHA]',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `// This work is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
// https://creativecommons.org/licenses/by-nc-sa/4.0/
// © Zeiierman {
//@version=6
indicator('SuperTrend Cluster (Zeiierman)', max_labels_count = 200, overlay = true, max_bars_back = 2000, behind_chart = false)
//}

// ~~ Tooltips {
var string t1  = "Minimum weighted agreement required for the bullish or bearish cluster to become valid. Higher values demand stronger alignment across the SuperTrend set."
var string t2  = "Selects which one of the five SuperTrend members is used as the base reference for flip markers, label placement, and final direction alignment."
var string t3  = "Colors the candles and bars using the live cluster strength gradient. When disabled, chart candles keep their default chart colors."
var string t4  = "Shows or hides the Bull Cluster and Bear Cluster labels when the selected base SuperTrend flips."
var string t5  = "Shows or hides the small base SuperTrend flip markers plotted at the selected base SuperTrend line."
var string t6  = "Main bullish color used for bullish trend lines, bullish labels, bullish markers, and bullish candle coloring."
var string t7  = "Main bearish color used for bearish trend lines, bearish labels, bearish markers, and bearish candle coloring."
var string t8  = "Neutral midpoint color used by the bar and candle gradient when bullish and bearish cluster pressure is balanced."

var string t9  = "ATR length for SuperTrend 1. Lower values react faster to price changes, while higher values make this member slower and smoother."
var string t10 = "ATR multiplier for SuperTrend 1. Higher values place the band farther from price and reduce sensitivity."
var string t11 = "Smoothing method applied to the source before SuperTrend 1 is calculated."
var string t12 = "Length of the smoothing used for SuperTrend 1. Higher values smooth more but add lag."
var string t13 = "Relative influence of SuperTrend 1 inside the weighted cluster. Higher values make this member contribute more to the final consensus."

var string t14 = "ATR length for SuperTrend 2. Lower values react faster to price changes, while higher values make this member slower and smoother."
var string t15 = "ATR multiplier for SuperTrend 2. Higher values place the band farther from price and reduce sensitivity."
var string t16 = "Smoothing method applied to the source before SuperTrend 2 is calculated."
var string t17 = "Length of the smoothing used for SuperTrend 2. Higher values smooth more but add lag."
var string t18 = "Relative influence of SuperTrend 2 inside the weighted cluster. Higher values make this member contribute more to the final consensus."

var string t19 = "ATR length for SuperTrend 3. Lower values react faster to price changes, while higher values make this member slower and smoother."
var string t20 = "ATR multiplier for SuperTrend 3. Higher values place the band farther from price and reduce sensitivity."
var string t21 = "Smoothing method applied to the source before SuperTrend 3 is calculated."
var string t22 = "Length of the smoothing used for SuperTrend 3. Higher values smooth more but add lag."
var string t23 = "Relative influence of SuperTrend 3 inside the weighted cluster. Higher values make this member contribute more to the final consensus."

var string t24 = "ATR length for SuperTrend 4. Lower values react faster to price changes, while higher values make this member slower and smoother."
var string t25 = "ATR multiplier for SuperTrend 4. Higher values place the band farther from price and reduce sensitivity."
var string t26 = "Smoothing method applied to the source before SuperTrend 4 is calculated."
var string t27 = "Length of the smoothing used for SuperTrend 4. Higher values smooth more but add lag."
var string t28 = "Relative influence of SuperTrend 4 inside the weighted cluster. Higher values make this member contribute more to the final consensus."

var string t29 = "ATR length for SuperTrend 5. Lower values react faster to price changes, while higher values make this member slower and smoother."
var string t30 = "ATR multiplier for SuperTrend 5. Higher values place the band farther from price and reduce sensitivity."
var string t31 = "Smoothing method applied to the source before SuperTrend 5 is calculated."
var string t32 = "Length of the smoothing used for SuperTrend 5. Higher values smooth more but add lag."
var string t33 = "Relative influence of SuperTrend 5 inside the weighted cluster. Higher values make this member contribute more to the final consensus."

var string t34 = "Fills the area between the active cluster SuperTrend line and a smoothed price reference with a translucent cloud."
var string t35 = "Length of the smoothing used for the hidden price reference that the cloud fills toward. Higher values create a steadier, softer cloud."
var string t36 = "Bullish cloud color used when the active cluster regime is bullish."
var string t37 = "Bearish cloud color used when the active cluster regime is bearish."
var string t38 = "Transparency of the cloud fill. Lower values are more solid, higher values are more subtle."
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ INPUT PARAMETERS {
gCe = 'Cluster Engine'
thr = input.float(0.60, 'Consensus Threshold', minval = 0.0, maxval = 1.0, step = 0.01, group = gCe, tooltip = t1)
baseIx = input.int(3, 'Base SuperTrend Index', minval = 1, maxval = 5, group = gCe, tooltip = t2)

gVi = 'Visual Analytics'
useBc = input.bool(true, 'Dynamic Bar Coloring', group = gVi, tooltip = t3)
showLbl = input.bool(true, 'Show Cluster Labels', group = gVi, tooltip = t4)
showDot = input.bool(true, 'Show Base SuperTrend Flip Dots', group = gVi, tooltip = t5)

cBu = input.color(color.new(color.lime, 0), 'Bull', group = gVi, inline = 'col', tooltip = t6)
cBe = input.color(color.new(#f7525f, 0), 'Bear', group = gVi, inline = 'col', tooltip = t7)
cN  = input.color(color.new(#ff9800, 0), 'Neutral', group = gVi, inline = 'col', tooltip = t6 + "\n\n" + t7 + "\n\n" + t8)

gCf = 'Cloud Fill'
showCloud = input.bool(true, 'Show Cloud Fill', group = gCf, tooltip = t34)
cloudLen = input.int(8, 'Cloud Reference Length', minval = 1, group = gCf, tooltip = t35)
cCloudBu = input.color(color.new(color.lime, 0), 'Bull Cloud', group = gCf, inline = 'cf', tooltip = t36)
cCloudBe = input.color(color.new(#f7525f, 0), 'Bear Cloud', group = gCf, inline = 'cf', tooltip = t37)
cloudTransp = input.int(65, 'Cloud Transparency', minval = 0, maxval = 95, group = gCf, tooltip = t38)

// ~~ SuperTrend 1 {
gSt1 = 'SuperTrend 1'
a1 = input.int(7, 'ATR Length', minval = 1, group = gSt1, inline = '1', tooltip = t9)
f1 = input.float(1.5, 'Factor', minval = 0.01, step = 0.01, group = gSt1, inline = '1', tooltip = t9 + "\n\n" + t10)
m1 = input.string('EMA', 'Smoothing', options = ['SMA', 'EMA', 'LSMA', 'WMA', 'HMA', 'RMA'], group = gSt1, inline = '1.', tooltip = t11)
l1 = input.int(3, 'Length', minval = 1, group = gSt1, inline = '1.', tooltip = t11 + "\n\n" + t12)
w1 = input.float(1.0, 'Weight', minval = 0.0, step = 0.1, group = gSt1, inline = 'w1', tooltip = t13)
//}

// ~~ SuperTrend 2 {
gSt2 = 'SuperTrend 2'
a2 = input.int(10, 'ATR Length', minval = 1, group = gSt2, inline = '2', tooltip = t14)
f2 = input.float(2.0, 'Factor', minval = 0.01, step = 0.01, group = gSt2, inline = '2', tooltip = t14 + "\n\n" + t15)
m2 = input.string('EMA', 'Smoothing', options = ['SMA', 'EMA', 'LSMA', 'WMA', 'HMA', 'RMA'], group = gSt2, inline = '2.', tooltip = t16)
l2 = input.int(5, 'Length', minval = 1, group = gSt2, inline = '2.', tooltip = t16 + "\n\n" + t17)
w2 = input.float(1.0, 'Weight', minval = 0.0, step = 0.1, group = gSt2, inline = 'w2', tooltip = t18)
//}

// ~~ SuperTrend 3 {
gSt3 = 'SuperTrend 3'
a3 = input.int(14, 'ATR Length', minval = 1, group = gSt3, inline = '3', tooltip = t19)
f3 = input.float(2.5, 'Factor', minval = 0.01, step = 0.01, group = gSt3, inline = '3', tooltip = t19 + "\n\n" + t20)
m3 = input.string('SMA', 'Smoothing', options = ['SMA', 'EMA', 'LSMA', 'WMA', 'HMA', 'RMA'], group = gSt3, inline = '3.', tooltip = t21)
l3 = input.int(8, 'Length', minval = 1, group = gSt3, inline = '3.', tooltip = t21 + "\n\n" + t22)
w3 = input.float(1.2, 'Weight', minval = 0.0, step = 0.1, group = gSt3, inline = 'w3', tooltip = t23)
//}

// ~~ SuperTrend 4 {
gSt4 = 'SuperTrend 4'
a4 = input.int(21, 'ATR Length', minval = 1, group = gSt4, inline = '4', tooltip = t24)
f4 = input.float(3.0, 'Factor', minval = 0.01, step = 0.01, group = gSt4, inline = '4', tooltip = t24 + "\n\n" + t25)
m4 = input.string('WMA', 'Smoothing', options = ['SMA', 'EMA', 'LSMA', 'WMA', 'HMA', 'RMA'], group = gSt4, inline = '4.', tooltip = t26)
l4 = input.int(13, 'Length', minval = 1, group = gSt4, inline = '4.', tooltip = t26 + "\n\n" + t27)
w4 = input.float(1.4, 'Weight', minval = 0.0, step = 0.1, group = gSt4, inline = 'w4', tooltip = t28)
//}

// ~~ SuperTrend 5 {
gSt5 = 'SuperTrend 5'
a5 = input.int(34, 'ATR Length', minval = 1, group = gSt5, inline = '5', tooltip = t29)
f5 = input.float(4.0, 'Factor', minval = 0.01, step = 0.01, group = gSt5, inline = '5', tooltip = t29 + "\n\n" + t30)
m5 = input.string('HMA', 'Smoothing', options = ['SMA', 'EMA', 'LSMA', 'WMA', 'HMA', 'RMA'], group = gSt5, inline = '5.', tooltip = t31)
l5 = input.int(21, 'Length', minval = 1, group = gSt5, inline = '5.', tooltip = t31 + "\n\n" + t32)
w5 = input.float(1.6, 'Weight', minval = 0.0, step = 0.1, group = gSt5, inline = 'w5', tooltip = t33)
//}
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ CONSTANTS & STYLING {
EPS = 0.0000001
N = 5
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ HELPER FUNCTIONS {
fMa(t, s, l) =>
    ln = math.max(1, l)
    switch t
        'SMA'  => ta.sma(s, ln)
        'EMA'  => ta.ema(s, ln)
        'LSMA' => ta.linreg(s, ln, 0)
        'WMA'  => ta.wma(s, ln)
        'HMA'  => ta.hma(s, ln)
        'RMA'  => ta.rma(s, ln)
        => ta.sma(s, ln)

fSt(src, atrLen, fac) =>
    atr = ta.atr(math.max(1, atrLen))
    ub0 = src + fac * atr
    lb0 = src - fac * atr

    ub = ub0
    ub := na(ub[1]) ? ub0 : (ub0 < ub[1] or src[1] > ub[1] ? ub0 : ub[1])

    lb = lb0
    lb := na(lb[1]) ? lb0 : (lb0 > lb[1] or src[1] < lb[1] ? lb0 : lb[1])

    d = 1.0
    d := na(d[1]) ? 1.0 : d[1] == -1.0 and src > ub[1] ? 1.0 : d[1] == 1.0 and src < lb[1] ? -1.0 : d[1]

    st = d == 1.0 ? lb : ub
    [st, d]
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ MULTI-SUPERTREND ENGINE {
src = hlc3

s1 = fMa(m1, src, l1)
s2 = fMa(m2, src, l2)
s3 = fMa(m3, src, l3)
s4 = fMa(m4, src, l4)
s5 = fMa(m5, src, l5)

[st1, d1] = fSt(s1, a1, f1)
[st2, d2] = fSt(s2, a2, f2)
[st3, d3] = fSt(s3, a3, f3)
[st4, d4] = fSt(s4, a4, f4)
[st5, d5] = fSt(s5, a5, f5)
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ ARRAYS FOR STORAGE {
var array<float> wArr = array.new_float(0)
var array<float> stArr = array.new_float(0)
var array<float> dArr = array.new_float(0)

if barstate.isfirst
    array.push(wArr, w1), array.push(wArr, w2), array.push(wArr, w3), array.push(wArr, w4), array.push(wArr, w5)
    for _ = 0 to N - 1
        array.push(stArr, na)
        array.push(dArr, na)

if array.size(wArr) != N or array.size(stArr) != N or array.size(dArr) != N
    runtime.error('Array size mismatch. Expected 5 elements in all arrays.')

array.set(stArr, 0, st1), array.set(stArr, 1, st2), array.set(stArr, 2, st3), array.set(stArr, 3, st4), array.set(stArr, 4, st5)
array.set(dArr, 0, d1), array.set(dArr, 1, d2), array.set(dArr, 2, d3), array.set(dArr, 3, d4), array.set(dArr, 4, d5)
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ CONSENSUS ENGINE {
var matrix<float> mDat = matrix.new<float>(N, 3, na)

if matrix.rows(mDat) != N or matrix.columns(mDat) != 3
    runtime.error('Matrix size mismatch. Expected 5x3.')

for i = 0 to N - 1
    matrix.set(mDat, i, 0, array.get(dArr, i))
    matrix.set(mDat, i, 1, array.get(wArr, i))
    matrix.set(mDat, i, 2, array.get(stArr, i))

wSum = 0.0
wBu = 0.0
wBe = 0.0
lnBuNum = 0.0
lnBeNum = 0.0

for i = 0 to N - 1
    d = matrix.get(mDat, i, 0)
    w = matrix.get(mDat, i, 1)
    st = matrix.get(mDat, i, 2)

    wSum += w

    if d > 0
        wBu += w
        lnBuNum += st * w
    else if d < 0
        wBe += w
        lnBeNum += st * w

wSum := math.max(wSum, EPS)

scBu = wBu / wSum
scBe = wBe / wSum
scCl = scBu - scBe
strCl = math.abs(scCl)

lnBu = wBu > 0 ? lnBuNum / wBu : na
lnBe = wBe > 0 ? lnBeNum / wBe : na

baseRow = math.max(0, math.min(N - 1, baseIx - 1))
stB = matrix.get(mDat, baseRow, 2)
dB  = matrix.get(mDat, baseRow, 0)

flipBu = ta.crossover(dB, 0)
flipBe = ta.crossunder(dB, 0)
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ FINAL FILTERED REGIME {
isBu = scBu >= thr
isBe = scBe >= thr

okBu = isBu and dB > 0
okBe = isBe and dB < 0

var float dLast = 0.0
if okBu and not okBe
    dLast := 1.0
else if okBe and not okBu
    dLast := -1.0

lnCl = dLast > 0 ? lnBu : dLast < 0 ? lnBe : na
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ VISUALIZATION {
cBar = scCl > 0 ? color.from_gradient(strCl, 0.0, 1.0, cN, cBu) : color.from_gradient(strCl, 0.0, 1.0, cN, cBe)

barcolor(useBc ? cBar : na)
plotcandle(useBc ? open : na, useBc ? high : na, useBc ? low : na, useBc ? close : na, color = useBc ? cBar : na, bordercolor = useBc ? cBar : na, wickcolor = useBc ? cBar : na)

plotshape(ta.crossover(dLast, 0), 'Major Long', shape.labelup, location.belowbar, color.new(cBu, 30), size = size.tiny, text = '▲', textcolor = color.white)
plotshape(ta.crossunder(dLast, 0), 'Major Short', shape.labeldown, location.abovebar, color.new(cBe, 30), size = size.tiny, text = '▼', textcolor = color.white)

plotshape(showDot and flipBu ? stB : na, 'Base ST Long', shape.triangleup, location.absolute, dLast > 0 ? color.new(cBu, 40) : color.new(cBe, 40), size = size.tiny)
plotshape(showDot and flipBe ? stB : na, 'Base ST Short', shape.triangledown, location.absolute, dLast > 0 ? color.new(cBu, 40) : color.new(cBe, 40), size = size.tiny)

if showLbl and flipBu
    label.new(bar_index, stB, text = 'Bull Cluster\n' + str.tostring(scBu * 100.0, '#.#') + '%', color = color.new(cBu, 90), textcolor = cBu, style = label.style_label_up, yloc = yloc.price, size = size.small)

if showLbl and flipBe
    label.new(bar_index, stB, text = 'Bear Cluster\n' + str.tostring(scBe * 100.0, '#.#') + '%', color = color.new(cBe, 90), textcolor = cBe, style = label.style_label_down, yloc = yloc.price, size = size.small)

pUp = plot(dLast == 1 ? lnCl : na, 'Cluster Up Trend', color = cBu, style = plot.style_linebr, linewidth = 2)
pDn = plot(dLast == -1 ? lnCl : na, 'Cluster Down Trend', color = cBe, style = plot.style_linebr, linewidth = 2)

// Hidden active-line plot for cloud fill
pCl = plot(lnCl, 'Active Cluster Line', color = color.new(chart.fg_color, 100), display = display.none)

// Hidden smoothed price reference for cloud fill
cloudRef = ta.sma(hlc3, cloudLen)
pRef = plot(cloudRef, 'Cloud Reference', color = color.new(chart.fg_color, 100), display = display.none)

cloudClr = showCloud ? dLast > 0 ? color.new(cCloudBu, cloudTransp) : dLast < 0 ? color.new(cCloudBe, cloudTransp) : na : na
fill(pCl, pRef, lnCl, cloudRef, cloudClr, color(na))
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}

// ~~ ALERTS {
alBu = ta.crossover(dLast, 0)
alBe = ta.crossunder(dLast, 0)
alAny = alBu or alBe

alertcondition(alBu, 'Long', 'Bullish clustered SuperTrend signal')
alertcondition(alBe, 'Short', 'Bearish clustered SuperTrend signal')
alertcondition(alAny, 'Signal', 'Clustered SuperTrend signal')
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~}
`
    },
    {
        id: 'ga-helion-trend-weave',
        name: 'GreyAlpha Helion Trend Weave [JOAT]',
        description: 'Advanced trend ribbon with volatility morphing, compression detection, and multi-state scoring. [GREYALPHA]',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © officialjackofalltrades
//@version=6
indicator("Helion Trend Weave [JOAT]", shorttitle="HTW [JOAT]", overlay=true)

// ──────────────────── INPUTS ────────────────────────────────────────────────
string GRP_CORE = "Helix Parameters"
string maType   = input.string("EMA", "Filament Type", options=["EMA", "SMA", "SMMA"], group=GRP_CORE)
int    basePer  = input.int(5,  "Origin Period",     minval=2,  maxval=20,  group=GRP_CORE, tooltip="Fastest MA period in the ribbon")
int    ribbonN  = input.int(8,  "Weave Depth",       minval=3,  maxval=12,  group=GRP_CORE, tooltip="Number of MA filaments in the weave")
int    spacing  = input.int(5,  "Filament Spacing",  minval=2,  maxval=15,  group=GRP_CORE, tooltip="Period increment between successive filaments")
bool   adaptive = input.bool(true, "Volatility Morphing", group=GRP_CORE, tooltip="Dynamically adjust periods based on ATR regime")

string GRP_ADAPT = "Morphic Tuning"
int    atrFast   = input.int(10, "Impulse ATR",   minval=3,  maxval=30,  group=GRP_ADAPT, tooltip="Fast ATR for volatility ratio")
int    atrSlowP  = input.int(50, "Anchor ATR",    minval=20, maxval=100, group=GRP_ADAPT, tooltip="Slow ATR for volatility ratio")
float  adaptMin  = input.float(0.5, "Morph Floor", minval=0.2, maxval=1.0, step=0.1, group=GRP_ADAPT)
float  adaptMax  = input.float(2.0, "Morph Ceiling", minval=1.0, maxval=4.0, step=0.1, group=GRP_ADAPT)

string GRP_SQ   = "Compression Chamber"
bool   showSqueeze = input.bool(true, "Compression Aura", group=GRP_SQ, tooltip="Background highlight when ribbon compresses below threshold")
int    sqLen       = input.int(100, "Chamber Lookback", minval=20, maxval=300, group=GRP_SQ)
float  sqPctile    = input.float(10, "Compression Percentile", minval=1, maxval=30, step=1, group=GRP_SQ)

string GRP_TWS  = "Twist Detection"
bool   showTwist  = input.bool(true, "Show Twist Events", group=GRP_TWS, tooltip="Mark ribbon inversion points where alignment flips")
int    twistConf  = input.int(2, "Twist Confirmation",   minval=1, maxval=5, group=GRP_TWS, tooltip="Bars of sustained inversion to confirm twist")

string GRP_VIS  = "Optics Layer"
bool   showFill  = input.bool(true, "Weave Fill",          group=GRP_VIS)
bool   showLead  = input.bool(true, "Lead Filament Glow",  group=GRP_VIS)
bool   showDash  = input.bool(true, "Command Panel",       group=GRP_VIS)
bool   showBarC  = input.bool(false, "Candle Tinting",     group=GRP_VIS, tooltip="Tint chart candles based on trend phase")

string GRP_COL  = "Chromatic Scheme"
color  colBullS  = input.color(#0affab, "Ascent Dominant",   group=GRP_COL)
color  colBullW  = input.color(#056b4d, "Ascent Fading",     group=GRP_COL)
color  colBearS  = input.color(#ff2e63, "Descent Dominant",  group=GRP_COL)
color  colBearW  = input.color(#8b1a3a, "Descent Fading",    group=GRP_COL)
color  colSqz    = input.color(#ffa502, "Compression Tone",  group=GRP_COL)
color  colTwist  = input.color(#a29bfe, "Twist Accent",      group=GRP_COL)
color  colSurge  = input.color(#00d2ff, "Surge Accent",      group=GRP_COL)
color  colFan    = input.color(#00e676, "Fan Accent",        group=GRP_COL)

string GRP_SIG   = "Signal Architecture"
bool   showCross   = input.bool(true, "Weave Cross Signals",     group=GRP_SIG, tooltip="Label when lead filament crosses anchor")
bool   showTwistSig = input.bool(true, "Twist Lock Signals",     group=GRP_SIG, tooltip="Label on confirmed ribbon inversions")
bool   showSurgeSig = input.bool(true, "Momentum Surge",         group=GRP_SIG, tooltip="Detect rapid spread expansion after compression")
bool   showFanSig   = input.bool(true, "Filament Fan",           group=GRP_SIG, tooltip="Mark when all filaments achieve perfect sequential order")
bool   showSnapSig  = input.bool(true, "Snap Recoil",            group=GRP_SIG, tooltip="Detect price snapping back through the ribbon midpoint")
bool   showDriftSig = input.bool(true, "Drift Fade",             group=GRP_SIG, tooltip="Warn when trend strength decays below dormant threshold")

// ──────────────────── MORPHIC PERIOD ──────────────────────────────────────
float atrS = ta.atr(atrFast)
float atrL = ta.atr(atrSlowP)
float volReg   = atrL != 0 ? atrS / atrL : 1.0
float adaptMult = adaptive ? math.max(adaptMin, math.min(adaptMax, 1.5 / volReg)) : 1.0

// ──────────────────── MA CALCULATION ────────────────────────────────────
// SMA helper using for-loop (works with series int length)
flexSMA(float src, int len) =>
    float s = 0.0
    int n = math.max(2, len)
    for j = 0 to n - 1
        s += nz(src[j])
    s / n

// Periods (series int due to adaptive ATR-based multiplier)
int per01 = math.max(2, math.round((basePer + 0  * spacing) * adaptMult))
int per02 = math.max(2, math.round((basePer + 1  * spacing) * adaptMult))
int per03 = math.max(2, math.round((basePer + 2  * spacing) * adaptMult))
int per04 = math.max(2, math.round((basePer + 3  * spacing) * adaptMult))
int per05 = math.max(2, math.round((basePer + 4  * spacing) * adaptMult))
int per06 = math.max(2, math.round((basePer + 5  * spacing) * adaptMult))
int per07 = math.max(2, math.round((basePer + 6  * spacing) * adaptMult))
int per08 = math.max(2, math.round((basePer + 7  * spacing) * adaptMult))
int per09 = math.max(2, math.round((basePer + 8  * spacing) * adaptMult))
int per10 = math.max(2, math.round((basePer + 9  * spacing) * adaptMult))
int per11 = math.max(2, math.round((basePer + 10 * spacing) * adaptMult))
int per12 = math.max(2, math.round((basePer + 11 * spacing) * adaptMult))

// Inline EMA per MA (each var is isolated at global scope)
var float e01 = na
var float e02 = na
var float e03 = na
var float e04 = na
var float e05 = na
var float e06 = na
var float e07 = na
var float e08 = na
var float e09 = na
var float e10 = na
var float e11 = na
var float e12 = na
float a01 = 2.0 / (per01 + 1)
float a02 = 2.0 / (per02 + 1)
float a03 = 2.0 / (per03 + 1)
float a04 = 2.0 / (per04 + 1)
float a05 = 2.0 / (per05 + 1)
float a06 = 2.0 / (per06 + 1)
float a07 = 2.0 / (per07 + 1)
float a08 = 2.0 / (per08 + 1)
float a09 = 2.0 / (per09 + 1)
float a10 = 2.0 / (per10 + 1)
float a11 = 2.0 / (per11 + 1)
float a12 = 2.0 / (per12 + 1)
e01 := na(e01) ? close : a01 * close + (1 - a01) * e01
e02 := na(e02) ? close : a02 * close + (1 - a02) * e02
e03 := na(e03) ? close : a03 * close + (1 - a03) * e03
e04 := na(e04) ? close : a04 * close + (1 - a04) * e04
e05 := na(e05) ? close : a05 * close + (1 - a05) * e05
e06 := na(e06) ? close : a06 * close + (1 - a06) * e06
e07 := na(e07) ? close : a07 * close + (1 - a07) * e07
e08 := na(e08) ? close : a08 * close + (1 - a08) * e08
e09 := na(e09) ? close : a09 * close + (1 - a09) * e09
e10 := na(e10) ? close : a10 * close + (1 - a10) * e10
e11 := na(e11) ? close : a11 * close + (1 - a11) * e11
e12 := na(e12) ? close : a12 * close + (1 - a12) * e12

// Inline RMA per MA (for SMMA mode)
var float r01 = na
var float r02 = na
var float r03 = na
var float r04 = na
var float r05 = na
var float r06 = na
var float r07 = na
var float r08 = na
var float r09 = na
var float r10 = na
var float r11 = na
var float r12 = na
float ra01 = 1.0 / per01
float ra02 = 1.0 / per02
float ra03 = 1.0 / per03
float ra04 = 1.0 / per04
float ra05 = 1.0 / per05
float ra06 = 1.0 / per06
float ra07 = 1.0 / per07
float ra08 = 1.0 / per08
float ra09 = 1.0 / per09
float ra10 = 1.0 / per10
float ra11 = 1.0 / per11
float ra12 = 1.0 / per12
r01 := na(r01) ? close : ra01 * close + (1 - ra01) * r01
r02 := na(r02) ? close : ra02 * close + (1 - ra02) * r02
r03 := na(r03) ? close : ra03 * close + (1 - ra03) * r03
r04 := na(r04) ? close : ra04 * close + (1 - ra04) * r04
r05 := na(r05) ? close : ra05 * close + (1 - ra05) * r05
r06 := na(r06) ? close : ra06 * close + (1 - ra06) * r06
r07 := na(r07) ? close : ra07 * close + (1 - ra07) * r07
r08 := na(r08) ? close : ra08 * close + (1 - ra08) * r08
r09 := na(r09) ? close : ra09 * close + (1 - ra09) * r09
r10 := na(r10) ? close : ra10 * close + (1 - ra10) * r10
r11 := na(r11) ? close : ra11 * close + (1 - ra11) * r11
r12 := na(r12) ? close : ra12 * close + (1 - ra12) * r12

// Select MA type
float ma01 = maType == "SMA" ? flexSMA(close, per01) : maType == "SMMA" ? r01 : e01
float ma02 = maType == "SMA" ? flexSMA(close, per02) : maType == "SMMA" ? r02 : e02
float ma03 = maType == "SMA" ? flexSMA(close, per03) : maType == "SMMA" ? r03 : e03
float ma04 = maType == "SMA" ? flexSMA(close, per04) : maType == "SMMA" ? r04 : e04
float ma05 = maType == "SMA" ? flexSMA(close, per05) : maType == "SMMA" ? r05 : e05
float ma06 = maType == "SMA" ? flexSMA(close, per06) : maType == "SMMA" ? r06 : e06
float ma07 = maType == "SMA" ? flexSMA(close, per07) : maType == "SMMA" ? r07 : e07
float ma08 = maType == "SMA" ? flexSMA(close, per08) : maType == "SMMA" ? r08 : e08
float ma09 = maType == "SMA" ? flexSMA(close, per09) : maType == "SMMA" ? r09 : e09
float ma10 = maType == "SMA" ? flexSMA(close, per10) : maType == "SMMA" ? r10 : e10
float ma11 = maType == "SMA" ? flexSMA(close, per11) : maType == "SMMA" ? r11 : e11
float ma12 = maType == "SMA" ? flexSMA(close, per12) : maType == "SMMA" ? r12 : e12

// Reference lines for trend determination
float fastest = ma01
float slowest = ribbonN >= 12 ? ma12 : ribbonN >= 11 ? ma11 : ribbonN >= 10 ? ma10 : ribbonN >= 9 ? ma09 : ribbonN >= 8 ? ma08 : ribbonN >= 7 ? ma07 : ribbonN >= 6 ? ma06 : ribbonN >= 5 ? ma05 : ribbonN >= 4 ? ma04 : ma03

// ──────────────────── TREND SCORING ─────────────────────────────────────────
bool bullTrend = fastest > slowest
bool rising    = ta.rising(fastest, 2)
bool falling   = ta.falling(fastest, 2)

// Four-state colour (wolfpack phase logic)
color trendCol = bullTrend and rising     ? colBullS :
                 bullTrend and not rising  ? colBullW :
                 not bullTrend and falling ? colBearS : colBearW

// Ribbon spread — normalised by ATR as trend strength proxy
float atrRef    = ta.atr(14)
float spread    = math.abs(fastest - slowest)
float spreadN   = atrRef != 0 ? spread / atrRef : 0.0
float spreadPct = ta.percentrank(spreadN, 100)

string strengthLabel = spreadPct > 70 ? "DOMINANT" : spreadPct > 30 ? "DEVELOPING" : "DORMANT"

// Ribbon alignment score — percentage of MAs in correct sequential order
alignCount(bool isBull) =>
    int cnt = 0
    if ribbonN >= 3 and ((isBull and ma01 > ma02 and ma02 > ma03) or (not isBull and ma01 < ma02 and ma02 < ma03))
        cnt += 1
    if ribbonN >= 5 and ((isBull and ma03 > ma04 and nz(ma04) > nz(ma05)) or (not isBull and ma03 < ma04 and nz(ma04) < nz(ma05)))
        cnt += 1
    if ribbonN >= 7 and ((isBull and nz(ma05) > nz(ma06) and nz(ma06) > nz(ma07)) or (not isBull and nz(ma05) < nz(ma06) and nz(ma06) < nz(ma07)))
        cnt += 1
    if ribbonN >= 9 and ((isBull and nz(ma07) > nz(ma08) and nz(ma08) > nz(ma09)) or (not isBull and nz(ma07) < nz(ma08) and nz(ma08) < nz(ma09)))
        cnt += 1
    cnt

int maxSegs   = ribbonN >= 9 ? 4 : ribbonN >= 7 ? 3 : ribbonN >= 5 ? 2 : 1
int alignSegs = alignCount(bullTrend)
float alignPct = maxSegs > 0 ? alignSegs * 100.0 / maxSegs : 0
string alignLabel = alignPct >= 100 ? "LOCKED" : alignPct >= 50 ? "PARTIAL" : "SCATTERED"

// Spread momentum — rate of change for early expansion/contraction
float spreadRoc = spreadN - nz(spreadN[3])
string spreadDir = spreadRoc > 0 ? "EXPANDING" : spreadRoc < 0 ? "CONTRACTING" : "FLAT"

// ──────────────────── COMPRESSION CHAMBER ──────────────────────────────────
float spreadRank = ta.percentrank(spread, sqLen)
bool  isSqueeze  = spreadRank <= sqPctile

bgcolor(showSqueeze and isSqueeze ? color.new(colSqz, 93) : na, title="Compression Aura")

// ──────────────────── TWIST DETECTION ──────────────────────────────────────
bool twistBull = ta.crossover(fastest, slowest)
bool twistBear = ta.crossunder(fastest, slowest)
var int twistBullCnt = 0
var int twistBearCnt = 0

if bullTrend
    twistBullCnt += 1
    twistBearCnt := 0
else
    twistBearCnt += 1
    twistBullCnt := 0

bool confirmedTwistBull = twistBullCnt == twistConf
bool confirmedTwistBear = twistBearCnt == twistConf

// Candle tinting
barcolor(showBarC ? trendCol : na, title="Phase Candle Tint")

// ──────────────────── PLOTS ─────────────────────────────────────────────────
int leadW = showLead ? 3 : 1

p01 = plot(ma01, "MA 1",  color=showLead ? trendCol : color.new(trendCol, 30), linewidth=leadW)
p02 = plot(ma02, "MA 2",  color=color.new(trendCol, 30), linewidth=1)
p03 = plot(ma03, "MA 3",  color=color.new(trendCol, 40), linewidth=1)
p04 = plot(ma04, "MA 4",  color=color.new(trendCol, 48), linewidth=1)
p05 = plot(ma05, "MA 5",  color=color.new(trendCol, 54), linewidth=1)
p06 = plot(ma06, "MA 6",  color=color.new(trendCol, 60), linewidth=1)
p07 = plot(ma07, "MA 7",  color=color.new(trendCol, 65), linewidth=1)
p08 = plot(ma08, "MA 8",  color=color.new(trendCol, 70), linewidth=1)
p09 = plot(ma09, "MA 9",  color=color.new(trendCol, 74), linewidth=1)
p10 = plot(ma10, "MA 10", color=color.new(trendCol, 78), linewidth=1)
p11 = plot(ma11, "MA 11", color=color.new(trendCol, 82), linewidth=1)
p12 = plot(ma12, "MA 12", color=color.new(trendCol, 86), linewidth=1)

// Weave fill between fastest and a mid-ribbon filament
fill(p01, p08, color=showFill ? color.new(trendCol, 88) : na, title="Weave Core Fill")

// ──────────────────── SIGNAL DETECTION ───────────────────────────────────────
float atrVal = nz(atrRef, 1)

// Cooldown counters — prevent any signal from repeating within N bars of itself
var int cdCross = 0
var int cdTwist = 0
var int cdSurge = 0
var int cdFan   = 0
var int cdSnap  = 0
var int cdDrift = 0
int CD_CROSS = 8
int CD_TWIST = 10
int CD_SURGE = 12
int CD_FAN   = 10
int CD_SNAP  = 8
int CD_DRIFT = 15
cdCross := math.max(0, cdCross - 1)
cdTwist := math.max(0, cdTwist - 1)
cdSurge := math.max(0, cdSurge - 1)
cdFan   := math.max(0, cdFan   - 1)
cdSnap  := math.max(0, cdSnap  - 1)
cdDrift := math.max(0, cdDrift - 1)

// Weave Cross — lead filament crosses anchor (core directional signal)
bool bullCross = ta.crossover(fastest, slowest)  and barstate.isconfirmed and cdCross == 0
bool bearCross = ta.crossunder(fastest, slowest) and barstate.isconfirmed and cdCross == 0

// Momentum Surge — compression release into expansion (structural breakout)
bool sqzRelease   = not isSqueeze and isSqueeze[1]
bool surgeUp      = sqzRelease and spreadRoc > 0 and bullTrend and barstate.isconfirmed and cdSurge == 0
bool surgeDn      = sqzRelease and spreadRoc > 0 and not bullTrend and barstate.isconfirmed and cdSurge == 0

// Filament Fan — all filaments snap into perfect sequential order (trend confirmation)
bool fanBull = alignPct >= 100 and nz(alignPct[1]) < 100 and bullTrend and barstate.isconfirmed and cdFan == 0
bool fanBear = alignPct >= 100 and nz(alignPct[1]) < 100 and not bullTrend and barstate.isconfirmed and cdFan == 0

// Twist Lock — ribbon inversion confirmed (edge-detected: fires only once per twist event)
bool twistBullEdge = confirmedTwistBull and not confirmedTwistBull[1] and barstate.isconfirmed and cdTwist == 0
bool twistBearEdge = confirmedTwistBear and not confirmedTwistBear[1] and barstate.isconfirmed and cdTwist == 0

// Snap Recoil — price crosses ribbon midpoint against trend (mean reversion)
// Requires minimum ribbon width to avoid noise in tight ranges
float ribbonMid = (fastest + slowest) / 2
bool snapBull   = ta.crossover(close, ribbonMid)  and not bullTrend and spreadN > 0.3 and barstate.isconfirmed and cdSnap == 0
bool snapBear   = ta.crossunder(close, ribbonMid) and bullTrend and spreadN > 0.3 and barstate.isconfirmed and cdSnap == 0

// Drift Fade — warning placed opposite to trend direction
bool driftWarn = spreadPct <= 15 and nz(spreadPct[1]) > 15 and barstate.isconfirmed and cdDrift == 0

// Arm cooldowns when signals fire
if bullCross or bearCross
    cdCross := CD_CROSS
if surgeUp or surgeDn
    cdSurge := CD_SURGE
if fanBull or fanBear
    cdFan := CD_FAN
if twistBullEdge or twistBearEdge
    cdTwist := CD_TWIST
if snapBull or snapBear
    cdSnap := CD_SNAP
if driftWarn
    cdDrift := CD_DRIFT

// Global anti-overlap: only one label per bar (priority: Cross > Surge > Twist > Fan > Snap > Drift)
bool barUsed = false

bool doCross    = (bullCross or bearCross) and not barUsed
bool doSurge    = (surgeUp or surgeDn) and not barUsed and not doCross
bool doTwist    = (twistBullEdge or twistBearEdge) and not barUsed and not doCross and not doSurge
bool doFan      = (fanBull or fanBear) and not barUsed and not doCross and not doSurge and not doTwist
bool doSnap     = (snapBull or snapBear) and not barUsed and not doCross and not doSurge and not doTwist and not doFan
bool doDrift    = driftWarn and not barUsed and not doCross and not doSurge and not doTwist and not doFan and not doSnap

// ──────────────────── LABEL SIGNALS ─────────────────────────────────────────
// Weave Cross — below/above price at ribbon edge
if showCross and doCross and bullCross
    label.new(bar_index, low - atrVal * 0.5, "IGNITE", style=label.style_label_up, color=color.new(colBullS, 10), textcolor=color.rgb(5, 20, 15), size=size.tiny, tooltip="Ascent cross — lead filament surged above anchor | Spread: " + str.tostring(spreadN, "#.##") + " | Align: " + str.tostring(alignPct, "#") + "%")
if showCross and doCross and bearCross
    label.new(bar_index, high + atrVal * 0.5, "QUENCH", style=label.style_label_down, color=color.new(colBearS, 10), textcolor=color.rgb(255, 240, 245), size=size.tiny, tooltip="Descent cross — lead filament dropped below anchor | Spread: " + str.tostring(spreadN, "#.##") + " | Align: " + str.tostring(alignPct, "#") + "%")

// Twist Lock — further from price to avoid cross overlap
if showTwistSig and doTwist and twistBullEdge
    label.new(bar_index, low - atrVal * 1.0, "TWIST LOCK", style=label.style_label_up, color=color.new(colTwist, 10), textcolor=color.rgb(240, 235, 255), size=size.tiny, tooltip="Bullish twist confirmed — ribbon inversion sustained " + str.tostring(twistConf) + " bars | Phase: " + (rising ? "RISING" : "FADING"))
if showTwistSig and doTwist and twistBearEdge
    label.new(bar_index, high + atrVal * 1.0, "TWIST LOCK", style=label.style_label_down, color=color.new(colTwist, 10), textcolor=color.rgb(240, 235, 255), size=size.tiny, tooltip="Bearish twist confirmed — ribbon inversion sustained " + str.tostring(twistConf) + " bars | Phase: " + (falling ? "FALLING" : "FADING"))

// Momentum Surge — furthest from price (structural breakout, high importance)
if showSurgeSig and doSurge and surgeUp
    label.new(bar_index, low - atrVal * 1.4, "SURGE", style=label.style_label_up, color=color.new(colSurge, 5), textcolor=color.rgb(0, 15, 30), size=size.tiny, tooltip="Bullish momentum surge — compression released into expansion | Force: " + strengthLabel + " " + str.tostring(spreadPct, "#") + "%")
if showSurgeSig and doSurge and surgeDn
    label.new(bar_index, high + atrVal * 1.4, "SURGE", style=label.style_label_down, color=color.new(colSurge, 5), textcolor=color.rgb(0, 15, 30), size=size.tiny, tooltip="Bearish momentum surge — compression released into expansion | Force: " + strengthLabel + " " + str.tostring(spreadPct, "#") + "%")

// Filament Fan — near price (confirmation, subtle)
if showFanSig and doFan and fanBull
    label.new(bar_index, low - atrVal * 0.3, "FAN", style=label.style_label_up, color=color.new(colFan, 8), textcolor=color.rgb(0, 25, 10), size=size.tiny, tooltip="Bullish filament fan — all MAs in perfect ascending order | Morph: " + str.tostring(adaptMult, "#.##") + "x")
if showFanSig and doFan and fanBear
    label.new(bar_index, high + atrVal * 0.3, "FAN", style=label.style_label_down, color=color.new(colFan, 8), textcolor=color.rgb(0, 25, 10), size=size.tiny, tooltip="Bearish filament fan — all MAs in perfect descending order | Morph: " + str.tostring(adaptMult, "#.##") + "x")

// Snap Recoil — mid distance (counter-trend, placed at ribbon midpoint zone)
if showSnapSig and doSnap and snapBull
    label.new(bar_index, low - atrVal * 0.7, "SNAP", style=label.style_label_up, color=color.new(colSurge, 25), textcolor=color.rgb(200, 245, 255), size=size.tiny, tooltip="Bullish snap recoil — price crossed ribbon midpoint against bearish trend | Spread: " + str.tostring(spreadN, "#.##"))
if showSnapSig and doSnap and snapBear
    label.new(bar_index, high + atrVal * 0.7, "SNAP", style=label.style_label_down, color=color.new(colBearS, 25), textcolor=color.rgb(255, 220, 230), size=size.tiny, tooltip="Bearish snap recoil — price crossed ribbon midpoint against bullish trend | Spread: " + str.tostring(spreadN, "#.##"))

// Drift Fade — warning placed opposite to trend direction
if showDriftSig and doDrift
    color driftCol = bullTrend ? color.new(colBullW, 20) : color.new(colBearW, 20)
    label.new(bar_index, bullTrend ? high + atrVal * 0.5 : low - atrVal * 0.5, "DRIFT", style=bullTrend ? label.style_label_down : label.style_label_up, color=driftCol, textcolor=color.rgb(180, 175, 160), size=size.tiny, tooltip="Drift fade — trend force decayed to dormant (" + str.tostring(spreadPct, "#") + "%) | Weave losing conviction")

// ──────────────────── COMMAND PANEL (DASHBOARD) ───────────────────────────
color dashBg   = color.rgb(8, 8, 22, 5)
color dashBord = color.rgb(40, 40, 65)
color dashLbl  = color.rgb(140, 145, 175)
color dashDim  = color.rgb(85, 88, 110)

var table htwDash = table.new(position.top_right, 2, 12, bgcolor=dashBg, border_color=dashBord, border_width=1, frame_width=1, frame_color=dashBord)

if showDash and barstate.islast
    string tDir = bullTrend ? "ASCENT" : "DESCENT"
    // Row 0 — Title
    table.cell(htwDash, 0, 0, "HTW [JOAT]",   text_color=trendCol, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 0, tDir,             text_color=trendCol, text_size=size.small, text_font_family=font.family_monospace)
    // Row 1 — Phase
    string phaseStr = bullTrend and rising ? "DOMINANT RISE" : bullTrend and not rising ? "FADING RISE" : not bullTrend and falling ? "DOMINANT FALL" : "FADING FALL"
    color phaseCol = bullTrend and rising ? colBullS : bullTrend and not rising ? colBullW : not bullTrend and falling ? colBearS : colBearW
    table.cell(htwDash, 0, 1, "PHASE",         text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 1, phaseStr,         text_color=phaseCol, text_size=size.small, text_font_family=font.family_monospace)
    // Row 2 — Strength
    color forceCol = spreadPct > 70 ? colBullS : spreadPct > 30 ? colSurge : colBearW
    table.cell(htwDash, 0, 2, "FORCE",         text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 2, strengthLabel + " " + str.tostring(spreadPct, "#") + "%", text_color=forceCol, text_size=size.small, text_font_family=font.family_monospace)
    // Row 3 — Spread
    table.cell(htwDash, 0, 3, "APERTURE",      text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 3, str.tostring(spreadN, "#.##") + " (" + spreadDir + ")", text_color=spreadRoc > 0 ? colFan : spreadRoc < 0 ? colBearS : dashDim, text_size=size.small, text_font_family=font.family_monospace)
    // Row 4 — Alignment
    table.cell(htwDash, 0, 4, "ALIGNMENT",     text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    color alCol = alignPct >= 100 ? colFan : alignPct >= 50 ? colSurge : dashDim
    table.cell(htwDash, 1, 4, alignLabel + " " + str.tostring(alignPct, "#") + "%", text_color=alCol, text_size=size.small, text_font_family=font.family_monospace)
    // Row 5 — Morphic multiplier
    color morphCol = adaptMult > 1.5 ? colSqz : adaptMult < 0.7 ? colSurge : dashDim
    table.cell(htwDash, 0, 5, "MORPH",         text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 5, str.tostring(adaptMult, "#.##") + "x", text_color=morphCol, text_size=size.small, text_font_family=font.family_monospace)
    // Row 6 — Compression
    table.cell(htwDash, 0, 6, "COMPRESS",      text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 6, isSqueeze ? "ACTIVE" : "NONE", text_color=isSqueeze ? colSqz : dashDim, text_size=size.small, text_font_family=font.family_monospace)
    // Row 7 — Filament config
    table.cell(htwDash, 0, 7, "WEAVE",         text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 7, maType + " x" + str.tostring(ribbonN), text_color=dashDim, text_size=size.small, text_font_family=font.family_monospace)
    // Row 8 — Vol regime
    table.cell(htwDash, 0, 8, "VOL REG",       text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 8, str.tostring(volReg, "#.##"), text_color=volReg > 1.2 ? colSqz : volReg < 0.8 ? colSurge : dashDim, text_size=size.small, text_font_family=font.family_monospace)
    // Row 9 — Ribbon midpoint
    table.cell(htwDash, 0, 9, "MIDPOINT",      text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    string midRel = close > ribbonMid ? "ABOVE" : "BELOW"
    color midCol = close > ribbonMid ? colBullS : colBearS
    table.cell(htwDash, 1, 9, midRel + " " + str.tostring(ribbonMid, "#.##"), text_color=midCol, text_size=size.small, text_font_family=font.family_monospace)
    // Row 10 — Lead period
    table.cell(htwDash, 0, 10, "LEAD PER",     text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 10, str.tostring(per01), text_color=colSurge, text_size=size.small, text_font_family=font.family_monospace)
    // Row 11 — Anchor period
    table.cell(htwDash, 0, 11, "ANCHOR PER",   text_color=dashLbl, text_size=size.small, text_font_family=font.family_monospace)
    table.cell(htwDash, 1, 11, str.tostring(ribbonN >= 12 ? per12 : ribbonN >= 8 ? per08 : per04), text_color=colTwist, text_size=size.small, text_font_family=font.family_monospace)

// ──────────────────── ALERTS ────────────────────────────────────────────────
alertcondition(bullCross,              title="Ascent Cross",         message="HTW: Weave turned bullish — lead filament crossed above anchor")
alertcondition(bearCross,              title="Descent Cross",        message="HTW: Weave turned bearish — lead filament crossed below anchor")
alertcondition(twistBullEdge,          title="Bull Twist Confirmed", message="HTW: Bullish twist confirmed — ribbon inversion sustained")
alertcondition(twistBearEdge,          title="Bear Twist Confirmed", message="HTW: Bearish twist confirmed — ribbon inversion sustained")
alertcondition(isSqueeze and not isSqueeze[1], title="Compression Onset",   message="HTW: Ribbon compression detected")
alertcondition(not isSqueeze and isSqueeze[1], title="Compression Release", message="HTW: Ribbon compression released — expansion beginning")
alertcondition(alignPct >= 100 and nz(alignPct[1]) < 100, title="Full Alignment", message="HTW: All filaments in perfect sequential alignment")
alertcondition(surgeUp or surgeDn,     title="Momentum Surge",      message="HTW: Momentum surge — compression released into rapid expansion")
alertcondition(fanBull or fanBear,     title="Filament Fan",         message="HTW: Filament fan — all MAs achieved perfect sequential order")
alertcondition(snapBull or snapBear,   title="Snap Recoil",          message="HTW: Snap recoil — price crossed ribbon midpoint against trend")
alertcondition(driftWarn,              title="Drift Fade",            message="HTW: Drift fade — trend force decayed to dormant level")
// ══════════════════════════════════════════════════════════════════════════════
`
    },
    {
        id: 'ga-algo-trend-system-tg',
        name: 'GreyAlpha Algo Trend System TG',
        description: 'Advanced trend engine with EMA cloud, Supertrend, fixed dollar SL/TP levels, and multi-channel Telegram integration. [GREYALPHA]',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.0',
        code: `//@version=5
indicator("Algo Trend System TG", overlay=true, max_lines_count=50, max_labels_count=50)

// ==========================================
// 1. SETTINGS & INPUTS
// ==========================================
atrPeriod = input.int(10, "ATR Period for Trend Calculation")
factor = input.float(3.0, "Trend Sensitivity Factor", step=0.1)
cloudFast = input.int(50, "Cloud Fast EMA")
cloudSlow = input.int(150, "Cloud Slow EMA")

// Fixed Dollar Distance Settings
sl_dist  = input.float(20.0, "Stop Loss Distance ($)") 
tp1_dist = input.float(10.0, "TP 1 Distance ($)")
tp2_dist = input.float(20.0, "TP 2 Distance ($)")
tp3_dist = input.float(30.0, "TP 3 Distance ($)")

// --- Telegram Settings (Supports up to 5 Groups) ---
useChat1 = input.bool(false, "Use Chat 1 (Optional)", group="Telegram Settings")
chatID1  = input.string("", "Telegram Chat ID 1", group="Telegram Settings")

useChat2 = input.bool(false, "Use Chat 2 (Optional)", group="Telegram Settings")
chatID2  = input.string("", "Telegram Chat ID 2", group="Telegram Settings")

useChat3 = input.bool(false, "Use Chat 3 (Optional)", group="Telegram Settings")
chatID3  = input.string("", "Telegram Chat ID 3", group="Telegram Settings")

useChat4 = input.bool(false, "Use Chat 4 (Optional)", group="Telegram Settings")
chatID4  = input.string("", "Telegram Chat ID 4", group="Telegram Settings")

useChat5 = input.bool(false, "Use Chat 5 (Optional)", group="Telegram Settings")
chatID5  = input.string("", "Telegram Chat ID 5", group="Telegram Settings")

// Telegram Broadcast Function (Fires dynamically for all enabled chats)
sendTelegramAlerts(string alertText) =>
    if useChat1 and chatID1 != ""
        alert('{"chat_id": "' + chatID1 + '", "text": "' + alertText + '"}', alert.freq_once_per_bar_close)
    if useChat2 and chatID2 != ""
        alert('{"chat_id": "' + chatID2 + '", "text": "' + alertText + '"}', alert.freq_once_per_bar_close)
    if useChat3 and chatID3 != ""
        alert('{"chat_id": "' + chatID3 + '", "text": "' + alertText + '"}', alert.freq_once_per_bar_close)
    if useChat4 and chatID4 != ""
        alert('{"chat_id": "' + chatID4 + '", "text": "' + alertText + '"}', alert.freq_once_per_bar_close)
    if useChat5 and chatID5 != ""
        alert('{"chat_id": "' + chatID5 + '", "text": "' + alertText + '"}', alert.freq_once_per_bar_close)

// --- Time Filter Settings ---
useTimeFilter = input.bool(true, "Use Time Filters for Trading", group="Time Filters")
session1 = input.session("2100-0700", "Trading Session 1", group="Time Filters") 
session2 = input.session("0925-1255", "Trading Session 2", group="Time Filters")
tz = input.string("America/New_York", "Timezone (America/New_York handles UTC-4/UTC-5)", group="Time Filters")

// --- Dashboard Settings ---
useDateFilter = input.bool(true, "Use Date Filter for Dashboard Stats", group="Dashboard Settings")
startDate     = input.time(timestamp("2022-01-01T00:00:00"), "Start Date", group="Dashboard Settings")
endDate       = input.time(timestamp("2030-01-01T00:00:00"), "End Date", group="Dashboard Settings")
closing_tp    = input.string("TP3", "Final Take Profit (Win Condition)", options=["TP1", "TP2", "TP3"], group="Dashboard Settings", tooltip="Select which TP target signifies the end of a successful trade. Once hit, the trade is marked as a WIN and tracking visually stops.")

// --- Visual Toggles ---
show_tp1 = input.bool(true, "Show TP1 on Chart", group="Visual Settings")
show_tp2 = input.bool(true, "Show TP2 on Chart", group="Visual Settings")
show_tp3 = input.bool(true, "Show TP3 on Chart", group="Visual Settings")

// Colors to match the screenshot
colorUp = color.new(#00e676, 0) // Bright Green
colorDn = color.new(#ff1744, 0) // Bright Red
cloudUp = color.new(#00e676, 85) // Transparent Green
cloudDn = color.new(#ff1744, 85) // Transparent Red

// ==========================================
// 2. CORE TREND ENGINE (Supertrend & Cloud)
// ==========================================
[supertrend, direction] = ta.supertrend(factor, atrPeriod)
trendColor = direction < 0 ? colorUp : colorDn

// Stepped Trailing Line plot
plot(supertrend, title="Trailing Line", color=trendColor, linewidth=2, style=plot.style_stepline)

// EMA Cloud
emaF = ta.ema(close, cloudFast)
emaS = ta.ema(close, cloudSlow)
p1 = plot(emaF, title="EMA Fast", color=color.new(color.gray, 100))
p2 = plot(emaS, title="EMA Slow", color=color.new(color.gray, 100))
fillColor = emaF > emaS ? cloudUp : cloudDn
fill(p1, p2, title="Trend Cloud", color=fillColor)

// ==========================================
// 3. SIGNALS, METRICS & TARGET CALCULATIONS
// ==========================================
// --- Time Filter Logic ---
inSession(sess) =>
    not na(time(timeframe.period, sess, tz))

inAllowedTime = not useTimeFilter or inSession(session1) or inSession(session2)

// Variables for keeping Target Levels & Trade State Tracker
var float entryPrice = na
var float stopLoss = na
var float tp1 = na
var float tp2 = na
var float tp3 = na
var float finalTPTarget = na // The one that officially decides Win logic

var bool inTrade = false
var int tradeDirection = 0 // 1 = Long, -1 = Short, 0 = Flat

// --- Dashboard Statistical Variables ---
var int totalTrades = 0
var int buyTrades = 0
var int sellTrades = 0
var int closedTrades = 0
var int winningTrades = 0
var bool trackCurrentTrade = false

// Monitor active trade to check if SL or our chosen final TP has been hit
if inTrade
    if tradeDirection == 1
        if low <= stopLoss // Hit SL -> Loss
            inTrade := false
            tradeDirection := 0
            if trackCurrentTrade
                closedTrades += 1
        else if high >= finalTPTarget // Hit Chosen TP target -> Win
            inTrade := false
            tradeDirection := 0
            if trackCurrentTrade
                winningTrades += 1
                closedTrades += 1
                
    else if tradeDirection == -1
        if high >= stopLoss // Hit SL -> Loss
            inTrade := false
            tradeDirection := 0
            if trackCurrentTrade
                closedTrades += 1
        else if low <= finalTPTarget // Hit Chosen TP target -> Win
            inTrade := false
            tradeDirection := 0
            if trackCurrentTrade
                winningTrades += 1
                closedTrades += 1

// Validation to check if the current bar is inside the set Date Range for dashboard metrics
inDateRange = not useDateFilter or (time >= startDate and time <= endDate)

// Raw Signal Filters
rawBuySignal = ta.crossunder(direction, 0) and (emaF > emaS) and inAllowedTime
rawSellSignal = ta.crossover(direction, 0) and (emaF < emaS) and inAllowedTime

// Filter signals based on current state (prevent consecutive same-directional trades)
buySignal = rawBuySignal and tradeDirection != 1
sellSignal = rawSellSignal and tradeDirection != -1

// Update Levels and Metrics when a new filtered signal hits
if buySignal
    entryPrice := close
    stopLoss := close - sl_dist 
    tp1 := entryPrice + tp1_dist
    tp2 := entryPrice + tp2_dist
    tp3 := entryPrice + tp3_dist
    
    // Assign the tracking target value based on dropdown choice
    finalTPTarget := closing_tp == "TP1" ? tp1 : closing_tp == "TP2" ? tp2 : tp3
    
    inTrade := true
    tradeDirection := 1
    
    // Register Statistical Trackers (Only if within selected timeline)
    if inDateRange
        totalTrades += 1
        buyTrades += 1
        trackCurrentTrade := true
    else
        trackCurrentTrade := false
        
    // Telegram Alert Trigger (Fires Broadcast Function)
    alertText = "PAIR : " + syminfo.ticker + "\\nBUY NOW " + str.tostring(entryPrice, "#.##") + "\\nSL " + str.tostring(stopLoss, "#.##") + "\\nTP1 " + str.tostring(tp1, "#.##") + "\\nTP2 " + str.tostring(tp2, "#.##") + "\\nTP3 " + str.tostring(tp3, "#.##")
    sendTelegramAlerts(alertText)

if sellSignal
    entryPrice := close
    stopLoss := close + sl_dist // Stop loss above entry
    tp1 := entryPrice - tp1_dist
    tp2 := entryPrice - tp2_dist
    tp3 := entryPrice - tp3_dist
    
    // Assign the tracking target value based on dropdown choice
    finalTPTarget := closing_tp == "TP1" ? tp1 : closing_tp == "TP2" ? tp2 : tp3
    
    inTrade := true
    tradeDirection := -1
    
    // Register Statistical Trackers (Only if within selected timeline)
    if inDateRange
        totalTrades += 1
        sellTrades += 1
        trackCurrentTrade := true
    else
        trackCurrentTrade := false
        
    // Telegram Alert Trigger (Fires Broadcast Function)
    alertText = "PAIR : " + syminfo.ticker + "\\nSELL NOW " + str.tostring(entryPrice, "#.##") + "\\nSL " + str.tostring(stopLoss, "#.##") + "\\nTP1 " + str.tostring(tp1, "#.##") + "\\nTP2 " + str.tostring(tp2, "#.##") + "\\nTP3 " + str.tostring(tp3, "#.##")
    sendTelegramAlerts(alertText)

// Plot the Smart Buy/Sell Labels
plotshape(buySignal, title="Buy Signal", style=shape.labelup, location=location.belowbar, color=colorUp, text="+SMART\\nBUY", textcolor=color.black, size=size.small)
plotshape(sellSignal, title="Sell Signal", style=shape.labeldown, location=location.abovebar, color=colorDn, text="+SMART\\nSELL", textcolor=color.white, size=size.small)

// ==========================================
// 4. DRAWING THE LEVELS (TP/SL/Entry Lines)
// ==========================================
var line l_entry = na
var line l_sl = na
var line l_tp1 = na
var line l_tp2 = na
var line l_tp3 = na

var label lb_entry = na
var label lb_sl = na
var label lb_tp1 = na
var label lb_tp2 = na
var label lb_tp3 = na

if (buySignal or sellSignal)
    // Clear old drawings safely
    line.delete(l_entry), line.delete(l_sl), line.delete(l_tp1), line.delete(l_tp2), line.delete(l_tp3)
    label.delete(lb_entry), label.delete(lb_sl), label.delete(lb_tp1), label.delete(lb_tp2), label.delete(lb_tp3)

    // Draw Core structural lines extending to the right
    l_entry := line.new(bar_index, entryPrice, bar_index + 15, entryPrice, color=color.orange, style=line.style_dashed)
    l_sl := line.new(bar_index, stopLoss, bar_index + 15, stopLoss, color=color.red, style=line.style_solid)
    
    lb_entry := label.new(bar_index + 15, entryPrice, "ENTRY : " + str.tostring(math.round(entryPrice, 2)), color=color.orange, textcolor=color.black, style=label.style_label_left, size=size.normal)
    lb_sl := label.new(bar_index + 15, stopLoss, "SL : " + str.tostring(math.round(stopLoss, 2)), color=color.red, textcolor=color.white, style=label.style_label_left, size=size.normal)

    // Draw TP visual targets based on toggle options
    if show_tp1
        l_tp1 := line.new(bar_index, tp1, bar_index + 15, tp1, color=color.green, style=line.style_dashed)
        lb_tp1 := label.new(bar_index + 15, tp1, "TP 1 : " + str.tostring(math.round(tp1, 2)), color=colorUp, textcolor=color.black, style=label.style_label_left, size=size.normal)
    if show_tp2
        l_tp2 := line.new(bar_index, tp2, bar_index + 15, tp2, color=color.green, style=line.style_dashed)
        lb_tp2 := label.new(bar_index + 15, tp2, "TP 2 : " + str.tostring(math.round(tp2, 2)), color=colorUp, textcolor=color.black, style=label.style_label_left, size=size.normal)
    if show_tp3
        l_tp3 := line.new(bar_index, tp3, bar_index + 15, tp3, color=color.green, style=line.style_dashed)
        lb_tp3 := label.new(bar_index + 15, tp3, "TP 3 : " + str.tostring(math.round(tp3, 2)), color=colorUp, textcolor=color.black, style=label.style_label_left, size=size.normal)

// Continuously shift the right anchor of all visible lines and labels forward 
// Drawing progression stops automatically when Trade reaches SL or Chosen Final TP setting (inTrade == false)
if barstate.islast and inTrade
    line.set_x2(l_entry, bar_index + 15), line.set_x2(l_sl, bar_index + 15)
    label.set_x(lb_entry, bar_index + 15), label.set_x(lb_sl, bar_index + 15)
    
    if show_tp1
        line.set_x2(l_tp1, bar_index + 15)
        label.set_x(lb_tp1, bar_index + 15)
    if show_tp2
        line.set_x2(l_tp2, bar_index + 15)
        label.set_x(lb_tp2, bar_index + 15)
    if show_tp3
        line.set_x2(l_tp3, bar_index + 15)
        label.set_x(lb_tp3, bar_index + 15)

// ==========================================
// 5. DASHBOARD (Right Side Strategy Metrics)
// ==========================================
var table dashInfo = table.new(position.top_right, 2, 6, bgcolor=color.new(color.black, 85), border_width=1, border_color=color.gray)

if barstate.islast
    // Calculate Win Rate (Safecatch for dividing by zero)
    winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0
    
    // Format Display Text for the date so it dynamically updates when you change it
    dateDisplay = useDateFilter ? str.format("{0,date,yyyy.MM.dd}", startDate) : "All Time"
    
    // Header
    table.cell(dashInfo, 0, 0, "Stats Timeline", text_color=color.white, text_halign=text.align_left)
    table.cell(dashInfo, 1, 0, "Since " + dateDisplay, text_color=color.orange, text_halign=text.align_right)
    
    // Data Rows
    table.cell(dashInfo, 0, 1, "Total Trades", text_color=color.gray, text_halign=text.align_left)
    table.cell(dashInfo, 1, 1, str.tostring(totalTrades), text_color=color.white, text_halign=text.align_right)
    
    table.cell(dashInfo, 0, 2, "Buy Trades", text_color=color.gray, text_halign=text.align_left)
    table.cell(dashInfo, 1, 2, str.tostring(buyTrades), text_color=colorUp, text_halign=text.align_right)
    
    table.cell(dashInfo, 0, 3, "Sell Trades", text_color=color.gray, text_halign=text.align_left)
    table.cell(dashInfo, 1, 3, str.tostring(sellTrades), text_color=colorDn, text_halign=text.align_right)
    
    table.cell(dashInfo, 0, 4, "Closed Trades", text_color=color.gray, text_halign=text.align_left)
    table.cell(dashInfo, 1, 4, str.tostring(closedTrades), text_color=color.white, text_halign=text.align_right)
    
    // Win Rate dynamically reflects whatever Closing target is set in inputs
    table.cell(dashInfo, 0, 5, "Win Rate (Hits " + closing_tp + ")", text_color=color.gray, text_halign=text.align_left)
    table.cell(dashInfo, 1, 5, str.tostring(math.round(winRate, 2)) + "%", text_color=winRate >= 50 ? colorUp : colorDn, text_halign=text.align_right)
`
    }
];

export const ProductsPage: React.FC<ProductsPageProps> = ({ onBack, onLogout, userMetadata }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const accessStatus = userMetadata?.access?.products || 'locked';

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRequestAccess = async () => {
        if (!userMetadata?.uid) return;
        const path = `users/${userMetadata.uid}`;
        try {
            const userRef = doc(db, 'users', userMetadata.uid);
            await updateDoc(userRef, {
                'access.products': 'pending'
            });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
        }
    };

    const renderLocked = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Products Locked</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                Access to our premium indicators and MT5 bots is restricted to authorized members. 
                Request access to unlock the full suite of GreyAlpha tools.
            </p>
            <button 
                onClick={handleRequestAccess}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-500/30"
            >
                Request Access
            </button>
        </div>
    );

    const renderPending = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mb-6 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Access Pending</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                Your request for product access is being reviewed. 
                Please ensure payment is confirmed. 
                You will be notified once access is granted.
            </p>
        </div>
    );

    const renderGranted = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRODUCTS.map((product) => (
                <div key={product.id} className="bg-white/60 dark:bg-slate-800/30 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden hover:border-green-500/50 transition-colors group shadow-inner">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{product.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 backdrop-blur-sm">
                                            {product.platform}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/20 dark:bg-white/10 border border-white/20 dark:border-white/10 text-gray-700 dark:text-gray-300 backdrop-blur-sm">
                                            {product.type}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-mono text-gray-400">{product.version}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            {product.description}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <a 
                                href={product.platform === 'TradingView' ? "https://www.tradingview.com/chart/" : "https://grey-one.vercel.app"} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-gray-500 hover:text-green-500 transition-colors flex items-center"
                            >
                                {product.platform === 'TradingView' ? 'Open TradingView' : 'Open GreyOne'}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                            
                            <button
                                onClick={() => handleCopy(product.code, product.id)}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all transform active:scale-95 backdrop-blur-md border ${
                                    copiedId === product.id
                                    ? 'bg-green-500/80 border-green-500/50 text-white shadow-lg shadow-green-500/30'
                                    : 'bg-white/80 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-white/20'
                                }`}
                            >
                                {copiedId === product.id ? 'Copied!' : 'Copy Script'}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-green-400">
                        GreyAlpha Products
                    </h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                        <button
                            onClick={onLogout}
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Premium Trading Tools</h2>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2 max-w-2xl mx-auto">
                            Exclusive indicators and automated scripts developed by the GreyAlpha Quantitative Team.
                        </p>
                    </div>

                    {accessStatus === 'locked' && renderLocked()}
                    {accessStatus === 'pending' && renderPending()}
                    {accessStatus === 'granted' && renderGranted()}
                </main>
            </div>
            <footer className="w-full text-center pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-gray-600 dark:text-dark-text/60 text-sm">
                <p>This is not financial advice. All analysis is for informational purposes only.</p>
                <p className="mt-2">
                    Contact: <a href="mailto:ma8138498@gmail.com" className="font-medium text-green-600 dark:text-green-400 hover:underline">ma8138498@gmail.com</a>
                </p>
            </footer>
        </div>
    );
};

