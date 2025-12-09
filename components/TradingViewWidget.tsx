
import React, { useEffect, useRef, memo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const TradingViewWidget: React.FC = memo(() => {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!container.current) return;
    
    setIsLoading(true);
    // Clear existing widget content
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // Define colors based on current theme
    // Set background to transparent to show the neural network
    const backgroundColor = "rgba(0, 0, 0, 0)"; 
    const gridColor = theme === 'dark' ? "rgba(30, 41, 59, 0.5)" : "rgba(240, 240, 240, 1)";
    const toolbarBg = theme === 'dark' ? "rgba(30, 41, 59, 0.8)" : "rgba(241, 245, 249, 0.8)";

    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "FX:EURUSD",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "${theme}",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "hide_side_toolbar": false,
        "withdateranges": true,
        "backgroundColor": "${backgroundColor}",
        "gridColor": "${gridColor}",
        "toolbar_bg": "${toolbarBg}",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": true,
        "calendar": true,
        "hide_volume": false,
        "support_host": "https://www.tradingview.com",
        "studies": [
          "MASimple@tv-basicstudies",
          "RSI@tv-basicstudies",
          "MACD@tv-basicstudies"
        ],
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650"
      }`;
    
    container.current.appendChild(script);

    // Mock loading finish - the widget takes a bit to render the iframe
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <div className="relative w-full h-full bg-transparent">
        {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )}
        <div className="tradingview-widget-container h-full w-full" ref={container}>
            <div className="tradingview-widget-container__widget h-full w-full"></div>
        </div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
