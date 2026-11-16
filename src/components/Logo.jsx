import React from 'react'

// Símbolo de KashUp: una K cuyo brazo superior es una flecha que sube.
export const KashSymbol = ({ size = 32, dark = false, title = 'KashUp' }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={title} className="kash-symbol">
    <rect x="4" y="4" width="112" height="112" rx="30" fill={dark ? '#18181B' : '#0A0A0B'} stroke={dark ? '#3F3F46' : 'none'} strokeWidth="2" />
    <rect x="30" y="26" width="15" height="68" rx="5" fill="#FFFFFF" />
    <path d="M52 62 L84 92" stroke="#FFFFFF" strokeWidth="15" strokeLinecap="round" />
    <path d="M51 59 L76 34" stroke="#10B981" strokeWidth="15" strokeLinecap="round" />
    <path d="M94 16 L64 21 L89 46 Z" fill="#10B981" stroke="#10B981" strokeWidth="4" strokeLinejoin="round" />
  </svg>
)

// Logotipo horizontal. onDark: para la barra lateral negra.
export const KashLogo = ({ size = 34, onDark = false }) => (
  <span className={`kash-logo${onDark ? ' on-dark' : ''}`} style={{ '--logo-size': `${size}px` }}>
    <KashSymbol size={size} dark={onDark} />
    <span className="kash-word">Kash<b>Up</b></span>
  </span>
)

export default KashLogo
