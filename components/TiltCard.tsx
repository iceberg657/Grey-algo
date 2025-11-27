
import React, { useRef, useState, useEffect } from 'react';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    intensity?: number;
    glareColor?: string;
    perspective?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({ 
    children, 
    className = '', 
    intensity = 10,
    glareColor = "rgba(255, 255, 255, 0.1)",
    perspective = 1000
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
    const [scale, setScale] = useState(1);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation (inverted Y for X rotation to look up/down correctly)
        const rotateX = ((y - centerY) / centerY) * -intensity;
        const rotateY = ((x - centerX) / centerX) * intensity;

        // Calculate glare position as percentage
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;

        setRotation({ x: rotateX, y: rotateY });
        setGlare({ x: glareX, y: glareY, opacity: 1 });
        setScale(1.02);
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
        setGlare(prev => ({ ...prev, opacity: 0 }));
        setScale(1);
    };

    const style: React.CSSProperties = {
        transform: `perspective(${perspective}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(${scale}, ${scale}, ${scale})`,
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
    };

    return (
        <div
            ref={ref}
            className={`relative transition-all duration-200 ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={style}
        >
            <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
                {children}
            </div>
            
            {/* Glare effect */}
            <div 
                className="absolute inset-0 w-full h-full pointer-events-none rounded-[inherit] z-20"
                style={{
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, ${glareColor}, transparent 80%)`,
                    opacity: glare.opacity,
                    transition: 'opacity 0.3s ease',
                    mixBlendMode: 'overlay',
                }}
            />
        </div>
    );
};
