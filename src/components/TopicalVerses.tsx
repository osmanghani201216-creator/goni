import { useState } from "react";
import { Book, Heart, Compass, Shield, Sun, Sparkles, Bookmark } from "lucide-react";

interface TopicalVersesProps {
  savedVerses?: { surahId: number; verseNumber: number }[];
  onToggleVerseBookmark?: (surahId: number, surahName: string, verseNumber: number, ar: string, bn: string) => void;
}

interface CuratedVerse {
  surah: number;
  surahName: string;
  verse: number;
  ar: string;
  tr: string;
  bn: string;
  explanation: string;
}

const TOPICS_DATA: Record<string, { icon: any; color: string; bg: string; title: string; desc: string; verses: CuratedVerse[] }> = {
  creed: {
    icon: Shield,
    color: "text-soph-gold",
    bg: "bg-soph-card border-soph-border",
    title: "ঈমান ও আকীদা (Belief & Creed)",
    desc: "তাওহীদ, আল্লাহর একত্ববাদ এবং আত্মিক প্রশান্তির আয়াতসমূহ",
    verses: [
      {
        surah: 112,
        surahName: "আল ইখলাস",
        verse: 1,
        ar: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ۝",
        tr: "কুল হুওয়াল্লাহু আহাদ। আল্লাহুস সামাদ। লাম ইয়ালিদ ওয়া লাম ইউলাদ। ওয়া লাম ইয়াকুল্লাহু কুফুওয়ান আহাদ।",
        bn: "বলুন, তিনিই আল্লাহ, একক-অদ্বিতীয়। আল্লাহ কারো মুখাপেক্ষী নন, সকলেই তাঁর মুখাপেক্ষী। তিনি কাউকে জন্ম দেননি এবং কেউ তাকে জন্ম দেয়নি। এবং তাঁর সমকক্ষ কেউই নেই।",
        explanation: "এই সূরাটি পবিত্র কুরআনের এক-তৃতীয়াংশের সমান মর্যাদা রাখে। এখানে অত্যন্ত সংক্ষিপ্ত অথচ চিরন্তন শব্দে আল্লাহর একত্ববাদের নিখুঁত ঘোষণা দেয়া হয়েছে।"
      },
      {
        surah: 2,
        surahName: "আল বাকারা (আয়াতুল কুরসী)",
        verse: 255,
        ar: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ",
        tr: "আল্লাহু লা ইলাহা ইল্লা হুয়াল হাইয়্যুল কাইয়্যুম। লা তা’খুযুহু সিনাতুо ওয়ালা নাউম। লাহূ মা ফিস সামাওয়াতি ওয়ামা ফিল আরয...",
        bn: "আল্লাহ, তিনি ছাড়া কোনো সত্য উপাস্য নেই, তিনি চিরঞ্জীব, সর্বসত্তার ধারক। তাকে تন্দ্রা কিংবা নিদ্রা স্পর্শ করে না। গ্যালাক্সি ও মহাকাশে যা কিছু আছে এবং পৃথিবীতে যা কিছু আছে সবই তাঁর মালিকানাধীন।",
        explanation: "এটি কুরআনের সর্বশ্রেষ্ঠ আয়াত। এটি নিয়মিত পাঠ করলে শয়তানের আক্রমণ থেকে নিরাপদ থাকা যায় এবং আত্মিক প্রশান্তি অর্জন হয়।"
      }
    ]
  },
  mercy: {
    icon: Heart,
    color: "text-soph-gold",
    bg: "bg-soph-card border-soph-border",
    title: "দয়া ও করুণা (Mercy & Grace)",
    desc: "বান্দার প্রতি বিশ্বজগতের মহান প্রতিপালকের অন্তহীন অনুগ্রহের আয়াত",
    verses: [
      {
        surah: 55,
        surahName: "আর রহমান",
        verse: 13,
        ar: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ ۝",
        tr: "ফাবিআইয়্যি আলা-ই রাব্বিকুমা তুকাদ্যিবান।",
        bn: "অতএব (হে মানব ও জিনজাতি!) তোমরা তোমরা প্রতিপালকের কোন কোন অনুগ্রহকে অস্বীকার করবে?",
        explanation: "আল্লাহ পাক সূরা আর-রাহমানে এই আয়াতটি ৩১ বার উল্লেখ করে মানবজাতিকে ও জিনজাতিকে তাঁর অগণিত নেয়ামত স্মরণ করিয়ে দিয়েছেন এবং কৃতজ্ঞ হওয়ার আহ্বান জানিয়েছেন।"
      },
      {
        surah: 93,
        surahName: "আদ দুহা",
        verse: 3,
        ar: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ ۝",
        tr: "মা ওয়াদ্দাআকা রাব্বুকা ওয়ামা কালা।",
        bn: "আপনার প্রতিপালক আপনাকে পরিত্যাগ করেননি এবং আপনার উপর অসন্তুষ্টও হননি।",
        explanation: "এই আয়াতটি হতাশায় নিমজ্জিত প্রতিটি মানুষের হৃদয়ে আশার আলো জ্বালায়। আল্লাহ তাঁর নেক বান্দাদের কখনো একাকী ছেড়ে দেন না।"
      }
    ]
  },
  forgiveness: {
    icon: Compass,
    color: "text-soph-gold",
    bg: "bg-soph-card border-soph-border",
    title: "ক্ষমা ও তাওবা (Tafsir & Forgiveness)",
    desc: "পাপ মার্জনা এবং আল্লাহর পথে ফিরে আসার প্রেরণা জাগানো আয়াতসমূহ",
    verses: [
      {
        surah: 39,
        surahName: "আয যুমার",
        verse: 53,
        ar: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ",
        tr: "কুল ইয়া ইবাদিয়ল্লাযীনা আসরাফূ আলা আনফুসিহিম লা তাকনাতূ মির রাহমাতিল্লাহ। ইন্নাল্লাহা ইয়াগফিরুয যুনূবা জামীআ...",
        bn: "বলুন, হে আমার বান্দাগণ! যারা নিজেদের ওপর জুলুম বা সীমালঙ্ঘন করেছ, তোমরা আল্লাহর অনুগ্রহ হতে নিরাশ হয়ো না। নিশ্চয়ই আল্লাহ সমস্ত গুনাহ ক্ষমা করে দেবেন। তিনি পরম অত্যন্ত ক্ষমাশীল ও দয়াময়।",
        explanation: "এটি কুরআনের অন্যতম আশাব্যঞ্জক আয়াত। গুনাহ যত বড়ই হোক না কেন, নিখাদ হৃদয়ে তওবা করলে আল্লাহ তা মাফ করে দেন।"
      },
      {
        surah: 3,
        surahName: "আলে ইমরান",
        verse: 135,
        ar: "وَالَّذِينَ إِذَا فَعَلُوا فَاحِشَةً أَوْ ظَلَمُوا أَنفُسَهُمْ ذَكَرُوا اللَّهَ فَاسْتَغْفَرُوا لِذُنُوبِهِمْ",
        tr: "ওয়াল্লাযীনা ইযা ফায়ালূ ফাহিশাতান আও যালামূ আনফুসাহুম যাকারুল্লাহা ফাসতাগফারূ লিযুনূবিহিম...",
        bn: "এবং তারা সেইসব লোক, যারা কোনো অশ্লীল কাজ করে ফেললে বা নিজেদের প্রতি অন্যায় করলে তৎক্ষণাৎ আল্লাহকে স্মরণ করে এবং নিজেদের পাপের জন্য ক্ষমা প্রার্থনা করে।",
        explanation: "মুমিনরা ভুলবশত পাপ বা সীমালঙ্ঘন করলে সঙ্গে সঙ্গে তওবা করে এবং পুনরায় পাপের রাস্তায় লিপ্ত হয় না।"
      }
    ]
  },
  lessons: {
    icon: Sun,
    color: "text-soph-gold",
    bg: "bg-soph-card border-soph-border",
    title: "ধৈর্য ও আমল (Patience & Daily Life)",
    desc: "জীবনের কঠিনতম পরিস্থিতিতে সঠিক কর্মপন্থা ও ধৈর্য ধারণের ঐশী আলো",
    verses: [
      {
        surah: 2,
        surahName: "আল বাকারা",
        verse: 153,
        ar: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ۝",
        tr: "ইয়া আইয়্যুহাল্লাযীনা আমানুস তাঈনূ বিস সাবরি ওয়াস সালাহ। ইন্নাল্লাহা মায়াস সাবিলীন।",
        bn: "হে বিশ্বাসীগণ! তোমরা ধৈর্য ও নামাজের মাধ্যমে আল্লাহর সাহায্য প্রার্থনা করো। নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সাথে আছেন।",
        explanation: "জীবনের সমস্ত দুঃখ-কষ্ট ও পরীক্ষায় উত্তীর্ণ হওয়ার প্রধান দুটি চমৎকার মাধ্যম হলো অবিরত ধৈর্য এবং নিয়মতান্ত্রিক নামাজ।"
      },
      {
        surah: 94,
        surahName: "আশ শারহ",
        verse: 6,
        ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا ۝",
        tr: "ইন্না মায়াল উসরি ইউসরা।",
        bn: "নিশ্চয়ই কষ্টের সাথেই তো স্বস্তি রয়েছে।",
        explanation: "এই আয়াতে আল্লাহ অত্যন্ত জোর দিয়ে বলেছেন যে প্রতিকূল পরিস্থিতি চিরস্থায়ী নয়, অন্ধকারের পরেই আলোর শুভাগমন অবধারিত।"
      }
    ]
  }
};

