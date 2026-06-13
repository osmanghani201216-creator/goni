import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  BookMarked, 
  Award, 
  Hash, 
  ArrowLeft,
  Flame,
  CheckCircle,
  HelpCircle,
  Info,
  Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Real volumes and counts from muslimbangla.com
interface HadithBook {
  id: string;
  bn: string;
  en: string;
  count: number;
  chapters: number;
  author: string;
  desc: string;
  badge: "সহীহ" | "সুনান" | "অন্যান্য" | "সংকলন";
}

const HADITH_BOOKS: HadithBook[] = [
  {
    id: "bukhari",
    bn: "সহীহ বুখারী",
    en: "Sahih al-Bukhari",
    count: 7563,
    chapters: 97,
    author: "ইমাম বুখারী (রহঃ)",
    desc: "ইসলামী শরীআতের অন্যতম প্রধান উৎস ও হাদীসের সবচেয়ে বিশুদ্ধতম সংকলন।",
    badge: "সহীহ"
  },
  {
    id: "muslim",
    bn: "সহীহ মুসলিম",
    en: "Sahih Muslim",
    count: 7453,
    chapters: 56,
    author: "ইমাম মুসলিম (রহঃ)",
    desc: "বিশুদ্ধতার বিচারে সহীহ বুখারীর পরেই যার স্থান ও সর্বাধিক গ্রহণযোগ্য সংকলন।",
    badge: "সহীহ"
  },
  {
    id: "riyad",
    bn: "রিয়াদুস সালিহীন",
    en: "Riyadh us-Saliheen",
    count: 1905,
    chapters: 20,
    author: "ইমাম নববী (রহঃ)",
    desc: "দৈনন্দিন আমল, চরিত্র গঠন ও আত্মশুদ্ধির সর্বোত্তম দিকনির্দেশনামূলক গ্রন্থ।",
    badge: "সংকলন"
  },
  {
    id: "tirmidhi",
    bn: "সুনানে তিরমিজী",
    en: "Jami` at-Tirmidhi",
    count: 3956,
    chapters: 46,
    author: "ইমাম তিরমিজী (রহঃ)",
    desc: "ফেকাহ সম্মত শ্রেণীবিভাগ ও বর্ণনাকারীদের নির্ভরযোগ্যতা যাচাই সংবলিত গ্রন্থ।",
    badge: "সুনান"
  },
  {
    id: "abudawood",
    bn: "সুনানে আবু দাউদ",
    en: "Sunan Abi Dawud",
    count: 5274,
    chapters: 43,
    author: "ইমাম আবু দাউদ (রহঃ)",
    desc: "আহকামে শরীআহ্ এবং দৈনন্দিন ফেক্বহী মাসআলার জন্য সুপ্রসিদ্ধ প্রামাণিক গ্রন্থ।",
    badge: "সুনান"
  },
  {
    id: "nasai",
    bn: "সুনানে নাসায়ী",
    en: "Sunan an-Nasa'i",
    count: 5758,
    chapters: 51,
    author: "ইমাম নাসায়ী (রহঃ)",
    desc: "ইবাদত ও বিধিবিধানের সুচারু বিবরণ সম্বলিত অন্যতম বিশুদ্ধ সুনান গ্রন্থ।",
    badge: "সুনান"
  },
  {
    id: "ibnmajah",
    bn: "সুনানে ইবনে মাজাহ",
    en: "Sunan Ibn Majah",
    count: 4341,
    chapters: 37,
    author: "ইমাম ইবনে মাজাহ (রহঃ)",
    desc: "সিহাহ সিত্তাহর ষষ্ঠ গ্রন্থ, যা অত্যন্ত সাবলীল ও সহজবোধ্য ধারাবাহিকতায় সজ্জিত।",
    badge: "সুনান"
  },
  {
    id: "mishkat",
    bn: "মিশকাতুল মাসাবীহ",
    en: "Mishkat al-Masabih",
    count: 6294,
    chapters: 26,
    author: "খতিব তাবরিজী (রহঃ)",
    desc: "সহীহাইন ও সুনান গ্রন্থের সমস্ত নির্ভরযোগ্য হাদীসের সমন্বিত সুন্দর বিশ্বকোষ।",
    badge: "সংকলন"
  },
  {
    id: "bulugh",
    bn: "বুলুগুল মারাম",
    en: "Bulugh al-Maram",
    count: 1596,
    chapters: 16,
    author: "হাফেজ ইবনে হাজার আল-আসকালানী (রহঃ)",
    desc: "আহকাম ও ফেকাহর দলীলভিত্তিক সংক্ষিপ্ত হাদীসের অত্যন্ত যুগান্তকারী সংকলন।",
    badge: "অন্যান্য"
  },
  {
    id: "adab",
    bn: "আল আদাবুল মুফরাদ",
    en: "Al-Adab Al-Mufrad",
    count: 1329,
    chapters: 644,
    author: "ইমাম বুখারী (রহঃ)",
    desc: "উত্তম আচরণ, পারিবারিক দায়িত্ব এবং শিষ্টাচার বিষয়ক স্বতন্ত্র কালজয়ী সংকলন।",
    badge: "অন্যান্য"
  }
];

