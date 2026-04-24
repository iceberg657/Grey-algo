
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './contexts/ThemeContext';
import { ThemeToggleButton } from './ThemeToggleButton';
import { NeuralBackground } from './NeuralBackground';
import Chart from 'chart.js/auto';

const landingPageCss = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
}
:root {
    /* Dark Theme */
    --primary-red: #ff3c3c;
    --primary-green: #2ecc71;
    --primary-purple: #9b59b6;
    --primary-yellow: #f1c40f;
    --primary-blue: #3498db;
    --dark-bg: #0f172a;
    --card-bg-dark: rgba(15, 23, 42, 0.3); /* High transparency */
    --text-light: #f0f9ff;
    --text-gray: #94a3b8;
    --border-color-dark: rgba(255, 255, 255, 0.1);
}
.light {
    /* Light Theme */
    --primary-red: #e74c3c;
    --primary-green: #27ae60;
    --primary-purple: #8e44ad;
    --primary-yellow: #f39c12;
    --primary-blue: #2980b9;
    --light-bg: #f8fafc;
    --card-bg-light: rgba(255, 255, 255, 0.8); /* Higher opacity for better visibility */
    --text-dark: #0f172a;
    --text-muted: #334155;
    --border-color-light: #94a3b8;
}
.landing-body {
    background: transparent;
    color: var(--text-light);
    overflow-x: hidden;
    scroll-behavior: smooth;
    transition: background 0.3s ease, color 0.3s ease;
    position: relative;
}
.light .landing-body {
    background: var(--light-bg);
    color: var(--text-dark);
}

.landing-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 2; /* Content above bg */
}

.landing-header {
    background: rgba(15, 23, 42, 0.2); /* Very Transparent Header */
    backdrop-filter: blur(10px);
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
    border-bottom: 1px solid var(--border-color-dark);
    transition: all 0.3s ease;
}
.light .landing-header {
    background: rgba(244, 247, 249, 0.2);
    border-bottom-color: var(--border-color-light);
}
.landing-header.scrolled {
    padding: 5px 0;
    background: rgba(15, 23, 42, 0.5);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;
    transition: all 0.3s ease;
}
.header-container.scrolled {
    padding: 10px 0;
}
.logo {
    display: flex;
    align-items: center;
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(90deg, var(--primary-blue), var(--primary-purple));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    transition: all 0.3s ease;
}
.logo i {
    margin-right: 10px;
    font-size: 2rem;
    color: var(--primary-blue);
}
nav ul {
    display: flex;
    list-style: none;
    align-items: center;
}
nav ul li {
    margin-left: 30px;
}
nav ul li a {
    color: var(--text-light);
    text-decoration: none;
    font-weight: 500;
    position: relative;
    padding: 5px 0;
    transition: color 0.3s;
}
.light nav ul li a {
    color: var(--text-dark);
}
nav ul li a:hover {
    color: var(--primary-blue);
}

.hero {
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 120px; /* Space for fixed header */
    padding-bottom: 50px;
    position: relative;
    text-align: center;
}

