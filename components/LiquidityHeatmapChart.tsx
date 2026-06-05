import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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
}

export const LiquidityHeatmapChart: React.FC<LiquidityHeatmapProps> = ({ data, currentPrice, width = 600, height = 400 }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        const margin = { top: 20, right: 30, bottom: 30, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        // Get min and max prices
        const maxPrice = d3.max(data, d => d.price) || (currentPrice * 1.05);
        const minPrice = d3.min(data, d => d.price) || (currentPrice * 0.95);

        // Scales
        const yScale = d3.scaleLinear()
            .domain([minPrice, maxPrice])
            .range([innerHeight, 0]);

        const maxVolume = d3.max(data, d => d.volume) || 100;
        const xScale = d3.scaleLinear()
            .domain([0, maxVolume])
            .range([0, innerWidth]);

        // Y-Axis
        const yAxis = d3.axisLeft(yScale).ticks(10);
        g.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .selectAll("text")
            .style("fill", "#94a3b8")
            .style("font-family", "monospace");

        // X-Axis
        const xAxis = d3.axisBottom(xScale).ticks(5);
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(xAxis)
            .selectAll("text")
            .style("fill", "#94a3b8");

        // Remove domain lines for cleaner look
        g.selectAll(".domain").remove();
        g.selectAll(".tick line").attr("stroke", "#334155");

        // Draw bars (heatmap)
        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d.price) - 5) // centered at price
            .attr("x", 0)
            .attr("height", 10)
            .attr("width", d => xScale(d.volume))
            .attr("fill", d => d.type === 'ask' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)')
            .attr("stroke", d => d.type === 'ask' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)')
            .attr("stroke-width", 1);

        // Draw current price line
        g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", yScale(currentPrice))
            .attr("y2", yScale(currentPrice))
            .attr("stroke", "#3b82f6")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4 4");

        g.append("text")
            .attr("x", innerWidth - 60)
            .attr("y", yScale(currentPrice) - 5)
            .attr("fill", "#3b82f6")
            .text("Current Price")
            .style("font-size", "10px")
            .style("font-family", "Inter, sans-serif");

    }, [data, currentPrice, width, height]);

    return (
        <div className="w-full flex justify-center bg-slate-900 rounded-xl p-4 overflow-hidden border border-slate-800">
            <svg ref={svgRef} width={width} height={height} className="w-full h-auto max-w-full" viewBox={`0 0 ${width} ${height}`} />
        </div>
    );
};
