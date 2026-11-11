export default function ShareBoxLogo({ className = "" }) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icon Emblem */}
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#641E32] border border-[#53192B] shadow-sm transition-transform duration-200 hover:scale-105">
        <svg 
          className="w-5 h-5 text-white"
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
        {/* Sage accent */}
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3B18A] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A3B18A] ring-2 ring-white"></span>
        </span>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center text-xl font-bold tracking-tight leading-none text-[#F7F3EB]">
          <span>Share</span>
          <span className="text-[#A3B18A] ml-0.5">Box</span>
        </div>
        <span className="text-[9px] font-semibold tracking-widest uppercase text-[#E8DFD0] mt-1">
          Giveaways · Exchanges
        </span>
      </div>
    </div>
  );
}