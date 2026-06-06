type LogoSize = 'sm' | 'md' | 'lg';

const iconSizes = {
  sm: 'h-12 w-12 rounded-[18px]',
  md: 'h-16 w-16 rounded-[22px]',
  lg: 'h-24 w-24 rounded-[30px]',
};

export function WtfFridgeIcon({ size = 'md' }: { size?: LogoSize }) {
  return (
    <div className={`relative shrink-0 overflow-hidden bg-[#0869d5] shadow-card ${iconSizes[size]}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="WTF fridge logo">
        <defs>
          <linearGradient id={`fridge-blue-${size}`} x1="16" x2="96" y1="4" y2="116" gradientUnits="userSpaceOnUse">
            <stop stopColor="#24d3dd" />
            <stop offset="0.48" stopColor="#0d86df" />
            <stop offset="1" stopColor="#064db7" />
          </linearGradient>
          <linearGradient id={`leaf-green-${size}`} x1="84" x2="104" y1="21" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9df23d" />
            <stop offset="1" stopColor="#32b947" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="28" fill={`url(#fridge-blue-${size})`} />
        <path d="M0 52H120" stroke="white" strokeOpacity="0.9" strokeWidth="3" />
        <path d="M16 30L22 30L26 42L32 30H38L44 42L48 30H54L46 52H40L35 40L30 52H24L16 30Z" fill="white" />
        <path d="M56 30H78V36H70V52H64V36H56V30Z" fill="white" />
        <path d="M82 30H101V36H88V40H99V46H88V52H82V30Z" fill="white" />
        <path d="M96 26C103 17 113 17 113 17C113 17 112 29 102 35C98 37 95 36 93 35C94 32 94 29 96 26Z" fill={`url(#leaf-green-${size})`} />
        <path d="M101 32C103 28 107 25 111 21" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M18 70C18 66 21 63 25 63C29 63 32 66 32 70V94C32 98 29 101 25 101C21 101 18 98 18 94V70Z" fill="white" fillOpacity="0.92" />
        <path d="M43 80C39 74 42 65 50 63C55 62 60 65 63 69C66 62 74 59 81 62C89 65 91 75 87 82C96 82 101 90 98 98C96 104 90 108 82 106H52C43 106 36 99 37 91C37 85 39 82 43 80Z" fill="#86d33e" />
        <circle cx="65" cy="79" r="13" fill="#ff6a37" />
        <path d="M64 66C66 62 70 61 75 62" stroke="#1c8e43" strokeWidth="4" strokeLinecap="round" />
        <path d="M78 63H95C100 63 104 67 104 72V100C104 105 100 109 95 109H78C73 109 69 105 69 100V72C69 67 73 63 78 63Z" fill="#f8fbff" />
        <path d="M80 63H93V55H80V63Z" fill="#58c83c" />
        <path d="M50 78H90C96 78 101 83 101 89V115H47V89C47 83 44 78 50 78Z" fill="#fffefe" />
        <path d="M57 91H88M57 101H86" stroke="#d4d7dc" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const textSizes = {
  sm: 'text-[22px]',
  md: 'text-[22px]',
  lg: 'text-[36px]',
};

export function Logo({ compact = false, hero = false }: { compact?: boolean; hero?: boolean }) {
  const size: LogoSize = hero ? 'lg' : 'sm';
  return (
    <div className={`flex items-center ${hero ? 'gap-4' : 'gap-3'}`}>
      <WtfFridgeIcon size={size} />
      {!compact && (
        <div className="leading-tight">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1171d8]">WTF</div>
          <div
            className={`${textSizes[size]} text-ink`}
            style={{ fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 900 }}
          >
            What The Fridge
          </div>
          {hero && <div className="mt-1 h-0.5 w-24 rounded-full bg-[#1171d8]" />}
        </div>
      )}
    </div>
  );
}
