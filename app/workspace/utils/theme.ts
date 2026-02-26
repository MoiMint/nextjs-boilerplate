export const getThemeClasses = (activeTheme: string | null) => {
  const isAnimated = activeTheme === "sunset" || activeTheme === "aurora" || activeTheme === "matrix";

  const themeClass = activeTheme === "pink"
    ? "border-pink-300/55 bg-pink-900/30"
    : activeTheme === "ocean"
      ? "border-cyan-300/55 bg-cyan-900/30"
      : activeTheme === "violet"
        ? "border-violet-300/55 bg-violet-900/30"
        : activeTheme === "sunset"
          ? "border-rose-300/60 bg-gradient-to-r from-rose-500/25 via-amber-400/20 to-fuchsia-500/20 bg-[length:200%_200%] animate-gradient-shift"
          : activeTheme === "aurora"
            ? "border-emerald-300/60 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-violet-500/20 bg-[length:200%_200%] animate-gradient-shift"
            : activeTheme === "matrix"
              ? "border-lime-300/60 bg-gradient-to-r from-lime-400/20 via-emerald-500/20 to-cyan-500/20 bg-[length:200%_200%] animate-gradient-shift"
              : "border-white/10 bg-slate-900";

  const appThemeClass = activeTheme === "pink"
    ? "from-pink-500/16 via-rose-500/10 to-slate-950"
    : activeTheme === "ocean"
      ? "from-cyan-500/16 via-blue-500/10 to-slate-950"
      : activeTheme === "violet"
        ? "from-violet-500/16 via-fuchsia-500/10 to-slate-950"
        : activeTheme === "sunset"
          ? "from-rose-500/20 via-amber-500/15 to-slate-950"
          : activeTheme === "aurora"
            ? "from-emerald-500/20 via-cyan-500/15 to-slate-950"
            : activeTheme === "matrix"
              ? "from-lime-500/20 via-emerald-500/15 to-slate-950"
              : "from-slate-900 via-slate-900 to-slate-950";

  return {
    themeClass: `${themeClass} ${isAnimated ? "bg-[length:200%_200%]" : ""}`,
    appThemeClass: `${appThemeClass} ${isAnimated ? "bg-[length:200%_200%] animate-gradient-shift" : ""}`,
  };
};

export const getNameStyleClass = (styleKey?: string | null) => {
  if (styleKey === "rainbow") return "bg-gradient-to-r from-pink-300 via-cyan-300 to-yellow-200 bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient-shift";
  if (styleKey === "fire") return "bg-gradient-to-r from-rose-400 via-orange-300 to-amber-200 bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient-shift";
  if (styleKey === "ocean") return "bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient-shift";
  return "text-slate-100";
};

export const getActiveTabClass = (active: boolean, activeTheme: string | null, hasNeonFrame: boolean) => {
  if (active) {
    if (activeTheme === "pink") return "bg-pink-300 text-slate-950";
    if (activeTheme === "ocean") return "bg-cyan-300 text-slate-950";
    if (activeTheme === "violet") return "bg-violet-300 text-slate-950";
    if (activeTheme === "sunset") return "bg-rose-300 text-slate-950";
    if (activeTheme === "aurora") return "bg-emerald-300 text-slate-950";
    if (activeTheme === "matrix") return "bg-lime-300 text-slate-950";
    return "bg-cyan-400 text-slate-950";
  }
  return hasNeonFrame ? "bg-white/5 neon-chip" : "bg-white/5";
};
