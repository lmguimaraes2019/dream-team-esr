// SVG gender icons for dashboard chart — blue male, pink female, purple other
export const MaleIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 80" fill="none">
    {/* Head */}
    <circle cx="32" cy="14" r="10" fill="#2196F3" />
    {/* Body */}
    <rect x="26" y="24" width="12" height="22" rx="4" fill="#2196F3" />
    {/* Left arm */}
    <rect x="12" y="26" width="14" height="6" rx="3" fill="#2196F3" />
    {/* Right arm */}
    <rect x="38" y="26" width="14" height="6" rx="3" fill="#2196F3" />
    {/* Left leg */}
    <rect x="24" y="46" width="7" height="18" rx="3" fill="#2196F3" />
    {/* Right leg */}
    <rect x="33" y="46" width="7" height="18" rx="3" fill="#2196F3" />
  </svg>
);

export const FemaleIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 80" fill="none">
    {/* Head */}
    <circle cx="32" cy="14" r="10" fill="#E91E63" />
    {/* Body / dress */}
    <path d="M26 24 L20 52 L44 52 L38 24 Z" rx="4" fill="#E91E63" />
    {/* Left arm */}
    <rect x="12" y="26" width="14" height="6" rx="3" fill="#E91E63" />
    {/* Right arm */}
    <rect x="38" y="26" width="14" height="6" rx="3" fill="#E91E63" />
    {/* Left leg */}
    <rect x="25" y="52" width="6" height="16" rx="3" fill="#E91E63" />
    {/* Right leg */}
    <rect x="33" y="52" width="6" height="16" rx="3" fill="#E91E63" />
  </svg>
);

export const OtherIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 80" fill="none">
    <circle cx="32" cy="14" r="10" fill="#9C27B0" />
    <rect x="26" y="24" width="12" height="22" rx="4" fill="#9C27B0" />
    <rect x="12" y="26" width="14" height="6" rx="3" fill="#9C27B0" />
    <rect x="38" y="26" width="14" height="6" rx="3" fill="#9C27B0" />
    <rect x="24" y="46" width="7" height="18" rx="3" fill="#9C27B0" />
    <rect x="33" y="46" width="7" height="18" rx="3" fill="#9C27B0" />
  </svg>
);