.hero-content {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.hero h1 {
    font-size: 3.5rem;
    margin-bottom: 20px;
    background: linear-gradient(90deg, var(--text-light), var(--primary-blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1.2;
    text-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
}
.light .hero h1 {
    background: linear-gradient(90deg, #0f172a, var(--primary-blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
.hero p {
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 40px;
    color: var(--text-gray);
    max-width: 700px;
}
.light .hero p {
    color: var(--text-muted);
}

.cta-button {
    display: inline-block;
    padding: 12px 30px;
    background: linear-gradient(90deg, var(--primary-blue), var(--primary-purple));
    color: white;
    border-radius: 30px;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.3s, box-shadow 0.3s;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
}
.cta-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.6);
}

/* Ticker Section */
.ticker-wrap {
    width: 100%;
    background: rgba(15, 23, 42, 0.2); /* Transparent */
    padding: 15px 0;
    overflow: hidden;
    margin-top: 40px;
    border-bottom: 1px solid var(--border-color-dark);
    backdrop-filter: blur(5px);
}
.light .ticker-wrap {
    background: rgba(255, 255, 255, 0.2);
    border-bottom-color: var(--border-color-light);
}
.ticker {
    display: flex;
    white-space: nowrap;
    animation: tickerScroll 30s linear infinite;
}
.ticker-item {
    display: flex;
    align-items: center;
    margin-right: 50px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
}
.up { color: var(--primary-green); }
.down { color: var(--primary-red); }

.bottom-text {
    text-align: center;
    color: var(--text-gray);
    font-size: 0.9rem;
    max-width: 800px;
    margin: 40px auto 20px;
}
.light .bottom-text {
    color: var(--text-muted);
}

/* Sections */
.section { 
    padding: 80px 0; 
    background: transparent; /* Fully transparent to see neural net */
    margin-bottom: 1px; 
}

.section-title {
    text-align: center;
    margin-bottom: 50px;
}
.section-title h2 {
    font-size: 2.5rem;
    margin-bottom: 15px;
    background: linear-gradient(90deg, var(--primary-blue), var(--primary-yellow));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
.section-title p {
    color: var(--text-gray);
    max-width: 600px;
    margin: 0 auto;
}
.light .section-title p {
    color: var(--text-muted);
}

.products-grid { display: grid; gap: 30px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.product-card {
    background: var(--card-bg-dark);
    border-radius: 15px;
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
    border: 1px solid var(--border-color-dark);
    backdrop-filter: blur(12px); /* Glassmorphism */
    box-shadow: inset 0 2px 4px 0 rgba(255, 255, 255, 0.05);
}
.light .product-card {
    background: var(--card-bg-light);
    border: 1px solid var(--border-color-light);
}
.product-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    border-color: rgba(52, 152, 219, 0.3);
}
.product-image { height: 200px; overflow: hidden; }
.product-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.product-card:hover .product-image img { transform: scale(1.05); }
.product-content { padding: 25px; }
.product-content h3 { font-size: 1.5rem; margin-bottom: 15px; color: var(--primary-blue); }
.product-content p { color: var(--text-gray); margin-bottom: 20px; line-height: 1.6; }
.product-features { list-style: none; margin-bottom: 20px; }
.product-features li { display: flex; align-items: center; margin-bottom: 10px; color: var(--text-light); }
.light .product-features li { color: var(--text-dark); }
.product-features li i { color: var(--primary-green); margin-right: 10px; }

/* Pricing */
.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; }
.pricing-card {
    background: var(--card-bg-dark);
    border-radius: 15px;
    padding: 30px;
    text-align: center;
    transition: transform 0.3s;
    border: 1px solid var(--border-color-dark);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(12px);
    box-shadow: inset 0 2px 4px 0 rgba(255, 255, 255, 0.05);
}
.light .pricing-card { background: var(--card-bg-light); border: 1px solid var(--border-color-light); }
.pricing-card:hover { transform: translateY(-10px); border-color: rgba(155, 89, 182, 0.3); }
.pricing-card.popular::before {
    content: "POPULAR";
    position: absolute;
    top: 15px;
    right: -30px;
    background: var(--primary-purple);
    color: white;
    padding: 5px 30px;
    font-size: 0.8rem;
    font-weight: 700;
    transform: rotate(45deg);
}
.pricing-card h3 { font-size: 1.8rem; margin-bottom: 20px; color: var(--primary-yellow); }
.price {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 20px;
    background: linear-gradient(90deg, var(--primary-yellow), var(--primary-green));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
.price span { font-size: 1rem; color: var(--text-gray); }
.pricing-features { list-style: none; margin-bottom: 30px; }
.pricing-features li { padding: 10px 0; border-bottom: 1px solid var(--border-color-dark); color: var(--text-gray); }
.pricing-features li:last-child { border-bottom: none; }

/* Contact */
.contact {
    background: var(--card-bg-dark);
    border-radius: 15px;
    overflow: hidden;
    display: flex;
    margin-top: 50px;
    border: 1px solid var(--border-color-dark);
    backdrop-filter: blur(12px);
    box-shadow: inset 0 2px 4px 0 rgba(255, 255, 255, 0.05);
}
.light .contact { background: var(--card-bg-light); border-color: var(--border-color-light); }
.contact-info { flex: 1; padding: 50px; background: rgba(52, 152, 219, 0.05); }
.light .contact-info { background: rgba(0,0,0,0.02); }
.contact-info h3 { font-size: 2rem; margin-bottom: 30px; color: var(--primary-blue); }
.contact-item { display: flex; align-items: center; margin-bottom: 20px; }
.contact-item i {
    font-size: 1.5rem;
    width: 50px;
    height: 50px;
    background: rgba(52, 152, 219, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-right: 15px;
    color: var(--primary-blue);
}
.contact-form { flex: 1; padding: 50px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group textarea {
    width: 100%;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color-dark);
    border-radius: 8px;
    color: var(--text-light);
    font-size: 1rem;
}
.light .form-group input, .light .form-group textarea {
    background: #fff;
    border-color: var(--border-color-light);
    color: var(--text-dark);
}
.form-group textarea { height: 150px; resize: vertical; }

/* Footer */
footer { background: rgba(15, 23, 42, 0.2); padding: 50px 0 20px; margin-top: 0; backdrop-filter: blur(5px); }
.light footer { background: rgba(233, 236, 239, 0.2); }
.footer-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; margin-bottom: 40px; }
.footer-column h4 { font-size: 1.3rem; margin-bottom: 20px; color: var(--primary-blue); }
.footer-links { list-style: none; }
.footer-links li { margin-bottom: 10px; }
.footer-links a { color: var(--text-gray); text-decoration: none; transition: color 0.3s; }
.footer-links a:hover { color: var(--primary-blue); }
.copyright { text-align: center; padding-top: 20px; border-top: 1px solid var(--border-color-dark); color: var(--text-gray); }

.chart-container {
    height: 300px;
    margin: 50px 0;
    background: var(--card-bg-dark);
    border-radius: 15px;
    padding: 20px;
    border: 1px solid var(--border-color-dark);
    backdrop-filter: blur(12px);
    box-shadow: inset 0 2px 4px 0 rgba(255, 255, 255, 0.05);
}
.light .chart-container { background: #fff; border-color: var(--border-color-light); }

@keyframes tickerScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
}

@media (max-width: 992px) { .contact { flex-direction: column; } }
@media (max-width: 768px) {
    .hero h1 { font-size: 2.5rem; }
    .header-container { flex-direction: column; }
    nav ul { margin-top: 15px; flex-wrap: wrap; justify-content: center; }
}
`;

const LiveSignalFeed: React.FC = () => {
    const [signals, setSignals] = useState<any[]>([]);
    
    const assets = ['EUR/USD', 'GBP/JPY', 'XAU/USD', 'NAS100', 'US30', 'BTC/USD'];
    const outcomes = ['WIN', 'TP HIT', 'BREAKEVEN'];
    
    const addSignal = () => {
        const asset = assets[Math.floor(Math.random() * assets.length)];
        const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const pips = Math.floor(Math.random() * 50) + 10;
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        const isWin = outcome !== 'BREAKEVEN';
        
        const newSignal = {
            id: `${Date.now()}-${Math.random()}`,
            asset,
            direction,
            pips,
            outcome,
            isWin,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        
        setSignals(prev => [newSignal, ...prev].slice(0, 5));
    };

    useEffect(() => {
        // Initial population
        addSignal();
        addSignal();
        
        const interval = setInterval(() => {
            if (Math.random() > 0.3) {
                addSignal();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute top-24 right-4 md:right-10 z-20 hidden lg:block w-72 pointer-events-none opacity-80">
            <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-1 pl-2">Live Alpha Stream</div>
                {signals.map((sig) => (
                    <div key={sig.id} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-white/10 p-3 rounded-lg shadow-lg animate-fade-in flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-800 dark:text-white text-sm">{sig.asset}</span>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${sig.direction === 'BUY' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>{sig.direction}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{sig.time}</span>
                        </div>
                        <div className="text-right">
                            <div className={`font-mono font-bold ${sig.isWin ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {sig.isWin ? '+' : ''}{sig.pips} Pips
                            </div>
                            <span className="text-[10px] text-gray-600 dark:text-gray-500 font-bold">{sig.outcome}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

import { useAuth } from '../hooks/useAuth';

export const LandingPage: React.FC<{ onEnterApp: () => void }> = ({ onEnterApp }) => {
    const { theme } = useTheme();
    const { loginWithGoogle } = useAuth();

    const handleGoogleSignUp = async () => {
        try {
            await loginWithGoogle();
            onEnterApp();
        } catch (error) {
            console.error('Google sign up failed:', error);
        }
    };

    useEffect(() => {
        document.body.classList.add('landing-body');
        if (theme === 'light') {
            document.body.classList.add('light');
        } else {
            document.body.classList.remove('light');
        }

        // Ticker Logic
        async function initTicker() {
            const ticker = document.getElementById('stockTicker');
            if (!ticker) return;
            
            let tickerData: any[] = [];
            try {
                const response = await fetch('/api/marketData');
                if (response.ok) tickerData = await response.json();
            } catch (e) { console.error(e); }

            if (tickerData.length === 0) {
                 tickerData = [
                    { symbol: "EUR/USD", price: 1.0850, change: 0.0015, changePercent: 0.14 },
                    { symbol: "GBP/USD", price: 1.2640, change: -0.0020, changePercent: -0.16 },
                    { symbol: "USD/JPY", price: 148.20, change: 0.45, changePercent: 0.30 },
                    { symbol: "BTC/USD", price: 64500.00, change: 1200.50, changePercent: 1.90 },
                    { symbol: "ETH/USD", price: 3450.50, change: 85.20, changePercent: 2.53 },
                    { symbol: "XAU/USD", price: 2150.40, change: 12.10, changePercent: 0.56 }
                ];
            }
            
            ticker.innerHTML = ''; 
            // Duplicate for smooth loop
            const displayData = [...tickerData, ...tickerData, ...tickerData];

            displayData.forEach((item: any) => {
                const isPositive = item.change >= 0;
                const tickerItem = document.createElement('div');
                tickerItem.className = 'ticker-item';
                
                let pricePrecision = 4;
                if (item.symbol.includes('JPY') || item.symbol.includes('BTC') || item.symbol.includes('ETH') || item.symbol.includes('XAU')) pricePrecision = 2;
                
                tickerItem.innerHTML = `
                    <span style="font-weight:700; margin-right:8px; color:${theme === 'light'?'#0f172a':'#fff'}">${item.symbol}</span>
                    <span style="margin-right:8px; color:${theme === 'light'?'#334155':'#ccc'}">${item.price.toFixed(pricePrecision)}</span>
                    <span class="${isPositive ? 'up' : 'down'}" style="display:flex; align-items:center">
                        ${isPositive ? '▲' : '▼'} ${Math.abs(item.change).toFixed(pricePrecision)} (${Math.abs(item.changePercent).toFixed(2)}%)
                    </span>
                `;
                ticker.appendChild(tickerItem);
            });
        }

        let marketChartInstance: any = null;
        function createMarketChart() {
            if (marketChartInstance) {
                marketChartInstance.destroy();
                marketChartInstance = null;
            }
            
            const canvas = document.getElementById('marketChart') as HTMLCanvasElement;
            if (!canvas) return;
            
            // Destroy existing chart if it exists by ID
            const existingChart = Chart.getChart('marketChart');
            if (existingChart) {
                existingChart.destroy();
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const assets = [
                { name: 'S&P 500', color: '#3498db', data: [] as number[] },
                { name: 'NASDAQ', color: '#9b59b6', data: [] as number[] },
                { name: 'DOW JONES', color: '#2ecc71', data: [] as number[] }
            ];
            
            assets.forEach(asset => {
                let value = 100;
                for (let i = 0; i < 50; i++) {
                    value += (Math.random() - 0.3) * 5;
                    asset.data.push(value);
                }
            });
            
            marketChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array(50).fill(''),
                    datasets: assets.map(asset => ({
                        label: asset.name,
                        data: asset.data,
                        borderColor: asset.color,
                        backgroundColor: asset.color + '20',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { color: theme === 'dark' ? '#f0f9ff' : '#2c3e50', font: { size: 12 } } },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }
            });
        }

        initTicker();
        const chartTimeout = setTimeout(createMarketChart, 500); // Slight delay to ensure DOM is ready

        const loader = document.getElementById('loader');
        if(loader) setTimeout(() => loader.classList.add('hidden'), 1000);

        return () => {
            clearTimeout(chartTimeout);
            document.body.classList.remove('landing-body', 'light');
            if (marketChartInstance) {
                marketChartInstance.destroy();
                marketChartInstance = null;
            }
            const existingChart = Chart.getChart('marketChart');
            if (existingChart) {
                existingChart.destroy();
            }
        };
    }, [theme]);

    return (
        <>
            <style>{landingPageCss}</style>
            <div className="relative min-h-screen bg-[#0f172a] dark:bg-[#0f172a] transition-colors duration-300">
                <NeuralBackground />
                <div className="loader" id="loader">
                    <div className="loader-spinner"></div>
                </div>
                
                {/* Simulated Live Feed */}
                <LiveSignalFeed />

                {/* Header */}
                <header className="landing-header">
                    <div className="landing-container header-container">
                        <div className="logo">
                            <i className="fas fa-chart-line"></i>
                            <span>GreyAlpha</span>
                        </div>
                        <nav>
                            <ul>
                                <li><a href="#home">Home</a></li>
                                <li><a href="#products">Products</a></li>
                                <li><a href="#pricing">Pricing</a></li>
                                <li><a href="#contact">Contact</a></li>
                                <li><ThemeToggleButton /></li>
                                <li>
                                    <button onClick={onEnterApp} className="cta-button" style={{padding: '8px 20px', fontSize: '0.9rem'}}>
                                        Get Started With Our App
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="hero" id="home">
                    <div className="landing-container">
                        <div className="hero-content">
                            <h1>Unleash our cutting-edge AI to navigate financial markets with precision and confidence.</h1>
                            <p>Our advanced algorithms analyze market data in real-time to identify your next high-probability trade.</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a href="#products" className="cta-button">Explore Our Products</a>
                                <button 
                                    onClick={handleGoogleSignUp}
                                    className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full font-bold transition-all backdrop-blur-md flex items-center justify-center gap-2 shadow-xl"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Sign up with Google
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Data Ticker Strip */}
                    <div className="ticker-wrap">
                        <div className="ticker" id="stockTicker"></div>
                    </div>

                    {/* Footer Text */}
                    <p className="bottom-text">
                        Discover our suite of advanced trading tools designed to give you the competitive edge in financial markets.
                    </p>
                </section>

                {/* Products Section */}
                <section className="section" id="products">
                    <div className="landing-container">
                        <div className="section-title">
                            <h2>Our Trading Products</h2>
                            <p>Discover our suite of advanced trading tools designed to give you the competitive edge in financial markets.</p>
                        </div>
                        
                        <div className="products-grid">
                            <div className="product-card">
                                <div className="product-image">
                                    <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Volatility AI Scanner" />
                                </div>
                                <div className="product-content">
                                    <h3>Volatility AI Scanner</h3>
                                    <p>Our AI-powered scanner detects volatility patterns and potential breakouts in real-time across multiple markets and timeframes.</p>
                                    <ul className="product-features">
                                        <li><i className="fas fa-check-circle"></i> Real-time market scanning</li>
                                        <li><i className="fas fa-check-circle"></i> Advanced pattern recognition</li>
                                        <li><i className="fas fa-check-circle"></i> Multi-market coverage</li>
                                    </ul>
                                    <a href="#pricing" className="cta-button">View Pricing</a>
                                </div>
                            </div>
                            
                            <div className="product-card">
                                <div className="product-image">
                                    <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Neural Trading Systems" />
                                </div>
                                <div className="product-content">
                                    <h3>Neural Trading Systems</h3>
                                    <p>Deep learning models that adapt to changing market conditions and identify complex patterns for high-probability trades.</p>
                                    <ul className="product-features">
                                        <li><i className="fas fa-check-circle"></i> Self-learning algorithms</li>
                                        <li><i className="fas fa-check-circle"></i> Adaptive market analysis</li>
                                        <li><i className="fas fa-check-circle"></i> Risk management protocols</li>
                                    </ul>
                                    <a href="#pricing" className="cta-button">View Pricing</a>
                                </div>
                            </div>
                            
                            <div className="product-card">
                                <div className="product-image">
                                    <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Custom Strategies" />
                                </div>
                                <div className="product-content">
                                    <h3>Custom Strategies</h3>
                                    <p>Tailored trading strategies developed specifically for your risk profile, trading style, and financial goals.</p>
                                    <ul className="product-features">
                                        <li><i className="fas fa-check-circle"></i> Personalized strategy development</li>
                                        <li><i className="fas fa-check-circle"></i> Backtesting and optimization</li>
                                        <li><i className="fas fa-check-circle"></i> Real-time performance monitoring</li>
                                    </ul>
                                    <a href="#pricing" className="cta-button">View Pricing</a>
                                </div>
                            </div>
                            
                            <div className="product-card">
                                <div className="product-image">
                                    <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Automation Creation" />
                                </div>
                                <div className="product-content">
                                    <h3>Automation Creation</h3>
                                    <p>Build and deploy automated trading systems without coding. Our visual editor makes strategy automation accessible to everyone.</p>
                                    <ul className="product-features">
                                        <li><i className="fas fa-check-circle"></i> Visual strategy builder</li>
                                        <li><i className="fas fa-check-circle"></i> No coding required</li>
                                        <li><i className="fas fa-check-circle"></i> Multi-broker compatibility</li>
                                    </ul>
                                    <a href="#pricing" className="cta-button">View Pricing</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Market Chart */}
                <div className="landing-container">
                    <div className="chart-container">
                        <canvas id="marketChart"></canvas>
                    </div>
                </div>

                {/* Pricing Section */}
                <section className="section" id="pricing">
                    <div className="landing-container">
                        <div className="section-title">
                            <h2>Pricing Plans</h2>
                            <p>Flexible pricing options for traders of all levels. Choose the plan that fits your trading needs.</p>
                        </div>
                        
                        <div className="pricing-grid">
                            <div className="pricing-card">
                                <h3>Starter</h3>
                                <div className="price">$99<span>/month</span></div>
                                <ul className="pricing-features">
                                    <li>Volatility AI Scanner Basic</li>
                                    <li>5 Custom Alerts</li>
                                    <li>Email Support</li>
                                    <li>Daily Market Reports</li>
                                    <li>Limited Strategy Backtesting</li>
                                </ul>
                                <a href="#contact" className="cta-button">Get Started</a>
                            </div>
                            
                            <div className="pricing-card popular">
                                <h3>Professional</h3>
                                <div className="price">$249<span>/month</span></div>
                                <ul className="pricing-features">
                                    <li>Full Volatility AI Scanner</li>
                                    <li>Neural Trading System Access</li>
                                    <li>Unlimited Custom Alerts</li>
                                    <li>Priority Support</li>
                                    <li>Advanced Backtesting</li>
                                    <li>2 Custom Strategies</li>
                                </ul>
                                <a href="#contact" className="cta-button">Get Started</a>
                            </div>
                            
                            <div className="pricing-card">
                                <h3>Enterprise</h3>
                                <div className="price">$499<span>/month</span></div>
                                <ul className="pricing-features">
                                    <li>All Professional Features</li>
                                    <li>Unlimited Custom Strategies</li>
                                    <li>Full Automation Suite</li>
                                    <li>24/7 Dedicated Support</li>
                                    <li>API Access</li>
                                    <li>Premium Market Data Feeds</li>
                                </ul>
                                <a href="#contact" className="cta-button">Get Started</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section className="section" id="contact">
                    <div className="landing-container">
                        <div className="section-title">
                            <h2>Contact Us</h2>
                            <p>Have questions or ready to get started? Reach out to our team for more information.</p>
                        </div>
                        
                        <div className="contact">
                            <div className="contact-info">
                                <h3>Get In Touch</h3>
                                
                                <div className="contact-details">
                                    <div className="contact-item">
                                        <i className="fas fa-phone-alt mt-1"></i>
                                        <div>
                                            <h4>Phone / WhatsApp</h4>
                                            <div className="flex gap-4 mt-2">
                                                <a href="tel:+2348123792862" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors font-medium">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                                    Call
                                                </a>
                                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                                <a href="https://wa.me/2348123792862" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 transition-colors font-medium">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                                    WhatsApp
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="contact-item cursor-pointer" onClick={() => window.location.href = "mailto:ma8138498@gmail.com"}>
                                        <i className="fas fa-envelope"></i>
                                        <div>
                                            <h4>Email</h4>
                                            <p className="hover:text-blue-500 transition-colors">ma8138498@gmail.com</p>
                                        </div>
                                    </div>
                                    
                                    <div className="contact-item">
                                        <i className="fas fa-map-marker-alt"></i>
                                        <div>
                                            <h4>Headquarters</h4>
                                            <p>Lagos, Nigeria</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <h3>About GreyAlpha</h3>
                                <p>GreyAlpha is a leading provider of algorithmic trading solutions. Our team of financial experts, data scientists, and software engineers develop cutting-edge tools that help traders leverage technology for better market performance.</p>
                            </div>
                            
                            <div className="contact-form">
                                <h3>Send a Message</h3>
                                <form id="contactForm" onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                                    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                                    const subject = (form.elements.namedItem('subject') as HTMLInputElement).value;
                                    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;
                                    const mailtoLink = `mailto:ma8138498@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
                                    window.location.href = mailtoLink;
                                }}>
                                    <div className="form-group">
                                        <label htmlFor="name">Name</label>
                                        <input type="text" id="name" name="name" required />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="email">Email</label>
                                        <input type="email" id="email" name="email" required />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="subject">Subject</label>
                                        <input type="text" id="subject" name="subject" required />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="message">Message</label>
                                        <textarea id="message" name="message" required></textarea>
                                    </div>
                                    
                                    <button type="submit" className="cta-button">Send Message</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Partners / Built On Section */}
                <section className="py-24 relative z-10 overflow-hidden">
                    <div className="landing-container relative z-10 max-w-6xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider relative inline-block drop-shadow-md">
                                Built on robust, institutional-grade infrastructure and data providers.
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                            
                            {/* Google */}
                            <div className="group relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-white/40 dark:hover:bg-slate-900/50 transition-all duration-500 flex flex-col items-center text-center min-h-[280px]">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/5 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] pointer-events-none"></div>
                                <div className="flex-1 flex flex-col items-center justify-center transform group-hover:-translate-y-4 transition-transform duration-500 w-full">
                                    <div className="w-20 h-20 mb-6 flex items-center justify-center drop-shadow-md">
                                        <img src="https://www.vectorlogo.zone/logos/google/google-icon.svg" alt="Google Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 drop-shadow-sm">Google</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 drop-shadow-sm">Firebase Auth & Infrastructure</p>
                                </div>
                                <div className="absolute bottom-6 left-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold drop-shadow-sm">
                                        Powers authentication, real-time database, notifications and admin infrastructure
                                    </p>
                                </div>
                            </div>

                            {/* Deriv */}
                            <div className="group relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-white/40 dark:hover:bg-slate-900/50 transition-all duration-500 flex flex-col items-center text-center min-h-[280px]">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-red-500/5 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] pointer-events-none"></div>
                                <div className="flex-1 flex flex-col items-center justify-center transform group-hover:-translate-y-4 transition-transform duration-500 w-full">
                                    <div className="w-20 h-20 mb-6 flex items-center justify-center drop-shadow-md">
                                        <svg viewBox="0 0 200 200" className="w-[4.5rem] h-[4.5rem] drop-shadow-lg" fill="#FF444F">
                                            <path d="M125.7,28.8 L152.0,24.5 L129.5,175.5 L91.2,175.5 C55.3,175.5 35.8,151.7 35.8,118.4 C35.8,79.5 61.1,70.5 89.8,70.5 L106.8,70.5 L125.7,28.8 Z M103.5,91.8 L84.2,91.8 C64.1,91.8 59.2,104.2 59.2,119.5 C59.2,138.8 68.2,154.2 86.8,154.2 L95.2,154.2 L103.5,91.8 Z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 drop-shadow-sm">Deriv</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-2 drop-shadow-sm">Live Price Feed & Trade Data</p>
                                </div>
                                <div className="absolute bottom-6 left-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold drop-shadow-sm">
                                        Provides live WebSocket price feeds and OHLC data for the Sniper Page engine
                                    </p>
                                </div>
                            </div>

                            {/* Twelve Data */}
                            <div className="group relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-white/40 dark:hover:bg-slate-900/50 transition-all duration-500 flex flex-col items-center text-center min-h-[280px]">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/5 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] pointer-events-none"></div>
                                <div className="flex-1 flex flex-col items-center justify-center transform group-hover:-translate-y-4 transition-transform duration-500 w-full">
                                    <div className="w-20 h-20 mb-6 flex items-center justify-center drop-shadow-md">
                                        <svg viewBox="0 0 100 100" className="w-[4.5rem] h-[4.5rem] drop-shadow-lg rounded-sm overflow-hidden">
                                            <rect width="100" height="100" fill="#2563eb" />
                                            <text x="50" y="74" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="76" fill="white" textAnchor="middle" letterSpacing="-4">12</text>
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 drop-shadow-sm">Twelve Data</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#2563eb] dark:text-[#60a5fa] mb-2 drop-shadow-sm">Market Scanner & Validation</p>
                                </div>
                                <div className="absolute bottom-6 left-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold drop-shadow-sm">
                                        Validates hourly market momentum for the dashboard asset scanner
                                    </p>
                                </div>
                            </div>

                            {/* Gemini AI */}
                            <div className="group relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-white/40 dark:hover:bg-slate-900/50 transition-all duration-500 flex flex-col items-center text-center min-h-[280px]">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] pointer-events-none"></div>
                                <div className="flex-1 flex flex-col items-center justify-center transform group-hover:-translate-y-4 transition-transform duration-500 w-full">
                                    <div className="w-20 h-20 mb-6 flex items-center justify-center drop-shadow-md">
                                        <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-lg" fill="none">
                                            <defs>
                                                <linearGradient id="gemini-grad-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#4285F4"/>
                                                    <stop offset="50%" stopColor="#9B72CB"/>
                                                    <stop offset="100%" stopColor="#D96570"/>
                                                </linearGradient>
                                            </defs>
                                            <path d="M11.968 24C12.443 17.514 17.514 12.443 24 11.968C17.514 11.494 12.443 6.422 11.968 0C11.494 6.422 6.422 11.494 0 11.968C6.422 12.443 11.494 17.514 11.968 24Z" fill="url(#gemini-grad-logo)"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 drop-shadow-sm">Gemini AI</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#9B72CB] mb-2 drop-shadow-sm">Neural Analysis Engine</p>
                                </div>
                                <div className="absolute bottom-6 left-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold drop-shadow-sm">
                                        The neural analysis engine powering all trade signals, chatbot and market reasoning
                                    </p>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer>
                    <div className="landing-container">
                        <div className="footer-content">
                            <div className="footer-column">
                                <h4>GreyAlpha</h4>
                                <p>Advanced algorithmic trading solutions for modern traders. Harness the power of AI and quantitative analysis for superior market performance.</p>
                            </div>
                            
                            <div className="footer-column">
                                <h4>Products</h4>
                                <ul className="footer-links">
                                    <li><a href="#">Volatility AI Scanner</a></li>
                                    <li><a href="#">Neural Trading Systems</a></li>
                                    <li><a href="#">Custom Strategies</a></li>
                                    <li><a href="#">Automation Creation</a></li>
                                    <li><a href="#">Market Analytics</a></li>
                                </ul>
                            </div>
                            
                            <div className="footer-column">
                                <h4>Resources</h4>
                                <ul className="footer-links">
                                    <li><a href="#">Documentation</a></li>
                                    <li><a href="#">Trading Academy</a></li>
                                    <li><a href="#">Market Insights</a></li>
                                    <li><a href="#">API Reference</a></li>
                                    <li><a href="#">System Status</a></li>
                                </ul>
                            </div>
                            
                            <div className="footer-column">
                                <h4>Company</h4>
                                <ul className="footer-links">
                                    <li><a href="#">About Us</a></li>
                                    <li><a href="#">Careers</a></li>
                                    <li><a href="#">Blog</a></li>
                                    <li><a href="#">Partners</a></li>
                                    <li><a href="#">Contact</a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="copyright flex flex-col items-center">
                            <p className="text-sm opacity-50">&copy; 2026 GreyAlpha. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
};
