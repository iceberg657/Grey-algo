
import React, { useEffect, useRef } from 'react';
import { useTheme } from './contexts/ThemeContext';

export const NeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handler
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        let animationFrameId: number;

        interface GradientBlob {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            colorLight: string;
            colorDark: string;
        }

        // Initialize 5 thick color blobs mimicking premium fluid gradient flows
        const blobs: GradientBlob[] = [
            { 
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height, 
                vx: 0.6, 
                vy: 0.4, 
                radius: Math.min(canvas.width, canvas.height) * 0.55, 
                colorLight: 'rgba(99, 102, 241, 0.16)', // Indigo
                colorDark: 'rgba(79, 70, 229, 0.22)' 
            },
            { 
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height, 
                vx: -0.5, 
                vy: 0.4, 
                radius: Math.min(canvas.width, canvas.height) * 0.60, 
                colorLight: 'rgba(6, 182, 212, 0.15)', // Cyan
                colorDark: 'rgba(8, 145, 178, 0.18)' 
            },
            { 
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height, 
                vx: 0.4, 
                vy: -0.5, 
                radius: Math.min(canvas.width, canvas.height) * 0.50, 
                colorLight: 'rgba(236, 72, 153, 0.14)', // Rose
                colorDark: 'rgba(219, 39, 119, 0.18)' 
            },
            { 
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height, 
                vx: -0.4, 
                vy: -0.4, 
                radius: Math.min(canvas.width, canvas.height) * 0.52, 
                colorLight: 'rgba(16, 185, 129, 0.14)', // Emerald
                colorDark: 'rgba(5, 150, 105, 0.15)' 
            },
            { 
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height, 
                vx: 0.3, 
                vy: 0.5, 
                radius: Math.min(canvas.width, canvas.height) * 0.48, 
                colorLight: 'rgba(245, 158, 11, 0.13)', // Amber
                colorDark: 'rgba(217, 119, 6, 0.14)' 
            }
        ];

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = theme === 'dark';
            
            // Replicate dynamic liquid overlay blending using the screen composite mode
            ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';

            blobs.forEach((b) => {
                b.x += b.vx;
                b.y += b.vy;

                // Handle soft edge boundaries
                if (b.x - b.radius < -100 || b.x + b.radius > canvas.width + 100) b.vx *= -1;
                if (b.y - b.radius < -100 || b.y + b.radius > canvas.height + 100) b.vy *= -1;

                b.x = Math.max(-b.radius, Math.min(canvas.width + b.radius, b.x));
                b.y = Math.max(-b.radius, Math.min(canvas.height + b.radius, b.y));

                const color = isDark ? b.colorDark : b.colorLight;
                const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.05, b.x, b.y, b.radius);
                grad.addColorStop(0, color);
                grad.addColorStop(0.5, color.replace(/[\d\.]+\)$/, '0.06)'));
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            });

            // Subtle micro-sparkles shimmering over the liquid glass to represent fine grains of high-end frosted screens
            ctx.globalCompositeOperation = 'source-over';
            const sparkleColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.03)';
            ctx.fillStyle = sparkleColor;
            for (let i = 0; i < 12; i++) {
                const sx = (Math.sin(Date.now() * 0.0006 * (i + 1)) * 0.5 + 0.5) * canvas.width;
                const sy = (Math.cos(Date.now() * 0.0005 * (i + 1)) * 0.5 + 0.5) * canvas.height;
                ctx.beginPath();
                ctx.arc(sx, sy, 1, 0, Math.PI * 2);
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]);

    return (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-slate-50/70 dark:bg-[#070b14] transition-colors duration-700">
            {/* Liquid Bubble Gradients / Blobs of Light both on light and dark mode */}
            <div className="absolute inset-0 overflow-hidden mix-blend-multiply dark:mix-blend-screen opacity-75 dark:opacity-60">
                {/* Bubble 1: Top Left - Indigo / Blue */}
                <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-indigo-200/35 dark:bg-indigo-900/20 blur-[130px] md:blur-[190px] animate-blob-1" />
                
                {/* Bubble 2: Middle Right - Cyan / Teal / Turquoise */}
                <div className="absolute top-[25%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-teal-200/30 dark:bg-cyan-900/15 blur-[130px] md:blur-[190px] animate-blob-2" />
                
                {/* Bubble 3: Bottom Left - Emerald / Amber / Soft Violet */}
                <div className="absolute bottom-[-15%] left-[5%] w-[50vw] h-[50vw] rounded-full bg-emerald-200/25 dark:bg-violet-900/20 blur-[110px] md:blur-[170px] animate-blob-3" />

                {/* Bubble 4: Center/Top-Right - Soft Rose / Gold / Bright Fuchsia */}
                <div className="absolute top-[10%] left-[35%] w-[45vw] h-[45vw] rounded-full bg-rose-200/25 dark:bg-pink-950/15 blur-[140px] md:blur-[200px] animate-blob-2" />
            </div>

            {/* Moving Liquid Gradient Canvas Layer */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 dark:opacity-85 mix-blend-color-dodge" />
        </div>
    );
};