interface Topic {
  id: string;
  bn: string;
  color: string;
}

const TOPICS: Topic[] = [
  { id: "iman", bn: "ঈমান ও আকীদা", color: "from-amber-500/20 to-amber-600/30 text-amber-300 border-amber-500/30" },
  { id: "knowledge", bn: "ইলম ও জ্ঞান", color: "from-blue-500/20 to-indigo-600/30 text-blue-300 border-blue-500/30" },
  { id: "character", bn: "চরিত্র ও শিষ্টাচার", color: "from-emerald-500/20 to-teal-600/30 text-emerald-300 border-emerald-500/30" },
  { id: "salat", bn: "সালাত ও পবিত্রতা", color: "from-cyan-500/20 to-sky-600/30 text-cyan-300 border-cyan-500/30" },
  { id: "repent", bn: "তওবা ও আল্লাহর ক্ষমা", color: "from-rose-500/20 to-pink-600/30 text-rose-300 border-rose-500/30" }
];

interface CuratedHadith {
  id: number;
  source: string;
  topicId: string;
  ar: string;
  bn: string;
  narrator: string;
}

const CURATED_HADITHS: CuratedHadith[] = [
  {
    id: 1,
    topicId: "iman",
    source: "সহীহ বুখারী, হাদীস: ১",
    narrator: "হযরত ওমর ইবনুল খাত্তাব (রাঃ)",
    ar: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى ۝",
    bn: "নিশ্চয়ই সমস্ত আমল বা কাজ নিয়তের ওপর নির্ভরশীল। প্রত্যেক মানুষ তা-ই পাবে যা সে নিয়ত করেছে।"
  },
  {
    id: 2,
    topicId: "iman",
    source: "সহীহ মুসলিম, হাদীস: ৪৫",
    narrator: "হযরত আনাস বিন মালিক (রাঃ)",
    ar: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ ۝",
    bn: "তোমাদের কেউ ততক্ষণ পর্যন্ত প্রকৃত মুমিন হতে পারবে না, না সে তার ভাইয়ের জন্য তা-ই পছন্দ করবে যা নিজের জন্য পছন্দ করে।"
  },
  {
    id: 3,
    topicId: "knowledge",
    source: "সহীহ বুখারী, হাদীস: ৫০২৭",
    narrator: "হযরত ওসমান বিন আফফান (রাঃ)",
    ar: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ ۝",
    bn: "তোমাদের মধ্যে সর্বশ্রেষ্ঠ ঐ ব্যক্তি, যে নিজে কুরআন শিক্ষা করে এবং অন্যকে তা শিক্ষা দেয়।"
  },
  {
    id: 4,
    topicId: "knowledge",
    source: "সুনানে ইবনে মাজাহ, হাদীস: ২২৪",
    narrator: "হযরত আনাস বিন মালিক (রাঃ)",
    ar: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ ۝",
    bn: "ইলম বা দ্বীনি জ্ঞান অর্জন করা প্রত্যেক মুসলমানের জন্য অত্যন্ত গুরুদায়িত্ব ও আবশ্যিক কর্তব্য (ফরয)।"
  },
  {
    id: 5,
    topicId: "character",
    source: "সুনানে তিরমিযী, হাদীস: ২০০৩",
    narrator: "হযরত আবু হুরায়রা (রাঃ)",
    ar: "أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا ۝",
    bn: "মুমিনদের মধ্যে ঈমানের দিক দিয়ে সবচেয়ে পরিপক্ক ও পূর্ণাঙ্গ মুমিন সেই ব্যক্তি, যার চরিত্র ও আচরণ সবচেয়ে উত্তম।"
  },
  {
    id: 6,
    topicId: "character",
    source: "সহীহ বুখারী, হাদীস: ৬০১১",
    narrator: "হযরত আবু হুরায়রা (রাঃ)",
    ar: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ ۝",
    bn: "যে ব্যক্তি আল্লাহ ও শেষ বিচার দিবসের ওপর আন্তরিক বিশ্বাস রাখে, সে যেন ভালো কথা বলে, অন্যথায় নীরবতা পালন করে।"
  },
  {
    id: 7,
    topicId: "salat",
    source: "সহীহ মুসলিম, হাদীস: ২২৩",
    narrator: "হযরত আবু মালিক আল-আশআরী (রাঃ)",
    ar: "الطُّهُورُ شَطْرُ الإِيمَانِ ۝",
    bn: "পবিত্রতা এবং পরিচ্ছন্নতা হচ্ছে ঈমান বা বিশ্বাসের অর্ধাংশ।"
  },
  {
    id: 8,
    topicId: "salat",
    source: "সুনানে তিরমিযী, হাদীস: ২৬১৬",
    narrator: "হযরত মুআজ বিন জাবাল (রাঃ)",
    ar: "رَأْسُ الأَمْرِ الإِسْلَامُ، وَعَمُودُهُ الصَّلَاةُ ۝",
    bn: "সকল কাজের মূল উৎস হচ্ছে ইসলাম (আত্মসমর্পণ), আর ইসলামের মূল স্তম্ভ বা খুঁটি হচ্ছে সালাত (নামাজ)।"
  },
  {
    id: 9,
    topicId: "repent",
    source: "সুনানে তিরমিযী, হাদীস: ২৪৯৯",
    narrator: "হযরত আনাস বিন মালিক (রাঃ)",
    ar: "كُلُّ ابْنِ آدَمَ خَطَّاءٌ وَخَيْرُ الْخَطَّائِينَ التَّوَّابُونَ ۝",
    bn: "প্রত্যেক আদম সন্তানই বারবার ভুলকারী বা গুনাহগার, আর পাপকারীদের মধ্যে সর্বশ্রেষ্ঠ হলো তারা যারা আন্তরিকভাবে তওবা করে আল্লাহর পানে ফিরে আসে।"
  },
  {
    id: 10,
    topicId: "repent",
    source: "সহীহ বুখারী, হাদীস: ৭৪০১",
    narrator: "হযরত আবু হুরায়রা (রাঃ)",
    ar: "إِنَّ اللَّهَ كَتَبَ كِتَابًا قَبْلَ أَنْ يَخْلُقَ الْخَلْقَ: إِنَّ رَحْمَتِي سَبَقَتْ غَضَبِي ۝",
    bn: "নিশ্চয়ই মহান আল্লাহ সৃষ্টির পূর্বে তাঁর কিতাবে লিখে রেখেছেন: নিঃসন্দেহে আমার পরম দয়া ও করুণা আমার ক্রোধের ওপর জয়ী ও অগ্রগামী।"
  }
];

