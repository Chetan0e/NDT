import React from 'react';

export default function Logo({ size = 34, className = "" }) {
    return (
        <img
            src="/logo.png"
            alt="Logo"
            width={size}
            height={size}
            className={className}
            style={{ objectFit: 'contain' }}
        />
    );
}
