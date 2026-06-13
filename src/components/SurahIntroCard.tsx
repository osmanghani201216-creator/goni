import { useState, useEffect } from "react";
import { Sparkles, HelpCircle, AlertCircle, RefreshCw } from "lucide-react";

interface IntroData {
  summary: string;
  theme: string;
  background: string;
}

interface SurahIntroCardProps {
  surahId: number;
}

export default function SurahIntroCard({ surahId }: SurahIntroCardProps) {
  const [intro, setIntro] = useState<IntroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadIntro() {
      setLoading(true);
      setError(null);
      setIntro(null);
      try {
        const res = await fetch(`/api/surah-intro/${surahId}`);
        if (!res.ok) throw new Error("সূরার তাফসীর ও পরিচিতি লোড করা সম্ভব হয়নি");
        const data = await res.json();
        if (active) {
          setIntro(data);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "পরিচিতি ও বিবরণ লোড করতে ব্যর্থ হয়েছে।");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadIntro();

    return () => {
      active = false;
    };
  }, [surahId]);

  if (loading) {
    return (
      <div className="bg-soph-card border border-soph-border rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 shadow-md">
        <RefreshCw className="h-6 w-6 text-soph-gold animate-spin" />
        <p className="text-xs text-soph-text-secondary font-medium">
          Gemini AI সূরার চমৎকার পরিচিতি ও শান-ই-নুযূল প্রস্তুত করছে...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-soph-card border border-soph-border rounded-2xl p-5 flex items-start gap-4 shadow-md">
        <AlertCircle className="h-5 w-5 text-soph-gold shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-soph-gold">পরিচিতি প্রস্তুত করতে সাময়িক সমস্যা হচ্ছে</h4>
          <p className="text-xs text-soph-text-secondary mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!intro) return null;

  return (
    <div className="bg-soph-card border border-soph-border rounded-2xl p-6 space-y-6 shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.4px,transparent_0.4px)] [background-size:20px_20px] opacity-5 pointer-events-none"></div>
      
      <div className="flex items-center gap-2 relative z-10 border-b border-soph-border/50 pb-3">
        <Sparkles className="h-5 w-5 text-soph-gold shrink-0" />
        <h3 className="text-base font-bold text-soph-text-primary">
          ঐশী সূরার রূপরেখা ও পরিচিতি (AI তাফসীর)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* Summary Card */}
        <div className="space-y-3 bg-soph-deep/30 p-4 border border-soph-border rounded-xl">
          <div className="flex items-center gap-1.5 bg-soph-hover text-soph-gold px-3 py-1 rounded-lg w-max border border-soph-border/40">
            <span className="text-xs font-bold font-sans">১. সূরার পরিচিতি ও সারসংক্ষেপ</span>
          </div>
          <p className="text-sm text-soph-text-primary leading-relaxed text-justify">
            {intro.summary}
          </p>
        </div>

        {/* Theme Card */}
        <div className="space-y-3 bg-soph-deep/30 p-4 border border-soph-border rounded-xl">
          <div className="flex items-center gap-1.5 bg-soph-hover text-soph-gold px-3 py-1 rounded-lg w-max border border-soph-border/40">
            <span className="text-xs font-bold font-sans">২. আলোচিত মূল বিষয়বস্তুসমূহ</span>
          </div>
          <div className="text-sm text-soph-text-primary leading-relaxed whitespace-pre-line text-justify">
            {intro.theme}
          </div>
        </div>

        {/* Background Card */}
        <div className="space-y-3 bg-soph-deep/30 p-4 border border-soph-border rounded-xl">
          <div className="flex items-center gap-1.5 bg-soph-hover text-soph-gold px-3 py-1 rounded-lg w-max border border-soph-border/40">
            <span className="text-xs font-bold">৩. অবতরণের ঐতিহাসিক প্রেক্ষাপট</span>
          </div>
          <p className="text-sm text-soph-text-primary leading-relaxed text-justify">
            {intro.background}
          </p>
        </div>
      </div>
    </div>
  );
}
