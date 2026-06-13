import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SurahSummary } from "../types.ts";
import { ALL_SURAS } from "../data.ts";
import { 
  Search, Compass, BookOpen, Layers, Sparkles, X, 
  RefreshCw, AlertCircle, FileText, LayoutList,
  Download, Check, Trash2, Database, Wifi, WifiOff, Info
} from "lucide-react";

interface SuraGridProps {
  onSelectSurah: (n: number) => void;
}

export default function SuraGrid({ onSelectSurah }: SuraGridProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "makki" | "madani">("all");

  // Offline download states
  const [downloadedIds, setDownloadedIds] = useState<number[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const scanOfflineCache = () => {
    const ids: number[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("quran_surah_offline_")) {
        const id = parseInt(key.replace("quran_surah_offline_", ""));
        if (!isNaN(id)) {
          ids.push(id);
        }
      }
    }
    setDownloadedIds(ids.sort((a, b) => a - b));
  };

  useEffect(() => {
    scanOfflineCache();
  }, []);

  const downloadSurahOffline = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/quran/offline/${id}`);
      if (!res.ok) throw new Error("Failed to download");
      const data = await res.json();
      localStorage.setItem(`quran_surah_offline_${id}`, JSON.stringify(data));
      // Standardize the caching key names for direct quick retrieval offline
      localStorage.setItem(`quran_surah_offline_details_${id}`, JSON.stringify(data));
      scanOfflineCache();
    } catch (err) {
      console.error(`Failed to download surah ${id}:`, err);
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteSurahOffline = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(`quran_surah_offline_${id}`);
    localStorage.removeItem(`quran_surah_offline_details_${id}`);
    scanOfflineCache();
  };

  const syncAllSurahs = async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    setSyncProgress(0);
    
    const remainingIds = ALL_SURAS.map(s => s.n).filter(id => !downloadedIds.includes(id));
    if (remainingIds.length === 0) {
      // Force refresh all
      const allIds = ALL_SURAS.map(s => s.n);
      let count = 0;
      for (const id of allIds) {
        try {
          const res = await fetch(`/api/quran/offline/${id}`);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(`quran_surah_offline_${id}`, JSON.stringify(data));
          }
        } catch (err) {
          console.error(err);
        }
        count++;
        setSyncProgress(Math.round((count / allIds.length) * 100));
      }
    } else {
      let count = 0;
      const totalToDownload = remainingIds.length;
      for (const id of remainingIds) {
        try {
          const res = await fetch(`/api/quran/offline/${id}`);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(`quran_surah_offline_${id}`, JSON.stringify(data));
          }
        } catch (err) {
          console.error(err);
        }
        count++;
        setSyncProgress(Math.round((count / totalToDownload) * 100));
        scanOfflineCache();
      }
    }
    setIsSyncingAll(false);
    scanOfflineCache();
  };

  // AI Quick Glance states
  const [quickGlanceId, setQuickGlanceId] = useState<number | null>(null);
  const [glanceData, setGlanceData] = useState<{ summary: string; theme: string; background: string } | null>(null);
  const [isGlanceLoading, setIsGlanceLoading] = useState(false);
  const [glanceError, setGlanceError] = useState<string | null>(null);

  useEffect(() => {
    if (quickGlanceId === null) {
      setGlanceData(null);
      setGlanceError(null);
      return;
    }

    let active = true;
    async function loadGlance() {
      setIsGlanceLoading(true);
      setGlanceError(null);
      setGlanceData(null);
      try {
        const res = await fetch(`/api/surah-intro/${quickGlanceId}`);
        if (!res.ok) throw new Error("সূরার কুইক গ্ল্যান্স ডাটা লোড করা সম্ভব হয়নি।");
        const data = await res.json();
        if (active) {
          setGlanceData(data);
        }
      } catch (err: any) {
        if (active) {
          setGlanceError(err.message || "সারসংক্ষেপ লোড করতে ব্যর্থ হয়েছে।");
        }
      } finally {
        if (active) {
          setIsGlanceLoading(false);
        }
      }
    }

    loadGlance();
    return () => {
      active = false;
    };
  }, [quickGlanceId]);

  const activeGlanceSurah = ALL_SURAS.find(s => s.n === quickGlanceId);

  const filtered = ALL_SURAS.filter((s) => {
    const matchesSearch =
      s.bn.toLowerCase().includes(search.toLowerCase()) ||
      s.en.toLowerCase().includes(search.toLowerCase()) ||
      s.mn.toLowerCase().includes(search.toLowerCase()) ||
      s.ar.toLowerCase().includes(search.toLowerCase()) ||
      s.n.toString() === search.trim();
    
    if (filterType === "all") return matchesSearch;
    return matchesSearch && s.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter controls */}
      <div className="bg-soph-card border border-soph-border rounded-2xl p-5 shadow-lg space-y-4 select-none">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="পছন্দের সূরা খুঁজুন... (নাম, সূরার নম্বর বা অর্থ লিখে সার্চ করুন)"
            className="w-full pl-11 pr-4 py-3 bg-soph-deep border border-soph-border rounded-xl text-soph-text-primary placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-soph-gold transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-soph-gold-muted" />
        </div>

        {/* Filter categories */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex bg-soph-deep p-1 rounded-xl border border-soph-border">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-soph-gold text-soph-deep shadow-md font-bold"
                  : "text-soph-text-secondary hover:text-soph-text-primary"
              }`}
            >
              সব সূরা ({ALL_SURAS.length})
            </button>
            <button
              onClick={() => setFilterType("makki")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === "makki"
                  ? "bg-soph-gold text-soph-deep shadow-md font-bold"
                  : "text-soph-text-secondary hover:text-soph-text-primary"
              }`}
            >
              মাক্কী সূরা (৮৬টি)
            </button>
            <button
              onClick={() => setFilterType("madani")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === "madani"
                  ? "bg-soph-gold text-soph-deep shadow-md font-bold"
                  : "text-soph-text-secondary hover:text-soph-text-primary"
              }`}
            >
              মাদানী সূরা (২৮টি)
            </button>
          </div>

          <div className="text-xs font-mono text-soph-text-secondary">
            মিল পাওয়া গেছে: {filtered.length}টি সূরার
          </div>
        </div>
      </div>

      {/* Offline Management Panel */}
      <div className="bg-soph-card border border-soph-border rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4 select-none">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
              isSyncingAll 
                ? "bg-soph-gold/10 border-soph-gold text-soph-gold animate-spin" 
                : downloadedIds.length === 114 
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400" 
                : "bg-soph-deep border-soph-border text-soph-gold"
            }`}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-soph-text-primary flex items-center gap-2">
                অফলাইন সূরা ডাউনলোড ও সিঙ্ক ম্যানেজার
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  networkOnline 
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" 
                    : "bg-red-950/40 text-red-400 border border-red-500/20"
                }`}>
                  {networkOnline ? (
                    <>
                      <Wifi className="h-2.5 w-2.5" />
                      <span>অনলাইন</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-2.5 w-2.5 animate-pulse" />
                      <span>অফলাইন তিলাওয়াত সচল</span>
                    </>
                  )}
                </span>
              </h4>
              <p className="text-xs text-soph-text-secondary mt-0.5">
                কুরআনের ১১৪টি সূরা অফলাইনে ব্রাউজ করুন। {downloadedIds.length}টি সূরা ইতিমধ্যে সাকসেসফুলি ডাউনলোড হয়েছে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={isSyncingAll || !networkOnline}
              onClick={syncAllSurahs}
              className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                downloadedIds.length === 114 
                  ? "bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" 
                  : "bg-soph-gold hover:bg-soph-gold-light text-soph-deep shadow-md font-bold"
              }`}
            >
              {isSyncingAll ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>সিঙ্ক হচ্ছে ({syncProgress}%)</span>
                </>
              ) : downloadedIds.length === 114 ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>তালিকায় ১১৪টি পূর্ণ সিঙ্কড</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>বাকি {114 - downloadedIds.length}টি অফলাইনে সিঙ্ক করুন</span>
                </>
              )}
            </button>
            
            {downloadedIds.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("আপনি কি সব ডাউনলোড করা সুরার অফলাইন ক্যাশ ফাইল মুছে ফেলতে চান?")) {
                    for (let i = 1; i <= 114; i++) {
                      localStorage.removeItem(`quran_surah_offline_${i}`);
                      localStorage.removeItem(`quran_surah_offline_details_${i}`);
                    }
                    scanOfflineCache();
                  }
                }}
                disabled={isSyncingAll}
                className="p-2 bg-soph-deep hover:bg-red-950/20 text-soph-text-secondary hover:text-red-400 border border-soph-border rounded-xl transition cursor-pointer"
                title="সকল অফলাইন ডাউনলোড মুছুন"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isSyncingAll && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-soph-text-secondary font-semibold font-mono">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-soph-gold animate-ping"></span>
                <span>সূরাসমূহের আরবি তিলাওয়াত, বাংলা অর্থ ও উচ্চারণ ফাইল ক্রমান্বয়ে স্টোর হচ্ছে...</span>
              </span>
              <span>{syncProgress}%</span>
            </div>
            <div className="w-full bg-soph-deep rounded-full h-1.5 overflow-hidden border border-soph-border/40">
              <div 
                className="bg-soph-gold h-1.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(197,160,89,0.3)]"
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-soph-card rounded-2xl border border-soph-border p-8">
          <div className="text-soph-gold-muted mb-4 font-serif text-4xl">🔍</div>
          <h3 className="text-lg font-bold text-soph-text-primary">কোনো সূরা খুঁজে পাওয়া যায়নি</h3>
          <p className="text-soph-text-secondary text-sm mt-1">ঠিকভাবে শব্দ বা নম্বর লিখে আবার অনুসন্ধান করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.n}
              onClick={() => onSelectSurah(s.n)}
              className="group relative bg-soph-card border border-soph-border rounded-2xl p-4 cursor-pointer hover:border-soph-gold/40 hover:shadow-lg hover:shadow-black/50 transition duration-150 flex items-center justify-between"
            >
              {/* Left Side: Number and Details */}
              <div className="flex items-center gap-4">
                {/* Number Frame */}
                <div className="h-11 w-11 shrink-0 rounded-xl bg-soph-deep border border-soph-border text-soph-gold flex items-center justify-center font-bold text-sm font-mono shadow-inner group-hover:bg-soph-hover group-hover:border-soph-gold transition duration-150 select-none">
                  {s.n}
                </div>

                {/* Sura Titles */}
                <div>
                  <h4 className="font-bold text-soph-text-primary text-base group-hover:text-soph-gold transition flex items-center gap-2">
                    {s.bn}
                  </h4>
                  <p className="text-[11px] text-soph-text-secondary font-medium select-none">
                    {s.en} • {s.mn}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap select-none">
                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-soph-hover text-soph-gold border border-soph-border">
                      {s.type === "makki" ? "মাক্কী" : "মাদানী"}
                    </span>
                    <span className="text-[10px] text-soph-text-secondary font-mono">
                      {s.ayat}টি আয়াত
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickGlanceId(s.n);
                      }}
                      className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-soph-gold/10 hover:bg-soph-gold/25 text-soph-gold border border-soph-gold/20 hover:border-soph-gold/40 transition duration-150 cursor-pointer"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-soph-gold animate-pulse" />
                      <span>Quick Glance</span>
                    </button>
                    {downloadedIds.includes(s.n) ? (
                      <button
                        onClick={(e) => deleteSurahOffline(s.n, e)}
                        className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-950/45 hover:bg-red-950/40 text-emerald-400 hover:text-red-405 border border-emerald-500/30 hover:border-red-500/40 opacity-90 transition duration-150 cursor-pointer"
                        title="অফলাইন থেকে মুছে ফেলতে ক্লিক করুন"
                      >
                        <Check className="h-2.5 w-2.5" />
                        <span>অফলাইন</span>
                        <Trash2 className="h-2.5 w-2.5 ml-0.5 text-emerald-400/80 hover:text-red-400" />
                      </button>
                    ) : downloadingId === s.n ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-soph-gold/15 text-soph-gold border border-soph-gold/30 animate-pulse">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin text-soph-gold" />
                        <span>ডাউনলোড...</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => downloadSurahOffline(s.n, e)}
                        disabled={!networkOnline}
                        className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-soph-deep hover:bg-soph-gold/15 disabled:opacity-40 disabled:pointer-events-none text-soph-text-secondary hover:text-soph-gold border border-soph-border hover:border-soph-gold/25 transition duration-150 cursor-pointer"
                        title="অফলাইনে পড়তে ক্লিক করে ডাউনলোড করুন"
                      >
                        <Download className="h-2.5 w-2.5 text-soph-gold-muted" />
                        <span>Offline Save</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Arabic Calligraphy Styling */}
              <div className="text-right pl-2 select-none">
                <span className="font-serif text-lg text-soph-gold font-medium dir-rtl tracking-wide select-none">
                  {s.ar}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Glance Modal */}
      <AnimatePresence>
        {quickGlanceId !== null && activeGlanceSurah && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickGlanceId(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative bg-soph-card border border-soph-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-soph-border flex items-center justify-between bg-soph-deep bg-[radial-gradient(#C5A059_0.4px,transparent_0.4px)] [background-size:16px_16px] opacity-95">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-soph-hover border border-soph-gold/25 text-soph-gold flex items-center justify-center font-bold font-mono">
                    {activeGlanceSurah.n}
                  </div>
                  <div>
                    <h3 className="font-bold text-soph-text-primary text-base flex items-center gap-2">
                       {activeGlanceSurah.bn} 
                       <span className="text-[10px] text-soph-gold bg-soph-gold/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-soph-gold/20 flex items-center gap-1">
                         <Sparkles className="h-3 w-3 text-soph-gold animate-pulse" /> 
                         AI Quick Glance
                       </span>
                    </h3>
                    <p className="text-xs text-soph-text-secondary">
                      {activeGlanceSurah.en} • {activeGlanceSurah.mn} • {activeGlanceSurah.ayat}টি আয়াত ({activeGlanceSurah.type === "makki" ? "মাক্কী" : "মাদানী"})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setQuickGlanceId(null)}
                  className="p-1.5 rounded-xl bg-soph-deep hover:bg-soph-hover text-soph-text-secondary hover:text-soph-text-primary border border-soph-border transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin flex-1 text-left">
                {isGlanceLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
                    <RefreshCw className="h-8 w-8 text-soph-gold animate-spin" />
                    <div>
                      <p className="text-sm font-bold text-soph-gold animate-pulse">Gemini AI চমৎকার রূপরেখা ও শান-ই-নুযূল প্রস্তুত করছে</p>
                      <p className="text-xs text-soph-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
                        এটি সুরাটির প্রধান মূলভাব, শান-ই-নুযূল ও প্রধান গাইডলাইনগুলো একের পর এক সমন্বয় করে লোড করছে, অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন...
                      </p>
                    </div>
                  </div>
                ) : glanceError ? (
                  <div className="bg-red-950/10 border border-red-900/40 rounded-2xl p-5 flex gap-4">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-400">ব্যর্থ হয়েছে</h4>
                      <p className="text-xs text-soph-text-secondary mt-1">{glanceError}</p>
                      <button
                        onClick={() => {
                          setQuickGlanceId(null);
                          setTimeout(() => setQuickGlanceId(activeGlanceSurah.n), 50);
                        }}
                        className="mt-3 px-3 py-1.5 bg-soph-gold text-soph-deep rounded-lg text-xs font-bold transition hover:bg-soph-gold-light cursor-pointer"
                      >
                        পুনরায় চেষ্টা করুন
                      </button>
                    </div>
                  </div>
                ) : glanceData ? (
                  <div className="space-y-5 animate-fade-in">
                    {/* Visual Intro Highlight */}
                    <div className="bg-gradient-to-r from-soph-gold/10 to-soph-gold/5 border border-soph-gold/15 rounded-2xl p-4 flex gap-4 items-start">
                      <div className="h-9 w-9 rounded-xl bg-soph-gold/15 flex items-center justify-center shrink-0 border border-soph-gold/25 mt-0.5 shadow-md">
                        <FileText className="h-5 w-5 text-soph-gold" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black uppercase text-soph-gold tracking-wider mb-1">
                          ১. সূরার পরিচিতি ও সারসংক্ষেপ
                        </h4>
                        <p className="text-xs text-soph-text-primary leading-relaxed text-justify">
                          {glanceData.summary}
                        </p>
                      </div>
                    </div>

                    {/* Key Themes List */}
                    <div className="bg-soph-deep/40 border border-soph-border rounded-2xl p-4 flex gap-4 items-start">
                      <div className="h-9 w-9 rounded-xl bg-soph-hover flex items-center justify-center shrink-0 border border-soph-border mt-0.5 shadow-sm">
                        <LayoutList className="h-5 w-5 text-soph-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase text-soph-gold tracking-wider mb-2">
                          ২. আলোচিত প্রধান মূল থিমসমূহ
                        </h4>
                        <div className="text-xs text-soph-text-primary leading-relaxed whitespace-pre-line text-justify bg-soph-deep border border-soph-border/40 rounded-xl p-3.5">
                          {glanceData.theme}
                        </div>
                      </div>
                    </div>

                    {/* Historic background */}
                    <div className="bg-soph-deep/20 border border-soph-border rounded-2xl p-4 flex gap-4 items-start">
                      <div className="h-9 w-9 rounded-xl bg-soph-hover flex items-center justify-center shrink-0 border border-soph-border mt-0.5 shadow-sm">
                        <Compass className="h-5 w-5 text-soph-gold-muted" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black uppercase text-soph-gold/90 tracking-wider mb-1">
                          ৩. অবতরণের রহস্য ও প্রেক্ষাপট (শান-ই-নুযূল)
                        </h4>
                        <p className="text-xs text-soph-text-primary/95 leading-relaxed text-justify">
                          {glanceData.background}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-soph-border bg-soph-deep/60 flex flex-col sm:flex-row gap-3 justify-between items-center bg-[radial-gradient(#C5A059_0.3px,transparent_0.3px)] [background-size:24px_24px] opacity-95">
                <p className="text-[10px] text-soph-text-secondary text-center sm:text-left leading-relaxed">
                  *এই কুইক গ্ল্যান্স সারসংক্ষেপটি Gemini AI-এর তাফসীর ইন্টেলিজেন্স দ্বারা জেনারেট করা হয়েছে।
                </p>
                <div className="flex gap-2 w-full sm:w-auto shrink-0 select-none">
                  <button
                    onClick={() => {
                      setQuickGlanceId(null);
                      onSelectSurah(activeGlanceSurah.n);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-black text-xs rounded-xl shadow-lg shadow-black/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>তিলওয়াত করুন</span>
                    <BookOpen className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setQuickGlanceId(null)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-soph-deep hover:bg-soph-hover text-soph-text-secondary border border-soph-border font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

