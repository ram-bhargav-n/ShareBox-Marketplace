
function ActivityMarquee() {
  const activities = [
    { text: "GIVEAWAY · Pass useful things along for free", color: "bg-[#A3B18A]" },
    { text: "EXCHANGE · Swap items directly with your community", color: "bg-[#E8DFD0]" },
    { text: "Share locally. Give good things another story.", color: "bg-[#A3B18A]" },
  ];

  const repeatedActivities = [...activities, ...activities];

  return (
    <div className="flex h-10 w-full items-center overflow-hidden border-b border-[#7D8976]/50 bg-[#641E32] text-[#F7F3EB]">

   
      <div className="z-10 flex h-full shrink-0 items-center gap-2.5 border-r border-[#7D8976]/50 bg-[#641E32] px-5 font-mono text-[11px] font-bold tracking-[1px] text-[#E8DFD0]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A3B18A] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#A3B18A]" />
        </span>

        COMMUNITY SHARING
      </div>

 
      <div className="group flex min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max shrink-0 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {repeatedActivities.map((activity, index) => (
            <div
              key={index}
              className="flex h-10 shrink-0 items-center gap-2.5 px-6 text-xs"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activity.color}`} />

              <span className="whitespace-nowrap font-medium text-[#F7F3EB]">
                {activity.text}
              </span>

              <span className="ml-4 h-4 w-px bg-[#7D8976]/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ActivityMarquee;
