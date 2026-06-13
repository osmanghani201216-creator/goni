import React, { useState } from "react";
import { 
  Bookmark, 
  Trash2, 
  Copy, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Check, 
  HelpCircle,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SavedVerse {
  surahId: number;
  surahName: string;
  verseNumber: number;
  ar: string;
  bn: string;
}

interface SavedHadith {
  id: string; // unique key
  book: string;
  ar: string;
  bn: string;
  narrator?: string;
  chapter?: string;
}

interface MySavedProps {
  savedVerses: SavedVerse[];
  savedHadiths: SavedHadith[];
  onRemoveVerse: (surahId: number, verseNumber: number) => void;
  onRemoveHadith: (id: string) => void;
  onGotoSurah: (surahId: number) => void;
  onGotoHadith: () => void;
}

export default function MySaved({ 
  savedVerses, 
  savedHadiths, 
  onRemoveVerse, 
  onRemoveHadith, 
  onGotoSurah,
  onGotoHadith
}: MySavedProps) {
  const [activeSubTab, setActiveSubTab] = useState<"verses" | "hadiths">("verses");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Sub tabs selector */}
      <div className="flex bg-soph-deep border border-soph-border p-1 rounded-xl justify-between items-center max-w-md mx-auto">
        <button
          onClick={() => setActiveSubTab("verses")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === "verses"
              ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
              : "text-soph-text-secondary hover:text-soph-gold"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          সংরক্ষিত আয়াত ({savedVerses.length})
        </button>
        <button
          onClick={() => setActiveSubTab("hadiths")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === "hadiths"
              ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
              : "text-soph-text-secondary hover:text-soph-gold"
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          সংরক্ষিত হাদীস ({savedHadiths.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* SAVED VERSES */}
        {activeSubTab === "verses" && (
          <motion.div
            key="verses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {savedVerses.length === 0 ? (
              <div className="text-center py-16 bg-soph-card border border-soph-border rounded-3xl space-y-3 shadow-md">
                <Bookmark className="h-10 w-10 text-soph-text-secondary/40 mx-auto" />
                <p className="text-sm font-bold text-soph-text-secondary">কোনো আয়াত সংরক্ষণ করা হয়নি!</p>
                <p className="text-xs text-soph-text-secondary/60 max-w-xs mx-auto">
                  কুরআন পড়ার সময় যেকোনো আয়াতের পাশে থাকা বুকমার্ক আইকনটিতে ক্লিক করে আয়াতে কারীমা এখানে জমা করে রাখুন।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedVerses.map((verse, idx) => {
                  const copyKey = `verse-${verse.surahId}-${verse.verseNumber}`;
                  return (
                    <div
                      key={copyKey}
                      className="bg-soph-card border border-soph-border rounded-2xl p-6 hover:border-soph-gold/30 hover:shadow-lg transition-all duration-150 space-y-4 relative overflow-hidden"
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-center pb-2 border-b border-soph-border/45">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-soph-gold">
                            {verse.surahName} (সূরা নম্বর {verse.surahId}) : আয়াত {verse.verseNumber}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Go to Surah */}
                          <button
                            onClick={() => onGotoSurah(verse.surahId)}
                            className="p-1.5 bg-soph-deep hover:bg-soph-hover rounded-lg text-soph-gold text-[10px] font-bold flex items-center gap-1 border border-soph-border transition duration-150 cursor-pointer"
                            title="সূরাটিতে গিয়ে পূর্ণ তাফসীর পড়ুন"
                          >
                            <span>সূরা পড়ুন</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          
                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(`${verse.ar}\n\nঅর্থ: ${verse.bn} (${verse.surahName}: ${verse.verseNumber})`, copyKey)}
                            className="p-1.5 hover:bg-soph-hover rounded-lg text-soph-text-secondary hover:text-soph-gold border border-transparent hover:border-soph-border transition duration-150 cursor-pointer"
                            title="কপি করুন"
                          >
                            {copiedKey === copyKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Quick Remove */}
                          <button
                            onClick={() => onRemoveVerse(verse.surahId, verse.verseNumber)}
                            className="p-1.5 hover:bg-red-950/30 rounded-lg text-soph-text-secondary hover:text-red-400 border border-transparent hover:border-red-900/40 transition duration-150 cursor-pointer"
                            title="সংরক্ষণ থেকে বাদ দিন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Arabic Verse */}
                      <div className="font-serif text-2xl text-right text-soph-text-primary font-bold dir-rtl leading-loose select-all">
                        {verse.ar}
                      </div>

                      {/* Meaning Text */}
                      <div className="text-soph-text-primary text-sm leading-relaxed border-l-2 border-soph-gold bg-soph-deep/30 pl-4 py-2.5 rounded-r-xl">
                        <span className="text-[10px] font-bold text-soph-gold block mb-1">বাংলা অর্থ:</span>
                        {verse.bn}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* SAVED HADITHS */}
        {activeSubTab === "hadiths" && (
          <motion.div
            key="hadiths"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {savedHadiths.length === 0 ? (
              <div className="text-center py-16 bg-soph-card border border-soph-border rounded-3xl space-y-3 shadow-md">
                <Bookmark className="h-10 w-10 text-soph-text-secondary/40 mx-auto" />
                <p className="text-sm font-bold text-soph-text-secondary">কোনো হাদীস স্মরণীয় করা হয়নি!</p>
                <p className="text-xs text-soph-text-secondary/60 max-w-xs mx-auto">
                  হাদীস পড়ার সময় যেকোনো হাদীসের পাশে থাকা বুকমার্ক আইকনটিতে ক্লিক করে মূল্যবান বাণীটি সংরক্ষণ করুন।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedHadiths.map((hadith, idx) => {
                  const copyKey = `hadith-${hadith.id}`;
                  return (
                    <div
                      key={hadith.id}
                      className="bg-soph-card border border-soph-border rounded-2xl p-6 hover:border-soph-gold/30 hover:shadow-lg transition-all duration-150 space-y-4 relative overflow-hidden"
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-center pb-2 border-b border-soph-border/45">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-soph-gold">
                            {hadith.book}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Go to Hadith Page */}
                          <button
                            onClick={onGotoHadith}
                            className="p-1.5 bg-soph-deep hover:bg-soph-hover rounded-lg text-soph-gold text-[10px] font-bold flex items-center gap-1 border border-soph-border transition duration-150 cursor-pointer"
                            title="হাদীস পেজে ফিরে যান"
                          >
                            <span>হাদীস সমগ্রে যান</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>

                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(`${hadith.ar}\n\n${hadith.narrator || ""}\n\nঅর্থ: ${hadith.bn} (${hadith.book})`, copyKey)}
                            className="p-1.5 hover:bg-soph-hover rounded-lg text-soph-text-secondary hover:text-soph-gold border border-transparent hover:border-soph-border transition duration-150 cursor-pointer"
                            title="কপি করুন"
                          >
                            {copiedKey === copyKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Quick Remove */}
                          <button
                            onClick={() => onRemoveHadith(hadith.id)}
                            className="p-1.5 hover:bg-red-950/30 rounded-lg text-soph-text-secondary hover:text-red-400 border border-transparent hover:border-red-900/40 transition duration-150 cursor-pointer"
                            title="সংরক্ষণ থেকে বাদ দিন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Header details if present */}
                      {hadith.chapter && (
                        <p className="text-[10px] text-soph-text-secondary font-semibold">
                          অধ্যায়: {hadith.chapter}
                        </p>
                      )}

                      {/* Arabic Hadith */}
                      <div className="font-serif text-xl md:text-2xl text-right text-soph-text-primary font-bold dir-rtl leading-relaxed select-all">
                        {hadith.ar}
                      </div>

                      {/* Narrator */}
                      {hadith.narrator && (
                        <div className="text-xs font-semibold text-soph-gold flex items-center gap-1.5">
                          <Award className="h-4 w-4 shrink-0" /> {hadith.narrator}
                        </div>
                      )}

                      {/* Meaning Text */}
                      <div className="text-soph-text-primary text-sm leading-relaxed border-l-2 border-soph-gold bg-soph-deep/30 pl-4 py-2.5 rounded-r-xl">
                        <span className="text-[10px] font-bold text-soph-gold block mb-1">হাদীসের অর্থ:</span>
                        {hadith.bn}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
