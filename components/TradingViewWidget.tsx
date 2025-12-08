
import React, { useEffect, useRef, memo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const TradingViewWidget: React.FC = memo(() => {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!container.current) return;
    
    // Clear existing widget content to prevent duplicates/stale widgets on theme change
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // Define colors based on current theme
    const backgroundColor = theme === 'dark' ? "rgba(15, 23, 42, 1)" : "rgba(255, 255, 255, 1)";
    const gridColor = theme === 'dark' ? "rgba(0, 0, 0, 0.06)" : "rgba(240, 240, 240, 1)";

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
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "calendar": false,
        "hide_volume": true,
        "support_host": "https://www.tradingview.com"
      }`;
    
    container.current.appendChild(script);
  }, [theme]); // Re-run effect when theme changes

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%", overflow: 'hidden' }}>
      <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
