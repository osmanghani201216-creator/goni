import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Calendar, Bell, BellOff, ArrowRight, BookOpen, 
  RefreshCw, CheckCircle, Lightbulb, Clipboard, Volume2, Info
} from "lucide-react";

interface DailyVerseProps {
  onGotoSurah?: (surahId: number) => void;
}

interface TafsirData {
  pronunciation: string;
  context: string;
  explanation: string;
  lessons: string;
}

// 1. Curated List of Beautiful, Inspiring and Life-guiding Verses
const CURATED_VERSES = [
  {
    surahId: 93,
    surahName: "আদ দুহা",
    verseNumber: 3,
    ar: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ",
    bn: "আপনার পালনকর্তা আপনাকে ছেড়ে যাননি এবং আপনার প্রতি অসন্তুষ্ট হননি।"
  },
  {
    surahId: 2,
    surahName: "আল বাকারা",
    verseNumber: 152,
    ar: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    bn: "অতএব তোমরা আমাকে স্মরণ কর, আমিও তোমাদের স্মরণ করব। আর তোমরা আমার প্রতি কৃতজ্ঞ হও এবং অকৃতজ্ঞ হয়ো না।"
  },
  {
    surahId: 2,
    surahName: "আল বাকারা",
    verseNumber: 186,
    ar: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ",
    bn: "আর আমার বান্দারা যখন আপনার কাছে আমার সম্পর্কে জিজ্ঞেস করে, তখন আমি তো নিকটেই আছি; আমি আহ্বানকারীর ডাকে সাড়া দেই যখন সে আমাকে ডাকে।"
  },
  {
    surahId: 94,
    surahName: "আশ শারহ",
    verseNumber: 5,
    ar: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
    bn: "নিশ্চয় কষ্টের সাথেই স্বস্তি রয়েছে।"
  },
  {
    surahId: 3,
    surahName: "আলে ইমরান",
    verseNumber: 139,
    ar: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ",
    bn: "আর তোমরা হতাশ হয়ো না এবং দুঃখ করো না, তোমরাই বিজয়ী হবে যদি তোমরা মুমিন হও।"
  },
  {
    surahId: 39,
    surahName: "আয যুমার",
    verseNumber: 53,
    ar: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ",
    bn: "বলুন, হে আমার বান্দারা যারা নিজেদের প্রতি জুলুম করেছ, তোমরা আল্লাহর রহমত হতে নিরাশ হয়ো না।"
  },
  {
    surahId: 20,
    surahName: "ত্বা-হা",
    verseNumber: 25,
    ar: "رَبِّ اشْرَحْ لِي صَدْرِي",
    bn: "হে আমার পালনকর্তা! আমার বক্ষ প্রশস্ত করে দিন।"
  },
  {
    surahId: 13,
    surahName: "আর রাদ",
    verseNumber: 28,
    ar: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    bn: "জেনে রেখ, আল্লাহর স্মরণেই কেবল অন্তরসমূহ প্রশান্তি লাভ করে।"
  },
  {
    surahId: 2,
    surahName: "আল বাকারা",
    verseNumber: 286,
    ar: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    bn: "আল্লাহ কোনো প্রাণীর ওপর তার সাধ্যের অতিরিক্ত দায়িত্ব চাপিয়ে দেন না।"
  },
  {
    surahId: 25,
    surahName: "আল ফুরকান",
    verseNumber: 74,
    ar: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    bn: "হে আমাদের পালনকর্তা! আমাদের স্ত্রীদের ও সন্তানদেরকে আমাদের চোখের শীতলতা বানিয়ে দিন এবং আমাদেরকে মুত্তাকীদের নেতা বানিয়ে দিন।"
  }
];

function toBengaliNumerals(num: number | string): string {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num
    .toString()
    .split("")
    .map(digit => banglaDigits[parseInt(digit)] || digit)
    .join("");
}

