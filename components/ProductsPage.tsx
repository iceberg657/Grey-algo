
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

