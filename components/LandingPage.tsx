
import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggleButton } from './ThemeToggleButton';

const landingPageCss = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
:root {
    /* Dark Theme */
    --primary-red: #ff3c3c;
    --primary-green: #2ecc71;
    --primary-purple: #9b59b6;
    --primary-yellow: #f1c40f;
    --primary-blue: #3498db;
    --dark-bg: #0f172a;
    --card-bg-dark: rgba(19, 28, 46, 0.8);
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
    --light-bg: #f4f7f9;
    --card-bg-light: rgba(255, 255, 255, 0.9);
    --text-dark: #2c3e50;
    --text-muted: #7f8c8d;
    --border-color-light: #e0e0e0;
}
.landing-body {
    background: linear-gradient(135deg, var(--dark-bg), #1e293b);
    color: var(--text-light);
    overflow-x: hidden;
    scroll-behavior: smooth;
    background-attachment: fixed;
    transition: background 0.3s ease, color 0.3s ease;
}
.light .landing-body {
    background: var(--light-bg);
    color: var(--text-dark);
}
.landing-body::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: 
        radial-gradient(circle at 20% 30%, rgba(155, 89, 182, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(52, 152, 219, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 30% 80%, rgba(241, 196, 15, 0.15) 0%, transparent 40%);
    z-index: -1;
    transition: opacity 0.5s ease;
}
.light .landing-body::before {
    opacity: 0.5;
}
.landing-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}
.landing-header {
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
    border-bottom: 1px solid var(--border-color-dark);
    transition: all 0.3s ease;
}
.light .landing-header {
    background: rgba(244, 247, 249, 0.9);
    border-bottom-color: var(--border-color-light);
}
.landing-header.scrolled {
    padding: 5px 0;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}
.light .landing-header.scrolled {
     box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
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
.logo.scrolled {
    font-size: 1.5rem;
}
.logo i {
    margin-right: 10px;
    font-size: 2rem;
    transition: all 0.3s ease;
}
.logo.scrolled i {
    font-size: 1.6rem;
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
nav ul li a::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--primary-blue), var(--primary-purple));
    transition: width 0.3s;
}
nav ul li a:hover::after {
    width: 100%;
}
.hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding-top: 80px;
    position: relative;
    overflow: hidden;
}
.hero::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: 
        radial-gradient(circle at 10% 20%, rgba(46, 204, 113, 0.1) 0%, transparent 30%),
        radial-gradient(circle at 90% 80%, rgba(255, 60, 60, 0.1) 0%, transparent 30%);
    z-index: -1;
}
.hero-content {
    max-width: 600px;
    z-index: 2;
}
.hero h1 {
    font-size: 3.5rem;
    margin-bottom: 20px;
    background: linear-gradient(90deg, var(--text-light), var(--primary-blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
.light .hero h1 {
    background: linear-gradient(90deg, var(--text-dark), var(--primary-blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
.hero p {
    font-size: 1.2rem;
    line-height: 1.6;
    margin-bottom: 30px;
    color: var(--text-gray);
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
}
.cta-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}
.hero-image {
    position: absolute;
    right: -50px;
    top: 50%;
    transform: translateY(-50%);
    width: 50%;
    max-width: 600px;
    z-index: 1;
}
.ticker-wrap {
    background: rgba(19, 28, 46, 0.9);
    padding: 15px 0;
    overflow: hidden;
    border-top: 1px solid var(--border-color-dark);
    border-bottom: 1px solid var(--border-color-dark);
    margin: 40px 0;
}
.light .ticker-wrap {
    background: #fff;
    border-color: var(--border-color-light);
}
.ticker {
    display: flex;
    white-space: nowrap;
    animation: tickerScroll 25s linear infinite;
}
.ticker-item {
    display: flex;
    align-items: center;
    margin-right: 40px;
}
.ticker-symbol {
    font-weight: 700;
    margin-right: 10px;
}
.ticker-price {
    margin-right: 5px;
}
.ticker-change {
    display: flex;
    align-items: center;
}
.up {
    color: var(--primary-green);
}
.down {
    color: var(--primary-red);
}
.ticker-change i {
    margin-right: 5px;
}
@keyframes tickerScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-100%); }
}
.section {
    padding: 80px 0;
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
.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
}
.product-card {
    background: var(--card-bg-dark);
    border-radius: 15px;
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
    border: 1px solid var(--border-color-dark);
    backdrop-filter: blur(10px);
}
.light .product-card {
    background: var(--card-bg-light);
    border: 1px solid var(--border-color-light);
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}
.product-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    border-color: rgba(52, 152, 219, 0.3);
}
.light .product-card:hover {
    box-shadow: 0 15px 30px rgba(0,0,0,0.1);
    border-color: rgba(41, 128, 185, 0.3);
}
.product-image {
    height: 200px;
    overflow: hidden;
}
.product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s;
}
.product-card:hover .product-image img {
    transform: scale(1.05);
}
.product-content {
    padding: 25px;
}
.product-content h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: var(--primary-blue);
}
.product-content p {
    color: var(--text-gray);
    margin-bottom: 20px;
    line-height: 1.6;
}
.light .product-content p {
    color: var(--text-muted);
}
.product-features {
    list-style: none;
    margin-bottom: 20px;
}
.product-features li {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    color: var(--text-light);
}
.light .product-features li {
    color: var(--text-dark);
}
.product-features li i {
    color: var(--primary-green);
    margin-right: 10px;
}
.pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
}
.pricing-card {
    background: var(--card-bg-dark);
    border-radius: 15px;
    padding: 30px;
    text-align: center;
    transition: transform 0.3s;
    border: 1px solid var(--border-color-dark);
    position: relative;
    overflow: hidden;
}
.light .pricing-card {
    background: var(--card-bg-light);
    border: 1px solid var(--border-color-light);
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}
.pricing-card:hover {
    transform: translateY(-10px);
    border-color: rgba(155, 89, 182, 0.3);
}
.light .pricing-card:hover {
    border-color: rgba(142, 68, 173, 0.3);
}
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
.pricing-card h3 {
    font-size: 1.8rem;
    margin-bottom: 20px;
    color: var(--primary-yellow);
}
.price {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 20px;
    background: linear-gradient(90deg, var(--primary-yellow), var(--primary-green));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
.price span {
    font-size: 1rem;
    color: var(--text-gray);
}
.light .price span {
    color: var(--text-muted);
}
.pricing-features {
    list-style: none;
    margin-bottom: 30px;
}
.pricing-features li {
    padding: 10px 0;
    border-bottom: 1px solid var(--border-color-dark);
    color: var(--text-gray);
}
.light .pricing-features li {
    border-bottom-color: var(--border-color-light);
    color: var(--text-muted);
}
.pricing-features li:last-child {
    border-bottom: none;
}
.contact {
    background: linear-gradient(135deg, rgba(19, 28, 46, 0.9), rgba(15, 23, 42, 0.9));
    border-radius: 15px;
    overflow: hidden;
    display: flex;
    margin-top: 50px;
    border: 1px solid var(--border-color-dark);
}
.light .contact {
    background: var(--light-bg);
    border-color: var(--border-color-light);
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}
.contact-info {
    flex: 1;
    padding: 50px;
    background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(155, 89, 182, 0.1));
}
.light .contact-info {
    background: #e9ecef;
}
.contact-info h3 {
    font-size: 2rem;
    margin-bottom: 30px;
    color: var(--primary-blue);
}
.contact-details {
    margin-bottom: 40px;
}
.contact-item {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}
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
.light .contact-item i {
    background: rgba(41, 128, 185, 0.1);
}
.contact-item div h4 {
    font-size: 1.2rem;
    margin-bottom: 5px;
}
.contact-item div p {
    color: var(--text-gray);
}
.light .contact-item div p {
    color: var(--text-muted);
}
.contact-form {
    flex: 1;
    padding: 50px;
}
.form-group {
    margin-bottom: 20px;
}
.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}
.form-group input,
.form-group textarea {
    width: 100%;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color-dark);
    border-radius: 8px;
    color: var(--text-light);
    font-size: 1rem;
}
.light .form-group input,
.light .form-group textarea {
    background: #fff;
    border-color: var(--border-color-light);
    color: var(--text-dark);
}
.form-group textarea {
    height: 150px;
    resize: vertical;
}
footer {
    background: rgba(15, 23, 42, 0.95);
    padding: 50px 0 20px;
    margin-top: 80px;
}
.light footer {
    background: #e9ecef;
}
.footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
    margin-bottom: 40px;
}
.footer-column h4 {
    font-size: 1.3rem;
    margin-bottom: 20px;
    color: var(--primary-blue);
}
.footer-links {
    list-style: none;
}
.footer-links li {
    margin-bottom: 10px;
}
.footer-links a {
    color: var(--text-gray);
    text-decoration: none;
    transition: color 0.3s;
}
.light .footer-links a {
    color: var(--text-muted);
}
.footer-links a:hover {
    color: var(--primary-blue);
}
.copyright {
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid var(--border-color-dark);
    color: var(--text-gray);
}
.light .copyright {
    border-top-color: var(--border-color-light);
    color: var(--text-muted);
}
.chart-container {
    height: 300px;
    margin: 50px 0;
    background: var(--card-bg-dark);
    border-radius: 15px;
    padding: 20px;
    border: 1px solid var(--border-color-dark);
}
.light .chart-container {
    background: #fff;
    border-color: var(--border-color-light);
}
.loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--dark-bg);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    transition: opacity 0.5s, visibility 0.5s;
}
.light .loader {
    background: var(--light-bg);
}
.loader.hidden {
    opacity: 0;
    visibility: hidden;
}
.loader-spinner {
    width: 50px;
    height: 50px;
    border: 5px solid rgba(255, 255, 255, 0.1);
    border-top: 5px solid var(--primary-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
.light .loader-spinner {
    border-color: rgba(0,0,0,0.1);
    border-top-color: var(--primary-blue);
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
@media (max-width: 992px) {
    .hero-image {
        display: none;
    }
    
    .hero-content {
        max-width: 100%;
        text-align: center;
    }
    
    .contact {
        flex-direction: column;
    }
}
@media (max-width: 768px) {
    .header-container {
        flex-direction: column;
    }
    
    nav ul {
        margin-top: 20px;
        flex-wrap: wrap;
        justify-content: center;
    }
    
    nav ul li {
        margin: 5px 10px;
    }
    
    .hero h1 {
        font-size: 2.5rem;
    }
    .section {
        padding: 50px 0;
    }
}
`;

export const LandingPage: React.FC<{ onEnterApp: () => void }> = ({ onEnterApp }) => {
    const { theme } = useTheme();

    useEffect(() => {
        document.body.classList.add('landing-body');
        // Add light/dark class based on theme context
        if (theme === 'light') {
            document.body.classList.add('light');
        } else {
            document.body.classList.remove('light');
        }

        const Chart = (window as any).Chart;
        if (!Chart) {
            console.error("Chart.js is not loaded");
            return;
        }

        // Updated: Fetch live currency data via the backend API instead of hardcoded stocks
        async function initTicker() {
            const ticker = document.getElementById('stockTicker');
            if (!ticker) return;
            
            let tickerData: any[] = [];

            try {
                // Fetch from our backend which uses Alpha Vantage
                const response = await fetch('/api/marketData');
                if (response.ok) {
                    tickerData = await response.json();
                }
            } catch (e) {
                console.error("Failed to fetch ticker data", e);
            }

            // Fallback data if API quota reached or error (Show fake data to keep UI looking good)
            if (tickerData.length === 0) {
                 tickerData = [
                    { symbol: "EUR/USD", price: 1.0850, change: 0.0015, changePercent: 0.14 },
                    { symbol: "GBP/USD", price: 1.2640, change: -0.0020, changePercent: -0.16 },
                    { symbol: "USD/JPY", price: 148.20, change: 0.45, changePercent: 0.30 },
                    { symbol: "USD/CHF", price: 0.8850, change: 0.0010, changePercent: 0.11 },
                    { symbol: "AUD/USD", price: 0.6540, change: -0.0030, changePercent: -0.46 },
                    { symbol: "EUR/GBP", price: 0.8560, change: 0.0012, changePercent: 0.14 },
                    { symbol: "EUR/JPY", price: 160.80, change: 0.55, changePercent: 0.34 },
                    { symbol: "GBP/JPY", price: 187.35, change: 0.40, changePercent: 0.21 },
                    { symbol: "AUD/JPY", price: 96.90, change: -0.10, changePercent: -0.10 },
                    { symbol: "NZD/USD", price: 0.6120, change: -0.0015, changePercent: -0.24 },
                    { symbol: "BTC/USD", price: 42500.00, change: 120.50, changePercent: 0.28 },
                    { symbol: "ETH/USD", price: 2300.50, change: 15.20, changePercent: 0.66 },
                    { symbol: "XAU/USD", price: 2035.40, change: 5.10, changePercent: 0.25 }
                ];
            }
            
            ticker.innerHTML = ''; // Clear previous items

            tickerData.forEach((item: any) => {
                const isPositive = item.change >= 0;
                const tickerItem = document.createElement('div');
                tickerItem.className = 'ticker-item';
                
                // Formatting
                let pricePrecision = 4;
                if (item.symbol.includes('JPY')) pricePrecision = 2;
                if (item.symbol.includes('BTC') || item.symbol.includes('ETH') || item.symbol.includes('XAU')) pricePrecision = 2;
                
                tickerItem.innerHTML = `
                    <div class="ticker-symbol">${item.symbol}</div>
                    <div class="ticker-price">${item.price.toFixed(pricePrecision)}</div>
                    <div class="ticker-change ${isPositive ? 'up' : 'down'}">
                        <i class="fas fa-caret-${isPositive ? 'up' : 'down'}"></i>
                        <span>${Math.abs(item.change).toFixed(pricePrecision)} (${Math.abs(item.changePercent).toFixed(2)}%)</span>
                    </div>
                `;
                ticker.appendChild(tickerItem);
            });
            
            const tickerWrap = document.querySelector('.ticker-wrap');
            if (tickerWrap && tickerWrap.children[1]) {
                tickerWrap.removeChild(tickerWrap.children[1]);
            }
            const clone = ticker.cloneNode(true);
            if (tickerWrap) {
                tickerWrap.appendChild(clone);
            }
        }

        let heroChartInstance: any = null;
        function createHeroChart() {
            const canvas = document.getElementById('heroChart') as HTMLCanvasElement;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const data: number[] = [];
            let value = 100;
            for (let i = 0; i < 100; i++) {
                value += (Math.random() - 0.4) * 10;
                data.push(value);
            }
            
            heroChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array(100).fill(''),
                    datasets: [{
                        data: data,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 2000, easing: 'easeOutQuart' },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
        }

        let marketChartInstance: any = null;
        function createMarketChart() {
            const canvas = document.getElementById('marketChart') as HTMLCanvasElement;
            if (!canvas) return;
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
                        tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(19, 28, 46, 0.9)', titleColor: '#f0f9ff', bodyColor: '#f0f9ff', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1 }
                    },
                    scales: {
                        x: { grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }, ticks: { color: theme === 'dark' ? '#94a3b8' : '#7f8c8d' } },
                        y: { grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }, ticks: { color: theme === 'dark' ? '#94a3b8' : '#7f8c8d' } }
                    },
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }
            });
        }

        const smoothScrollHandler = (e: Event) => {
            e.preventDefault();
            const targetId = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
            if (!targetId) return;
            const target = document.querySelector(targetId);
            if (target) {
                window.scrollTo({
                    top: (target as HTMLElement).offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        };

        const anchors = document.querySelectorAll('a[href^="#"]');
        anchors.forEach(anchor => anchor.addEventListener('click', smoothScrollHandler as EventListener));

        const formSubmitHandler = (e: Event) => {
            e.preventDefault();
            alert('Thank you for your message! We will contact you soon.');
            (e.currentTarget as HTMLFormElement).reset();
        };
        const contactForm = document.getElementById('contactForm');
        contactForm?.addEventListener('submit', formSubmitHandler as EventListener);

        const scrollHandler = () => {
            const header = document.getElementById('header');
            const logo = document.getElementById('logo');
            const headerContainer = document.querySelector('.header-container');
            if (window.scrollY > 50) {
                header?.classList.add('scrolled');
                logo?.classList.add('scrolled');
                headerContainer?.classList.add('scrolled');
            } else {
                header?.classList.remove('scrolled');
                logo?.classList.remove('scrolled');
                headerContainer?.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', scrollHandler);

        const loader = document.getElementById('loader');
        if(loader) {
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 1500);
        }
        
        initTicker();
        // Destroy existing charts before creating new ones to prevent memory leaks on theme change
        heroChartInstance?.destroy();
        marketChartInstance?.destroy();
        createHeroChart();
        createMarketChart();


        return () => {
            document.body.classList.remove('landing-body', 'light');
            anchors.forEach(anchor => anchor.removeEventListener('click', smoothScrollHandler as EventListener));
            contactForm?.removeEventListener('submit', formSubmitHandler as EventListener);
            window.removeEventListener('scroll', scrollHandler);
            heroChartInstance?.destroy();
            marketChartInstance?.destroy();
        };
    }, [theme]);

    return (
        <>
            <style>{landingPageCss}</style>
            <div>
                {/* Loading Animation */}
                <div className="loader" id="loader">
                    <div className="loader-spinner"></div>
                </div>

                {/* Header */}
                <header id="header" className="landing-header">
                    <div className="landing-container header-container">
                        <div className="logo" id="logo">
                            <i className="fas fa-chart-line"></i>
                            <span>GreyQuant</span>
                        </div>
                        <nav>
                            <ul>
                                <li><a href="#home">Home</a></li>
                                <li><a href="#products">Products</a></li>
                                <li><a href="#pricing">Pricing</a></li>
                                <li><a href="#contact">Contact</a></li>
                                <li>
                                    <ThemeToggleButton />
                                </li>
                                <li>
                                    <button onClick={onEnterApp} className="cta-button" style={{padding: '8px 20px'}}>
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
                            <h1>GreyQuant: AI-Powered Quantitative Trading</h1>
                            <p>Unleash our cutting-edge AI to navigate financial markets with precision and confidence. Our advanced algorithms analyze market data in real-time to identify your next high-probability trade.</p>
                            <a href="#products" className="cta-button">Explore Our Products</a>
                        </div>
                    </div>
                    <div className="hero-image">
                        <canvas id="heroChart"></canvas>
                    </div>
                </section>

                {/* Stock Ticker */}
                <div className="ticker-wrap">
                    <div className="ticker" id="stockTicker">
                        {/* Ticker items will be populated by JavaScript */}
                    </div>
                </div>

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
                                        <li><i className="fas fa-check-circle"></i> Customizable alert system</li>
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
                                        <li><i className="fas fa-check-circle"></i> Performance optimization</li>
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
                                        <li><i className="fas fa-check-circle"></i> Ongoing strategy refinement</li>
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
                                        <li><i className="fas fa-check-circle"></i> Cloud-based execution</li>
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
                                        <i className="fas fa-phone-alt"></i>
                                        <div>
                                            <h4>Phone</h4>
                                            <p>+234 812 379 2862</p>
                                        </div>
                                    </div>
                                    
                                    <div className="contact-item">
                                        <i className="fas fa-envelope"></i>
                                        <div>
                                            <h4>Email</h4>
                                            <p>ma8138498@gmail.com</p>
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
                                
                                <h3>About GreyQuant</h3>
                                <p>GreyQuant is a leading provider of algorithmic trading solutions. Our team of financial experts, data scientists, and software engineers develop cutting-edge tools that help traders leverage technology for better market performance.</p>
                            </div>
                            
                            <div className="contact-form">
                                <h3>Send a Message</h3>
                                <form id="contactForm">
                                    <div className="form-group">
                                        <label htmlFor="name">Name</label>
                                        <input type="text" id="name" required />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="email">Email</label>
                                        <input type="email" id="email" required />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="subject">Subject</label>
                                        <input type="text" id="subject" required />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="message">Message</label>
                                        <textarea id="message" required></textarea>
                                    </div>
                                    
                                    <button type="submit" className="cta-button">Send Message</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer>
                    <div className="landing-container">
                        <div className="footer-content">
                            <div className="footer-column">
                                <h4>GreyQuant</h4>
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
                        
                        <div className="copyright">
                            <p>&copy; 2023 GreyQuant. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
};
