import React from 'react';

export default function Logo({ size = 34, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="brainGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#60a5fa" stopOpacity="0.8" />
                    <stop offset="1" stopColor="#3b82f6" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="glowGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#93c5fd" />
                    <stop offset="0.5" stopColor="#3b82f6" />
                    <stop offset="1" stopColor="#1e3a8a" />
                </linearGradient>
                <radialGradient id="nodeGlow" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#bfdbfe" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
                </radialGradient>
                <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Outer Swoop / Shield */}
            <path
                d="M55,10 C75,15 90,30 92,45 C94,60 70,75 50,90 C48,65 55,45 85,45 C65,35 60,20 55,10 Z"
                fill="url(#glowGrad)"
                opacity="0.9"
                filter="url(#neon)"
            />
            <path
                d="M50,90 C40,75 25,65 20,50 C15,35 30,20 50,15 C45,25 25,35 30,55 C35,65 45,75 50,90 Z"
                stroke="url(#glowGrad)"
                strokeWidth="2"
                fill="none"
                filter="url(#neon)"
            />

            {/* Neural Network Nodes */}
            <g stroke="#93c5fd" strokeWidth="1" opacity="0.6">
                <line x1="30" y1="35" x2="45" y2="30" />
                <line x1="45" y1="30" x2="55" y2="40" />
                <line x1="55" y1="40" x2="40" y2="50" />
                <line x1="40" y1="50" x2="30" y2="35" />

                <line x1="40" y1="50" x2="35" y2="65" />
                <line x1="35" y1="65" x2="50" y2="60" />
                <line x1="50" y1="60" x2="55" y2="40" />
            </g>

            {/* Glowing Nodes */}
            <circle cx="30" cy="35" r="2.5" fill="#ffffff" filter="url(#neon)" />
            <circle cx="45" cy="30" r="3" fill="#ffffff" filter="url(#neon)" />
            <circle cx="55" cy="40" r="2.5" fill="#ffffff" filter="url(#neon)" />
            <circle cx="40" cy="50" r="3.5" fill="#ffffff" filter="url(#neon)" />
            <circle cx="35" cy="65" r="2.5" fill="#ffffff" filter="url(#neon)" />
            <circle cx="50" cy="60" r="3" fill="#ffffff" filter="url(#neon)" />

            {/* Little starburst dots */}
            <circle cx="40" cy="20" r="1.5" fill="#bfdbfe" opacity="0.8" />
            <circle cx="25" cy="45" r="1" fill="#bfdbfe" opacity="0.6" />
            <circle cx="28" cy="55" r="1.5" fill="#bfdbfe" opacity="0.7" />
            <circle cx="45" cy="70" r="1.5" fill="#bfdbfe" opacity="0.8" />
            <circle cx="65" cy="25" r="1" fill="#bfdbfe" opacity="0.5" />
        </svg>
    );
}
