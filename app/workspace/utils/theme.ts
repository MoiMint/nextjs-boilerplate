export const getThemeClasses = (activeTheme: string | null) => {
  const themeClass = activeTheme === "pink"
    ? "border-pink-300/55 bg-pink-900/30"
    : activeTheme === "ocean"
      ? "border-cyan-300/55 bg-cyan-900/30"
      : activeTheme === "violet"
        ? "border-violet-300/55 bg-violet-900/30"
        : "border-white/10 bg-slate-900";

  const appThemeClass = activeTheme === "pink"
    ? "from-pink-500/16 via-rose-500/10 to-slate-950"
    : activeTheme === "ocean"
      ? "from-cyan-500/16 via-blue-500/10 to-slate-950"
      : activeTheme === "violet"
        ? "from-violet-500/16 via-fuchsia-500/10 to-slate-950"
        : "from-slate-900 via-slate-900 to-slate-950";

  return { themeClass, appThemeClass };
};

export const getNameStyleClass = (styleKey?: string | null) => {
  if (styleKey === "rainbow") return "bg-gradient-to-r from-pink-300 via-cyan-300 to-yellow-200 bg-[length:200%_200%] bg-clip-text text-transparent animate-pulse";
  if (styleKey === "fire") return "bg-gradient-to-r from-rose-400 via-orange-300 to-amber-200 bg-[length:200%_200%] bg-clip-text text-transparent animate-pulse";
  if (styleKey === "ocean") return "bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-[length:200%_200%] bg-clip-text text-transparent animate-pulse";
  return "text-slate-100";
};

export const getActiveTabClass = (active: boolean, activeTheme: string | null, hasNeonFrame: boolean) => {
  if (active) {
    if (activeTheme === "pink") return "border border-pink-200/80 bg-pink-300 text-slate-950";
    if (activeTheme === "ocean") return "border border-cyan-200/80 bg-cyan-300 text-slate-950";
    if (activeTheme === "violet") return "border border-violet-200/80 bg-violet-300 text-slate-950";
    return "border border-cyan-200/80 bg-cyan-400 text-slate-950";
  }

  if (activeTheme === "pink") return hasNeonFrame ? "border border-pink-300/35 bg-pink-500/10 text-pink-100 neon-chip" : "border border-pink-300/35 bg-pink-500/10 text-pink-100";
  if (activeTheme === "ocean") return hasNeonFrame ? "border border-cyan-300/35 bg-cyan-500/10 text-cyan-100 neon-chip" : "border border-cyan-300/35 bg-cyan-500/10 text-cyan-100";
  if (activeTheme === "violet") return hasNeonFrame ? "border border-violet-300/35 bg-violet-500/10 text-violet-100 neon-chip" : "border border-violet-300/35 bg-violet-500/10 text-violet-100";

  return hasNeonFrame ? "border border-white/20 bg-white/5 neon-chip" : "border border-white/20 bg-white/5";
};
