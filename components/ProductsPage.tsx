
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
        id: 'ga-isv-200-pro',
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