export default function TopicalVerses({ 
  savedVerses = [], 
  onToggleVerseBookmark 
}: TopicalVersesProps = {}) {
  const [activeTopic, setActiveTopic] = useState<string>("creed");

  const topicObj = TOPICS_DATA[activeTopic];

  return (
    <div className="space-y-6">
      {/* Category selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(TOPICS_DATA).map(([key, value]) => {
          const IconComp = value.icon;
          const isActive = activeTopic === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTopic(key)}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                isActive
                  ? "bg-soph-gold border-soph-gold text-soph-deep font-bold shadow-md shadow-soph-gold/10"
                  : "bg-soph-card border-soph-border text-soph-text-secondary hover:bg-soph-hover"
              }`}
            >
              <IconComp className={`h-5 w-5 shrink-0 ${isActive ? "text-soph-deep" : "text-soph-gold"}`} />
              <div>
                <div className="text-xs font-bold font-sans tracking-tight">
                  {key === "creed" ? "ঈমান ও আকীদা" : key === "mercy" ? "আল্লাহর দয়া" : key === "forgiveness" ? "ক্ষমা ও তাওবা" : "ধৈর্য ও আমল"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div className={`p-5 rounded-2xl border ${topicObj.bg} flex gap-3 items-start shadow-md relative overflow-hidden bg-soph-card`}>
        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.4px,transparent_0.4px)] [background-size:20px_20px] opacity-5 pointer-events-none"></div>
        <Sparkles className="h-5 w-5 shrink-0 text-soph-gold mt-0.5 animate-pulse relative z-10" />
        <div className="relative z-10">
          <h3 className={`text-sm font-bold ${topicObj.color}`}>{topicObj.title}</h3>
          <p className="text-soph-text-secondary text-xs mt-1 leading-relaxed">
            {topicObj.desc}
          </p>
        </div>
      </div>

      {/* Verses list */}
      <div className="space-y-4">
        {topicObj.verses.map((verse, index) => (
          <div
            key={index}
            className="bg-soph-card border border-soph-border rounded-2xl p-6 space-y-4 shadow-md"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-soph-border/70 pb-3">
              <span className="text-xs font-bold text-soph-gold font-sans">
                {verse.surahName} : আয়াত {verse.verse} (সূরা নম্বর {verse.surah})
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-soph-text-secondary hidden sm:inline">বিষয়ভিত্তিক সংকলন</span>
                
                {/* Bookmark Button */}
                <button
                  onClick={() => onToggleVerseBookmark?.(
                    verse.surah,
                    verse.surahName,
                    verse.verse,
                    verse.ar,
                    verse.bn
                  )}
                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                    savedVerses.some(v => v.surahId === verse.surah && v.verseNumber === verse.verse)
                      ? "bg-soph-gold text-soph-deep border-soph-gold"
                      : "bg-soph-deep/50 hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                  }`}
                  title={
                    savedVerses.some(v => v.surahId === verse.surah && v.verseNumber === verse.verse)
                      ? "সংরক্ষণ থেকে বাদ দিন"
                      : "আয়াতটি সংরক্ষণ করুন"
                  }
                >
                  <Bookmark className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Arabic */}
            <div className="font-serif text-2xl text-right text-soph-text-primary font-bold dir-rtl leading-loose select-all">
              {verse.ar}
            </div>

            {/* Transliteration */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-soph-text-secondary block">বাংলা উচ্চারণ:</span>
              <p className="text-xs font-semibold text-soph-text-primary leading-relaxed bg-soph-deep p-3 rounded-xl border border-soph-border">
                {verse.tr}
              </p>
            </div>

            {/* Meaning */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-soph-text-secondary block">অনুবাদ:</span>
              <p className="text-sm font-medium text-soph-text-primary pl-4 border-l-2 border-soph-gold py-0.5">
                {verse.bn}
              </p>
            </div>

            {/* Explanation */}
            <div className="space-y-1 bg-soph-deep p-4 rounded-xl border border-soph-border">
              <span className="text-[10px] uppercase font-bold text-soph-gold block">ঐশ্বরিক গুরুত্ব ও তাফসীর:</span>
              <p className="text-xs text-soph-text-secondary leading-relaxed text-justify">
                {verse.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
