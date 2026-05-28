export function AIStatusBar() {
  const items = [
    { label: "agentes ativos", value: 5, color: "text-emerald-400" },
    { label: "tarefas em execução", value: 12, color: "text-blue-400" },
    { label: "campanhas escalando", value: 3, color: "text-purple-400" },
    { label: "análises finalizadas", value: 2, color: "text-cyan-400" },
  ];
  return (
    <div className="mt-4 mb-6 rounded-2xl border border-blue-500/20 bg-[#061120]/80 px-5 py-4 backdrop-blur-xl shadow-[0_0_30px_rgba(0,119,255,0.12)]">
      <div className="flex flex-wrap items-center gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition-all duration-300 hover:border-blue-400/40 hover:bg-blue-500/5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
            <span className="text-sm text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
