import React from 'react'

// Símbolo de QuontUp360: una Q cuyo anillo es la visión 360° del negocio y una flecha esmeralda que sale del ciclo.
export const BrandSymbol = ({ size = 32, dark = false, title = 'QuontUp360' }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={title} className="brand-symbol">
    <rect x="4" y="4" width="112" height="112" rx="30" fill={dark ? '#18181B' : '#0A0A0B'} stroke={dark ? '#3F3F46' : 'none'} strokeWidth="2" />
    <g transform="translate(60 60) scale(0.95) translate(-60 -60)">
      <path d="M79.85 64.18 A27 27 0 1 1 55.82 40.15" fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" />
      <path d="M72.09 86.09 L87 100" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" />
      <path d="M54 66 L87.57 32.43" stroke="#10B981" strokeWidth="13" strokeLinecap="round" />
      <path d="M99 21 L95.46 44.33 L75.67 24.54 Z" fill="#10B981" stroke="#10B981" strokeWidth="4" strokeLinejoin="round" />
    </g>
  </svg>
)

// Logotipo horizontal: Quont + Up (esmeralda) + 360 como exponente. onDark: para la barra lateral negra.
export const BrandLogo = ({ size = 34, onDark = false }) => (
  <span className={`brand-logo${onDark ? ' on-dark' : ''}`} style={{ '--logo-size': `${size}px` }}>
    <BrandSymbol size={size} dark={onDark} />
    <span className="brand-word">Quont<b>Up</b><sup>360</sup></span>
  </span>
)

export default BrandLogo