interface HadithBrowserProps {
  savedHadiths?: { id: string }[];
  onToggleHadithBookmark?: (key: string, book: string, ar: string, bn: string, narrator?: string, chapter?: string) => void;
}

export default function HadithBrowser({ 
  savedHadiths = [], 
  onToggleHadithBookmark 
}: HadithBrowserProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<"books" | "curated" | "search">("books");
  
  // Topic filtering
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  
  // Specific book search mode
  const [selectedBook, setSelectedBook] = useState<HadithBook | null>(null);
  const [targetHadithNum, setTargetHadithNum] = useState("");
  
  // General search query
  const [searchQuery, setSearchQuery] = useState("");
  
  // AI query loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<{
    book: string;
    chapter: string;
    narrator: string;
    ar: string;
    bn: string;
    relevance: string;
    status: string;
  } | null>(null);

  // Quick lookup for a hadith from selected book
  const handleBookHadithLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !targetHadithNum.trim()) return;

    setLoading(true);
    setError(null);
    setApiResult(null);

    try {
      const res = await fetch("/api/hadith-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book: selectedBook.bn,
          hadithNumber: targetHadithNum.trim()
        })
      });

      if (!res.ok) throw new Error("হাদীসটি অনলাইনে খুঁজে পাওয়া যায়নি।");
      const data = await res.json();
      setApiResult(data);
    } catch (err: any) {
      setError(err.message || "আল্লাহর বাণী লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // General search across all books referencing muslimbangla.com using Gemini AI
  const handleGeneralSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setApiResult(null);

    try {
      const res = await fetch("/api/hadith-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim()
        })
      });

      if (!res.ok) throw new Error("হাদীসটি অনলাইনে লোড করা যায়নি।");
      const data = await res.json();
      setApiResult(data);
    } catch (err: any) {
      setError(err.message || "অনুসন্ধানে ক্রুটি হয়েছে। অনুগ্রহ করে বিষয়ের নাম বাংলা অক্ষরে লিখে চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const filteredCurated = selectedTopic === "all"
    ? CURATED_HADITHS
    : CURATED_HADITHS.filter(h => h.topicId === selectedTopic);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hadith Section Subnav */}
      <div className="flex bg-soph-deep border border-soph-border p-1 rounded-xl justify-between items-center max-w-md mx-auto">
        <button
          onClick={() => {
            setActiveSubTab("books");
            setSelectedBook(null);
            setApiResult(null);
            setError(null);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
            activeSubTab === "books"
              ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
              : "text-soph-text-secondary hover:text-soph-gold"
          }`}
        >
          হাদীস গ্রন্থমালা
        </button>
        <button
          onClick={() => {
            setActiveSubTab("curated");
            setApiResult(null);
            setError(null);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
            activeSubTab === "curated"
              ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
              : "text-soph-text-secondary hover:text-soph-gold"
          }`}
        >
          বিষয়ভিত্তিক হাদীস
        </button>
        <button
          onClick={() => {
            setActiveSubTab("search");
            setApiResult(null);
            setError(null);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
            activeSubTab === "search"
              ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
              : "text-soph-text-secondary hover:text-soph-gold"
          }`}
        >
          স্মার্ট হাদীস সার্চ
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: ALL BOOKS FORWARD VIEW (matching muslimbangla.com/hadith-books) */}
        {activeSubTab === "books" && !selectedBook && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-soph-text-primary flex items-center justify-center gap-2">
                <BookMarked className="h-5 w-5 text-soph-gold" /> হাদীসের বিখ্যাত গ্রন্থসমূহ
              </h2>
              <p className="text-xs text-soph-text-secondary max-w-lg mx-auto">
                মুসলিমবাংলা পোর্টাল অনুসরণে সিহাহ সিত্তাহ সহ বিশ্বনন্দিত বিশুদ্ধতম হাদীস সংকলনসমূহের বিবরণ ও হাদীস অনুসন্ধানের সহজ সুবিধা।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HADITH_BOOKS.map((book) => (
                <div
                  key={book.id}
                  onClick={() => {
                    setSelectedBook(book);
                    setTargetHadithNum("");
                    setApiResult(null);
                    setError(null);
                  }}
                  className="bg-soph-card border border-soph-border p-5 rounded-2xl hover:border-soph-gold/40 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-soph-gold group-hover:underline">
                          {book.bn}
                        </span>
                        <p className="text-[10px] text-soph-text-secondary font-mono">
                          {book.en}
                        </p>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                        book.badge === "সহীহ" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30" :
                        book.badge === "সুনান" ? "bg-amber-950/40 text-amber-400 border-amber-900/30" :
                        "bg-soph-hover text-soph-text-primary border-soph-border"
                      }`}>
                        {book.badge}
                      </span>
                    </div>

                    <p className="text-xs text-soph-text-secondary leading-relaxed">
                      {book.desc}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-soph-border/40 mt-4 text-[10px] text-soph-text-secondary font-medium">
                    <span>সংকলক: <strong className="text-soph-text-primary">{book.author}</strong></span>
                    <span className="bg-soph-deep border border-soph-border px-2 py-0.5 rounded-md font-mono text-soph-gold">
                      {book.count} হাদীস • {book.chapters}টি অধ্যায়
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SUBTAB: SINGLE BOOK DISPLAY & QUERY */}
        {activeSubTab === "books" && selectedBook && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Back to list button */}
            <button
              onClick={() => {
                setSelectedBook(null);
                setApiResult(null);
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-soph-gold hover:text-soph-gold/80 hover:bg-soph-hover px-3.5 py-1.5 rounded-xl border border-soph-border transition duration-150 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> গ্রন্থ তালিকায় ফিরুন
            </button>

            {/* Book Info Panel */}
            <div className="bg-soph-card border border-soph-border rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-bold text-soph-text-primary">{selectedBook.bn}</span>
                  <span className="text-[10px] font-bold text-soph-gold bg-soph-deep border border-soph-border px-2 py-0.5 rounded-md">
                    {selectedBook.badge} গ্রন্থ
                  </span>
                </div>
                <p className="text-xs text-soph-text-secondary">{selectedBook.desc}</p>
                <p className="text-[11px] text-soph-text-secondary font-semibold">সংকলক: {selectedBook.author}</p>
              </div>

              <div className="text-left md:text-right text-xs">
                <span className="text-soph-gold font-bold font-mono bg-soph-deep border border-soph-border p-2 rounded-xl inline-block">
                  মোট হাদীস: {selectedBook.count} টি
                </span>
                <p className="text-[10px] text-soph-text-secondary mt-1 font-medium">অধ্যায় ও অনুচ্ছেদ: {selectedBook.chapters} টি</p>
              </div>
            </div>

            {/* Hadith Number Lookup Form */}
            <div className="bg-soph-card border border-soph-border p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-soph-gold flex items-center gap-1.5">
                <Hash className="h-4 w-4" /> হাদীস সূচক খোঁজা (যেমন: ১ থেকে {selectedBook.count} পর্যন্ত)
              </h3>
              
              <form onSubmit={handleBookHadithLookup} className="flex gap-2.5">
                <input
                  type="number"
                  min="1"
                  max={selectedBook.count}
                  placeholder={`হাদীস নম্বর লিখুন (১ - ${selectedBook.count})`}
                  className="flex-1 px-4 py-2.5 bg-soph-deep border border-soph-border focus:ring-1 focus:ring-soph-gold rounded-xl text-xs text-soph-text-primary placeholder-zinc-500 focus:outline-none"
                  value={targetHadithNum}
                  onChange={(e) => setTargetHadithNum(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={loading || !targetHadithNum}
                  className="px-5 py-2.5 bg-soph-gold hover:bg-soph-gold/90 text-soph-deep font-bold text-xs rounded-xl transition duration-150 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  উদ্ধার করুন
                </button>
              </form>
            </div>

            {/* Dynamic Fetch Output */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-12 py-16 space-y-3"
                >
                  <RefreshCw className="h-7 w-7 text-soph-gold animate-spin" />
                  <p className="text-xs text-soph-text-secondary font-medium">
                    {selectedBook.bn} গ্রন্থ হতে হাদীস নং {targetHadithNum} খুঁজে আনা হচ্ছে...
                  </p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-950/20 border border-red-900/30 text-red-400 p-4 rounded-xl text-xs flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {apiResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-soph-card border border-soph-border rounded-2xl p-6 space-y-5 shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-soph-border/45 text-xs text-soph-text-secondary font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-soph-gold bg-soph-hover px-3 py-1 rounded-full border border-soph-border font-bold">
                        📍 {apiResult.book}
                      </span>
                      <span className="bg-soph-hover px-2.5 py-1 rounded-md border border-soph-border">
                        {apiResult.chapter}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/20">
                        মান: {apiResult.status}
                      </span>
                    </div>

                    {/* Bookmark Toggle */}
                    <button
                      onClick={() => onToggleHadithBookmark?.(
                        `lookup-${selectedBook?.id}-${targetHadithNum}`,
                        `${apiResult.book}, হাদীস নং ${targetHadithNum}`,
                        apiResult.ar,
                        apiResult.bn,
                        apiResult.narrator,
                        apiResult.chapter
                      )}
                      className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                        savedHadiths.some(h => h.id === `lookup-${selectedBook?.id}-${targetHadithNum}`)
                          ? "bg-soph-gold text-soph-deep border-soph-gold"
                          : "bg-soph-deep/50 hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                      }`}
                      title={
                        savedHadiths.some(h => h.id === `lookup-${selectedBook?.id}-${targetHadithNum}`)
                          ? "সংরক্ষণ থেকে বাদ দিন"
                          : "হাদীসটি সংরক্ষণ করুন"
                      }
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Arabic Text */}
                  <div className="font-serif text-xl md:text-2xl text-right text-soph-text-primary font-bold dir-rtl leading-relaxed select-all">
                    {apiResult.ar}
                  </div>

                  {/* Narrator Info */}
                  <div className="text-xs font-semibold text-soph-gold flex items-center gap-1.5 pt-1">
                    <Award className="h-4 w-4" /> {apiResult.narrator}
                  </div>

                  {/* Translation */}
                  <div className="text-soph-text-primary text-sm leading-relaxed border-l-2 border-soph-gold bg-soph-deep/40 pl-4 py-2.5 rounded-r-xl">
                    <span className="text-[10px] font-bold text-soph-gold block mb-1 uppercase tracking-wider">হাদীসের বাংলা অর্থ:</span>
                    {apiResult.bn}
                  </div>

                  {/* Deep relevance / lessons */}
                  <div className="space-y-2 pt-3 border-t border-soph-border/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-soph-text-primary">
                      <Sparkles className="h-3.5 w-3.5 text-soph-gold" /> হাদীসের ব্যাখ্যা ও শিক্ষা:
                    </div>
                    <p className="text-xs text-soph-text-secondary leading-relaxed bg-soph-deep/20 p-3.5 rounded-xl border border-soph-border/40">
                      {apiResult.relevance}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* TAB 2: CURATED HADITHS INDEX (Fast display, zero loading required) */}
        {activeSubTab === "curated" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Topic Picker */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedTopic("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 border cursor-pointer ${
                  selectedTopic === "all"
                    ? "bg-soph-gold text-soph-deep border-soph-gold shadow-md"
                    : "bg-soph-deep text-soph-text-secondary border-soph-border hover:bg-soph-hover"
                }`}
              >
                সব বিষয়
              </button>
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 border cursor-pointer ${
                    selectedTopic === topic.id
                      ? "bg-soph-gold text-soph-deep border-soph-gold shadow-md"
                      : "bg-soph-deep text-soph-text-secondary border-soph-border hover:bg-soph-hover"
                  }`}
                >
                  {topic.bn}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-4">
              {filteredCurated.map((h) => {
                const matchedTopic = TOPICS.find(t => t.id === h.topicId);
                return (
                  <div
                    key={h.id}
                    className="bg-soph-card border border-soph-border rounded-2xl p-6 hover:border-soph-gold/30 hover:shadow-lg transition-all duration-150 space-y-4"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-soph-border/45">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-soph-gold bg-soph-hover px-3 py-1 rounded-full border border-soph-border font-mono">
                          📓 {h.source}
                        </span>
                        {matchedTopic && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${matchedTopic.color}`}>
                            {matchedTopic.bn}
                          </span>
                        )}
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={() => onToggleHadithBookmark?.(
                          `curated-${h.id}`,
                          h.source,
                          h.ar,
                          h.bn,
                          h.narrator,
                          matchedTopic?.bn || "সাধারণ"
                        )}
                        className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          savedHadiths.some(hd => hd.id === `curated-${h.id}`)
                            ? "bg-soph-gold text-soph-deep border-soph-gold"
                            : "bg-soph-deep/50 hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                        }`}
                        title={
                          savedHadiths.some(hd => hd.id === `curated-${h.id}`)
                            ? "সংরক্ষণ থেকে বাদ দিন"
                            : "হাদীসটি সংরক্ষণ করুন"
                        }
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Arabic text with beautiful ligatures */}
                    <div className="font-serif text-xl md:text-2xl text-right text-soph-text-primary font-bold dir-rtl leading-relaxed select-all">
                      {h.ar}
                    </div>

                    {/* Narrator */}
                    <div className="text-xs font-semibold text-soph-gold flex items-center gap-1.5 opacity-90 pl-1">
                      <Award className="h-4 w-4" /> {h.narrator}
                    </div>

                    {/* Translation */}
                    <div className="text-soph-text-primary text-sm leading-relaxed border-l-2 border-soph-gold bg-soph-deep/30 pl-4 py-2.5 rounded-r-xl">
                      <span className="text-[10px] font-bold text-soph-gold block mb-1">অনুবাদ:</span>
                      {h.bn}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 3: SMART SEARCH INTERFACE (Fetch search details from Gemini server) */}
        {activeSubTab === "search" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-soph-text-primary flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-soph-gold" /> এআই হাদীস অনুসন্ধান ও ব্যাখ্যা
              </h2>
              <p className="text-xs text-soph-text-secondary max-w-lg mx-auto">
                আপনি যে কোনো বিষয়ের নাম বাংলায় লিখুন (যেমন: সততা, জ্ঞান, মা-বাবা, সালাত) অথবা সহীহ হাদীসের কোনো সুনির্দিষ্ট বর্ণনা বা গ্রন্থের নাম লিখে খোঁজা শুরু করুন।
              </p>
            </div>

            {/* General Search Input */}
            <div className="bg-soph-card border border-soph-border p-5 rounded-2xl shadow-sm">
              <form onSubmit={handleGeneralSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder="হাদীসের বিষয় বা বাণী লিখুন (যেমন: 'জ্ঞানের গুরুত্ব' অথবা 'পিতা মাতার মর্যাদা')"
                    className="w-full pl-10 pr-4 py-3 bg-soph-deep border border-soph-border focus:ring-1 focus:ring-soph-gold focus:border-soph-gold rounded-xl text-xs text-soph-text-primary placeholder-zinc-500 focus:outline-none transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-soph-gold" />
                </div>
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="px-6 py-3 bg-soph-gold hover:bg-soph-gold/90 text-soph-deep font-bold text-xs rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  অনুসন্ধান
                </button>
              </form>
            </div>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-12 py-16 space-y-3"
                >
                  <RefreshCw className="h-7 w-7 text-soph-gold animate-spin" />
                  <p className="text-xs text-soph-text-secondary font-medium">
                    Gemini AI নির্ভরযোগ্য হাদীসের ভাণ্ডার থেকে চমৎকার হাদীস নিয়ে আসছে...
                  </p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-950/20 border border-red-900/30 text-red-400 p-4 rounded-xl text-xs flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {apiResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-soph-card border border-soph-border rounded-2xl p-6 space-y-5 shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-soph-border/45 text-xs text-soph-text-secondary font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-soph-gold bg-soph-hover px-3 py-1 rounded-full border border-soph-border font-bold">
                        📍 {apiResult.book}
                      </span>
                      <span className="bg-soph-hover px-2.5 py-1 rounded-md border border-soph-border">
                        {apiResult.chapter}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/20">
                        মান: {apiResult.status}
                      </span>
                    </div>

                    {/* Bookmark Toggle */}
                    <button
                      onClick={() => onToggleHadithBookmark?.(
                        `smart-${apiResult.book}-${apiResult.narrator.substring(0, 20)}`,
                        apiResult.book,
                        apiResult.ar,
                        apiResult.bn,
                        apiResult.narrator,
                        apiResult.chapter
                      )}
                      className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                        savedHadiths.some(h => h.id === `smart-${apiResult.book}-${apiResult.narrator.substring(0, 20)}`)
                          ? "bg-soph-gold text-soph-deep border-soph-gold"
                          : "bg-soph-deep/50 hover:bg-soph-hover text-soph-text-secondary hover:text-soph-gold border-soph-border"
                      }`}
                      title={
                        savedHadiths.some(h => h.id === `smart-${apiResult.book}-${apiResult.narrator.substring(0, 20)}`)
                          ? "সংরক্ষণ থেকে বাদ দিন"
                          : "হাদীসটি সংরক্ষণ করুন"
                      }
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Arabic text with beautiful ligatures */}
                  <div className="font-serif text-xl md:text-2xl text-right text-soph-text-primary font-bold dir-rtl leading-relaxed select-all">
                    {apiResult.ar}
                  </div>

                  {/* Narrator */}
                  <div className="text-xs font-semibold text-soph-gold flex items-center gap-1.5 pt-1">
                    <Award className="h-4 w-4" /> {apiResult.narrator}
                  </div>

                  {/* Translation */}
                  <div className="text-soph-text-primary text-sm leading-relaxed border-l-2 border-soph-gold bg-soph-deep/40 pl-4 py-2.5 rounded-r-xl">
                    <span className="text-[10px] font-bold text-soph-gold block mb-1 uppercase tracking-wider">হাদীসের সরল অর্থ:</span>
                    {apiResult.bn}
                  </div>

                  {/* Deep relevance / lessons */}
                  <div className="space-y-2 pt-3 border-t border-soph-border/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-soph-text-primary">
                      <Sparkles className="h-3.5 w-3.5 text-soph-gold" /> হাদীসের গভীর শিক্ষা ও জীবনোপযোগ ঢং:
                    </div>
                    <p className="text-xs text-soph-text-secondary leading-relaxed bg-soph-deep/20 p-3.5 rounded-xl border border-soph-border/40 text-justify">
                      {apiResult.relevance}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
