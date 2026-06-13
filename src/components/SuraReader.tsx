import React, { useState, useRef, useEffect } from "react";
import { SurahDetails, Ayah, TafsirResponse } from "../types.ts";
import { 
  ArrowLeft, Play, Pause, ZoomIn, ZoomOut, Sparkles, BookOpen, 
  Lightbulb, ShieldCheck, Heart, Volume2, VolumeX, Search, RefreshCw, AlertCircle, Bookmark,
  SkipBack, SkipForward, X, Minimize2, Maximize2, RotateCcw, RotateCw, Share2, Copy, Download, Check, Type
} from "lucide-react";
import SurahIntroCard from "./SurahIntroCard.tsx";

interface SuraReaderProps {
  surahId: number;
  onBack: () => void;
  savedVerses?: { surahId: number; verseNumber: number }[];
  onToggleVerseBookmark?: (surahId: number, surahName: string, verseNumber: number, ar: string, bn: string) => void;
}

function toBengaliNumerals(num: number | string): string {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num
    .toString()
    .split("")
    .map(digit => banglaDigits[parseInt(digit)] || digit)
    .join("");
}

function renderArabicWithTajweed(text: string, enabled: boolean): React.ReactNode {
  if (!enabled) return text;
  
  let processed = text;
  
  // 1. Ghunnah: Nun or Mim with Shaddah (نّ or مّ)
  processed = processed.replace(/([\u0646\u0645]\u0651)/g, "@@GHUNNAH_START@@$1@@GHUNNAH_END@@");
  
  // 2. Qalqalah: قطب جد with Sukun (قْ طْ بْ جْ دْ)
  processed = processed.replace(/([\u0642\u0637\u0628\u062c\u062f]\u0652)/g, "@@QALQALAH_START@@$1@@QALQALAH_END@@");
  
  // 3. Ikhfa / Idgham: Nun Sakinah or Tanween (نْ or ً ٌ ٍ)
  processed = processed.replace(/(\u0646\u0652|[\u064b\u064c\u064d])/g, "@@IKHFA_START@@$1@@IKHFA_END@@");

  const parts = processed.split(/(@@[A-Z_]+@@)/);
  const result: React.ReactNode[] = [];
  let currentStyle: "ghunnah" | "qalqalah" | "ikhfa" | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "@@GHUNNAH_START@@") {
      currentStyle = "ghunnah";
    } else if (part === "@@GHUNNAH_END@@") {
      currentStyle = null;
    } else if (part === "@@QALQALAH_START@@") {
      currentStyle = "qalqalah";
    } else if (part === "@@QALQALAH_END@@") {
      currentStyle = null;
    } else if (part === "@@IKHFA_START@@") {
      currentStyle = "ikhfa";
    } else if (part === "@@IKHFA_END@@") {
      currentStyle = null;
    } else if (part) {
      if (currentStyle === "ghunnah") {
        result.push(
          <span key={i} className="text-emerald-400 font-extrabold" title="গুন্নাহ (Ghunnah)">
            {part}
          </span>
        );
      } else if (currentStyle === "qalqalah") {
        result.push(
          <span key={i} className="text-orange-400 font-extrabold" title="কলকলা (Qalqalah)">
            {part}
          </span>
        );
      } else if (currentStyle === "ikhfa") {
        result.push(
          <span key={i} className="text-cyan-400 font-extrabold" title="ইখফা/ইদগাম (Ikhfa/Idgham)">
            {part}
          </span>
        );
      } else {
        result.push(part);
      }
    }
  }

  return <>{result}</>;
}

