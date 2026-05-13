import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Search, Trash2, Scan, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";
import {
  useGetHistory,
  getGetHistoryQueryKey,
  useDeleteHistoryEntry,
  useGetAnalytics,
  getGetAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const NEON_COLORS = ["#f59e0b", "#10b981", "#00d4ff", "#a855f7"];

export default function History() {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<"" | "ai_generated" | "real">("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const params = {
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(resultFilter ? { result: resultFilter as "ai_generated" | "real" } : {}),
  };

  const { data: historyData, isLoading } = useGetHistory(params, {
    query: { queryKey: getGetHistoryQueryKey(params) },
  });
  const { data: analytics } = useGetAnalytics();
  const deleteMutation = useDeleteHistoryEntry();

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
      },
    });
  };

  const pieData = analytics
    ? [
        { name: "AI Generated", value: analytics.totalAiGenerated },
        { name: "Authentic / Real", value: analytics.totalReal },
      ].filter(d => d.value > 0)
    : [];

  const barData = analytics?.recentActivity ?? [];
  const confidenceData = analytics?.confidenceDistribution ?? [];

  const entries = historyData?.entries ?? [];
  const total = historyData?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center animate-glow-pulse"
                style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.38)" }}
              >
                <Clock className="w-5 h-5 text-[#00d4ff]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-sora">Detection History</h1>
                <p className="text-[rgba(180,210,255,0.40)] text-xs font-mono tracking-widest uppercase">Analysis Records & Analytics</p>
              </div>
            </div>
          </motion.div>

          {analytics && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="glass-card rounded-2xl p-4">
                <p className="text-xs text-[rgba(0,212,255,0.65)] uppercase tracking-widest mb-3 font-mono flex items-center gap-2">
                  <BarChart3 className="w-3 h-3" /> Detection Split
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={NEON_COLORS[i]} stroke="transparent" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgba(7,9,28,0.95)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: "12px", color: "#e2e8f0", fontSize: "11px" }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", color: "rgba(180,210,255,0.60)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <p className="text-xs text-[rgba(0,212,255,0.65)] uppercase tracking-widest mb-3 font-mono">7-Day Activity</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(80,160,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(180,210,255,0.35)" }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 9, fill: "rgba(180,210,255,0.35)" }} />
                    <Tooltip contentStyle={{ background: "rgba(7,9,28,0.95)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: "12px", color: "#e2e8f0", fontSize: "11px" }} />
                    <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <p className="text-xs text-[rgba(168,85,247,0.65)] uppercase tracking-widest mb-3 font-mono">Confidence Distribution</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={confidenceData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.06)" />
                    <XAxis dataKey="range" tick={{ fontSize: 9, fill: "rgba(180,210,255,0.35)" }} />
                    <YAxis tick={{ fontSize: 9, fill: "rgba(180,210,255,0.35)" }} />
                    <Tooltip contentStyle={{ background: "rgba(7,9,28,0.95)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "12px", color: "#e2e8f0", fontSize: "11px" }} />
                    <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,212,255,0.45)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by filename..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-[rgba(200,220,255,0.85)] placeholder:text-[rgba(180,210,255,0.25)] bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.14)] focus:outline-none focus:border-[rgba(0,212,255,0.45)] transition-colors font-sora"
                  data-testid="input-search-history"
                />
              </div>
              <select
                value={resultFilter}
                onChange={(e) => { setResultFilter(e.target.value as "" | "ai_generated" | "real"); setPage(1); }}
                className="px-4 py-2.5 rounded-xl text-sm text-[rgba(200,220,255,0.85)] bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.14)] focus:outline-none focus:border-[rgba(0,212,255,0.45)] transition-colors font-sora"
                data-testid="select-result-filter"
              >
                <option value="">All Results</option>
                <option value="ai_generated">AI Generated</option>
                <option value="real">Real / Authentic</option>
              </select>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center gap-4">
                <motion.div
                  className="w-9 h-9 rounded-full border-2 border-t-[#00d4ff] border-[rgba(0,212,255,0.12)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-[rgba(180,210,255,0.40)] text-sm font-mono">Loading records...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-14 text-center">
                <Clock className="w-14 h-14 text-[rgba(0,212,255,0.20)] mx-auto mb-4" />
                <p className="text-[rgba(200,220,255,0.55)] font-sora">No detection records found</p>
                <p className="text-[rgba(180,210,255,0.30)] text-sm mt-2 font-sora">Upload an image to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-history">
                  <thead>
                    <tr className="border-b border-[rgba(0,212,255,0.08)]">
                      {["File", "Type", "Result", "AI %", "Confidence", "Date", ""].map((h) => (
                        <th key={h} className="px-4 py-3.5 text-left text-xs text-[rgba(180,210,255,0.35)] uppercase tracking-widest font-mono font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => {
                      const isAI = entry.prediction === "ai_generated";
                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-[rgba(80,160,255,0.05)] hover:bg-[rgba(0,212,255,0.025)] transition-colors"
                          data-testid={`row-history-${entry.id}`}
                        >
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-[rgba(200,220,255,0.70)] font-mono truncate max-w-[140px] block" title={entry.fileName}>{entry.fileName}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-xs font-mono text-[#00d4ff]">
                              <Scan className="w-3 h-3" />
                              image
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: isAI ? "#f59e0b" : "#10b981" }}>
                              {isAI ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              {isAI ? "AI Generated" : "Real / Authentic"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-[rgba(180,210,255,0.07)]">
                                <div className="h-full rounded-full" style={{ width: `${entry.aiGeneratedPercent}%`, background: isAI ? "#f59e0b" : "#10b981" }} />
                              </div>
                              <span className="text-xs font-mono text-[rgba(200,220,255,0.60)]">{entry.aiGeneratedPercent.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-mono text-[rgba(0,212,255,0.75)]">{entry.confidenceScore.toFixed(1)}%</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-[rgba(180,210,255,0.32)] font-mono">{new Date(entry.timestamp).toLocaleDateString()}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deleteMutation.isPending}
                              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-[rgba(239,68,68,0.12)] hover:text-[#f87171] text-[rgba(180,210,255,0.22)]"
                              data-testid={`button-delete-${entry.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-4 py-3.5 border-t border-[rgba(0,212,255,0.07)] flex items-center justify-between">
                <span className="text-xs text-[rgba(180,210,255,0.32)] font-mono">{total} total records</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-1.5 rounded-lg text-xs neon-btn-blue disabled:opacity-30 disabled:cursor-not-allowed" data-testid="button-prev-page">Prev</button>
                  <span className="px-3 py-1.5 text-xs text-[rgba(180,210,255,0.45)] font-mono">{page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-1.5 rounded-lg text-xs neon-btn-blue disabled:opacity-30 disabled:cursor-not-allowed" data-testid="button-next-page">Next</button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