export default function DailyVerse({ onGotoSurah }: DailyVerseProps) {
  // Determine date seed to dynamically select consistent Ayat of the day
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = Math.abs(dateSeed) % CURATED_VERSES.length;
  const verse = CURATED_VERSES[index];

  // States
  const [tafsir, setTafsir] = useState<TafsirData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notification / Reminder states
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    return localStorage.getItem("daily_reminder_enabled") === "true";
  });
  const [reminderTime, setReminderTime] = useState<string>(() => {
    return localStorage.getItem("daily_reminder_time") || "09:00";
  });
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Effect to hide toast message after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Request & Update Reminder notification settings
  const handleToggleReminder = async () => {
    if (!reminderEnabled) {
      // Enabling notification: Must ask for permission
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setReminderEnabled(true);
          localStorage.setItem("daily_reminder_enabled", "true");
          setToastMessage(`অনুমতি সফল! প্রতিদিন ${toBengaliNumerals(reminderTime)} মিনিটে নোটিফিকেশন পাঠানো হবে।`);
        } else {
          setToastMessage("নোটিফিকেশন পারমিশন রিজেক্ট করা হয়েছে! ব্রাউজার সেটিংস থেকে অনুমতি দিন।");
        }
      } else {
        // System fallback
        setReminderEnabled(true);
        localStorage.setItem("daily_reminder_enabled", "true");
        setToastMessage(`আপনার ব্রাউজারে নোটিফিকেশন এপিআই নেই, তবে অ্যাপের ভেতরেই প্রতিদিন মনে করিয়ে দেওয়া হবে।`);
      }
    } else {
      // Disabling
      setReminderEnabled(false);
      localStorage.setItem("daily_reminder_enabled", "false");
      setToastMessage("দৈনিক রিমাইন্ডার বন্ধ করা হয়েছে।");
    }
  };

  const handleSaveTime = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("daily_reminder_time", reminderTime);
    setToastMessage(`রিমাইন্ডার সময় পরিবর্তন করে ${toBengaliNumerals(reminderTime)} টা করা হয়েছে!`);
    setShowReminderSettings(false);
  };

  // Fetch Tafsir via OpenAI / Gemini proxy on server.ts
  const handleLoadTafsir = async () => {
    if (tafsir) return; // already loaded or in cache
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surah: verse.surahId,
          ayah: verse.verseNumber,
          text: verse.ar,
          translation: verse.bn
        })
      });

      if (!res.ok) {
        throw new Error("তাফসীর লোড করতে সমস্যা হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।");
      }

      const data = await res.json();
      setTafsir(data);
    } catch (err: any) {
      setError(err.message || "তাফসীর জেনারেট করতে ত্রুটি দেখা দিয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-soph-card border border-soph-border rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Background ambient shine */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-soph-gold/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none"></div>

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-soph-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-soph-gold/10 border border-soph-gold/30 flex items-center justify-center text-soph-gold">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-soph-gold font-extrabold uppercase tracking-widest block label-section">আজকের পবিত্র আলোর বাণী</span>
            <h3 className="text-sm font-bold text-soph-text-primary mt-0.5">
              আয়াত অব দ্য ডে • {today.toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
          </div>
        </div>

        {/* Reminder Settings buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowReminderSettings(!showReminderSettings)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-soph-deep hover:bg-soph-hover border border-soph-border text-soph-text-secondary hover:text-soph-gold text-xs font-semibold rounded-xl transition cursor-pointer select-none"
          >
            {reminderEnabled ? <Bell className="h-3.5 w-3.5 text-soph-gold animate-bounce" /> : <BellOff className="h-3.5 w-3.5" />}
            <span>স্মরণিকা রিমাইন্ডার</span>
          </button>
        </div>
      </div>

      {/* Reminder settings form drawer */}
      <AnimatePresence>
        {showReminderSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-soph-deep/60 border border-soph-border/70 rounded-2xl p-4 space-y-4"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-soph-gold flex items-center gap-1.5 uppercase tracking-wide">
                  ⏰ দৈনিক কুরআন পাঠের রিমাইন্ডার সেটিংস
                </h4>
                <p className="text-[11px] text-soph-text-secondary">
                  ঈমানী চেতনা তরতাজা রাখতে প্রতিদিন নির্ধারিত সময়ে আজকের পবিত্র আয়াতটি নিয়ে স্মরণ করিয়ে দেওয়া হবে।
                </p>
              </div>
              <button
                onClick={handleToggleReminder}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition shrink-0 cursor-pointer ${
                  reminderEnabled
                    ? "bg-rose-950/20 text-rose-400 border-rose-900/30 hover:bg-rose-950/40"
                    : "bg-soph-gold text-soph-deep border-soph-gold hover:opacity-90 font-extrabold"
                }`}
              >
                {reminderEnabled ? "রিমাইন্ডার বন্ধ করুন" : "রিমাইন্ডার চালু করুন"}
              </button>
            </div>

            {reminderEnabled && (
              <form onSubmit={handleSaveTime} className="flex flex-col sm:flex-row items-end sm:items-center gap-3 pt-2">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <span className="text-xs text-soph-text-secondary font-medium whitespace-nowrap">প্রতিদিন নোটিফিকেশনের সময়:</span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-soph-card border border-soph-border text-soph-gold text-xs font-bold rounded-lg p-2 focus:ring-1 focus:ring-soph-gold focus:outline-none cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-soph-gold text-soph-deep text-xs font-bold rounded-lg hover:opacity-95 cursor-pointer flex items-center justify-center gap-1 transition"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> সেটিংস সংরক্ষণ করুন
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Verse Core Display */}
      <div className="bg-soph-deep p-6 md:p-8 rounded-2xl border border-soph-border space-y-5 text-center relative overflow-hidden shadow-inner">
        {/* Subtle Quran patterns */}
        <div className="absolute inset-0 bg-[#C5A059]/[0.015] [background-size:24px_24px] pointer-events-none"></div>

        {/* Verse Location Badge */}
        <div className="flex justify-center">
          <span className="px-3.5 py-1 bg-soph-card border border-soph-border rounded-full text-[10px] md:text-xs text-soph-gold font-bold">
            সূরা {verse.surahName} (আয়াত {toBengaliNumerals(verse.verseNumber)})
          </span>
        </div>

        {/* Arabic Display */}
        <div 
          className="font-serif text-3xl md:text-4xl text-soph-text-primary leading-normal md:leading-loose text-center dir-rtl select-all drop-shadow-md py-2"
          style={{ fontFamily: 'Amiri, serif' }}
        >
          {verse.ar}
        </div>

        {/* Bangla Translation */}
        <div className="max-w-2xl mx-auto space-y-1.5 border-t border-soph-border/40 pt-4">
          <span className="text-[10px] text-soph-gold-muted font-bold block uppercase tracking-widest">বঙ্গানুবাদ ও অর্থ</span>
          <p className="text-sm md:text-base font-semibold text-soph-text-primary leading-relaxed">
            {verse.bn}
          </p>
        </div>
      </div>

      {/* Tafsir / Action Buttons Section */}
      <div className="space-y-4">
        {/* Load/Toggle Tafsir Trigger */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-soph-text-secondary">
            <Info className="h-4 w-4 text-soph-gold" />
            <span>এই আয়াতের গভীর রহস্য ও কল্যাণ জানতে তাফসীর পড়ুন।</span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {onGotoSurah && (
              <button
                onClick={() => onGotoSurah(verse.surahId)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-soph-deep hover:bg-soph-hover border border-soph-border hover:border-soph-gold/40 text-soph-text-secondary hover:text-soph-gold text-xs font-bold rounded-xl transition cursor-pointer select-none w-full sm:w-auto"
              >
                <span>পড়ুন সম্পূর্ণ সূরা</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={handleLoadTafsir}
              disabled={loading || !!tafsir}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md w-full sm:w-auto select-none ${
                tafsir 
                  ? "bg-soph-gold/10 text-soph-gold border border-soph-gold/20 cursor-default" 
                  : "bg-soph-gold hover:bg-soph-gold/90 text-soph-deep border border-soph-gold cursor-pointer"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>তাফসীর রেডি হচ্ছে...</span>
                </>
              ) : tafsir ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>আজকের তাফসীর পড়া যাচ্ছে</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>দ্বীনি তাফসীর ও আমল</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tafsir content area */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-rose-400 bg-rose-950/20 border border-rose-950/40 p-3 rounded-xl text-center"
            >
              {error}
            </motion.div>
          )}

          {tafsir && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-soph-deep/40 border border-soph-border p-5 rounded-2xl space-y-5"
            >
              {/* Pronunciation */}
              <div className="flex gap-3 items-start">
                <div className="h-7 w-7 rounded-lg bg-soph-gold/10 border border-soph-gold/20 flex items-center justify-center text-soph-gold shrink-0 mt-0.5">
                  <Volume2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-soph-gold font-black uppercase tracking-wider block">বাংলা উচ্চারণ</span>
                  <p className="text-xs font-bold text-soph-text-primary mt-1 select-all">
                    {tafsir.pronunciation}
                  </p>
                </div>
              </div>

              {/* Context */}
              <div className="flex gap-3 items-start border-t border-soph-border/40 pt-4">
                <div className="h-7 w-7 rounded-lg bg-soph-gold/10 border border-soph-gold/20 flex items-center justify-center text-soph-gold shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-soph-gold font-black uppercase tracking-wider block">অবতরণের কারণ / ঐতিহাসিক প্রেক্ষাপট</span>
                  <p className="text-xs text-soph-text-secondary leading-relaxed mt-1 text-justify">
                    {tafsir.context}
                  </p>
                </div>
              </div>

              {/* Explanation */}
              <div className="flex gap-3 items-start border-t border-soph-border/40 pt-4">
                <div className="h-7 w-7 rounded-lg bg-soph-soft/10 bg-soph-gold/10 border border-soph-gold/20 flex items-center justify-center text-soph-gold shrink-0 mt-0.5">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-soph-gold font-black uppercase tracking-wider block">আয়াতটির গভীরতা ও তাফসীর</span>
                  <p className="text-xs text-soph-text-primary leading-relaxed mt-1 text-justify">
                    {tafsir.explanation}
                  </p>
                </div>
              </div>

              {/* Lessons */}
              <div className="flex gap-3 items-start border-t border-soph-border/40 pt-4">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider block">বাস্তব শিক্ষা ও দৈনন্দিন আমল</span>
                  <div className="text-xs text-soph-text-secondary whitespace-pre-line leading-relaxed mt-1.5 pl-1.5">
                    {tafsir.lessons}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating alert/success toast message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 bg-soph-gold text-soph-deep font-extrabold max-w-sm border border-soph-gold p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs"
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
