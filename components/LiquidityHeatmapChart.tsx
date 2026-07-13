import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface StopCluster {
    price: number;
    size: number;
    type: 'BUY_STOP_LIQUIDITY' | 'SELL_STOP_LIQUIDITY';
    probability: 'HIGH' | 'MEDIUM' | 'LOW';
    distancePips: number;
}

interface LiquidityLevel {
    price: number;
    volume: number;
    type: 'ask' | 'bid';
}

interface LiquidityHeatmapProps {
    data: LiquidityLevel[];
    currentPrice: number;
    width?: number;
    height?: number;
    poc?: number;
    vah?: number;
    val?: number;
    stopClusters?: StopCluster[];
}

export const LiquidityHeatmapChart: React.FC<LiquidityHeatmapProps> = ({ 
    data, 
    currentPrice, 
    width = 600, 
    height = 400,
    poc,
    vah,
    val,
    stopClusters = []
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        const margin = { top: 25, right: 120, bottom: 30, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        // Get min and max prices
        let maxPrice = d3.max(data, d => d.price) || (currentPrice * 1.05);
        let minPrice = d3.min(data, d => d.price) || (currentPrice * 0.95);

        // Account for POC and VAH/VAL in the scale bounds if they exist
        if (poc) {
            maxPrice = Math.max(maxPrice, poc);
            minPrice = Math.min(minPrice, poc);
        }
        if (vah) maxPrice = Math.max(maxPrice, vah);
        if (val) minPrice = Math.min(minPrice, val);

        if (stopClusters && stopClusters.length > 0) {
            stopClusters.forEach(sc => {
                maxPrice = Math.max(maxPrice, sc.price);
                minPrice = Math.min(minPrice, sc.price);
            });
        }

        // Add 2% padding to price bounds
        const pricePadding = (maxPrice - minPrice) * 0.05;
        maxPrice += pricePadding || 0.001;
        minPrice -= pricePadding || 0.001;

        // Scales
        const yScale = d3.scaleLinear()
            .domain([minPrice, maxPrice])
            .range([innerHeight, 0]);

        const maxVolume = d3.max(data, d => d.volume) || 100;
        const xScale = d3.scaleLinear()
            .domain([0, maxVolume])
            .range([0, innerWidth]);

        // Y-Axis (Prices)
        const yAxis = d3.axisLeft(yScale).ticks(10).tickFormat(d3.format(".5f"));
        g.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .selectAll("text")
            .style("fill", "#94a3b8")
            .style("font-family", "monospace")
            .style("font-size", "10px");

        // X-Axis (Volume Depth)
        const xAxis = d3.axisBottom(xScale).ticks(5);
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(xAxis)
            .selectAll("text")
            .style("fill", "#64748b")
            .style("font-size", "9px");

        // Remove domain lines for cleaner look
        g.selectAll(".domain").remove();
        g.selectAll(".tick line").attr("stroke", "#1e293b");

        // Draw depth bars (heatmap)
        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d.price) - 4) // centered at price
            .attr("x", 0)
            .attr("height", 8)
            .attr("width", d => xScale(d.volume))
            .attr("fill", d => d.type === 'ask' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)')
            .attr("stroke", d => d.type === 'ask' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 197, 94, 0.35)')
            .attr("stroke-width", 0.7);

        // 1. DRAW VALUE AREA (VAH / VAL) IF AVAILABLE
        if (vah && val) {
            const vahY = yScale(vah);
            const valY = yScale(val);

            // Shaded Value Area Background
            g.append("rect")
                .attr("x", 0)
                .attr("width", innerWidth)
                .attr("y", vahY)
                .attr("height", Math.max(1, valY - vahY))
                .attr("fill", "rgba(99, 102, 241, 0.03)")
                .attr("pointer-events", "none");

            // VAH Boundary
            g.append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", vahY)
                .attr("y2", vahY)
                .attr("stroke", "#a5b4fc")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "3 3");

            g.append("text")
                .attr("x", innerWidth + 6)
                .attr("y", vahY + 3)
                .attr("fill", "#a5b4fc")
                .text(`VAH: ${vah.toFixed(5)}`)
                .style("font-size", "9px")
                .style("font-weight", "600")
                .style("font-family", "monospace");

            // VAL Boundary
            g.append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", valY)
                .attr("y2", valY)
                .attr("stroke", "#c084fc")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "3 3");

            g.append("text")
                .attr("x", innerWidth + 6)
                .attr("y", valY + 3)
                .attr("fill", "#c084fc")
                .text(`VAL: ${val.toFixed(5)}`)
                .style("font-size", "9px")
                .style("font-weight", "600")
                .style("font-family", "monospace");
        }

        // 2. DRAW REAL POINT OF CONTROL (POC)
        if (poc) {
            const pocY = yScale(poc);
            g.append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", pocY)
                .attr("y2", pocY)
                .attr("stroke", "#f59e0b")
                .attr("stroke-width", 2);

            g.append("text")
                .attr("x", innerWidth + 6)
                .attr("y", pocY + 3)
                .attr("fill", "#f59e0b")
                .text(`POC: ${poc.toFixed(5)}`)
                .style("font-size", "10px")
                .style("font-weight", "900")
                .style("font-family", "monospace");
        }

        // 3. DRAW DETECTED STOP CLUSTERS / LIQUIDITY POOLS
        if (stopClusters && stopClusters.length > 0) {
            stopClusters.forEach(sc => {
                const scY = yScale(sc.price);
                const isBuyStop = sc.type === 'BUY_STOP_LIQUIDITY';

                g.append("line")
                    .attr("x1", 0)
                    .attr("x2", innerWidth)
                    .attr("y1", scY)
                    .attr("y2", scY)
                    .attr("stroke", isBuyStop ? "rgba(129, 140, 248, 0.6)" : "rgba(245, 158, 11, 0.6)")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "2 2");

                g.append("text")
                    .attr("x", innerWidth + 6)
                    .attr("y", scY + 3)
                    .attr("fill", isBuyStop ? "#818cf8" : "#fbbf24")
                    .text(`${isBuyStop ? '🔴 BUY STOPS' : '🟢 SELL STOPS'} (${sc.size} L)`)
                    .style("font-size", "8px")
                    .style("font-weight", "bold")
                    .style("font-family", "Inter, sans-serif");
            });
        }

        // 4. DRAW CURRENT PRICE LINE
        const currentY = yScale(currentPrice);
        g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", currentY)
            .attr("y2", currentY)
            .attr("stroke", "#3b82f6")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4");

        g.append("text")
            .attr("x", innerWidth + 6)
            .attr("y", currentY + 3)
            .attr("fill", "#3b82f6")
            .text(`CMP: ${currentPrice.toFixed(5)}`)
            .style("font-size", "9px")
            .style("font-weight", "bold")
            .style("font-family", "Inter, sans-serif");

    }, [data, currentPrice, width, height, poc, vah, val, stopClusters]);

    return (
        <div className="w-full flex justify-center bg-slate-950 rounded-2xl p-4 overflow-hidden border border-slate-800 shadow-inner">
            <svg ref={svgRef} width={width} height={height} className="w-full h-auto max-w-full" viewBox={`0 0 ${width} ${height}`} />
        </div>
    );
};