export default function SuraReader({ 
  surahId, 
  onBack, 
  savedVerses = [], 
  onToggleVerseBookmark 
}: SuraReaderProps) {
  const [surah, setSurah] = useState<SurahDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTajweedEnabled, setIsTajweedEnabled] = useState<boolean>(false);

  // Settings states
  const [arabicSize, setArabicSize] = useState<number>(32); // Font size for Arabic text
  const [searchQuery, setSearchQuery] = useState("");

  // Recitation Mode States
  const [isRecitationMode, setIsRecitationMode] = useState<boolean>(false);
  const [continuousPlay, setContinuousPlay] = useState<boolean>(true);
  const [selectedQari, setSelectedQari] = useState<string>("ar.alafasy");
  const [activeRecitationAyah, setActiveRecitationAyah] = useState<Ayah | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Unified HTML5 Surah Audio Player states
  const [surahAudioList, setSurahAudioList] = useState<any[]>([]);
  const [loadingAudioList, setLoadingAudioList] = useState<boolean>(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(0);
  const [isSurahPlaying, setIsSurahPlaying] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isLoopingSurah, setIsLoopingSurah] = useState<boolean>(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState<boolean>(false);

  // Floating audio player visibility states
  const [isFloatingPlayerVisible, setIsFloatingPlayerVisible] = useState<boolean>(true);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState<boolean>(false);

  // Deep explanations / Tafsir state mapping
  const [explanations, setExplanations] = useState<Record<number, TafsirResponse>>({});
  const [loadingTafsir, setLoadingTafsir] = useState<Record<number, boolean>>({});
  const [tafsirError, setTafsirError] = useState<Record<number, string | null>>({});
  const [pronunciations, setPronunciations] = useState<Record<number, string>>({});
  const [loadingPronunciations, setLoadingPronunciations] = useState<boolean>(false);

  // Web Speech API / TTS states for Tafsir
  const [activeTafsirSpeakingAyah, setActiveTafsirSpeakingAyah] = useState<number | null>(null);
  const [isTafsirSpeakingPaused, setIsTafsirSpeakingPaused] = useState<boolean>(false);
  const [ttsLanguage, setTtsLanguage] = useState<"bn" | "ar">("bn");
  const [ttsRate, setTtsRate] = useState<number>(1.0);

  // Tafsir Reading Typography preferences
  const [tafsirFontSize, setTafsirFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [tafsirFontStyle, setTafsirFontStyle] = useState<"sans" | "serif">("serif");

  const getTafsirFontSizeClass = () => {
    switch (tafsirFontSize) {
      case "sm":
        return "text-xs md:text-sm";
      case "base":
        return "text-sm md:text-[15px]";
      case "lg":
        return "text-[15px] md:text-[17px]";
      case "xl":
        return "text-[17px] md:text-[20px]";
      default:
        return "text-sm md:text-[15px]";
    }
  };

  const getTafsirFontStyleClass = () => {
    return tafsirFontStyle === "serif" ? "font-serif tracking-wide" : "font-sans";
  };

  // Stop any active Tafsir speech on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakTafsir = (ayahNo: number, loadedTafsir: TafsirResponse, arabicText: string) => {
    if (!("speechSynthesis" in window)) {
      alert("আরিব বা বাংলা স্পিচ সিন্থেসিস সাপোর্ট পাওয়া যায়নি।");
      return;
    }

    // Toggle pause/resume if clicking the already active speaking Tafsir
    if (activeTafsirSpeakingAyah === ayahNo) {
      if (window.speechSynthesis.speaking) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsTafsirSpeakingPaused(false);
        } else {
          window.speechSynthesis.pause();
          setIsTafsirSpeakingPaused(true);
        }
        return;
      }
    }

    // Stop current speech first
    window.speechSynthesis.cancel();

    // Set new active speech
    setActiveTafsirSpeakingAyah(ayahNo);
    setIsTafsirSpeakingPaused(false);

    let utterance: SpeechSynthesisUtterance;

    if (ttsLanguage === "ar") {
      // Speak the beautiful Arabic text of the verse
      utterance = new SpeechSynthesisUtterance(arabicText);
      const voices = window.speechSynthesis.getVoices();
      const arVoice = voices.find(v => v.lang.toLowerCase().includes("ar")) || voices.find(v => v.lang.toLowerCase().startsWith("ar"));
      if (arVoice) {
        utterance.voice = arVoice;
      }
      utterance.lang = "ar-SA";
      utterance.rate = ttsRate;
    } else {
      // Prepare speech content
      const introName = surah?.bn || "";
      const intro = `সূরা ${introName}, আয়াত নং ${toBengaliNumerals(ayahNo)} এর তাফসীর ও ব্যাখ্যা।`;
      const pronunciationPart = loadedTafsir.pronunciation ? `বাংলা উচ্চারণ: ${loadedTafsir.pronunciation}।` : "";
      const contextPart = loadedTafsir.context ? `অবতরণের প্রেক্ষাপট: ${loadedTafsir.context}।` : "";
      const explanationPart = loadedTafsir.explanation ? `তাফসীর ও ব্যাখ্যা: ${loadedTafsir.explanation}।` : "";
      
      // Quick cleaning of lists
      const cleanLessons = loadedTafsir.lessons 
        ? loadedTafsir.lessons.split('\n').map(line => line.replace(/^[-\*\d\.\s]+/, "")).join("। ") 
        : "";
      const lessonsPart = cleanLessons ? `মূল শিক্ষা ও আমল: ${cleanLessons}।` : "";

      const fullContent = `${intro} ${pronunciationPart} ${contextPart} ${explanationPart} ${lessonsPart}`;

      utterance = new SpeechSynthesisUtterance(fullContent);

      // Try to find a Bengali voice natively
      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(v => v.lang.toLowerCase().includes("bn")) || voices.find(v => v.lang.toLowerCase().startsWith("bn"));
      if (bnVoice) {
        utterance.voice = bnVoice;
      }
      utterance.lang = "bn-BD";
      utterance.rate = ttsRate;
    }

    utterance.onend = () => {
      setActiveTafsirSpeakingAyah(null);
      setIsTafsirSpeakingPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setActiveTafsirSpeakingAyah(null);
      setIsTafsirSpeakingPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const changeTtsLanguage = (lang: "bn" | "ar", ayahNo: number, loadedTafsir: TafsirResponse, arabicText: string) => {
    setTtsLanguage(lang);
    if (activeTafsirSpeakingAyah === ayahNo) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        let utterance: SpeechSynthesisUtterance;
        if (lang === "ar") {
          utterance = new SpeechSynthesisUtterance(arabicText);
          const voices = window.speechSynthesis.getVoices();
          const arVoice = voices.find(v => v.lang.toLowerCase().includes("ar")) || voices.find(v => v.lang.toLowerCase().startsWith("ar"));
          if (arVoice) {
            utterance.voice = arVoice;
          }
          utterance.lang = "ar-SA";
          utterance.rate = ttsRate;
        } else {
          const introName = surah?.bn || "";
          const intro = `সূরা ${introName}, আয়াত নং ${toBengaliNumerals(ayahNo)} এর তাফসীর ও ব্যাখ্যা।`;
          const pronunciationPart = loadedTafsir.pronunciation ? `বাংলা উচ্চারণ: ${loadedTafsir.pronunciation}।` : "";
          const contextPart = loadedTafsir.context ? `অবতরণের প্রেক্ষাপট: ${loadedTafsir.context}।` : "";
          const explanationPart = loadedTafsir.explanation ? `তাফসীর ও ব্যাখ্যা: ${loadedTafsir.explanation}।` : "";
          const cleanLessons = loadedTafsir.lessons 
            ? loadedTafsir.lessons.split('\n').map(line => line.replace(/^[-\*\d\.\s]+/, "")).join("। ") 
            : "";
          const lessonsPart = cleanLessons ? `মূল শিক্ষা ও আমল: ${cleanLessons}।` : "";
          const fullContent = `${intro} ${pronunciationPart} ${contextPart} ${explanationPart} ${lessonsPart}`;

          utterance = new SpeechSynthesisUtterance(fullContent);
          const voices = window.speechSynthesis.getVoices();
          const bnVoice = voices.find(v => v.lang.toLowerCase().includes("bn")) || voices.find(v => v.lang.toLowerCase().startsWith("bn"));
          if (bnVoice) {
            utterance.voice = bnVoice;
          }
          utterance.lang = "bn-BD";
          utterance.rate = ttsRate;
        }

        utterance.onend = () => {
          setActiveTafsirSpeakingAyah(null);
          setIsTafsirSpeakingPaused(false);
        };

        utterance.onerror = (e) => {
          console.error("SpeechSynthesis error:", e);
          setActiveTafsirSpeakingAyah(null);
          setIsTafsirSpeakingPaused(false);
        };

        setIsTafsirSpeakingPaused(false);
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  const changeTtsRate = (newRate: number, ayahNo: number, loadedTafsir: TafsirResponse, arabicText: string) => {
    setTtsRate(newRate);
    if (activeTafsirSpeakingAyah === ayahNo) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        let utterance: SpeechSynthesisUtterance;
        if (ttsLanguage === "ar") {
          utterance = new SpeechSynthesisUtterance(arabicText);
          const voices = window.speechSynthesis.getVoices();
          const arVoice = voices.find(v => v.lang.toLowerCase().includes("ar")) || voices.find(v => v.lang.toLowerCase().startsWith("ar"));
          if (arVoice) {
            utterance.voice = arVoice;
          }
          utterance.lang = "ar-SA";
        } else {
          const introName = surah?.bn || "";
          const intro = `সূরা ${introName}, আয়াত নং ${toBengaliNumerals(ayahNo)} এর তাফসীর ও ব্যাখ্যা।`;
          const pronunciationPart = loadedTafsir.pronunciation ? `বাংলা উচ্চারণ: ${loadedTafsir.pronunciation}।` : "";
          const contextPart = loadedTafsir.context ? `অবতরণের প্রেক্ষাপট: ${loadedTafsir.context}।` : "";
          const explanationPart = loadedTafsir.explanation ? `তাফসীর ও ব্যাখ্যা: ${loadedTafsir.explanation}।` : "";
          const cleanLessons = loadedTafsir.lessons 
            ? loadedTafsir.lessons.split('\n').map(line => line.replace(/^[-\*\d\.\s]+/, "")).join("। ") 
            : "";
          const lessonsPart = cleanLessons ? `মূল শিক্ষা ও আমল: ${cleanLessons}।` : "";
          const fullContent = `${intro} ${pronunciationPart} ${contextPart} ${explanationPart} ${lessonsPart}`;

          utterance = new SpeechSynthesisUtterance(fullContent);
          const voices = window.speechSynthesis.getVoices();
          const bnVoice = voices.find(v => v.lang.toLowerCase().includes("bn")) || voices.find(v => v.lang.toLowerCase().startsWith("bn"));
          if (bnVoice) {
            utterance.voice = bnVoice;
          }
          utterance.lang = "bn-BD";
        }

        utterance.rate = newRate;

        utterance.onend = () => {
          setActiveTafsirSpeakingAyah(null);
          setIsTafsirSpeakingPaused(false);
        };

        utterance.onerror = (e) => {
          console.error("SpeechSynthesis error:", e);
          setActiveTafsirSpeakingAyah(null);
          setIsTafsirSpeakingPaused(false);
        };

        setIsTafsirSpeakingPaused(false);
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  const stopTafsirSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveTafsirSpeakingAyah(null);
    setIsTafsirSpeakingPaused(false);
  };

  const [copiedAyahNo, setCopiedAyahNo] = useState<number | null>(null);
  const [downloadingAyahNo, setDownloadingAyahNo] = useState<number | null>(null);

  const handleCopyAyah = async (ayah: Ayah) => {
    const textToCopy = `🕌 সূরা ${surah?.bn || ""}, আয়াত ${toBengaliNumerals(ayah.numberInSurah)}\n\nআরবি:\n${ayah.text}\n\nবাংলা অনুবাদ:\n${ayah.translation}\n\n— আল-কুরআন ডিজিটাল তাফসীর ট্র্যাকার`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAyahNo(ayah.number);
      setTimeout(() => setCopiedAyahNo(null), 2000);
    } catch (err) {
      console.error("কপি করতে সমস্যা হয়েছে:", err);
    }
  };

  const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = ctx.measureText(testLine).width;
      if (width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  const handleDownloadImageCard = (ayah: Ayah) => {
    setDownloadingAyahNo(ayah.number);
    
    // Create canvas element dynamically
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setDownloadingAyahNo(null);
      return;
    }

    // High resolution layout suitable for sharing
    const width = 1080;
    const padding = 80;
    const contentWidth = width - (padding * 2);

    // Dynamic height calculation
    ctx.font = "bold 44px 'Amiri', 'Georgia', serif";
    const arabicLines = getWrappedLines(ctx, ayah.text, contentWidth);
    
    ctx.font = "600 28px 'Inter', Arial, sans-serif";
    const translationLines = getWrappedLines(ctx, ayah.translation, contentWidth);

    const baseHeight = 440; // Spacing for top ornament, citation, margins, dividers and footer
    const arabicLineHeight = 72;
    const translationLineHeight = 46;
    
    const calculatedHeight = baseHeight + (arabicLines.length * arabicLineHeight) + (translationLines.length * translationLineHeight);
    const height = Math.max(1080, calculatedHeight);

    canvas.width = width;
    canvas.height = height;

    // 1. Sleek Gradient Dark luxury backdrop
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#080a0e");
    gradient.addColorStop(0.5, "#12161f");
    gradient.addColorStop(1, "#080a0e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Sophisticated gold double borders
    const borderInset = 45;
    ctx.strokeStyle = "#C5A059";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(borderInset, borderInset, width - (borderInset * 2), height - (borderInset * 2));
    
    ctx.strokeStyle = "rgba(197, 160, 89, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(borderInset + 10, borderInset + 10, width - ((borderInset + 10) * 2), height - ((borderInset + 10) * 2));

    // Corner decorative nodes
    ctx.fillStyle = "#C5A059";
    const corners = [
      { x: borderInset, y: borderInset },
      { x: width - borderInset, y: borderInset },
      { x: borderInset, y: height - borderInset },
      { x: width - borderInset, y: height - borderInset }
    ];
    corners.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 3. Top crescent emblem
    ctx.font = "36px 'serif'";
    ctx.fillText("🕌", width / 2, 110);

    // 4. Beautiful Golden Citation Title
    ctx.font = "bold 26px 'Inter', sans-serif";
    ctx.fillStyle = "#C5A059";
    ctx.fillText(`— সূরা ${surah?.bn || ""} • আয়াত ${toBengaliNumerals(ayah.numberInSurah)} —`, width / 2, 165);

    // Elegant divider line
    ctx.strokeStyle = "rgba(197, 160, 89, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 180, 210);
    ctx.lineTo(width / 2 + 180, 210);
    ctx.stroke();

    // 5. Draw Arabic Verses
    let currentY = 280;
    ctx.font = "bold 44px 'Amiri', 'Georgia', serif";
    ctx.fillStyle = "#FFFFFF";
    
    arabicLines.forEach(line => {
      ctx.fillText(line, width / 2, currentY);
      currentY += arabicLineHeight;
    });

    // 6. Centered geometric divider between Arabic & Bengali translation
    currentY += 20;
    ctx.fillStyle = "rgba(197, 160, 89, 0.8)";
    ctx.font = "24px 'serif'";
    ctx.fillText("❖ ❖ ❖", width / 2, currentY);
    currentY += 55;

    // 7. Draw Bangla Translation
    ctx.font = "600 28px 'Inter', Arial, sans-serif";
    ctx.fillStyle = "#E5E7EB";
    translationLines.forEach(line => {
      ctx.fillText(line, width / 2, currentY);
      currentY += translationLineHeight;
    });

    // 8. Draw Brand Footer Signature at base
    const footerY = height - 95;
    ctx.strokeStyle = "rgba(197, 160, 89, 0.15)";
    ctx.beginPath();
    ctx.moveTo(width / 2 - 250, footerY - 25);
    ctx.lineTo(width / 2 + 250, footerY - 25);
    ctx.stroke();

    ctx.fillStyle = "rgba(197, 160, 89, 0.85)";
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.fillText("আল-কুরআন ডিজিটাল তাফসীর ট্র্যাকার", width / 2, footerY);

    ctx.fillStyle = "rgba(156, 163, 175, 0.5)";
    ctx.font = "500 13px 'monospace'";
    ctx.fillText("ai.studio/build", width / 2, footerY + 28);

    // Trigger local browser filesave flow
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Surah_${surah?.n || surahId}_Ayah_${ayah.numberInSurah}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("ইমেজ কার্ড ফাইল সেভ করার সময় ত্রুটি:", e);
    } finally {
      setDownloadingAyahNo(null);
    }
  };

  const fullAudioRef = useRef<HTMLAudioElement | null>(null);

  // Derived playingAyah based on current state of full audio player
  const playingAyah = isSurahPlaying && surah?.ayahs[currentAudioIndex]
    ? surah.ayahs[currentAudioIndex].number
    : null;

  // Fetch Surah Details
  useEffect(() => {
    let active = true;

    async function fetchDetails() {
      setLoading(true);
      setError(null);
      
      // Try to load from offline cache first (Instant load)
      const offlineCacheKey = `quran_surah_offline_${surahId}`;
      const cachedData = localStorage.getItem(offlineCacheKey);
      
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          if (data && data.ayahs && data.ayahs.length > 0) {
            if (active) {
              setSurah(data);
              setActiveRecitationAyah(data.ayahs[0]);
              
              // Seed pronunciations from cached data
              const cachedPronunciations: Record<number, string> = {};
              data.ayahs.forEach((ayah: any) => {
                if (ayah.pronunciation) {
                  cachedPronunciations[ayah.numberInSurah] = ayah.pronunciation;
                }
              });
              setPronunciations(cachedPronunciations);
              setLoading(false);
            }
            return; // Successful instant cache bypass
          }
        } catch (e) {
          console.warn("Parsing cached surah failed, fetching fresh data.", e);
        }
      }

      // Fetch fresh from robust offline-oriented endpoint
      try {
        const res = await fetch(`/api/quran/offline/${surahId}`);
        if (!res.ok) throw new Error("অনলাইন ডাটাবেস থেকে সূরার অনুবাদ ও আয়াতসমূহ লোড করতে ব্যর্থ হয়েছে।");
        const data = await res.json();
        
        if (active) {
          setSurah(data);
          if (data.ayahs && data.ayahs.length > 0) {
            setActiveRecitationAyah(data.ayahs[0]);
            
            // Seed pronunciation mapping
            const pronDict: Record<number, string> = {};
            data.ayahs.forEach((ayah: any) => {
              if (ayah.pronunciation) {
                pronDict[ayah.numberInSurah] = ayah.pronunciation;
              }
            });
            setPronunciations(pronDict);
          }
          
          // Automatic caching for future offline visits
          try {
            localStorage.setItem(offlineCacheKey, JSON.stringify(data));
            localStorage.setItem(`quran_surah_offline_details_${surahId}`, JSON.stringify(data));
          } catch (storageErr) {
            console.warn("Storage limits reached, could not cache offline copy.", storageErr);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "ভুল হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDetails();

    return () => {
      active = false;
      if (fullAudioRef.current) {
        fullAudioRef.current.pause();
      }
    };
  }, [surahId]);

  // Fetch Bengali pronunciations / transliterations automatically in background batches when Surah launches
  useEffect(() => {
    if (!surah || !surah.ayahs || surah.ayahs.length === 0) return;

    let active = true;
    
    // Check if we already have pronunciations populated
    const existingKeys = Object.keys(pronunciations).map(Number);
    const hasAll = surah.ayahs.every(a => existingKeys.includes(a.numberInSurah));
    if (hasAll && surah.ayahs.length > 0) {
      setLoadingPronunciations(false);
      return;
    }

    setLoadingPronunciations(true);

    async function fetchPronunciationsInBatches() {
      // Find ayahs that truly lack pronunciations
      const allAyahs = surah!.ayahs.filter(a => !pronunciations[a.numberInSurah]);
      if (allAyahs.length === 0) {
        setLoadingPronunciations(false);
        return;
      }
      const batchSize = 25;

      for (let i = 0; i < allAyahs.length; i += batchSize) {
        if (!active) break;
        const chunk = allAyahs.slice(i, i + batchSize).map(a => ({
          numberInSurah: a.numberInSurah,
          text: a.text
        }));

        try {
          const res = await fetch("/api/batch-pronounce", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              surahId,
              verses: chunk
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (active) {
              setPronunciations(prev => {
                const nextVal = { ...prev, ...data };
                // Sync to offline cache
                const cachedKey = `quran_surah_offline_${surahId}`;
                const rawObj = localStorage.getItem(cachedKey);
                if (rawObj) {
                  try {
                    const parsed = JSON.parse(rawObj);
                    parsed.ayahs = parsed.ayahs.map((ay: any) => ({
                      ...ay,
                      pronunciation: nextVal[ay.numberInSurah] || ay.pronunciation
                    }));
                    localStorage.setItem(cachedKey, JSON.stringify(parsed));
                    localStorage.setItem(`quran_surah_offline_details_${surahId}`, JSON.stringify(parsed));
                  } catch (e) {}
                }
                return nextVal;
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch batch pronunciations:", err);
        }
      }
      
      if (active) {
        setLoadingPronunciations(false);
      }
    }

    fetchPronunciationsInBatches();

    return () => {
      active = false;
    };
  }, [surahId, surah]);

  // Fetch Full Surah Audio file URLs from Al-Quran Cloud API with beautiful local generators fallback
  useEffect(() => {
    if (!surah) return;
    
    let active = true;
    async function fetchAudioUrls() {
      setLoadingAudioList(true);
      try {
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/${selectedQari}`);
        if (!res.ok) throw new Error("API call was not successful");
        const json = await res.json();
        if (active && json.code === 200 && json.data?.ayahs) {
          const list = json.data.ayahs.map((ayah: any) => ({
            number: ayah.number,
            numberInSurah: ayah.numberInSurah,
            audio: ayah.audio,
            audioSecondary: ayah.audioSecondary?.[0] || ayah.audio,
            text: ayah.text
          }));
          setSurahAudioList(list);
          setLoadingAudioList(false);
          return;
        }
      } catch (e) {
        console.warn("Failed to fetch from api.alquran.cloud, using network fallback.", e);
      }
      
      // Fallback local list generation
      if (active) {
        const fallbackList = surah.ayahs.map((ayah) => ({
          number: ayah.number,
          numberInSurah: ayah.numberInSurah,
          audio: `https://cdn.islamic.network/quran/audio/128/${selectedQari}/${ayah.number}.mp3`,
          audioSecondary: `https://cdn.islamic.network/quran/audio/64/${selectedQari}/${ayah.number}.mp3`,
          text: ayah.text
        }));
        setSurahAudioList(fallbackList);
      }
      setLoadingAudioList(false);
    }
    
    fetchAudioUrls();
    
    return () => {
      active = false;
    };
  }, [surahId, selectedQari, surah]);

  // Adjust playback speed on the HTML5 element
  useEffect(() => {
    if (fullAudioRef.current) {
      fullAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentAudioIndex, surahAudioList]);

  // Handle HTML5 Volume and Muted properties
  useEffect(() => {
    if (fullAudioRef.current) {
      fullAudioRef.current.volume = isAudioMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isAudioMuted]);

  // When changing audios, trigger automatic playback if isSurahPlaying is active
  useEffect(() => {
    if (fullAudioRef.current && isSurahPlaying) {
      fullAudioRef.current.play().catch(err => {
        console.warn("Failed to play on scroll transition", err);
      });
    }
  }, [currentAudioIndex]);

  // Play a specific audio index in playlist
  const playAudioIndex = (index: number, shouldPlay = true) => {
    setCurrentAudioIndex(index);
    if (surah?.ayahs[index]) {
      setActiveRecitationAyah(surah.ayahs[index]);
    }
    if (shouldPlay) {
      setIsSurahPlaying(true);
      setIsFloatingPlayerVisible(true);
      setIsFloatingMinimized(false);
      setTimeout(() => {
        fullAudioRef.current?.play().catch(err => {
          console.warn("Audio play failed on click:", err);
          setIsSurahPlaying(false);
        });
      }, 50);
    }
  };

  // HTML5 audio elements handlers
  const handleTimeUpdate = () => {
    if (fullAudioRef.current) {
      setAudioCurrentTime(fullAudioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (fullAudioRef.current) {
      setAudioDuration(fullAudioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    if (continuousPlay && currentAudioIndex + 1 < surahAudioList.length) {
      setTimeout(() => {
        playAudioIndex(currentAudioIndex + 1, true);
      }, 1200); // 1.2s serene gap
    } else {
      if (isLoopingSurah) {
        playAudioIndex(0, true);
      } else {
        setIsSurahPlaying(false);
        setAudioCurrentTime(0);
      }
    }
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setAudioCurrentTime(time);
    if (fullAudioRef.current) {
      fullAudioRef.current.currentTime = time;
    }
  };

  const handleRewind10 = () => {
    if (fullAudioRef.current) {
      let newTime = fullAudioRef.current.currentTime - 10;
      if (newTime < 0) newTime = 0;
      fullAudioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  };

  const handleFastForward10 = () => {
    if (fullAudioRef.current) {
      let newTime = fullAudioRef.current.currentTime + 10;
      if (newTime > audioDuration) newTime = audioDuration;
      fullAudioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "০০:০০";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    const minStr = mins.toString().padStart(2, "0");
    const secStr = remainder.toString().padStart(2, "0");
    return `${toBengaliNumerals(minStr)}:${toBengaliNumerals(secStr)}`;
  };

  // Robust Audio recitation handler supporting Qari selection, speed rate, & continuous plays
  function playAudio(ayahNumber: number, customQari?: string) {
    if (!surah) return;
    const targetIndex = surah.ayahs.findIndex(a => a.number === ayahNumber);
    if (targetIndex === -1) return;

    if (currentAudioIndex === targetIndex) {
      if (isSurahPlaying) {
        fullAudioRef.current?.pause();
        setIsSurahPlaying(false);
      } else {
        setIsSurahPlaying(true);
        setIsFloatingPlayerVisible(true);
        setIsFloatingMinimized(false);
        fullAudioRef.current?.play().catch(() => setIsSurahPlaying(false));
      }
    } else {
      playAudioIndex(targetIndex, true);
    }
  }

  // Load verse-specific pronunciation and detailed AI Tafsir
  async function loadTafsir(ayah: Ayah) {
    const key = ayah.numberInSurah;
    if (explanations[key]) return; // already loaded

    setLoadingTafsir(prev => ({ ...prev, [key]: true }));
    setTafsirError(prev => ({ ...prev, [key]: null }));

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surah: surahId,
          ayah: ayah.numberInSurah,
          text: ayah.text,
          translation: ayah.translation
        })
      });

      if (!res.ok) throw new Error("তাফসীর প্রস্তুত করা যায়নি");
      const data = await res.json();

      setExplanations(prev => ({ ...prev, [key]: data }));
    } catch (err: any) {
      setTafsirError(prev => ({ ...prev, [key]: err.message || "Gemini তাফসীর প্রস্তুত করতে ব্যর্থ হয়েছে।" }));
    } finally {
      setLoadingTafsir(prev => ({ ...prev, [key]: false }));
    }
  }

  const filteredAyahs = surah
    ? surah.ayahs.filter(a => 
        a.translation.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.numberInSurah.toString() === searchQuery.trim()
      )
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="h-8 w-8 text-soph-gold animate-spin" />
        <p className="text-sm text-soph-text-secondary font-medium">
          কুরআনের আয়াত এবং চমৎকার তথ্যসমূহ সাজানো হচ্ছে...
        </p>
      </div>
    );
  }

  if (error || !surah) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-soph-card border border-soph-border rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-soph-text-primary">সূরা লোড করা যায়নি</h3>
        <p className="text-soph-text-secondary text-sm">{error || "সূরা পাওয়া যায়নি"}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-soph-gold hover:bg-soph-gold/90 text-soph-deep font-bold text-xs rounded-xl shadow-md transition"
        >
          তালিকায় ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reader Nav & Tools */}
      <div className="sticky top-14 z-20 bg-soph-deep/95 backdrop-blur-md border-b border-soph-border py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-soph-hover hover:text-soph-gold rounded-xl transition text-soph-text-secondary"
            title="মাঝের তালিকায় ফিরুন"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-soph-text-primary flex items-center gap-2">
              {surah.n}. {surah.bn} <span className="text-soph-gold font-serif font-normal">{surah.ar}</span>
            </h2>
            <p className="text-xs text-soph-text-secondary font-medium mt-0.5">
              নামের অর্থ: {surah.mn} • {surah.type === "makki" ? "মাক্কী" : "মাদানী"} • {surah.ayat} আয়াত
            </p>
          </div>
        </div>

        {/* Text sizing & Search Ayat Bar */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Ayat Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="আয়াত নম্বর বা শব্দ খুজুন..."
              className="pl-8 pr-3 py-1.5 bg-soph-deep border border-soph-border focus:ring-1 focus:ring-soph-gold focus:border-soph-gold rounded-xl text-xs text-soph-text-primary placeholder-soph-text-secondary focus:outline-none w-44"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-soph-text-secondary" />
          </div>

          {/* Recitation Mode Toggle */}
          <button
            onClick={() => {
              setIsRecitationMode(!isRecitationMode);
              if (!activeRecitationAyah && surah?.ayahs.length) {
                setActiveRecitationAyah(surah.ayahs[0]);
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all duration-300 cursor-pointer ${
              isRecitationMode 
                ? "bg-soph-gold text-soph-deep border-soph-gold shadow-[0_0_12px_rgba(197,160,89,0.25)]" 
                : "bg-soph-deep hover:bg-soph-hover text-soph-text-primary border-soph-border hover:border-soph-gold/40 hover:text-soph-gold"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecitationMode ? "bg-soph-deep" : "bg-soph-gold"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isRecitationMode ? "bg-soph-deep" : "bg-soph-gold"}`}></span>
            </span>
            {isRecitationMode ? "তেলাওয়াত মোড সক্রিয়" : "তেলাওয়াত মোড"}
          </button>

          {/* Tajweed Highlights Toggle */}
          <button
            onClick={() => setIsTajweedEnabled(!isTajweedEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-300 cursor-pointer ${
              isTajweedEnabled 
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]" 
                : "bg-soph-deep hover:bg-soph-hover text-soph-text-primary border-soph-border hover:border-emerald-500/30 hover:text-emerald-400"
            }`}
            title="তাজবীদ কালার কোডেড হাইলাইট সক্রিয়/নিষ্ক্রিয় করুন"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isTajweedEnabled ? "text-emerald-400 animate-pulse" : "text-soph-text-secondary"}`} />
            <span>তাজবীদ কালার</span>
          </button>

          {/* Size controls */}
          <div className="flex bg-soph-deep p-1 rounded-xl border border-soph-border">
            <button
              onClick={() => setArabicSize(prev => Math.max(24, prev - 4))}
              className="p-1.5 text-soph-gold hover:bg-soph-hover rounded-lg transition"
              title="আরবি লেখা ছোট করুন"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-bold font-mono px-2 flex items-center justify-center text-soph-text-secondary">
              AR: {arabicSize}px
            </span>
            <button
              onClick={() => setArabicSize(prev => Math.min(48, prev + 4))}
              className="p-1.5 text-soph-gold hover:bg-soph-hover rounded-lg transition"
              title="আরবি লেখা বড় করুন"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isTajweedEnabled && (
        <div className="bg-soph-deep/40 border border-soph-border p-3.5 rounded-2xl flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-soph-text-secondary select-none">
          <span className="font-semibold text-[11px] text-soph-gold uppercase tracking-wider flex items-center gap-1">
            🎨 তাজবীদ কালার কোড নির্দেশিকা:
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400"></span> 
            <span>গুন্নাহ (Ghunnah): <strong className="text-emerald-400 font-extrabold pb-0.5">সবুজ</strong></span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400"></span>
            <span>কলকলা (Qalqalah): <strong className="text-orange-400 font-extrabold pb-0.5">কমলা</strong></span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400"></span>
            <span>ইখফা/ইদগাম (Ikhfa/Idgham): <strong className="text-cyan-400 font-extrabold pb-0.5">নীল</strong></span>
          </span>
        </div>
      )}

      {/* HTML5 Audio Player Element */}
      <audio
        ref={fullAudioRef}
        src={surahAudioList[currentAudioIndex]?.audio}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        onPlay={() => setIsSurahPlaying(true)}
        onPause={() => setIsSurahPlaying(false)}
        onWaiting={() => setIsPlayerLoading(true)}
        onPlaying={() => setIsPlayerLoading(false)}
      />

      {/* Dynamic HTML5 Surah Audio Player Card */}
      <div className="bg-soph-card border border-soph-border rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden space-y-4">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-soph-gold/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Leftside Info */}
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl bg-soph-gold/10 border border-soph-gold/30 flex items-center justify-center text-soph-gold transition-transform duration-500 ${isSurahPlaying ? "rotate-180 scale-105" : ""}`}>
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-soph-gold font-extrabold uppercase tracking-widest block font-mono">AL-QURAN CLOUD AUDIO PLAYER</span>
                {isPlayerLoading && (
                  <span className="text-[9px] text-emerald-400 font-extrabold animate-pulse bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded">লোড হচ্ছে...</span>
                )}
                {loadingAudioList && (
                  <span className="text-[9px] text-soph-gold animate-pulse bg-soph-gold/10 border border-soph-gold/20 px-1.5 py-0.5 rounded">আয়াত কালেকশন মিলানো হচ্ছে...</span>
                )}
              </div>
              <h3 className="text-sm font-extrabold text-soph-text-primary mt-0.5">
                {surah.bn} ({surah.ar}) • সম্পূর্ণ সূরার অল-ইন-ওয়ান প্লেয়ার
              </h3>
              <p className="text-[11px] text-soph-text-secondary mt-0.5">
                চলতি আয়াত: <strong className="text-soph-gold font-sans">{toBengaliNumerals(currentAudioIndex + 1)}</strong>/{toBengaliNumerals(surah.ayat)} • ক্বারী: <span className="font-bold text-soph-text-primary">{selectedQari === "ar.alafasy" ? "মিশারী রাশিদ আল-আফাসী" : selectedQari === "ar.abdulbasitmuhammadabdussamad" ? "আব্দুল বাসিত" : selectedQari === "ar.saadalgamidi" ? "সাদ আল-গামদী" : selectedQari === "ar.shuraym" ? "সৌদ আশ-শুরাইম" : "মাহমূদ খলীল আল-হুসারী"}</span>
              </p>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Prev/Play/Next */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentAudioIndex > 0) {
                    playAudioIndex(currentAudioIndex - 1, isSurahPlaying);
                  }
                }}
                disabled={currentAudioIndex === 0}
                className="p-2 bg-soph-deep hover:bg-soph-hover disabled:opacity-30 disabled:pointer-events-none rounded-xl text-soph-gold border border-soph-border cursor-pointer transition flex items-center justify-center shadow-inner"
                title="পূর্ববর্তী আয়াত"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  if (isSurahPlaying) {
                    fullAudioRef.current?.pause();
                    setIsSurahPlaying(false);
                  } else {
                    setIsSurahPlaying(true);
                    fullAudioRef.current?.play().catch(() => setIsSurahPlaying(false));
                  }
                }}
                className="py-2.5 px-5 bg-soph-gold hover:bg-soph-gold/90 text-soph-deep rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                {isSurahPlaying ? (
                  <>
                    <Pause className="h-4 w-4 fill-current shrink-0" />
                    <span>থামান</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current shrink-0" />
                    <span>তেলাওয়াত শুরু</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (currentAudioIndex + 1 < surahAudioList.length) {
                    playAudioIndex(currentAudioIndex + 1, isSurahPlaying);
                  }
                }}
                disabled={currentAudioIndex >= surahAudioList.length - 1}
                className="p-2 bg-soph-deep hover:bg-soph-hover disabled:opacity-30 disabled:pointer-events-none rounded-xl text-soph-gold border border-soph-border cursor-pointer transition flex items-center justify-center shadow-inner"
                title="পরবর্তী আয়াত"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Loop Toggle */}
            <button
              onClick={() => setIsLoopingSurah(!isLoopingSurah)}
              className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                isLoopingSurah
                  ? "bg-soph-gold/15 text-soph-gold border-soph-gold/40 shadow-[0_0_8px_rgba(197,160,89,0.15)]"
                  : "bg-soph-deep hover:bg-soph-hover text-soph-text-secondary border-soph-border"
              }`}
              title={isLoopingSurah ? "পুনরাবৃত্তি সক্রিয়" : "পুনরাবৃত্তি নিষ্ক্রিয়"}
            >
              <RefreshCw className={`h-4 w-4 ${isLoopingSurah ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Progress Timeline & Volume controls */}
        <div className="space-y-2 border-t border-soph-border/40 pt-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-soph-text-secondary select-none">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-soph-gold animate-ping"></span>
              <span>আয়াত {toBengaliNumerals(currentAudioIndex + 1)} অগ্রগতি</span>
            </span>
            <div className="flex items-center gap-1">
              <span>{formatTime(audioCurrentTime)}</span>
              <span>/</span>
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <input
              type="range"
              min={0}
              max={audioDuration || 100}
              step={0.1}
              value={audioCurrentTime}
              onChange={handleScrubChange}
              className="w-full h-1.5 bg-soph-deep rounded-lg appearance-none cursor-pointer accent-soph-gold focus:outline-none"
            />
            
            {/* Volume block */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 bg-soph-deep/40 px-3 py-1.5 rounded-xl border border-soph-border/30">
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className="text-soph-gold hover:text-soph-gold/80 transition"
                title={isAudioMuted ? "শব্দ চালু করুন" : "শব্দ বন্ধ করুন"}
              >
                {isAudioMuted || audioVolume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isAudioMuted ? 0 : audioVolume}
                onChange={(e) => {
                  setAudioVolume(parseFloat(e.target.value));
                  setIsAudioMuted(false);
                }}
                className="w-20 h-1 bg-soph-deep rounded-lg appearance-none cursor-pointer accent-soph-gold focus:outline-none"
                title="ভলিউম নিয়ন্ত্রণ"
              />
            </div>
          </div>
        </div>
      </div>

      {isRecitationMode ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-soph-card border border-soph-border rounded-2xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-soph-gold/5 via-transparent to-soph-gold/5 pointer-events-none"></div>
            <h1 className="text-2xl font-extrabold text-soph-text-primary flex items-center justify-center gap-3">
              {surah.bn} <span className="text-soph-gold font-serif font-normal text-3xl">{surah.ar}</span>
            </h1>
            <div className="flex justify-center items-center gap-2">
              <span className="px-3 py-1 bg-soph-deep border border-soph-border text-soph-gold font-semibold text-xs rounded-full">
                {surah.type === "makki" ? "মাক্কী সূরা" : "মাদানী সূরা"}
              </span>
              <span className="px-3 py-1 bg-soph-deep border border-soph-border text-soph-gold font-semibold text-xs rounded-full">
                মোট আয়াত: {toBengaliNumerals(surah.ayat)}
              </span>
            </div>
          </div>

          {/* Continuous Mushaf Card */}
          <div className="bg-soph-card border border-soph-border rounded-3xl p-6 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Ambient pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none"></div>

            {/* Bismillah Header inside Continuous card */}
            {surah.hasBismillah && (
              <div className="text-center pb-8 border-b border-soph-border/40 mb-8">
                <div className="font-serif text-3xl md:text-4xl text-soph-gold tracking-wide dir-rtl select-none" style={{ fontFamily: "Amiri, serif" }}>
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
                <p className="text-xs text-soph-text-secondary font-medium mt-2">
                  পরম করুণাময় অতি দয়ালু আল্লাহর নামে শুরু করছি
                </p>
              </div>
            )}

            {/* Mushaf Continuous Arabic Text Block */}
            <div 
              className="text-right leading-[2.8] tracking-wide select-all font-serif flex flex-wrap flex-row-reverse justify-start gap-y-6"
              style={{ 
                fontSize: `${arabicSize}px`, 
                direction: "rtl", 
                fontFamily: "Amiri, serif" 
              }}
            >
              {surah.ayahs.map((ayah) => {
                const isPlaying = playingAyah === ayah.number;
                const isActive = activeRecitationAyah?.number === ayah.number;

                return (
                  <span
                    key={ayah.number}
                    onClick={() => {
                      setActiveRecitationAyah(ayah);
                      playAudio(ayah.number);
                    }}
                    className={`inline cursor-pointer px-1 py-1 transition-all duration-300 rounded-lg select-all ${
                      isPlaying
                        ? "text-emerald-400 bg-emerald-950/30 border-b border-emerald-500/30 border-dashed shadow-[0_0_12px_rgba(52,211,153,0.15)] font-bold"
                        : isActive
                        ? "text-soph-gold bg-soph-gold/5 border-b border-soph-gold/30 border-dashed"
                        : "text-soph-text-primary hover:text-soph-gold hover:bg-soph-gold/5"
                    }`}
                    title={`আয়াত ${toBengaliNumerals(ayah.numberInSurah)} - প্লে করতে ক্লিক করুন`}
                  >
                    {/* The Arabic verse text */}
                    {renderArabicWithTajweed(ayah.text, isTajweedEnabled)}

                    {/* Decorative Verse numbering circle */}
                    <span className="inline-flex items-center justify-center hover:scale-110 transition-transform duration-200 select-none relative mx-3.5 h-10 w-10 text-soph-gold font-bold text-xs" style={{ verticalAlign: "middle" }}>
                      <svg className={`absolute inset-0 w-full h-full stroke-current ${isPlaying ? "text-emerald-400 animate-pulse" : "text-soph-gold/50 hover:text-soph-gold"}`} fill="none" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" strokeWidth="1.5" />
                        <path d="M 18,3 L 18,6" strokeWidth="1.5" />
                        <path d="M 18,30 L 18,33" strokeWidth="1.5" />
                        <path d="M 3,18 L 6,18" strokeWidth="1.5" />
                        <path d="M 30,18 L 33,18" strokeWidth="1.5" />
                      </svg>
                      <span className={`relative z-10 text-[11px] font-sans ${isPlaying ? "text-emerald-400" : "text-soph-gold/90"}`}>
                        {toBengaliNumerals(ayah.numberInSurah)}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Active Recitation / Selection Translation Drawer (Bottom of the Mushaf page) */}
            {activeRecitationAyah && (
              <div className="mt-12 p-5 bg-soph-deep border border-soph-border rounded-2xl relative overflow-hidden transition-all duration-300 shadow-inner">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-soph-border/50 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-soph-gold uppercase tracking-wider bg-soph-card border border-soph-border px-2.5 py-1 rounded-lg">
                      নির্বাচিত আয়াত {toBengaliNumerals(activeRecitationAyah.numberInSurah)}
                    </span>
                    {playingAyah === activeRecitationAyah.number && (
                      <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-md font-bold animate-pulse flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> তেলাওয়াত হচ্ছে
                      </span>
                    )}
                  </div>

                  {/* AI Quick Tafsir Trigger and Toggle Bookmark */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadTafsir(activeRecitationAyah)}
                      disabled={!!explanations[activeRecitationAyah.numberInSurah] || loadingTafsir[activeRecitationAyah.numberInSurah]}
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border transition duration-150 flex items-center gap-1 cursor-pointer ${
                        explanations[activeRecitationAyah.numberInSurah]
                          ? "bg-soph-gold/10 text-soph-gold border-soph-gold/30 cursor-default"
                          : "bg-soph-hover text-soph-gold border-soph-border hover:bg-soph-border"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {explanations[activeRecitationAyah.numberInSurah] ? "Tafsir Loaded (তাফসীর)" : "Get Tafsir (তাফসীর)"}
                    </button>

                    <button
                      onClick={() => handleCopyAyah(activeRecitationAyah)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                        copiedAyahNo === activeRecitationAyah.number
                          ? "bg-emerald-950 text-emerald-400 border-emerald-500/50"
                          : "bg-soph-deep hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                      }`}
                      title="আয়াত কপি করুন"
                    >
                      {copiedAyahNo === activeRecitationAyah.number ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDownloadImageCard(activeRecitationAyah)}
                      disabled={downloadingAyahNo === activeRecitationAyah.number}
                      className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                        downloadingAyahNo === activeRecitationAyah.number
                          ? "bg-soph-deep text-soph-gold border-soph-gold/40 animate-pulse"
                          : "bg-soph-deep hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                      }`}
                      title="ইমেজ কার্ড ডাউনলোড করুন"
                    >
                      {downloadingAyahNo === activeRecitationAyah.number ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onToggleVerseBookmark?.(
                        surahId, 
                        surah?.nameBn || surah?.name || "", 
                        activeRecitationAyah.numberInSurah, 
                        activeRecitationAyah.text, 
                        activeRecitationAyah.translation
                      )}
                      className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                        savedVerses.some(v => v.surahId === surahId && v.verseNumber === activeRecitationAyah.numberInSurah)
                          ? "bg-soph-gold text-soph-deep border-soph-gold shadow-md"
                          : "bg-soph-deep hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                      }`}
                      title="সংরক্ষণ করুন"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meaning & explanation content */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-teal-400 tracking-widest block mb-0.5">বাংলা উচ্চারণ:</span>
                      <p className="text-xs font-semibold text-soph-text-primary leading-relaxed">
                        {pronunciations[activeRecitationAyah.numberInSurah] || "উচ্চারণ প্রস্তুত হচ্ছে..."}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-soph-gold tracking-widest block mb-0.5">বাংলা অর্থ ও অনুবাদ:</span>
                      <p className="text-xs font-semibold text-soph-text-primary leading-relaxed">
                        {activeRecitationAyah.translation}
                      </p>
                    </div>
                  </div>

                  {explanations[activeRecitationAyah.numberInSurah] && (
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-soph-border/40 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-soph-gold block mb-0.5">তাফসীর ও ব্যাখ্যা:</span>
                        <p className="text-soph-text-secondary leading-relaxed whitespace-pre-line">
                          {explanations[activeRecitationAyah.numberInSurah].explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls Panel */}
          <div className="bg-soph-card border border-soph-border rounded-3xl p-4 md:p-6 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Qari selector */}
              <div className="flex items-center gap-2.5 w-full lg:w-auto">
                <span className="text-soph-text-secondary text-[10px] font-bold uppercase whitespace-nowrap">কারী সিলেক্ট করুন:</span>
                <select
                  value={selectedQari}
                  onChange={(e) => {
                    setSelectedQari(e.target.value);
                  }}
                  className="py-1.5 pl-2.5 pr-8 bg-soph-deep border border-soph-border text-soph-gold font-bold rounded-xl text-xs focus:ring-1 focus:ring-soph-gold focus:outline-none cursor-pointer w-full lg:w-48"
                >
                  <option value="ar.alafasy">মিশারী রাশিদ আল-আফাসী</option>
                  <option value="ar.abdulbasitmuhammadabdussamad">আব্দুল বাসিত আব্দুস সামাদ</option>
                  <option value="ar.saadalgamidi">সাদ আল-গামদী</option>
                  <option value="ar.shuraym">সৌদ আশ-শুরাইম</option>
                  <option value="ar.husary">মাহমূদ খলীল আল-হুসারী</option>
                </select>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (currentAudioIndex > 0) {
                      playAudioIndex(currentAudioIndex - 1, isSurahPlaying);
                    }
                  }}
                  disabled={currentAudioIndex === 0}
                  className="p-2.5 bg-soph-deep hover:bg-soph-hover disabled:opacity-30 disabled:pointer-events-none rounded-xl text-soph-gold border border-soph-border cursor-pointer transition flex items-center justify-center shadow-inner"
                  title="পূর্ববর্তী আয়াত"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    if (isSurahPlaying) {
                      fullAudioRef.current?.pause();
                      setIsSurahPlaying(false);
                    } else {
                      setIsSurahPlaying(true);
                      fullAudioRef.current?.play().catch(() => setIsSurahPlaying(false));
                    }
                  }}
                  className="py-2.5 px-6 bg-soph-gold hover:bg-soph-gold/90 text-soph-deep rounded-xl font-bold font-sans text-xs flex items-center gap-2 cursor-pointer transition shadow-[0_4px_12px_rgba(197,160,89,0.2)] hover:shadow-[0_4px_16px_rgba(197,160,89,0.35)] duration-200"
                >
                  {isSurahPlaying ? (
                    <>
                      <Pause className="h-4 w-4 shrink-0 fill-current animate-pulse" />
                      <span>তেলাওয়াত থামান</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 shrink-0 fill-current" />
                      <span>তেলাওয়াত ও প্লে</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (currentAudioIndex + 1 < surahAudioList.length) {
                      playAudioIndex(currentAudioIndex + 1, isSurahPlaying);
                    }
                  }}
                  disabled={currentAudioIndex >= surahAudioList.length - 1}
                  className="p-2.5 bg-soph-deep hover:bg-soph-hover disabled:opacity-30 disabled:pointer-events-none rounded-xl text-soph-gold border border-soph-border cursor-pointer transition flex items-center justify-center shadow-inner"
                  title="পরবর্তী আয়াত"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* AutoPlay & Speed Controls */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={continuousPlay}
                    onChange={(e) => setContinuousPlay(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-8 h-4 bg-soph-hover rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-soph-text-secondary after:border-soph-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-soph-gold/30 peer-checked:after:bg-soph-gold border border-soph-border"></div>
                  <span className="text-[10px] font-bold text-soph-text-secondary peer-checked:text-soph-gold uppercase tracking-wider">
                    অটো-প্লে
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-soph-text-secondary text-[10px] font-bold uppercase whitespace-nowrap">গতি:</span>
                  <div className="flex bg-soph-deep p-0.5 rounded-lg border border-soph-border">
                    {[
                      { val: 0.85, label: "ধীর" },
                      { val: 1.0, label: "স্বাভাবিক" },
                      { val: 1.15, label: "দ্রুত" }
                    ].map((sp) => (
                      <button
                        key={sp.val}
                        onClick={() => setPlaybackRate(sp.val)}
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition duration-150 cursor-pointer ${
                          playbackRate === sp.val 
                            ? "bg-soph-gold text-soph-deep" 
                            : "text-soph-text-secondary hover:text-soph-gold"
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* AI Integrated Sura Introduction Card */}
          <SurahIntroCard surahId={surahId} />

          {/* Bismillah Header if applicable */}
          {surah.hasBismillah && (
            <div className="text-center py-8">
              <div className="font-serif text-3xl text-soph-gold tracking-wide dir-rtl select-none">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
              <p className="text-xs text-soph-text-secondary font-medium mt-1">
                পরম করুণাময় অতি দয়ালু আল্লাহর নামে শুরু করছি
              </p>
            </div>
          )}

          {/* Verses List */}
          <div className="space-y-4">
            {filteredAyahs.map((ayah) => {
              const loaded = explanations[ayah.numberInSurah];
              const isL = loadingTafsir[ayah.numberInSurah];
              const isErr = tafsirError[ayah.numberInSurah];
              const isTtsActive = activeTafsirSpeakingAyah === ayah.numberInSurah;

              return (
                <div
                  key={ayah.number}
                  className={`bg-soph-card rounded-2xl p-6 transition-all duration-300 relative overflow-hidden ${
                    isTtsActive
                      ? "border-soph-gold/80 bg-soph-card shadow-[0_0_24px_rgba(212,163,89,0.18)] ring-1 ring-soph-gold/30"
                      : "border-soph-border hover:border-soph-gold/30 hover:shadow-lg hover:shadow-black/40"
                  } border`}
                >
                  {/* Top Control Bar: Ayah Number, Recitation */}
                  <div className="flex items-center justify-between mb-4 border-b border-soph-border pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-soph-deep border border-soph-border text-soph-gold font-bold text-xs font-mono flex items-center justify-center">
                        {ayah.numberInSurah}
                      </div>
                      <span className="text-[10px] text-soph-text-secondary font-mono font-medium">
                        পারা: {ayah.juz} • গ্লোবাল আয়াত: {ayah.number}
                      </span>
                      {isTtsActive && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 transition-all ${
                          isTafsirSpeakingPaused 
                            ? "bg-soph-gold/15 text-soph-gold/80 border border-soph-gold/20" 
                            : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 animate-pulse"
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${isTafsirSpeakingPaused ? "bg-soph-gold/60" : "bg-emerald-400 animate-ping"}`}></span>
                          {isTafsirSpeakingPaused ? "টিটিএস বিরতিতে" : (ttsLanguage === "ar" ? "আরবি তেলাওয়াত হচ্ছে" : "তাফসীর পড়া হচ্ছে")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Recite Audio Button */}
                      <button
                        onClick={() => playAudio(ayah.number)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
                          playingAyah === ayah.number
                            ? "bg-soph-gold text-soph-deep border-soph-gold font-bold"
                            : "bg-soph-deep hover:bg-soph-hover text-soph-text-primary border-soph-border"
                        }`}
                      >
                        {playingAyah === ayah.number ? (
                          <>
                            <Pause className="h-3 w-3 animate-pulse" /> অডিও থামান
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" /> তিলাওয়াত প্লে
                          </>
                        )}
                      </button>

                      {/* AI Explanation Button */}
                      <button
                        onClick={() => loadTafsir(ayah)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
                          loaded
                            ? "bg-soph-gold/10 border-soph-gold text-soph-gold"
                            : "bg-soph-deep/50 hover:bg-soph-hover text-soph-gold border-soph-border"
                        }`}
                      >
                        <Sparkles className="h-3 w-3 shrink-0 text-soph-gold" />
                        {loaded ? "View Tafsir (তাফসীর)" : "Get Tafsir (তাফসীর পান)"}
                      </button>

                      {/* Bookmark Button */}
                      <button
                        onClick={() => onToggleVerseBookmark?.(
                          surahId, 
                          surah?.nameBn || surah?.name || "", 
                          ayah.numberInSurah, 
                          ayah.text, 
                          ayah.translation
                        )}
                        className={`p-1 mt-px rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          savedVerses.some(v => v.surahId === surahId && v.verseNumber === ayah.numberInSurah)
                            ? "bg-soph-gold text-soph-deep border-soph-gold"
                            : "bg-soph-deep/50 hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                        }`}
                        title={
                          savedVerses.some(v => v.surahId === surahId && v.verseNumber === ayah.numberInSurah)
                            ? "সংরক্ষণ থেকে বাদ দিন"
                            : "আয়াতটি সংরক্ষণ করুন"
                        }
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopyAyah(ayah)}
                        className={`p-1 mt-px rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          copiedAyahNo === ayah.number
                            ? "bg-emerald-950 text-emerald-400 border-emerald-500/50"
                            : "bg-soph-deep/50 hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                        }`}
                        title="আয়াত ও অনুবাদ কপি করুন"
                      >
                        {copiedAyahNo === ayah.number ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Download/Share Card Button */}
                      <button
                        onClick={() => handleDownloadImageCard(ayah)}
                        disabled={downloadingAyahNo === ayah.number}
                        className={`p-1 mt-px rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          downloadingAyahNo === ayah.number
                            ? "bg-soph-deep text-soph-gold border-soph-gold/40 animate-pulse"
                            : "bg-soph-deep/50 hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                        }`}
                        title="ইমেজ কার্ড সাজিয়ে ডাউনলোড করুন"
                      >
                        {downloadingAyahNo === ayah.number ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Arabic verse text */}
                  <div 
                    className={`font-serif leading-loose text-right font-semibold dir-rtl mb-4 select-all pb-2 transition-all duration-300 rounded-lg px-2 ${
                      isTtsActive && ttsLanguage === "ar" && !isTafsirSpeakingPaused
                        ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)] bg-emerald-950/20 scale-[1.01]"
                        : "text-soph-text-primary"
                    }`}
                    style={{ fontSize: `${arabicSize}px` }}
                  >
                    {renderArabicWithTajweed(ayah.text, isTajweedEnabled)}
                  </div>

                  {/* Transliteration (Pronunciation) Text */}
                  <div className="text-soph-text-primary text-sm leading-relaxed bg-soph-deep/20 border-l-2 border-teal-500/60 pl-4 py-2 rounded-r-lg mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold block mb-1">উচ্চারণ:</span>
                    {pronunciations[ayah.numberInSurah] ? (
                      <span className="font-medium text-soph-text-primary">{pronunciations[ayah.numberInSurah]}</span>
                    ) : (
                      <span className="text-xs text-soph-text-secondary italic animate-pulse">উচ্চারণ প্রস্তুত করা হচ্ছে...</span>
                    )}
                  </div>

                  {/* Translation Text */}
                  <div className="text-soph-text-primary text-sm leading-relaxed bg-soph-deep/40 border-l-2 border-soph-gold pl-4 py-2 rounded-r-lg">
                    <span className="text-[10px] uppercase tracking-wider text-soph-gold font-bold block mb-1">অর্থ:</span>
                    {ayah.translation}
                  </div>

                  {/* AI Tafsir Panel (Pronunciation, Shan-e-Nuzul, Lessons) */}
                  {(loaded || isL || isErr) && (
                    <div className="mt-5 pt-5 border-t border-soph-border space-y-4">
                      {isL && (
                        <div className="flex items-center gap-2 py-2">
                          <RefreshCw className="h-4 w-4 text-soph-gold animate-spin" />
                          <span className="text-xs text-soph-text-secondary font-medium">Gemini AI আয়াতটির সঠিক উচ্চারণ ও নির্ভরযোগ্য ব্যাখ্যা প্রস্তুত করছে...</span>
                        </div>
                      )}

                      {isErr && (
                        <div className="text-xs text-red-400 bg-red-950/20 p-3 rounded-lg flex items-center gap-2 border border-red-900/30">
                          <AlertCircle className="h-4 w-4" /> {isErr}
                        </div>
                      )}

                      {loaded && (
                        <div className={`space-y-4 rounded-xl p-4 border transition-all duration-300 ${
                          isTtsActive && ttsLanguage === "bn" && !isTafsirSpeakingPaused
                            ? "bg-soph-deep/90 border-soph-gold/40 shadow-[0_0_15px_rgba(212,163,89,0.12)]"
                            : "bg-soph-deep/60 border-soph-border"
                        }`}>
                          {/* Text-to-Speech Tafsir Playback Controls with style/language selector */}
                          <div className="bg-soph-deep/90 border border-soph-gold/20 hover:border-soph-gold/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 select-none transition-all duration-300">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-soph-gold border ${
                                activeTafsirSpeakingAyah === ayah.numberInSurah && !isTafsirSpeakingPaused
                                  ? "bg-soph-gold/10 border-soph-gold/50 animate-pulse"
                                  : "bg-soph-deep border-soph-border/60"
                              }`}>
                                <Volume2 className="h-4 w-4" />
                              </div>
                              <div className="text-left">
                                <p className="text-[11px] font-black text-soph-text-primary">এআই তাফসীর রিডার (TTS)</p>
                                <p className="text-[9px] text-soph-text-secondary leading-tight">
                                  {activeTafsirSpeakingAyah === ayah.numberInSurah
                                    ? (isTafsirSpeakingPaused ? "অডিও সাময়িক বিরতিতে রয়েছে" : (ttsLanguage === "ar" ? "আরবি আয়াত তেলাওয়াত হচ্ছে..." : "তাফসীর পড়ে শোনানো হচ্ছে..."))
                                    : (ttsLanguage === "ar" ? "মূল আরবি তেলাওয়াত শুনুন" : "তাফসীর ও ব্যাখ্যা শুনুন বাংলা কণ্ঠে")}
                                </p>
                              </div>
                            </div>

                            {/* Bengali & Arabic synthesis selector */}
                            <div className="flex items-center gap-1 bg-soph-deep/80 p-0.5 rounded-lg border border-soph-border/60">
                              <button
                                onClick={() => changeTtsLanguage("bn", ayah.numberInSurah, loaded, ayah.text)}
                                className={`px-2 py-1 text-[9px] font-extrabold rounded-md transition duration-150 cursor-pointer ${
                                  ttsLanguage === "bn"
                                    ? "bg-soph-gold text-soph-deep font-black shadow-sm"
                                    : "text-soph-text-secondary hover:text-soph-gold"
                                }`}
                                title="তাফসীর ও ব্যাখ্যা বাংলা কণ্ঠে শুনুন"
                              >
                                বাংলা তাফসীর
                              </button>
                              <button
                                onClick={() => changeTtsLanguage("ar", ayah.numberInSurah, loaded, ayah.text)}
                                className={`px-2 py-1 text-[9px] font-extrabold rounded-md transition duration-150 cursor-pointer ${
                                  ttsLanguage === "ar"
                                    ? "bg-soph-gold text-soph-deep font-black shadow-sm"
                                    : "text-soph-text-secondary hover:text-soph-gold"
                                }`}
                                title="আরবি আয়াত তেলাওয়াত শুনুন"
                              >
                                আরবি আয়াত
                              </button>
                            </div>

                            {/* Playback speed slider */}
                            <div className="flex items-center gap-2 bg-soph-deep/80 px-2.5 py-1.5 rounded-lg border border-soph-border/60 text-[9px] font-bold text-soph-text-secondary">
                              <span>গতি (Speed):</span>
                              <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={ttsRate}
                                onChange={(e) => changeTtsRate(parseFloat(e.target.value), ayah.numberInSurah, loaded, ayah.text)}
                                className="w-14 h-1 bg-soph-border rounded-lg appearance-none cursor-pointer accent-soph-gold"
                                title="পড়ার গতি পরিবর্তন করুন"
                              />
                              <span className="text-soph-gold font-bold min-w-[24px] text-right">{ttsRate.toFixed(1)}x</span>
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                              {/* Play / Pause Toggle Button */}
                              <button
                                onClick={() => speakTafsir(ayah.numberInSurah, loaded, ayah.text)}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition duration-150 flex items-center gap-1 cursor-pointer ${
                                  activeTafsirSpeakingAyah === ayah.numberInSurah && !isTafsirSpeakingPaused
                                    ? "bg-soph-gold/15 text-soph-gold border border-soph-gold/30 hover:bg-soph-gold/25"
                                    : "bg-soph-gold text-soph-deep hover:bg-soph-gold-light font-black"
                                }`}
                                title={activeTafsirSpeakingAyah === ayah.numberInSurah && !isTafsirSpeakingPaused ? "বিরতি দিন" : "তাফসীর শুনুন"}
                              >
                                {activeTafsirSpeakingAyah === ayah.numberInSurah && !isTafsirSpeakingPaused ? (
                                  <>
                                    <Pause className="h-3 w-3 fill-current" />
                                    <span>বিরতি</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 fill-current ml-0.5" />
                                    <span>{activeTafsirSpeakingAyah === ayah.numberInSurah ? "চলুন" : "শুনুন"}</span>
                                  </>
                                )}
                              </button>

                              {/* Stop Button */}
                              {activeTafsirSpeakingAyah === ayah.numberInSurah && (
                                <button
                                  onClick={stopTafsirSpeech}
                                  className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-500/25 text-[9px] font-extrabold cursor-pointer transition flex items-center gap-1"
                                  title="সম্পূর্ণ থামুন"
                                >
                                  <VolumeX className="h-3 w-3" />
                                  <span>থামুন</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Typography formatting options for generated Tafsir text */}
                          <div className="bg-soph-deep/45 border border-soph-border/70 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 select-none">
                              <Type className="h-4 w-4 text-soph-gold" />
                              <span className="text-[10px] uppercase tracking-wider text-soph-text-secondary font-black">হরফ শৈলী / ফন্ট স্টাইল:</span>
                              <div className="flex bg-soph-deep border border-soph-border/70 p-0.5 rounded-lg">
                                <button
                                  onClick={() => setTafsirFontStyle("sans")}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-md cursor-pointer transition duration-150 ${
                                    tafsirFontStyle === "sans"
                                      ? "bg-soph-gold text-soph-deep font-black shadow-sm"
                                      : "text-soph-text-secondary hover:text-soph-gold"
                                  }`}
                                  title="Sans-serif (আধুনিক ফন্ট)"
                                >
                                  Sans-serif
                                </button>
                                <button
                                  onClick={() => setTafsirFontStyle("serif")}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-md cursor-pointer transition duration-150 ${
                                    tafsirFontStyle === "serif"
                                      ? "bg-soph-gold text-soph-deep font-black shadow-sm"
                                      : "text-soph-text-secondary hover:text-soph-gold"
                                  }`}
                                  title="Serif (ঐতিহ্যবাহী বইয়ের ফন্ট)"
                                >
                                  Serif
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 select-none">
                              <span className="text-[10px] uppercase tracking-wider text-soph-text-secondary font-black">আকার / ফন্ট সাইজ:</span>
                              <div className="flex bg-soph-deep border border-soph-border/70 p-0.5 rounded-lg">
                                {(["sm", "base", "lg", "xl"] as const).map((sz) => {
                                  const labels: Record<string, string> = { sm: "S", base: "M", lg: "L", xl: "XL" };
                                  return (
                                    <button
                                      key={sz}
                                      onClick={() => setTafsirFontSize(sz)}
                                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md cursor-pointer transition w-7 h-6 flex items-center justify-center ${
                                        tafsirFontSize === sz
                                          ? "bg-soph-gold text-soph-deep font-black shadow-sm"
                                          : "text-soph-text-secondary hover:text-soph-gold"
                                      }`}
                                      title={`ফন্টের আকার: ${labels[sz]}`}
                                    >
                                      {labels[sz]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Bengali Pronunciation */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-soph-text-primary">
                              <Volume2 className="h-3.5 w-3.5 text-soph-gold" />
                              <span className="text-xs font-bold font-sans text-soph-gold">বাংলা উচ্চারণ:</span>
                            </div>
                            <p className={`text-soph-text-primary pl-5 ${getTafsirFontStyleClass()} ${getTafsirFontSizeClass()}`}>
                              {loaded.pronunciation}
                            </p>
                          </div>

                          {/* Shan-e-Nuzul Context */}
                          {loaded.context && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-soph-text-primary">
                                <BookOpen className="h-3.5 w-3.5 text-soph-gold" />
                                <span className="text-xs font-bold text-soph-gold">অবতরণের প্রেক্ষাপট / আলোচনা:</span>
                              </div>
                              <p className={`text-soph-text-secondary pl-5 leading-relaxed text-justify ${getTafsirFontStyleClass()} ${getTafsirFontSizeClass()}`}>
                                {loaded.context}
                              </p>
                            </div>
                          )}

                          {/* Detailed Tafsir Explanation */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-soph-text-primary">
                              <Lightbulb className="h-3.5 w-3.5 text-soph-gold" />
                              <span className="text-xs font-bold text-soph-gold">তাফসীর ও ব্যাখ্যা:</span>
                            </div>
                            <p className={`text-soph-text-secondary pl-5 leading-relaxed text-justify ${getTafsirFontStyleClass()} ${getTafsirFontSizeClass()}`}>
                              {loaded.explanation}
                            </p>
                          </div>

                          {/* Key Lessons/Amals */}
                          {loaded.lessons && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-soph-text-primary font-semibold">
                                <Heart className="h-3.5 w-3.5 text-soph-gold" />
                                <span className="text-xs font-bold text-soph-gold">মূল শিক্ষা ও বাস্তব আমল:</span>
                              </div>
                              <div className={`text-soph-text-secondary pl-5 select-none ${getTafsirFontStyleClass()} ${getTafsirFontSizeClass()}`}>
                                {loaded.lessons.split('\n').map((line, lIdx) => (
                                  <div key={lIdx} className="mb-1 last:mb-0 flex gap-1 items-start">
                                    <span className="text-soph-gold shrink-0 mt-0.5">•</span>
                                    <span>{line.replace(/^[-\*\d\.\s]+/, "")}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Floating Audio Player Viewport Overlay */}
      {surah && (
        <>
          {/* Case 1: Closed -> Show Restore Floating FAB */}
          {!isFloatingPlayerVisible && (
            <button
              onClick={() => {
                setIsFloatingPlayerVisible(true);
                setIsFloatingMinimized(false);
              }}
              className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-soph-gold to-amber-500 hover:from-soph-gold/90 hover:to-amber-500/95 text-soph-deep font-bold rounded-full shadow-[0_4px_16px_rgba(197,160,89,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center group cursor-pointer"
              title="অডিও প্লেয়ার খুলুন"
            >
              <div className="relative">
                <Volume2 className="h-5 w-5" />
                {isSurahPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 text-xs font-sans font-extrabold tracking-wide transition-all duration-300 whitespace-nowrap">
                প্লেয়ার খুলুন
              </span>
            </button>
          )}

          {/* Case 2: Visible & Minimized -> Sleek Compact Badged Pill Controls */}
          {isFloatingPlayerVisible && isFloatingMinimized && (
            <div className="fixed bottom-6 right-6 z-50 bg-soph-card/95 backdrop-blur-xl border border-soph-border rounded-full py-1.5 pl-3.5 pr-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_10px_40px_rgba(197,160,89,0.15)] flex items-center gap-3 transition-all duration-300 transform scale-100 divide-x divide-soph-border/60">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isSurahPlaying ? "bg-emerald-400 animate-ping" : "bg-soph-gold"}`}></span>
                <span className="text-[11px] font-bold text-soph-text-primary">
                  {surah.bn} • আয়াত {toBengaliNumerals(currentAudioIndex + 1)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2">
                <button
                  onClick={() => {
                    if (isSurahPlaying) {
                      fullAudioRef.current?.pause();
                      setIsSurahPlaying(false);
                    } else {
                      setIsSurahPlaying(true);
                      setIsFloatingPlayerVisible(true);
                      setIsFloatingMinimized(false);
                      fullAudioRef.current?.play().catch(() => setIsSurahPlaying(false));
                    }
                  }}
                  className="p-1.5 hover:bg-soph-hover rounded-full text-soph-gold transition cursor-pointer flex items-center justify-center"
                  title={isSurahPlaying ? "থামান" : "চালু করুন"}
                >
                  {isSurahPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                </button>
                <button
                  onClick={() => setIsFloatingMinimized(false)}
                  className="p-1.5 hover:bg-soph-hover rounded-full text-soph-text-secondary hover:text-soph-gold transition cursor-pointer flex items-center justify-center"
                  title="মেক্সিমাইজ করুন"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Visible & Fully Expanded Floating Card */}
          {isFloatingPlayerVisible && !isFloatingMinimized && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-soph-card/95 backdrop-blur-xl border border-soph-gold/30 hover:border-soph-gold/60 rounded-2xl p-4 md:py-3 md:px-5 shadow-[0_20px_50px_rgba(0,0,0,0.75)] hover:shadow-[0_20px_50px_rgba(197,160,89,0.15)] relative overflow-hidden transition-all duration-300 animate-fade-in">
              {/* Amber ambient background glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-soph-gold/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full relative z-10">
                
                {/* 1. Left metadata: Active Surah details, Qari details */}
                <div className="flex items-center gap-3 md:min-w-[240px] max-w-full">
                  <div className={`h-11 w-11 rounded-full bg-soph-deep border-2 ${isSurahPlaying ? "border-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.3)] animate-pulse" : "border-soph-gold/40"} flex items-center justify-center text-soph-gold shrink-0 transition-all duration-500`}>
                    <Volume2 className={`h-5 w-5 ${isSurahPlaying ? "text-emerald-400" : ""}`} />
                  </div>
                  <div className="min-w-0 select-none text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-soph-gold-light uppercase tracking-wider">
                        {surah.bn} ({surah.ar})
                      </span>
                      {isPlayerLoading && (
                        <span className="text-[9px] text-emerald-400 font-extrabold animate-pulse bg-emerald-950/40 border border-emerald-900/30 px-1 py-0.2 rounded">লোড হচ্ছে...</span>
                      )}
                    </div>
                    <span className="text-[10px] text-soph-text-secondary block mt-0.5 truncate leading-tight">
                      আয়াত: <strong className="text-soph-text-primary font-bold font-sans">{toBengaliNumerals(currentAudioIndex + 1)}</strong>/{toBengaliNumerals(surah.ayat)}
                    </span>
                    <span className="text-[9px] text-soph-gold font-bold block truncate max-w-[210px]" title={selectedQari}>
                      ক্বারী: {selectedQari === "ar.alafasy" ? "মিশারী রাশিদ আল-আফাসী" : selectedQari === "ar.abdulbasitmuhammadabdussamad" ? "আব্দুল বাসিত" : selectedQari === "ar.saadalgamidi" ? "সাদ আল-গামদী" : selectedQari === "ar.shuraym" ? "সৌদ আশ-শুরাইম" : "মাহমূদ খলীল আল-হুসারী"}
                    </span>
                  </div>
                </div>

                {/* 2. Middle control station: Playback keys & seek timeline */}
                <div className="flex-1 flex flex-col items-center gap-2 max-w-xl w-full">
                  <div className="flex items-center gap-4">
                    {/* Previous Verse */}
                    <button
                      onClick={() => {
                        if (currentAudioIndex > 0) {
                          playAudioIndex(currentAudioIndex - 1, isSurahPlaying);
                        }
                      }}
                      disabled={currentAudioIndex === 0}
                      className="p-1 px-1.5 hover:bg-soph-hover disabled:opacity-30 disabled:pointer-events-none rounded-lg text-soph-gold/80 hover:text-soph-gold cursor-pointer transition flex items-center justify-center"
                      title="পূর্ববর্তী আয়াত"
                    >
                      <SkipBack className="h-4.5 w-4.5" />
                    </button>

                    {/* Rewind 10 Seconds */}
                    <button
                      onClick={handleRewind10}
                      className="p-1 px-1.5 hover:bg-soph-hover text-soph-gold/80 hover:text-soph-gold rounded-lg cursor-pointer transition flex items-center justify-center gap-0.5"
                      title="১০ সেকেন্ড পেছনে যান"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="text-[9px] font-black font-mono">১০s</span>
                    </button>

                    {/* Big Core Hub Play / Pause button */}
                    <button
                      onClick={() => {
                        if (isSurahPlaying) {
                          fullAudioRef.current?.pause();
                          setIsSurahPlaying(false);
                        } else {
                          setIsSurahPlaying(true);
                          setIsFloatingPlayerVisible(true);
                          setIsFloatingMinimized(false);
                          fullAudioRef.current?.play().catch(() => setIsSurahPlaying(false));
                        }
                      }}
                      className="p-3 bg-gradient-to-tr from-soph-gold to-amber-500 hover:from-soph-gold/95 hover:to-amber-500/95 text-soph-deep rounded-full font-bold cursor-pointer transition hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(197,160,89,0.35)] duration-200 flex items-center justify-center shrink-0"
                      title={isSurahPlaying ? "তিলাওয়াত থামান" : "তিলাওয়াত ও প্লে"}
                    >
                      {isSurahPlaying ? (
                        <Pause className="h-5 w-5 fill-current shrink-0" />
                      ) : (
                        <Play className="h-5 w-5 fill-current ml-0.5 shrink-0" />
                      )}
                    </button>

                    {/* Fast Forward 10 Seconds */}
                    <button
                      onClick={handleFastForward10}
                      className="p-1 px-1.5 hover:bg-soph-hover text-soph-gold/80 hover:text-soph-gold rounded-lg cursor-pointer transition flex items-center justify-center gap-0.5"
                      title="১০ সেকেন্ড সামনে যান"
                    >
                      <span className="text-[9px] font-black font-mono">১০s</span>
                      <RotateCw className="h-4 w-4" />
                    </button>

                    {/* Next Verse */}
                    <button
                      onClick={() => {
                        if (currentAudioIndex + 1 < surahAudioList.length) {
                          playAudioIndex(currentAudioIndex + 1, isSurahPlaying);
                        }
                      }}
                      disabled={currentAudioIndex >= surahAudioList.length - 1}
                      className="p-1 px-1.5 hover:bg-soph-hover disabled:opacity-30 disabled:pointer-events-none rounded-lg text-soph-gold/80 hover:text-soph-gold cursor-pointer transition flex items-center justify-center"
                      title="পরবর্তী আয়াত"
                    >
                      <SkipForward className="h-4.5 w-4.5" />
                    </button>

                    {/* Loop Toggle */}
                    <button
                      onClick={() => setIsLoopingSurah(!isLoopingSurah)}
                      className={`p-1.5 rounded-lg border transition flex items-center justify-center cursor-pointer ${
                        isLoopingSurah
                          ? "bg-soph-gold/15 text-soph-gold border-soph-gold/40 shadow-inner"
                          : "bg-soph-deep hover:bg-soph-hover text-soph-text-secondary border-soph-border/70"
                      }`}
                      title={isLoopingSurah ? "পুনরাবৃত্তি সক্রিয়" : "পুনরাবৃত্তি নিষ্ক্রিয়"}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoopingSurah ? "animate-spin text-soph-gold" : ""}`} />
                    </button>
                  </div>

                  {/* Progressive Timeline Slider */}
                  <div className="flex items-center gap-2.5 w-full">
                    <span className="text-[10px] font-mono text-soph-text-secondary select-none w-10 text-right">
                      {formatTime(audioCurrentTime)}
                    </span>
                    
                    <div className="relative flex-1 flex items-center group py-1.5">
                      {/* Background track */}
                      <div className="absolute left-0 right-0 h-1 bg-soph-deep rounded-full pointer-events-none overflow-hidden">
                        {/* Filled progress track with premium gold gradient */}
                        <div 
                          className="h-full bg-gradient-to-r from-soph-gold to-amber-500 rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(197,160,89,0.5)]"
                          style={{ width: `${(audioCurrentTime / (audioDuration || 1)) * 100}%` }}
                        />
                      </div>
                      {/* Interactive floating thumb handle */}
                      <div 
                        className="absolute h-3 w-3 bg-white border-2 border-soph-gold rounded-full pointer-events-none shadow-[0_2px_6px_rgba(0,0,0,0.3)] -translate-x-1/2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
                        style={{ left: `${(audioCurrentTime / (audioDuration || 1)) * 100}%` }}
                      />
                      {/* Drag overlay range element */}
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 100}
                        step={0.1}
                        value={audioCurrentTime}
                        onChange={handleScrubChange}
                        className="w-full h-3 opacity-0 cursor-pointer relative z-10 focus:outline-none"
                        title="আয়াত প্লে স্ক্রাবার"
                      />
                    </div>

                    <span className="text-[10px] font-mono text-soph-text-secondary select-none w-10 text-left">
                      {formatTime(audioDuration)}
                    </span>
                  </div>
                </div>

                {/* 3. Right Station: Speed Rate, Volume, minimize & close */}
                <div className="flex items-center justify-between md:justify-end gap-3 md:min-w-[240px] border-t border-soph-border/40 md:border-t-0 pt-3 md:pt-0">
                  {/* Playback speed selector */}
                  <div className="flex bg-soph-deep p-0.5 rounded-lg border border-soph-border/60">
                    {[
                      { val: 0.85, label: "ধীর" },
                      { val: 1.0, label: "স্বাভাবিক" },
                      { val: 1.15, label: "দ্রুত" }
                    ].map((sp) => (
                      <button
                        key={sp.val}
                        onClick={() => setPlaybackRate(sp.val)}
                        className={`px-1.5 py-0.5 text-[9px] font-black rounded-md transition duration-155 cursor-pointer ${
                          playbackRate === sp.val 
                            ? "bg-soph-gold text-soph-deep font-black" 
                            : "text-soph-text-secondary hover:text-soph-gold hover:bg-soph-hover"
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 bg-soph-deep/50 px-2 py-1 rounded-lg border border-soph-border/40 shrink-0">
                    <button
                      onClick={() => setIsAudioMuted(!isAudioMuted)}
                      className="text-soph-gold hover:text-soph-gold/80 transition flex items-center justify-center cursor-pointer"
                      title={isAudioMuted ? "শব্দ চালু করুন" : "শব্দ বন্ধ করুন"}
                    >
                      {isAudioMuted || audioVolume === 0 ? (
                        <VolumeX className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={isAudioMuted ? 0 : audioVolume}
                      onChange={(e) => {
                        setAudioVolume(parseFloat(e.target.value));
                        setIsAudioMuted(false);
                      }}
                      className="w-16 md:w-20 h-0.5 bg-soph-deep rounded-lg appearance-none cursor-pointer accent-soph-gold focus:outline-none"
                      title="ভলিউম"
                    />
                  </div>

                  {/* Resize & Close Drawer Action Items */}
                  <div className="flex items-center gap-1 divide-x divide-soph-border/60 pl-1 shrink-0">
                    <button
                      onClick={() => setIsFloatingMinimized(true)}
                      className="p-1 hover:bg-soph-hover hover:text-soph-gold rounded-lg transition text-soph-text-secondary cursor-pointer flex items-center justify-center shrink-0"
                      title="মিনিমাইজ বা ছোট করুন"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsFloatingPlayerVisible(false)}
                      className="p-1 pl-1.5 hover:bg-red-950/20 hover:text-red-400 rounded-lg transition text-soph-text-secondary cursor-pointer flex items-center justify-center shrink-0"
                      title="বন্ধ করুন"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
