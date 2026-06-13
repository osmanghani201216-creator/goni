import React, { useState } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Award, 
  CheckCheck, 
  BookOpen, 
  Bookmark, 
  Layers, 
  ChevronRight, 
  TrendingUp, 
  Trophy,
  Search,
  Check,
  Compass,
  ArrowRight,
  User,
  Trash2,
  Clock,
  Calendar,
  Globe,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ALL_SURAS } from "../data.ts";
import { db, handleFirestoreError, OperationType } from "../lib/firebase.ts";
import { collection, query, orderBy, limit, getDocs, setDoc, doc, getDoc, getCountFromServer, where } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";

const toBengaliNumerals = (num: number | string): string => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num
    .toString()
    .split("")
    .map((digit) => {
      const idx = parseInt(digit, 10);
      return isNaN(idx) ? digit : banglaDigits[idx];
    })
    .join("");
};

const COMMON_MEANINGS = [
  "বকনা-বাছুর", "ইমরানের পরিবার", "খাদ্য পরিবেশিত দস্তরখান", "গৃহপালিত পশু",
  "যুদ্ধলব্ধ সম্পদ", "গুহা", "মহিমান্বিত রাত", "মানুষ", "ভোরের আলো",
  "একনিষ্ঠতা", "নিশ্চিত ঘটনা", "রাজত্ব", "মহাসংবাদ", "ভোর", "সূর্য",
  "রাত", "উষাকাল", "মৌমাছি", "পিঁপড়া", "মাকড়সা", "নবী ইউসুফ (আঃ)"
];

const SPECIAL_SURAH_QUESTIONS: Record<number, { q: string; options: string[]; correctAnswerIndex: number; explanation: string; }[]> = {
  1: [ // Al-Fatihah
    {
      q: "মূল কিতাব বা 'উম্মুল কুরআন' (Mother of the Book) বলা হয় কোন পবিত্র সূরাকে?",
      options: ["সূরা আল-বাকারাহ", "সূরা আল-ফাতিহা", "সূরা ইয়াসীন", "সূরা আল-ইখলাস"],
      correctAnswerIndex: 1,
      explanation: "সূরা আল-ফাতিহাকে 'উম্মুল কুরআন' (কুরআনের মা) বলা হয় কারণ এতে সম্পূর্ণ কুরআনের মৌলিক শিক্ষার সারসংক্ষেপ নিহিত রয়েছে।"
    },
    {
      q: "সূরা আল-ফাতিহাতে সর্বমোট কতটি আয়াত রয়েছে?",
      options: ["৫টি আয়াত", "৬টি আয়াত", "৭টি আয়াত", "৮টি আয়াত"],
      correctAnswerIndex: 2,
      explanation: "সূরা আল-ফাতিহাতে মোট ৭টি আয়াত রয়েছে। একে ‘সাবআ মাসানী’ বা বারবার পঠিত সাতটি আয়াতও বলা হয়।"
    },
    {
      q: "সালাত বা নামাজের প্রতিটি রাকাতে কোন সূরাটি পাঠ করা রুকন বা অবশ্যকরণীয়?",
      options: ["সূরা আল-ফাতিহা", "সূরা আর-রহমান", "সূরা আল-ইখলাস", "সূরা আন-নাস"],
      correctAnswerIndex: 0,
      explanation: "রাসূলুল্লাহ (সাঃ) বলেছেন, যে ব্যক্তি সূরা আল-ফাতিহা পড়ল না তার সালাত লভ্য হবে না। তাই এটি নামাজের প্রতিটি রাকাতে অবশ্যকরণীয় ও ফরজ কাজ।"
    }
  ],
  2: [ // Al-Baqarah
    {
      q: "পবিত্র কুরআনের সবচেয়ে দীর্ঘতম আয়াত 'আয়াতুল কুরসী' কোন সূয়ায় অবস্থিত?",
      options: ["সূরা আলে ইমরান", "সূরা আল-বাকারাহ", "সূরা আল-আনআম", "সূরা ইউনুস"],
      correctAnswerIndex: 1,
      explanation: "আয়াতুল কুরসী হলো পবিত্র কুরআনের ২য় সূরা 'আল-বাকারাহ'-এর ২৫৫ নম্বর আয়াত, যার ফজিলত অত্যন্ত অপরিসীম।"
    },
    {
      q: "'আল-বাকারাহ' शब्दটির মূল অর্থ কী?",
      options: ["মৌমাছি", "পিঁপড়া", "বকনা-বাছুর বা গাভী", "মহিলা"],
      correctAnswerIndex: 2,
      explanation: "আল-বাকারাহ শব্দটির অর্থ 'গাভী' বা 'বকনা-বাছুর'। বনী ইসরাঈলের গাভী কুরবানি সংক্রান্ত অলৌকিক ঘটনার প্রেক্ষিতে এই নামকরণ।"
    },
    {
      q: "রাসূলুল্লাহ্ (সাঃ) শয়তানের অনিষ্ট থেকে বাঁচতে কোন সূরাটি ঘরে বেশি বেশি তিলাওয়াত করতে বলেছেন?",
      options: ["সূরা আল-বাকারাহ", "সূরা আর-রহমান", "সূরা আল-কাহফ", "সূরা ইয়াসীন"],
      correctAnswerIndex: 0,
      explanation: "হাদীসে এসেছে, যে ঘরে সূরা আল-বাকারাহ পাঠ করা হয়, সে ঘর থেকে শয়তান পলায়ন করে।"
    }
  ],
  3: [ // Ali 'Imran
    {
      q: "সূরা আলে ইমরানের 'আলে ইমরান' অংশটির অর্থ কী?",
      options: ["ইমরানের পরিবার", "ইমরানের বাগান", "ইমরানের অনুসারী", "ইমরানের স্বপ্ন"],
      correctAnswerIndex: 0,
      explanation: "আলে ইমরান মানে 'ইমরানের পরিবার'। এতে হযরত মারইয়াম (আঃ) এবং ঈসা (আঃ)-এর নানার বংশধর ও পরিবারের পুণ্যময় আলোচনা রয়েছে।"
    },
    {
      q: "পবিত্র কুরআনের কোন সূরায় ওহুদ যুদ্ধের ঘটনা এবং মুসলিমদের সাময়িক বিপর্যয় ও বিজয়ের কারণ গভীরভাবে বিশ্লেষণ করা হয়েছে?",
      options: ["সূরা আল-বাকারাহ", "সূরা আলে ইমরান", "সূরা আল-আনফাল", "সূরা আত-তাওবাহ"],
      correctAnswerIndex: 1,
      explanation: "সূরা আলে ইমরানের মধ্য ও শেষাংশে ওহুদ যুদ্ধের প্রেক্ষাপট, মুসলিমদের ধৈর্য ও আল্লাহর অফুরন্ত তাওয়াক্কুলের চমৎকার বর্ণনা রয়েছে।"
    }
  ],
  18: [ // Al-Kahf
    {
      q: "দাজ্জালের ফিতনা থেকে বাঁচতে রাসূলুল্লাহ (সাঃ) কোন সূরার প্রথম ১০ আয়াত মুখস্থ করার নির্দেশ দিয়েছেন?",
      options: ["সূরা ইয়াসীন", "সূরা আল-কাহফ", "সূরা আল-মুলক", "সূরা আর-রহমান"],
      correctAnswerIndex: 1,
      explanation: "হাদীসে এসেছে, যে ব্যক্তি সূরা আল-কাহফের প্রথম ১০ আয়াত মুখস্থ করবে সে দাজ্জালের ভয়াবহ ফিতনা থেকে নিরাপদ থাকবে।"
    },
    {
      q: "সূরা আল-কাহফে কোন যুবকদের অলৌকিক কাহিনী বর্ণিত হয়েছে যারা ঈমান রক্ষার্থে গুহায় দীর্ঘ ৩০৯ বছর ঘুমিয়ে ছিলেন?",
      options: ["আসহাবে কাহফ", "আসহাবে সাবত", "আসহাবে উখদুদ", "হেরা গুহাবাসী"],
      correctAnswerIndex: 0,
      explanation: "আসহাবে কাহফ (Guha-vasi) একদল ঈমানদার সৎ যুবকের কাহিনী, যারা মূর্তিপূজারী রাজার হাত থেকে ঈমান বাঁচাতে গুহায় আশ্রয় নিয়েছিলেন।"
    },
    {
      q: "হযরত মূসা (আঃ) এর সঙ্গে কোন বিশেষ জ্ঞানসম্পন্ন আলৌকিক চরিত্রের মানুষের সফর কাহিনী সূরা কাহফে এসেছে?",
      options: ["হযরত খিযির (আঃ)", "হযরত শুয়ائب (আঃ)", "হযরত লোকমান (আঃ)", "হযরত ইউসুফ (আঃ)"],
      correctAnswerIndex: 0,
      explanation: "সূরা কাহফে হযরত মূসা (আঃ) ও খোদায়ী আত্মিক সুগভীর জ্ঞানসম্পন্ন হযরত খিযির (আঃ)-এর শিক্ষণীয় সফর বর্ণিত হয়েছে।"
    }
  ],
  36: [ // Ya-Sin
    {
      q: "পবিত্র কুরআনের হৃদপিণ্ড বা 'অন্টার' (Heart of Quran) বলা হয় কোন সূরাকে?",
      options: ["সূরা আল-ফাতিহা", "সূরা ইয়াসীন", "সূরা আর-রহমান", "সূরা আল-ইখলাস"],
      correctAnswerIndex: 1,
      explanation: "হাদীস অনুযায়ী সূরা ইয়াসীনকে পবিত্র কুরআনের হৃদয় বা অন্তর বলা হয় কারণ এতে আখেরাত ও তাওহীদের চূড়ান্ত বয়ান সুনিপুণভাবে বর্ণিত হয়েছে।"
    },
    {
      q: "সূরা ইয়াসীন পবিত্র কুরআনের ৩৬তম সূরা এবং এর মোট আয়াত সংখ্যা কতটি?",
      options: ["৭৮টি", "৮৩টি", "৯৯টি", "১১০টি"],
      correctAnswerIndex: 1,
      explanation: "সূরা ইয়াসীন আল-কুরআনের ৩৬তম সূরা এবং এর সর্বমোট আয়াত সংখ্যা ৮৩টি।"
    }
  ],
  55: [ // Ar-Rahman
    {
      q: "সূরা আর-রহমানের কোন আয়াতটি বারবার (৩১ বার) পুনরাবৃত্তি করা হয়েছে?",
      options: [
        "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
        "إِنَّا أَنْজَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ",
        "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
        "قُلْ هُوَ اللَّهُ أَحَدٌ"
      ],
      correctAnswerIndex: 0,
      explanation: "সূরা আর-রহমানে 'তোমরা তোমাদের প্রতিপালকের কোন কোন নেয়ামত অস্বীকার করবে?' আয়াতটি ৩১ বার এসে আল্লাহর অনুগ্রহ স্মরণ করায়।"
    },
    {
      q: "সূরা আর-রহমান প্রধানত পবিত্র কুরআনের কত নম্বর পারায় রয়েছে?",
      options: ["২৫ নম্বর পারা", "২৬ নম্বর পারা", "২৭ নম্বর পারা", "৩০ নম্বর পারা"],
      correctAnswerIndex: 2,
      explanation: "আর-রহমান পবিত্র কুরআনের ২৭ নম্বর পারায় অবস্থিত অত্যন্ত প্রভাবশালী ও সুমধুর এক সূরা।"
    }
  ],
  56: [ // Al-Waqi'ah
    {
      q: "কোন সূরাটি প্রতি রাতে পাঠ করলে দারিদ্র্য স্পর্শ করবে না বলে সুনান গ্রন্থে সুসংবাদ এসেছে?",
      options: ["সূরা ইয়াসীন", "সূরা আল-ওয়াকিয়াহ", "সূরা আর-রহমান", "সূরা আল-হাদীদ"],
      correctAnswerIndex: 1,
      explanation: "হাদীসে বর্ণিত আছে, যে ব্যক্তি প্রতি রাতে সূরা ওয়াকিয়াহ তিলাওয়াত করবে, সে কখনো অনাহারে বা দারিদ্র্যে ভুগবে না।"
    },
    {
      q: "'আল-ওয়াকিয়াহ' শব্দটির বাংলা অর্থ কী?",
      options: ["মহাসংবাদ", "নিশ্চিত অবধারিত ঘটনা", "বজ্রপাত", "লোহা"],
      correctAnswerIndex: 1,
      explanation: "'আল-ওয়াকিয়াহ' শব্দের অর্থ মহাপ্রলয় বা নিশ্চিত অবধারিত মহা ঘটনা (কেয়ামত)।"
    }
  ],
  67: [ // Al-Mulk
    {
      q: "কুরআনের কোন ৩০ আয়াতের সূরাটি পাঠকারীর জন্য সুপারিশ করবে যতক্ষণ না তাকে কবরের আজাব থেকে ক্ষমা ও মুক্তি দেওয়া হয়?",
      options: ["সূরা আল-ওয়াকিয়াহ", "সূরা সাজদাহ", "সূরা আল-মুলক", "সূরা আল-ইনসান"],
      correctAnswerIndex: 2,
      explanation: "রাসূলুল্লাহ (সাঃ) বলেন, 'কুরআনে ৩০ আয়াতের একটি সূরা আছে, যা তার পাঠকারীর জন্য সুপারিশ করবে যতক্ষণ না তাকে কবরের আযাব হতে ক্ষমা করা হয়, আর তা হলো সূরা মুলক।'"
    },
    {
      q: "'আল-মুলক' শব্দের অর্থ কী?",
      options: ["রাজত্ব বা সার্বভৌমত্ব", "পাহাড়", "কলম", "বজ্র"],
      correctAnswerIndex: 0,
      explanation: "'আল-মুলক' শব্দের অর্থ হলো রাজত্ব, কর্তৃত্ব বা আল্লাহর সার্বভৌম ক্ষমতা।"
    }
  ],
  112: [ // Al-Ikhlas
    {
      q: "কোন পবিত্র সূরাটি একবার পাঠ করলে কুরআনের এক-তৃতীয়াংশ (তিন ভাগের এক ভাগ) খতমের সওয়াব অর্জিত হয়?",
      options: ["সূরা আল-ফাতিহা", "সূরা আল-ইখলাস", "সূরা আল-কাফিরুন", "সূরা আল-ফালাক"],
      correctAnswerIndex: 1,
      explanation: "হাদীস অনুসারে সূরা আল-ইখলাসে আল্লাহর সুউচ্চ সুনিপুণ একত্ববাদ (তাওহীদ) ঘোষিত হওয়ায় একে ৩ ভাগের ১ ভাগ কুরআনের সমতুল্য মনে করা হয়।"
    }
  ]
};

const DUPLICATE_QUIZ_QUESTIONS = [
  {
    id: 1,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের কোন সূরাকে 'কুরআনের অন্তর' (Heart of Quran) বলা হয়?",
    options: ["সূরা আল-ফাতিহা", "সূরা ইয়াসীন", "সূরা আর-রহমান", "সূরা আল-ইখলাস"],
    correctAnswerIndex: 1,
    explanation: "হাদীস অনুযায়ী সূরা ইয়াসীনকে পবিত্র কুরআনের হৃদয় বা অন্তর বলা হয়েছে, যা গভীর আধ্যাত্মিক অর্থ ও তাৎপর্য বহন করে।",
    difficulty: "beginner"
  },
  {
    id: 2,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের সবচেয়ে বড় সূরা কোনটি এবং এতে কতটি আয়াত রয়েছে?",
    options: ["সূরা আল-ইমরান (২০০ আয়াত)", "সূরা আল-আনাম (১৬৫ আয়াত)", "সূরা আল-বাকারাহ (২৮৬ আয়াত)", "সূরা আন-নিসা (১৭৬ আয়াত)"],
    correctAnswerIndex: 2,
    explanation: "সূরা আল-বাকারাহ্ পবিত্র কুরআনের ২য় এবং সবচেয়ে দীর্ঘতম সূরা, যাতে মোট ২৮৬টি আয়াত এবং ৪০টি রুকু রয়েছে।",
    difficulty: "beginner"
  },
  {
    id: 3,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "কোন সূরার শুরুতে কোনো 'বিসমিল্লাহ' নেই?",
    options: ["সূরা আত-তাওবাহ্", "সূরা আন-নামল", "সূরা আল-কাহফ", "সূরা ইউনুস"],
    correctAnswerIndex: 0,
    explanation: "সূরা আত-তাওবাহ্ এর শুরুতে কোনো বিসমিল্লাহ নেই। তবে সূরা আন-নামল এর ৩০ নম্বর আয়াতে আরেকটি অতিরিক্ত বিসমিল্লাহ রয়েছে।",
    difficulty: "intermediate"
  },
  {
    id: 4,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "বিশ্বের অন্যতম সুপরিচিত সুরা 'সূরা আল-কাহফ' প্রধানত কত নম্বর পারায় অবস্থিত?",
    options: ["১২ ও ১৩ নম্বর পারা", "১৫ ও ১৬ নম্বর পারা", "১৮ ও ১৯ নম্বর পারা", "২৯ ও ৩০ নম্বর পারা"],
    correctAnswerIndex: 1,
    explanation: "সূরা আল-কাহফ পবিত্র কুরআনের ১৫ এবং ১৬ নম্বর পারায় অবস্থিত। জুমার দিনে এই সূরা পাঠ করার বিশেষ ফজিলত রয়েছে।",
    difficulty: "advanced"
  },
  {
    id: 5,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "পবিত্র কুরআনের সর্বশেষ পারা (৩০তম পারা) বা 'আমপারা' মোট কতটি সূরা নিয়ে গঠিত?",
    options: ["৩০টি সূরা", "৩৪টি সূরা", "৩৭টি সূরা", "৪০টি সূরা"],
    correctAnswerIndex: 2,
    explanation: "কুরআনের ৩০তম পারায় বা জুয আম্মা-তে তুলনামূলক ছোট সাইজের ৩৭টি সংক্ষিপ্ত সূরা সংকলিত রয়েছে।",
    difficulty: "intermediate"
  },
  {
    id: 6,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "পবিত্র কুরআন প্রথমত কোন সম্মানিত ফেরেশতার মাধ্যমে রাসূলুল্লাহ (সাঃ) এর নিকট অবতীর্ণ হয়েছিল?",
    options: ["ফেরেশতা জিবরাঈল (আঃ)", "ফেরেশতা মিকাঈল (আঃ)", "ফেরেশতা ইসরাফিল (আঃ)", "ফেরেশতা আজরাঈল (আঃ)"],
    correctAnswerIndex: 0,
    explanation: "আল্লাহ তাআলার নির্দেশে ওহী তথা আসমানী কিতাব পৃথিবীতে পৌঁছানোর পবিত্র দায়িত্ব পালন করেছেন হযরত জিবরাঈল (আঃ)।",
    difficulty: "beginner"
  },
  {
    id: 7,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "কোন পবিত্র রাতে সর্বপ্রথম পবিত্র আল-কুরআন অবতীর্ণ হওয়া শুরু হয়?",
    options: ["লাইলাতুল মেরাজ", "লাইলাতুল কদর", "লাইলাতুল বারাত", "আরাফাতের দিন"],
    correctAnswerIndex: 1,
    explanation: "রমজান মাসের এক মহিমান্বিত رজনী 'লাইলাতুল কদরে' সর্বপ্রথম হেরা গুহায় মহাগ্রন্থ আল-কুরআন নাজিল হয়।",
    difficulty: "beginner"
  },
  {
    id: 8,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের কোন সূরাটি পাঠ করলে কবরের আযাব থেকে মুক্তি পাওয়া যায় বলে হাদীসে এসেছে?",
    options: ["সূরা আস-সাজদাহ্", "সূরা আল-ওয়াকিয়াহ্", "সূরা আল-মুলক", "সূরা আর-রহমান"],
    correctAnswerIndex: 2,
    explanation: "রাসূলুল্লাহ (সাঃ) বলেছেন, কুরআনের ৩০ আয়াতের একটি সূরা এমন আছে যা পাঠকারীর জন্য সুপারিশ করবে যতক্ষণ না তাকে ক্ষমা করা হয়, আর সেটি হলো সূরা আল-মুলক।",
    difficulty: "intermediate"
  },
  {
    id: 9,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "পবিত্র কুরআনের প্রথম পারার (১ম জুয) প্রথম আয়াতটি কোন সূরা দিয়ে শুরু হয়েছে?",
    options: ["সূরা আল-বাকারাহ্", "সূরা আল-ফাতিহা", "সূরা আল-ইমরান", "সূরা আন-নাস"],
    correctAnswerIndex: 1,
    explanation: "পবিত্র কুরআনের ১ নম্বর পারার একদম শুরুতে সূরা আল-ফাতিহা রয়েছে, যা কুরআনের ভূমিকা স্বরূপ এবং নামাজের প্রতি রাকাতে পঠিত হয়।",
    difficulty: "beginner"
  },
  {
    id: 10,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "রাসূলুল্লাহ (সাঃ) এর ওপর পূর্ণাঙ্গ কুরআন অবতীর্ণ হতে মোট কত বছর লেগেছিল?",
    options: ["১০ বছর", "১৫ বছর", "২৩ বছর", "৪০ বছর"],
    correctAnswerIndex: 2,
    explanation: "রাসূলুল্লাহ (সাঃ) এর ৪০ বছর বয়সে নবুওয়াত পাওয়ার পর থেকে দীর্ঘ প্রায় ২৩ বছর ধরে সময় ও প্রেক্ষাপটের প্রয়োজনে ধাপে ধাপে কুরআন অবতীর্ণ হয়।",
    difficulty: "intermediate"
  },
  {
    id: 11,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের কোন সূরাতে দুইবার 'বিসমিল্লাহ' রয়েছে?",
    options: ["সূরা আন-নামল", "সূরা আল-ফাতিহা", "সূরা আল-কদর", "সূরা ইয়াছিন"],
    correctAnswerIndex: 0,
    explanation: "সূরা আন-নামল এর প্রথমে একবার বিসমিল্লাহ রয়েছে এবং সূরার ৩০ নম্বর আয়াতে হযরত সুলায়মান (আঃ) এর চিঠির বিবরণে আরেকবার বিসমিল্লাহ এসেছে।",
    difficulty: "intermediate"
  },
  {
    id: 12,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "কুরআনের প্রথম হাফেজ ও সংকলন কমিটির প্রধান হিসেবে কোন সাহাবী দায়িত্ব পালন করেছিলেন?",
    options: ["হযরত আবু বকর (রাঃ)", "হযরত যায়েদ ইবনে সাবিত (রাঃ)", "হযরত ওসমান বিন আফফান (রাঃ)", "হযরত আলী (রাঃ)"],
    correctAnswerIndex: 1,
    explanation: "রাসূলুল্লাহ (সাঃ) এর প্রধান ওহী লেখক হযরত যায়েদ ইবনে সাবিত (রাঃ) খলিফাদের আমলে কুরআন প্রথম গ্রন্থাকারে করার কমিটির প্রধান দায়িত্ব পালন করেন।",
    difficulty: "advanced"
  },
  {
    id: 13,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "সূরা আর-রহমানের কোন বিখ্যাত আয়াতটি বারবার পুনরাবৃত্তি করে বান্দাকে আল্লাহর নেয়ামত স্মরণ করানো হয়েছে?",
    options: [
      "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
      "إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ",
      "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      "قُلْ هُوَ اللَّهُ أَحَدٌ"
    ],
    correctAnswerIndex: 0,
    explanation: "সূরা আর-রহমানে 'Fabi-ayyi ala-i Rabbikuma tukadhdhiban' (অতএব তোমরা তোমাদের প্রতিপালকের কোন কোন নেয়ামতকে অস্বীকার করবে?) আয়াতটি ৩১ বার এসেছে।",
    difficulty: "intermediate"
  },
  {
    id: 14,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "কুরআন মজিদের ১৫ নম্বর জুয বা পারার একদম প্রথম সুরার নাম কি?",
    options: ["সূরা ইউনুস", "সূরা বনী ইসরাঈল (আল-ইসরা)", "সূরা ইউসুফ", "সূরা আর-রাদ"],
    correctAnswerIndex: 1,
    explanation: "১৫ নম্বর পারা শুরু হয়েছে সূরা বনী ইসরাঈল (আল-ইসরা) দিয়ে, যেখানে মিরাজের মহিমান্বিত ভ্রমণের বিস্তারিত বর্ণনা রয়েছে।",
    difficulty: "advanced"
  },
  {
    id: 15,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "পবিত্র কুরআনে সবচেয়ে বেশি কোন নবীর নাম উল্লেখ করা হয়েছে?",
    options: ["হযরত মুহাম্মদ (সাঃ)", "হযরত ইব্রাহিম (আঃ)", "হযরত মুসা (আঃ)", "হযরত ঈসা (আঃ)"],
    correctAnswerIndex: 2,
    explanation: "পবিত্র আল-কুরআনের বিভিন্ন সূরায় মোট ১৩৬ বার হযরত মুসা (আঃ)-এর পবিত্র নাম ও জীবনী অত্যন্ত বিস্তারিত আলোচনা করা হয়েছে।",
    difficulty: "advanced"
  }
];

function generateQuestionsForSurah(surah: any, difficulty: "beginner" | "intermediate" | "advanced" = "beginner") {
  const ayatNum = surah.ayat || surah.ayahs?.length || 0;
  const correctOption = toBengaliNumerals(ayatNum) + "টি আয়াত";
  const op1 = toBengaliNumerals(Math.max(1, ayatNum - 5)) + "টি আয়াত";
  const op2 = toBengaliNumerals(ayatNum + 7) + "টি আয়াত";
  const op3 = toBengaliNumerals(ayatNum + 15) + "টি আয়াত";
  const ayatOptions = [correctOption, op1, op2, op3];

  const correctMeaning = surah.mn || "কোন তথ্য নেই";
  const meaningOptions = [
    correctMeaning,
    "মহিমান্বিত পাহাড়",
    "শান্তিময় শহর",
    "ভোরের আলো"
  ];

  const questions = [
    {
      q: `সূরা ${surah.bn}-এ সর্বমোট কতটি আয়াত রয়েছে? ${difficulty === "advanced" ? "(উচ্চ নির্ভুলতা)" : ""}`,
      options: ayatOptions,
      correctAnswerIndex: 0,
      explanation: `সূরা ${surah.bn} এ সর্বমোট আল্লাহর তরফ থেকে নাজিল হওয়া ${ayatNum} টি বরকতপূর্ণ আয়াত রয়েছে।`
    },
    {
      q: `সূরা ${surah.bn} অবতীর্ণ হওয়ার সময়কাল ও ভৌগোলিক প্রেক্ষিতে কোন ধরনের সূরা?`,
      options: [
        surah.type === 'makki' ? 'মাক্কী সূরা (হিজরতের পূর্বে মক্কায় অবতীর্ণ)' : 'মাদানী সূরা (হিজরতের পরে মদীনায় অবতীর্ণ)',
        surah.type === 'makki' ? 'মাদানী সূরা (হিজরতের পরে মদীনায় অবতীর্ণ)' : 'মাক্কী সূরা (হিজরতের পূর্বে মক্কায় অবতীর্ণ)'
      ],
      correctAnswerIndex: 0,
      explanation: `ঐতিহাসিক ও তাফসীর গ্রন্থ মতে, সূরা ${surah.bn} একটি পবিত্র ${surah.type === 'makki' ? 'মাক্কী' : 'মাদানী'} সূরা।`
    },
    {
      q: `সূরা '${surah.bn}'-এর আরবি নামকরণের বাংলা অর্থ বা ভাবার্থ কী?`,
      options: meaningOptions,
      correctAnswerIndex: 0,
      explanation: `পবিত্র আল-কুরআনের সূরা ${surah.bn}-এর নামের বাংলা শাব্দিক ভাবার্থ বা মূল অনুবাদ হলো ‘${surah.mn}’।`
    },
    {
      q: `সূরা ${surah.bn} আল-কুরআনের কততম বা ক্রমিক নম্বর সূরা?`,
      options: [
        toBengaliNumerals(surah.n) + "তম সূরা",
        toBengaliNumerals(surah.n + 2) + "তম সূরা",
        toBengaliNumerals(Math.max(1, surah.n - 1)) + "তম সূরা",
        toBengaliNumerals(surah.n + 5) + "তম সূরা"
      ],
      correctAnswerIndex: 0,
      explanation: `পবিত্র কুরআনের সূচিপত্র ও ক্রমবিন্যাস অনুযায়ী সূরা ${surah.bn} হলো ${toBengaliNumerals(surah.n)} নম্বর পবিত্র সূরা।`
    }
  ];

  let selectedQs = questions;
  if (difficulty === "beginner") {
    selectedQs = [questions[2], questions[3]];
  } else if (difficulty === "intermediate") {
    selectedQs = [questions[0], questions[2], questions[3]];
  }

  return selectedQs.map(q => {
    const correctVal = q.options[q.correctAnswerIndex];
    const uniqueOptions = Array.from(new Set(q.options));
    const shuffled = [...uniqueOptions].sort(() => Math.random() - 0.5);
    const newCorrectIdx = shuffled.indexOf(correctVal);
    
    return {
      q: q.q,
      options: shuffled,
      correctAnswerIndex: newCorrectIdx >= 0 ? newCorrectIdx : 0,
      explanation: q.explanation
    };
  });
}

function getQuestionsForSurah(surah: any, difficulty: "beginner" | "intermediate" | "advanced" = "beginner") {
  let list = [];
  if (SPECIAL_SURAH_QUESTIONS[surah.n]) {
    list = SPECIAL_SURAH_QUESTIONS[surah.n].map(q => ({
      q: q.q,
      options: [...q.options],
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation
    }));
  } else {
    return generateQuestionsForSurah(surah, difficulty);
  }

  let selectedList = list;
  if (difficulty === "beginner" && list.length > 1) {
    selectedList = list.slice(0, Math.min(2, list.length));
  } else if (difficulty === "intermediate" && list.length > 2) {
    selectedList = list.slice(0, Math.min(3, list.length));
  }

  // Shuffle option indices for the predefined questions as well
  return selectedList.map(q => {
    const correctVal = q.options[q.correctAnswerIndex];
    const uniqueOptions = Array.from(new Set(q.options));
    const shuffledOptions = [...uniqueOptions].sort(() => Math.random() - 0.5);
    const newCorrectIdx = shuffledOptions.indexOf(correctVal);
    return {
      q: q.q,
      options: shuffledOptions,
      correctAnswerIndex: newCorrectIdx >= 0 ? newCorrectIdx : 0,
      explanation: q.explanation
    };
  });
}

interface QuizQuestion {
  id: number;
  category: "surah" | "juz" | "facts";
  categoryBn: string;
  q: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
}

interface LeaderboardEntry {
  id: string;
  surahNo: number;
  surahName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timestamp: number;
  playerName: string;
}

interface MCQLeaderboardEntry {
  id: string;
  category: string;
  categoryBn: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timestamp: number;
  playerName: string;
}


const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের কোন সূরাকে 'কুরআনের অন্তর' (Heart of Quran) বলা হয়?",
    options: ["সূরা আল-ফাতিহা", "সূরা ইয়াসীন", "সূরা আর-রহমান", "সূরা আল-ইখলাস"],
    correctAnswerIndex: 1,
    explanation: "হাদীস অনুযায়ী সূরা ইয়াসীনকে পবিত্র কুরআনের হৃদয় বা অন্তর বলা হয়েছে, যা গভীর আধ্যাত্মিক অর্থ ও তাৎপর্য বহন করে।"
  },
  {
    id: 2,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের সবচেয়ে বড় সূরা কোনটি এবং এতে কতটি আয়াত রয়েছে?",
    options: ["সূরা আল-ইমরান (২০০ আয়াত)", "সূরা আল-আনাম (১৬৫ আয়াত)", "সূরা আল-বাকারাহ (২৮৬ আয়াত)", "সূরা আন-নিসা (১৭৬ আয়াত)"],
    correctAnswerIndex: 2,
    explanation: "সূরা আল-বাকারাহ্ পবিত্র কুরআনের ২য় এবং সবচেয়ে দীর্ঘতম সূরা, যাতে মোট ২৮৬টি আয়াত এবং ৪০টি রুকু রয়েছে।"
  },
  {
    id: 3,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "কোন সূরার শুরুতে কোনো 'বিসমিল্লাহ' নেই?",
    options: ["সূরা আত-তাওবাহ্", "সূরা আন-নামল", "সূরা আল-কাহফ", "সূরা ইউনুস"],
    correctAnswerIndex: 0,
    explanation: "সূরা আত-তাওবাহ্ এর শুরুতে কোনো বিসমিল্লাহ নেই। তবে সূরা আন-নামল এর ৩০ নম্বর আয়াতে আরেকটি অতিরিক্ত বিসমিল্লাহ রয়েছে।"
  },
  {
    id: 4,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "বিশ্বের অন্যতম সুপরিচিত সুরা 'সূরা আল-কাহফ' প্রধানত কত নম্বর পারায় অবস্থিত?",
    options: ["১২ ও ১৩ নম্বর পারা", "১৫ ও ১৬ নম্বর পারা", "১৮ ও ১৯ নম্বর পারা", "২৯ ও ৩০ নম্বর পারা"],
    correctAnswerIndex: 1,
    explanation: "সূরা আল-কাহফ পবিত্র কুরআনের ১৫ এবং ১৬ নম্বর পারায় অবস্থিত। জুমার দিনে এই সূরা পাঠ করার বিশেষ ফজিলত রয়েছে।"
  },
  {
    id: 5,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "পবিত্র কুরআনের সর্বশেষ পারা (৩০তম পারা) বা 'আমপারা' মোট কতটি সূরা নিয়ে গঠিত?",
    options: ["৩০টি সূরা", "৩৪টি সূরা", "৩৭টি সূরা", "৪০টি সূরা"],
    correctAnswerIndex: 2,
    explanation: "কুরআনের ৩০তম পারায় বা জুয আম্মা-তে তুলনামূলক ছোট সাইজের ৩৭টি সংক্ষিপ্ত সূরা সংকলিত রয়েছে।"
  },
  {
    id: 6,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "পবিত্র কুরআন প্রথমত কোন সম্মানিত ফেরেশতার মাধ্যমে রাসূলুল্লাহ (সাঃ) এর নিকট অবতীর্ণ হয়েছিল?",
    options: ["ফেরেশতা জিবরাঈল (আঃ)", "ফেরেশতা মিকাঈল (আঃ)", "ফেরেশতা ইসরাফিল (আঃ)", "ফেরেশতা আজরাঈল (আঃ)"],
    correctAnswerIndex: 0,
    explanation: "আল্লাহ তাআলার নির্দেশে ওহী তথা আসমানী কিতাব পৃথিবীতে পৌঁছানোর পবিত্র দায়িত্ব পালন করেছেন হযরত জিবরাঈল (আঃ)।"
  },
  {
    id: 7,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "কোন পবিত্র রাতে সর্বপ্রথম পবিত্র আল-কুরআন অবতীর্ণ হওয়া শুরু হয়?",
    options: ["লাইলাতুল মেরাজ", "লাইলাতুল কদর", "লাইলাতুল বারাত", "আরাফাতের দিন"],
    correctAnswerIndex: 1,
    explanation: "রমজান মাসের এক মহিমান্বিত রজনী 'লাইলাতুল কদরে' সর্বপ্রথম হেরা গুহায় মহাগ্রন্থ আল-কুরআন নাজিল হয়।"
  },
  {
    id: 8,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের কোন সূরাটি পাঠ করলে কবরের আযাব থেকে মুক্তি পাওয়া যায় বলে হাদীসে এসেছে?",
    options: ["সূরা আস-সাজদাহ্", "সূরা আল-ওয়াকিয়াহ্", "সূরা আল-মুলক", "সূরা আর-রহমান"],
    correctAnswerIndex: 2,
    explanation: "রাসূলুল্লাহ (সাঃ) বলেছেন, কুরআনের ৩০ আয়াতের একটি সূরা এমন আছে যা পাঠকারীর জন্য সুপারিশ করবে যতক্ষণ না তাকে ক্ষমা করা হয়, আর সেটি হলো সূরা আল-মুলক।"
  },
  {
    id: 9,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "পবিত্র কুরআনের প্রথম পারার (১ম জুয) প্রথম আয়াতটি কোন সূরা দিয়ে শুরু হয়েছে?",
    options: ["সূরা আল-বাকারাহ্", "সূরা আল-ফাতিহা", "সূরা আল-ইমরান", "সূরা আন-নাস"],
    correctAnswerIndex: 1,
    explanation: "পবিত্র কুরআনের ১ নম্বর পারার একদম শুরুতে সূরা আল-ফাতিহা রয়েছে, যা কুরআনের ভূমিকা স্বরূপ এবং নামাজের প্রতি রাকাতে পঠিত হয়।"
  },
  {
    id: 10,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "রাসূলুল্লাহ (সাঃ) এর ওপর পূর্ণাঙ্গ কুরআন অবতীর্ণ হতে মোট কত বছর লেগেছিল?",
    options: ["১০ বছর", "১৫ বছর", "২৩ বছর", "৪০ বছর"],
    correctAnswerIndex: 2,
    explanation: "রাসূলুল্লাহ (সাঃ) এর ৪০ বছর বয়সে নবুওয়াত পাওয়ার পর থেকে দীর্ঘ প্রায় ২৩ বছর ধরে সময় ও প্রেক্ষাপটের প্রয়োজনে ধাপে ধাপে কুরআন অবতীর্ণ হয়।"
  },
  {
    id: 11,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "পবিত্র কুরআনের কোন সূরাতে দুইবার 'বিসমিল্লাহ' রয়েছে?",
    options: ["সূরা আন-নামল", "সূরা আল-ফাতিহা", "সূরা আল-কদর", "সূরা ইয়াছিন"],
    correctAnswerIndex: 0,
    explanation: "সূরা আন-নামল এর প্রথমে একবার বিসমিল্লাহ রয়েছে এবং সূরার ৩০ নম্বর আয়াতে হযরত সুলায়মান (আঃ) এর চিঠির বিবরণে আরেকবার বিসমিল্লাহ এসেছে।"
  },
  {
    id: 12,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "কুরআনের প্রথম হাফেজ ও সংকলন কমিটির প্রধান হিসেবে কোন সাহাবী দায়িত্ব পালন করেছিলেন?",
    options: ["হযরত আবু বকর (রাঃ)", "হযরত যায়েদ ইবনে সাবিত (রাঃ)", "হযরত ওসমান বিন আফফান (রাঃ)", "হযরত আলী (রাঃ)"],
    correctAnswerIndex: 1,
    explanation: "রাসূলুল্লাহ (সাঃ) এর প্রধান ওহী লেখক হযরত যায়েদ ইবনে সাবিত (রাঃ) খলিফাদের আমলে কুরআন প্রথম গ্রন্থাকারে করার কমিটির প্রধান দায়িত্ব পালন করেন।"
  },
  {
    id: 13,
    category: "surah",
    categoryBn: "সূরা পরিচিতি",
    q: "সূরা আর-রহমানের কোন বিখ্যাত আয়াতটি বারবার পুনরাবৃত্তি করে বান্দাকে আল্লাহর নেয়ামত স্মরণ করানো হয়েছে?",
    options: [
      "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
      "إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ",
      "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      "قُلْ هُوَ اللَّهُ أَحَدٌ"
    ],
    correctAnswerIndex: 0,
    explanation: "সূরা আর-রহমানে 'Fabi-ayyi ala-i Rabbikuma tukadhdhiban' (অতএব তোমরা তোমাদের প্রতিপালকের কোন কোন নেয়ামতকে অস্বীকার করবে?) আয়াতটি ৩১ বার এসেছে।"
  },
  {
    id: 14,
    category: "juz",
    categoryBn: "পারা ও জুয",
    q: "কুরআন মজিদের ১৫ নম্বর জুয বা পারার একদম প্রথম সুরার নাম কি?",
    options: ["সূরা ইউনুস", "সূরা বনী ইসরাঈল (আল-ইসরা)", "সূরা ইউসুফ", "সূরা আর-রাদ"],
    correctAnswerIndex: 1,
    explanation: "১৫ নম্বর পারা শুরু হয়েছে সূরা বনী ইসরাঈল (আল-ইসরা) দিয়ে, যেখানে মিরাজের মহিমান্বিত ভ্রমণের বিস্তারিত বর্ণনা রয়েছে।"
  },
  {
    id: 15,
    category: "facts",
    categoryBn: "ইসলামিক সাধারণ জ্ঞান",
    q: "পবিত্র কুরআনে সবচেয়ে বেশি কোন নবীর নাম উল্লেখ করা হয়েছে?",
    options: ["হযরত মুহাম্মদ (সাঃ)", "হযরত ইব্রাহিম (আঃ)", "হযরত মুসা (আঃ)", "হযরত ঈসা (আঃ)"],
    correctAnswerIndex: 2,
    explanation: "পবিত্র আল-কুরআনের বিভিন্ন সূরায় মোট ১৩৬ বার হযরত মুসা (আঃ)-এর পবিত্র নাম ও জীবনী অত্যন্ত বিস্তারিত আলোচনা করা হয়েছে।"
  }
];

interface QuranQuizProps {
  currentUser?: FirebaseUser | null;
}

interface GlobalLeaderboardEntry {
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  updatedAt: string;
}

export default function QuranQuiz({ currentUser }: QuranQuizProps) {
  const [currentMode, setCurrentMode] = useState<"quiz" | "flashcard" | "surah" | "leaderboard">("quiz");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Quiz specific states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answeredHistory, setAnsweredHistory] = useState<{questionId: number, isCorrect: boolean}[]>([]);

  // Flashcards state
  const [flippedCardId, setFlippedCardId] = useState<number | null>(null);

  // Surah Specific Quiz States
  const [selectedSurahIdx, setSelectedSurahIdx] = useState<number | null>(null);
  const [surahQuizStarted, setSurahQuizStarted] = useState(false);
  const [surahQuizQuestions, setSurahQuizQuestions] = useState<any[]>([]);
  const [surahQuizCurrentIdx, setSurahQuizCurrentIdx] = useState(0);
  const [surahSelectedAnswer, setSurahSelectedAnswer] = useState<number | null>(null);
  const [surahIsSubmitted, setSurahIsSubmitted] = useState(false);
  const [surahQuizScore, setSurahQuizScore] = useState(0);
  const [surahQuizCompleted, setSurahQuizCompleted] = useState(false);
  const [surahQuizHistory, setSurahQuizHistory] = useState<{ q: string; options: string[]; correctAnswerIndex: number; selectedAnswer: number | null; explanation: string; }[]>([]);
  const [surahSearchQuery, setSurahSearchQuery] = useState("");

  // Global Leaderboard states
  const [globalLeaderboard, setGlobalLeaderboard] = useState<GlobalLeaderboardEntry[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState<boolean>(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myHighScore, setMyHighScore] = useState<GlobalLeaderboardEntry | null>(null);

  // Fetch Global Leaderboard
  const fetchGlobalLeaderboard = async () => {
    setLoadingGlobal(true);
    try {
      const q = query(
        collection(db, "quiz_scores"),
        orderBy("percentage", "desc"),
        orderBy("updatedAt", "asc"),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const entries: GlobalLeaderboardEntry[] = [];
      querySnapshot.forEach((doc) => {
        entries.push(doc.data() as GlobalLeaderboardEntry);
      });
      setGlobalLeaderboard(entries);

      if (currentUser) {
        const docRef = doc(db, "quiz_scores", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const myScoreData = docSnap.data() as GlobalLeaderboardEntry;
          setMyHighScore(myScoreData);

          const rankQuery = query(
            collection(db, "quiz_scores"),
            where("percentage", ">", myScoreData.percentage)
          );
          const countSnap = await getCountFromServer(rankQuery);
          setMyRank(countSnap.data().count + 1);
        } else {
          setMyHighScore(null);
          setMyRank(null);
        }
      } else {
        setMyHighScore(null);
        setMyRank(null);
      }
    } catch (e) {
      console.error("Failed to fetch global leaderboard:", e);
      try {
        handleFirestoreError(e, OperationType.LIST, "quiz_scores");
      } catch (err) {
        // Log & swallow
      }
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Save/Update high score in Firestore
  const saveGlobalHighScoreToFirestore = async (finalScore: number, totalQs: number) => {
    if (!currentUser) return;
    
    const percentage = Math.round((finalScore / totalQs) * 100);
    const userId = currentUser.uid;
    const docRef = doc(db, "quiz_scores", userId);
    
    try {
      const docSnap = await getDoc(docRef);
      let shouldUpdate = true;
      if (docSnap.exists()) {
        const existingData = docSnap.data();
        if (existingData.percentage >= percentage) {
          shouldUpdate = false;
        }
      }
      
      if (shouldUpdate) {
        await setDoc(docRef, {
          userId: userId,
          userName: currentUser.displayName || playerName.trim() || "পরীক্ষার্থী",
          score: finalScore,
          totalQuestions: totalQs,
          percentage: percentage,
          updatedAt: new Date().toISOString()
        });
        await fetchGlobalLeaderboard();
      }
    } catch (e) {
      console.error("Failed to save global quiz score:", e);
      try {
        handleFirestoreError(e, OperationType.WRITE, `quiz_scores/${userId}`);
      } catch (err) {
        // Log & swallow
      }
    }
  };

  React.useEffect(() => {
    fetchGlobalLeaderboard();
  }, [currentUser?.uid]);

  // Leaderboard states
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem("quran_quiz_player_name") || "পরীক্ষার্থী";
    } catch {
      return "পরীক্ষার্থী";
    }
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem("quran_quiz_surah_leaderboard");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveLeaderboardScore = (sIdx: number, finalScore: number, totalQs: number) => {
    const surah = ALL_SURAS[sIdx];
    const newEntry: LeaderboardEntry = {
      id: Math.random().toString(36).substring(2, 11) + Date.now(),
      surahNo: surah.n,
      surahName: surah.bn,
      score: finalScore,
      totalQuestions: totalQs,
      percentage: Math.round((finalScore / totalQs) * 100),
      timestamp: Date.now(),
      playerName: playerName.trim() || "পরীক্ষার্থী"
    };

    setLeaderboard(prev => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem("quran_quiz_surah_leaderboard", JSON.stringify(updated));
      } catch (e) {
        console.error("Local storage save failed:", e);
      }
      return updated;
    });
    
    if (currentUser) {
      saveGlobalHighScoreToFirestore(finalScore, totalQs);
    }
  };

  const [mcqLeaderboard, setMcqLeaderboard] = useState<MCQLeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem("quran_quiz_mcq_leaderboard");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveMCQLeaderboardScore = (finalScore: number, totalQs: number) => {
    const cats: Record<string, string> = {
      all: "সব বিষয়",
      surah: "সূরা পরিচিতি",
      juz: "পারা ও জুয",
      facts: "সাধারণ জ্ঞান"
    };

    const newEntry: MCQLeaderboardEntry = {
      id: Math.random().toString(36).substring(2, 11) + Date.now(),
      category: selectedCategory,
      categoryBn: cats[selectedCategory] || "অন্যান্য",
      score: finalScore,
      totalQuestions: totalQs,
      percentage: Math.round((finalScore / totalQs) * 100),
      timestamp: Date.now(),
      playerName: playerName.trim() || "পরীক্ষার্থী"
    };

    setMcqLeaderboard(prev => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem("quran_quiz_mcq_leaderboard", JSON.stringify(updated));
      } catch (e) {
        console.error("Local storage save failed:", e);
      }
      return updated;
    });

    if (currentUser) {
      saveGlobalHighScoreToFirestore(finalScore, totalQs);
    }
  };

  const startSurahQuiz = (sIdx: number) => {
    const surah = ALL_SURAS[sIdx];
    const qs = getQuestionsForSurah(surah);
    setSelectedSurahIdx(sIdx);
    setSurahQuizQuestions(qs);
    setSurahQuizCurrentIdx(0);
    setSurahSelectedAnswer(null);
    setSurahIsSubmitted(false);
    setSurahQuizScore(0);
    setSurahQuizCompleted(false);
    setSurahQuizHistory([]);
    setSurahQuizStarted(true);
  };

  const handleSurahAnswerSubmit = (optionIdx: number) => {
    if (surahIsSubmitted) return;
    setSurahSelectedAnswer(optionIdx);
    setSurahIsSubmitted(true);
    
    const currentQ = surahQuizQuestions[surahQuizCurrentIdx];
    const isCorrect = optionIdx === currentQ.correctAnswerIndex;
    if (isCorrect) {
      setSurahQuizScore(prev => prev + 1);
    }
    
    setSurahQuizHistory(prev => [
      ...prev,
      {
        q: currentQ.q,
        options: currentQ.options,
        correctAnswerIndex: currentQ.correctAnswerIndex,
        selectedAnswer: optionIdx,
        explanation: currentQ.explanation
      }
    ]);
  };

  const handleSurahNextQuestion = () => {
    if (surahQuizCurrentIdx + 1 < surahQuizQuestions.length) {
      setSurahQuizCurrentIdx(prev => prev + 1);
      setSurahSelectedAnswer(null);
      setSurahIsSubmitted(false);
    } else {
      setSurahQuizCompleted(true);
      if (selectedSurahIdx !== null) {
        saveLeaderboardScore(selectedSurahIdx, surahQuizScore, surahQuizQuestions.length);
      }
    }
  };

  const handleResetSurahQuiz = () => {
    if (selectedSurahIdx !== null) {
      startSurahQuiz(selectedSurahIdx);
    }
  };

  const handleExitSurahQuiz = () => {
    setSelectedSurahIdx(null);
    setSurahQuizStarted(false);
    setSurahQuizQuestions([]);
    setSurahQuizCurrentIdx(0);
    setSurahSelectedAnswer(null);
    setSurahIsSubmitted(false);
    setSurahQuizScore(0);
    setSurahQuizCompleted(false);
    setSurahQuizHistory([]);
  };

  // Filtered Questions
  const filteredQuestions = selectedCategory === "all"
    ? QUIZ_QUESTIONS
    : QUIZ_QUESTIONS.filter(q => q.category === selectedCategory);

  // Reset the quiz state
  const handleResetQuiz = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
    setAnsweredHistory([]);
  };

  // Submit Answer
  const handleAnswerSubmit = (index: number) => {
    if (isSubmitted) return;
    setSelectedAnswer(index);
    setIsSubmitted(true);
    
    const isCorrect = index === filteredQuestions[currentIdx].correctAnswerIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setAnsweredHistory(prev => [...prev, {
      questionId: filteredQuestions[currentIdx].id,
      isCorrect
    }]);
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (currentIdx + 1 < filteredQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    } else {
      setQuizCompleted(true);
      saveMCQLeaderboardScore(score, filteredQuestions.length);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto select-none">
      
      {/* Mode Selector & Topic Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-soph-border pb-5">
        
        {/* Toggle Mode buttons */}
        <div className="flex bg-soph-deep border border-soph-border p-1 rounded-xl w-full md:w-auto overflow-x-auto scroller-hidden">
          <button
            onClick={() => { setCurrentMode("quiz"); handleResetQuiz(); }}
            className={`flex-1 md:flex-none px-4 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              currentMode === "quiz"
                ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
                : "text-soph-text-secondary hover:text-soph-gold"
            }`}
          >
            <Trophy className="h-4 w-4" /> মাল্টিপল চয়েস কুইজ
          </button>
          <button
            onClick={() => { setCurrentMode("flashcard"); setFlippedCardId(null); }}
            className={`flex-1 md:flex-none px-4 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              currentMode === "flashcard"
                ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
                : "text-soph-text-secondary hover:text-soph-gold"
            }`}
          >
            <BookOpen className="h-4 w-4" /> নলেজ ফ্ল্যাশকার্ডস
          </button>
          <button
            onClick={() => { setCurrentMode("surah"); handleExitSurahQuiz(); }}
            className={`flex-1 md:flex-none px-4 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              currentMode === "surah"
                ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
                : "text-soph-text-secondary hover:text-soph-gold"
            }`}
          >
            <Compass className="h-4 w-4" /> সূরা ভিত্তিক কুইজ
          </button>
          <button
            onClick={() => { setCurrentMode("leaderboard"); }}
            className={`flex-1 md:flex-none px-4 py-2 text-center text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              currentMode === "leaderboard"
                ? "bg-soph-gold text-soph-deep shadow-md font-extrabold"
                : "text-soph-text-secondary hover:text-soph-gold"
            }`}
          >
            <Globe className="h-4 w-4" /> বৈশ্বিক লিডারবোর্ড
          </button>
        </div>

        {/* Categories selector */}
        {currentMode !== "surah" && currentMode !== "leaderboard" && (
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto justify-end animate-fade-in">
            {[
              { id: "all", label: "সব বিষয়" },
              { id: "surah", label: "সূরা পরিচিতি" },
              { id: "juz", label: "পারা ও জুয" },
              { id: "facts", label: "সাধারণ জ্ঞান" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  handleResetQuiz();
                  setFlippedCardId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 border cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-soph-gold text-soph-deep border-soph-gold shadow-md"
                    : "bg-soph-deep text-soph-text-secondary border-soph-border hover:bg-soph-hover"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RENDER ACTIVE MODE */}
      <AnimatePresence mode="wait">
        
        {/* MODE 1: INTERACTIVE QUIZ MODE */}
        {currentMode === "quiz" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            
            {!quizCompleted ? (
              <div className="bg-soph-card border border-soph-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                
                {/* Visual Accent Corner Elements */}
                <div className="absolute top-0 right-0 h-24 w-24 bg-soph-gold/5 blur-3xl rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 h-24 w-24 bg-soph-gold/5 blur-3xl rounded-full pointer-events-none"></div>

                {/* Progress Indicators Header */}
                <div className="flex justify-between items-center pb-4 border-b border-soph-border/40 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-soph-gold tracking-widest block font-mono">কুইজ সেশন প্রগতি</span>
                    <span className="text-sm font-bold text-soph-text-primary">
                      প্রশ্ন <span className="text-soph-gold font-mono">{currentIdx + 1}</span> / {filteredQuestions.length}
                    </span>
                  </div>
                  
                  {/* Current Score Display */}
                  <div className="bg-soph-deep border border-soph-border px-3 py-2 rounded-xl text-right">
                    <span className="text-[9px] text-soph-text-secondary uppercase block font-semibold">মোট স্কোর</span>
                    <span className="font-bold text-soph-gold font-mono md:text-sm text-xs">
                      {score} / {filteredQuestions.length}
                    </span>
                  </div>
                </div>

                {/* Question category & Text */}
                <div className="space-y-3">
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-soph-hover/75 text-soph-gold border border-soph-border/60 px-2.5 py-1 rounded-full">
                    📂 {filteredQuestions[currentIdx]?.categoryBn}
                  </span>
                  <h3 className="text-base md:text-lg font-extrabold text-soph-text-primary leading-relaxed">
                    {filteredQuestions[currentIdx]?.q}
                  </h3>
                </div>

                {/* Options List Grid */}
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {filteredQuestions[currentIdx]?.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrectOption = idx === filteredQuestions[currentIdx].correctAnswerIndex;
                    
                    // Button style modifiers based on status
                    let btnStyle = "bg-soph-deep border-soph-border hover:border-soph-gold/30 hover:bg-soph-hover";
                    let iconState = <HelpCircle className="h-4.5 w-4.5 text-soph-text-secondary group-hover:text-soph-gold transition" />;

                    if (isSubmitted) {
                      if (isCorrectOption) {
                        btnStyle = "bg-green-950/20 border-green-800 text-green-300 shadow-md shadow-green-900/15";
                        iconState = <CheckCircle2 className="h-4.5 w-4.5 text-green-400 shrink-0" />;
                      } else if (isSelected) {
                        btnStyle = "bg-red-950/20 border-red-800 text-red-300 shadow-md shadow-red-900/15";
                        iconState = <XCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />;
                      } else {
                        btnStyle = "bg-soph-deep/30 border-soph-border/40 text-soph-text-secondary opacity-60";
                        iconState = null;
                      }
                    } else if (isSelected) {
                      btnStyle = "bg-soph-hover/80 border-soph-gold text-soph-gold shadow-md";
                      iconState = <CheckCircle2 className="h-4.5 w-4.5 text-soph-gold shrink-0" />;
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isSubmitted}
                        onClick={() => handleAnswerSubmit(idx)}
                        className={`w-full px-5 py-3.5 border rounded-xl font-medium text-xs md:text-sm text-left flex items-center justify-between gap-4 transition duration-200 group cursor-pointer disabled:cursor-not-allowed ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-lg bg-soph-hover border border-soph-border flex items-center justify-center text-[11px] font-black font-mono text-soph-gold group-hover:bg-soph-gold group-hover:text-soph-deep transition">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-soph-text-primary font-bold">{option}</span>
                        </div>
                        {iconState}
                      </button>
                    );
                  })}
                </div>

                {/* Submited explanation box */}
                <AnimatePresence>
                  {isSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-soph-deep border border-soph-border rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-soph-gold">
                        <Sparkles className="h-4 w-4" /> শরিয়াহ ব্যাখ্যা ও তথ্য সূত্র:
                      </div>
                      <p className="text-xs md:text-sm text-soph-text-secondary leading-relaxed bg-soph-card/30 p-2.5 rounded-lg border border-soph-border/30">
                        {filteredQuestions[currentIdx]?.explanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons to go next */}
                {isSubmitted && (
                  <div className="flex justify-end pt-2 border-t border-soph-border/40">
                    <button
                      onClick={handleNextQuestion}
                      className="px-5 py-2.5 bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-soph-gold/10 transition cursor-pointer"
                    >
                      {currentIdx + 1 < filteredQuestions.length ? "পরবর্তী প্রশ্ন" : "ফলাফল দেখুন"} <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

              </div>
            ) : (
              // Quiz Score overview summary board
              <div className="bg-soph-card border border-soph-border rounded-2xl p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

                <div className="space-y-2">
                  <div className="h-16 w-16 bg-soph-hover border border-soph-border rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
                    🏆
                  </div>
                  <h3 className="text-xl font-extrabold text-soph-text-primary">অভিনন্দন! আপনি কুইজ সম্পূর্ণ করেছেন</h3>
                  <p className="text-xs text-soph-text-secondary max-w-sm mx-auto">
                    পবিত্র কুরআনের সূরা, পারা ও অন্যান্য বুনিয়াদী ইসলামী জ্ঞান যাচাইয়ের সুন্দর দক্ষতা অর্জন সফল হয়েছে।
                  </p>
                </div>

                {/* Visual Score Card */}
                <div className="max-w-xs mx-auto bg-soph-deep border border-soph-border p-6 rounded-2xl space-y-2 shadow-inner">
                  <span className="text-[10px] text-soph-gold uppercase font-black tracking-widest block">আপনার মোট অর্জিত স্কোর</span>
                  <div className="text-3xl font-black text-soph-text-primary font-mono leading-none">
                    {score} <span className="text-sm font-semibold text-soph-text-secondary">/ {filteredQuestions.length}</span>
                  </div>
                  
                  {/* Accuracy and stats */}
                  <div className="pt-3 border-t border-soph-border/60 flex justify-between items-center text-[11px] font-semibold text-soph-text-secondary font-sans leading-none px-2">
                    <span>সঠিক উত্তর: <strong className="text-green-400 font-mono">{score}</strong></span>
                    <span>ভুল উত্তর: <strong className="text-red-400 font-mono">{filteredQuestions.length - score}</strong></span>
                    <span>সঠিকতার হার: <strong className="text-soph-gold font-mono">{Math.round((score / filteredQuestions.length) * 100)}%</strong></span>
                  </div>
                </div>

                {/* Action button to reset */}
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={handleResetQuiz}
                    className="px-6 py-3 bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-soph-gold/10 transition cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" /> আবার শুরু করুন
                  </button>
                </div>
              </div>
            )}

            {/* MCQ LOCAL LEADERBOARD */}
            <div className="bg-soph-card border border-soph-border p-5 rounded-2xl space-y-4 shadow-xl text-left mt-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-soph-border pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-soph-gold" />
                  <h4 className="text-sm md:text-base font-extrabold text-soph-text-primary">
                    ব্যক্তিগত কুইজ লিডারবোর্ড (সর্বোচ্চ স্কোর)
                  </h4>
                </div>
                {mcqLeaderboard.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("আপনি কি নিশ্চিতভাবে সব কুইজ স্কোর রেকর্ড মুছে ফেলতে চান?")) {
                        setMcqLeaderboard([]);
                        try {
                          localStorage.removeItem("quran_quiz_mcq_leaderboard");
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                    className="text-[10px] bg-rose-950/30 text-rose-400 border border-rose-900/40 hover:bg-rose-900/20 px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> রেকর্ড মুছুন
                  </button>
                )}
              </div>

              {/* Player name card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-soph-deep border border-soph-border/70 p-3.5 rounded-lg">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-soph-text-primary">
                    <User className="h-3.5 w-3.5 text-soph-gold" /> আপনার নাম নির্ধারণ করুন:
                  </div>
                  <p className="text-[10px] text-soph-text-secondary leading-normal">
                    কুইজ সেশন ও সূরার ফলাফল ট্র্যাক করতে আপনার নামটি ব্যবহার করা হবে।
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerName}
                    maxLength={20}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      try {
                        localStorage.setItem("quran_quiz_player_name", e.target.value);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    placeholder="আপনার নাম..."
                    className="w-full px-3 py-2 text-xs bg-soph-card border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-lg transition"
                  />
                </div>
              </div>

              {mcqLeaderboard.length === 0 ? (
                <div className="text-center py-6 text-xs text-soph-text-secondary">
                  <Award className="h-8 w-8 text-soph-border mx-auto mb-2 opacity-50" />
                  আপনি এখনও কোনো কুইজে অংশ নেননি। ওপরে কুইজ শেষ করুন এবং আপনার অর্জনগুলো এখানে লিডারবোর্ডে দেখতে পাবেন!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    <div className="bg-soph-deep border border-soph-border/40 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] font-bold text-soph-text-secondary">মোট কুইজ সেশন:</span>
                      <span className="text-xs font-mono font-bold text-soph-gold">
                        {toBengaliNumerals(mcqLeaderboard.length)} টি
                      </span>
                    </div>
                    <div className="bg-soph-deep border border-soph-border/40 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] font-bold text-soph-text-secondary">গড় সঠিকতার হার:</span>
                      <span className="text-xs font-mono font-bold text-soph-gold">
                        {toBengaliNumerals(
                          Math.round(
                            mcqLeaderboard.reduce((acc, curr) => acc + curr.percentage, 0) /
                              mcqLeaderboard.length
                          )
                        )}%
                      </span>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                    {mcqLeaderboard.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="bg-soph-deep hover:bg-soph-hover/50 border border-soph-border/50 px-3.5 py-2.5 rounded-lg flex items-center justify-between text-xs transition animate-fade-in"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-soph-gold font-bold text-[10px] bg-soph-card border border-soph-border/60 h-5 w-5 rounded flex items-center justify-center">
                            {toBengaliNumerals(idx + 1)}
                          </span>
                          <div>
                            <span className="font-extrabold text-soph-text-primary">বিষয় শ্রেণী: {entry.categoryBn}</span>
                            <span className="text-[9px] text-soph-text-secondary block font-mono">
                              পরীক্ষার্থী: {entry.playerName} • {new Date(entry.timestamp).toLocaleDateString("bn-BD", { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            entry.percentage === 100
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
                              : entry.percentage >= 60
                              ? "bg-blue-950/40 text-blue-400 border-blue-900/60"
                              : "bg-amber-950/40 text-amber-500 border-amber-900/60"
                          }`}>
                            {toBengaliNumerals(entry.score)}/{toBengaliNumerals(entry.totalQuestions)} ({toBengaliNumerals(entry.percentage)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* MODE 2: KNOWLEDGE FLASHCARDS (Card flipping presentation) */}
        {currentMode === "flashcard" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1 mb-2">
              <h3 className="text-base font-bold text-soph-text-primary flex items-center justify-center gap-1.5">
                <BookOpen className="h-5 w-5 text-soph-gold" /> কুরআন জ্ঞান ফ্ল্যাশকার্ড কার্ডসমূহ
              </h3>
              <p className="text-[11px] text-soph-text-secondary max-w-md mx-auto">
                কার্ডের ওপরে ক্লিক করে উত্তরটি উন্মোচন করুন এবং নিজের বুদ্ধি ও জ্ঞান ঝালিয়ে নিন।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuestions.map((q) => {
                const isFlipped = flippedCardId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setFlippedCardId(isFlipped ? null : q.id)}
                    className={`bg-soph-card border border-soph-border p-5 rounded-2xl hover:border-soph-gold/30 hover:shadow-lg hover:shadow-black/40 transition-all duration-200 cursor-pointer min-h-48 flex flex-col justify-between group relative overflow-hidden select-none ${
                      isFlipped ? "ring-1 ring-soph-gold/40 border-soph-gold/35" : ""
                    }`}
                  >
                    
                    {/* Header bar */}
                    <div className="flex justify-between items-center pb-2.5 border-b border-soph-border/40 text-[10px] w-full">
                      <span className="text-soph-gold font-bold flex items-center gap-1">
                        📂 {q.categoryBn}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-soph-text-secondary bg-soph-hover px-2 py-0.5 rounded border border-soph-border/50">
                        {isFlipped ? "উত্তর উন্মোচিত" : "পরীক্ষা করুন"}
                      </span>
                    </div>

                    {/* Card Content (Dynamic based on flipped state) */}
                    <div className="py-4 flex-1 flex flex-col justify-center text-center">
                      <AnimatePresence mode="wait">
                        {!isFlipped ? (
                          <motion.div
                            key="question"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="space-y-2"
                          >
                            <p className="text-sm font-extrabold text-soph-text-primary group-hover:text-soph-gold transition leading-relaxed md:px-4">
                              {q.q}
                            </p>
                            <span className="text-[10px] text-soph-text-secondary font-medium tracking-wide flex items-center justify-center gap-1 block">
                              👀 উত্তর দেখতে এখানে ক্লিক করুন
                            </span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="answer"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="space-y-2.5"
                          >
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-3 py-0.5 rounded-full inline-block">
                              সঠিক উত্তর:
                            </span>
                            <p className="text-base font-black text-soph-text-primary leading-snug">
                              {q.options[q.correctAnswerIndex]}
                            </p>
                            <p className="text-[11px] text-soph-text-secondary leading-relaxed bg-soph-deep/40 p-2 rounded-xl text-justify border border-soph-border/30 max-w-sm mx-auto">
                              {q.explanation}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Footer bar */}
                    <div className="pt-2.5 border-t border-soph-border/30 text-[9px] text-right text-soph-text-secondary font-mono w-full">
                      তথ্যসূত্র: নির্ভরযোগ্য হাদীস ও তাফসীর গ্রন্থ
                    </div>

                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* MODE 3: SURAH-BASED QUIZ */}
        {currentMode === "surah" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* SUB-FLOW A: SURAH SELECTOR SCREEN */}
            {!surahQuizStarted && (
              <div className="space-y-6">
                {/* Intro banner */}
                <div className="bg-soph-card border border-soph-border p-6 rounded-2xl text-center space-y-2.5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-soph-gold/5 blur-3xl rounded-full pointer-events-none"></div>
                  <h3 className="text-lg md:text-xl font-extrabold text-soph-text-primary flex items-center justify-center gap-2">
                    <Compass className="h-6 w-6 text-soph-gold animate-spin-slow" /> সূরা ভিত্তিক কুরআন কুইজ
                  </h3>
                  <p className="text-xs md:text-sm text-soph-text-secondary max-w-xl mx-auto leading-relaxed">
                    পবিত্র আল-কুরআনের যেকোনো সূরা নির্বাচন করে সেই সূরার মোট আয়াত, অবস্থান, নামকরণের অর্থ ও সংক্ষিপ্ত তাত্ত্বিক জ্ঞান অর্জনে কুইজে পরীক্ষা দিন ও মেধা যাচাই করুন।
                  </p>
                </div>

                {/* LEADERBOARD & STATS SECTION */}
                <div className="bg-soph-card border border-soph-border p-5 rounded-xl space-y-4 shadow-md text-left">
                  <div className="flex items-center justify-between border-b border-soph-border pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-soph-gold" />
                      <h4 className="text-sm md:text-base font-extrabold text-soph-text-primary">
                        ব্যক্তিগত সর্বোচ্চ স্কোর ও ট্র্যাকার (লিডারবোর্ড)
                      </h4>
                    </div>
                    {leaderboard.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm("আপনি কি নিশ্চিতভাবে সব লিডারবোর্ড রেকর্ড মুছে ফেলতে চান?")) {
                            setLeaderboard([]);
                            try {
                              localStorage.removeItem("quran_quiz_surah_leaderboard");
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        }}
                        className="text-[10px] bg-rose-950/30 text-rose-400 border border-rose-900/40 hover:bg-rose-900/20 px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> রেকর্ড মুছুন
                      </button>
                    )}
                  </div>

                  {/* Player settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-soph-deep border border-soph-border/70 p-3.5 rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-soph-text-primary">
                        <User className="h-3.5 w-3.5 text-soph-gold" /> আপনার নাম সেট করুন:
                      </div>
                      <p className="text-[10px] text-soph-text-secondary leading-normal">
                        প্রস্তুতি ট্র্যাক করার জন্য আপনার একটি স্থায়ী নাম দিতে পারেন।
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playerName}
                        maxLength={20}
                        onChange={(e) => {
                          setPlayerName(e.target.value);
                          try {
                            localStorage.setItem("quran_quiz_player_name", e.target.value);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        placeholder="আপনার নাম..."
                        className="w-full px-3 py-2 text-xs bg-soph-card border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-lg transition"
                      />
                    </div>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="text-center py-6 text-xs text-soph-text-secondary">
                      <Award className="h-8 w-8 text-soph-border mx-auto mb-2 opacity-50" />
                      আপনি এখনও কোনো সূরার কুইজে অংশ নেননি। নিচে যেকোনো সূরা নির্বাচন করে পরীক্ষা দিন এবং আপনার সর্বোচ্চ স্কোর এখানে ট্র্যাক করুন!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                        <div className="bg-soph-deep border border-soph-border/40 p-3 rounded-lg flex items-center justify-between">
                          <span className="text-[10px] font-bold text-soph-text-secondary">অংশ নেওয়া সূরাসমূহ:</span>
                          <span className="text-xs font-mono font-bold text-soph-gold">
                            {toBengaliNumerals(
                              Array.from(new Set(leaderboard.map(e => e.surahNo))).length
                            )} টি
                          </span>
                        </div>
                        <div className="bg-soph-deep border border-soph-border/40 p-3 rounded-lg flex items-center justify-between">
                          <span className="text-[10px] font-bold text-soph-text-secondary">মোট পরীক্ষা দেওয়ার সংখ্যা:</span>
                          <span className="text-xs font-mono font-bold text-soph-gold">
                            {toBengaliNumerals(leaderboard.length)} বার
                          </span>
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                        {(() => {
                          const map: Record<number, LeaderboardEntry> = {};
                          leaderboard.forEach(entry => {
                            const existing = map[entry.surahNo];
                            if (!existing || entry.percentage > existing.percentage || (entry.percentage === existing.percentage && entry.timestamp > existing.timestamp)) {
                              map[entry.surahNo] = entry;
                            }
                          });
                          const topScores = Object.values(map).sort((a, b) => b.percentage - a.percentage);
                          return topScores.map((entry, idx) => (
                            <div
                              key={entry.id}
                              className="bg-soph-deep hover:bg-soph-hover/50 border border-soph-border/50 px-3.5 py-2.5 rounded-lg flex items-center justify-between text-xs transition"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-soph-gold font-bold text-[10px] bg-soph-card border border-soph-border/60 h-5 w-5 rounded flex items-center justify-center">
                                  {toBengaliNumerals(idx + 1)}
                                </span>
                                <div>
                                  <span className="font-extrabold text-soph-text-primary">সূরা {entry.surahName}</span>
                                  <span className="text-[9px] text-soph-text-secondary block font-mono">
                                    নাম: {entry.playerName} • {new Date(entry.timestamp).toLocaleDateString("bn-BD", { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  entry.percentage === 100
                                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
                                    : entry.percentage >= 60
                                    ? "bg-blue-950/40 text-blue-400 border-blue-900/60"
                                    : "bg-amber-950/40 text-amber-500 border-amber-900/60"
                                }`}>
                                  {toBengaliNumerals(entry.score)}/{toBengaliNumerals(entry.totalQuestions)} ({toBengaliNumerals(entry.percentage)}%)
                                </span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-soph-text-secondary" />
                  </span>
                  <input
                    type="text"
                    value={surahSearchQuery}
                    onChange={(e) => setSurahSearchQuery(e.target.value)}
                    placeholder="সূরার নাম (যেমন: ফাতিহা, বাকারাহ) বা সূরার নম্বর লিখে খুঁজুন..."
                    className="w-full pl-10 pr-4 py-3 bg-soph-deep border border-soph-border hover:border-soph-border-light focus:border-soph-gold focus:ring-1 focus:ring-soph-gold/40 text-soph-text-primary rounded-xl text-sm transition"
                  />
                  {surahSearchQuery && (
                    <button 
                      onClick={() => setSurahSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-soph-text-secondary hover:text-soph-gold cursor-pointer"
                    >
                      মুছে ফেলুন
                    </button>
                  )}
                </div>

                {/* Sura selection grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_SURAS.filter((s) => {
                    const query = surahSearchQuery.trim().toLowerCase();
                    if (!query) return true;
                    return (
                      s.bn.includes(query) ||
                      s.en.toLowerCase().includes(query) ||
                      s.mn.includes(query) ||
                      s.n.toString() === query
                    );
                  }).map((surah) => {
                    const isSpecial = !!SPECIAL_SURAH_QUESTIONS[surah.n];
                    return (
                      <div
                        key={surah.n}
                        onClick={() => startSurahQuiz(surah.n - 1)}
                        className="bg-soph-card border border-soph-border/70 hover:border-soph-gold/60 p-4 rounded-xl flex items-center justify-between group hover:shadow-lg transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {/* Sura Number badge */}
                          <div className="h-10 w-10 rounded-lg bg-soph-deep group-hover:bg-soph-hover/70 flex items-center justify-center border border-soph-border group-hover:border-soph-gold/30 transition text-xs font-mono font-bold text-soph-gold">
                            {toBengaliNumerals(surah.n)}
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-soph-text-primary group-hover:text-soph-gold transition">
                              {surah.bn}
                            </div>
                            <div className="text-[10px] text-soph-text-secondary flex items-center gap-1">
                              <span className="font-mono">{surah.en}</span>
                              <span>•</span>
                              <span>{surah.type === 'makki' ? 'মাক্কী' : 'মাদানী'}</span>
                              <span>•</span>
                              <span>{toBengaliNumerals(surah.ayat)} আয়াত</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {isSpecial && (
                            <span className="text-[9px] bg-soph-gold/10 border border-soph-gold/30 text-soph-gold font-bold px-1.5 py-0.5 rounded-full select-none">
                              প্রিমিয়াম কুইজ
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-soph-text-secondary group-hover:translate-x-1 group-hover:text-soph-gold transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-FLOW B: THE ACTIVE EXAM CARD & REVIEW SCREEN */}
            {surahQuizStarted && selectedSurahIdx !== null && (
              <div className="space-y-6 animate-fade-in">
                {/* Back to list and header */}
                <div className="flex items-center justify-between pb-3 border-b border-soph-border/40">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExitSurahQuiz}
                      className="px-3 py-1.5 bg-soph-deep border border-soph-border text-soph-text-secondary hover:text-soph-gold text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      ← সূরা তালিকায় ফিরুন
                    </button>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-soph-gold bg-soph-hover border border-soph-border px-3 py-1.5 rounded-xl">
                      সূরা {ALL_SURAS[selectedSurahIdx]?.bn} কুইজ
                    </span>
                  </div>
                </div>

                {!surahQuizCompleted ? (
                  /* EXAM IN PROGRESS */
                  <div className="bg-soph-card border border-soph-border rounded-xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-soph-gold/5 blur-3xl rounded-full pointer-events-none"></div>

                    {/* Progress indicator */}
                    <div className="flex justify-between items-center text-xs pb-4 border-b border-soph-border/30">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-soph-gold tracking-wider font-mono block mb-1">প্রশ্ন প্রগতি</span>
                        <span className="font-extrabold text-soph-text-primary text-sm">
                          প্রশ্ন <span className="font-mono text-soph-gold">{toBengaliNumerals(surahQuizCurrentIdx + 1)}</span> / {toBengaliNumerals(surahQuizQuestions.length)}
                        </span>
                      </div>
                      
                      <div className="bg-soph-deep border border-soph-border px-3 py-1.5 rounded-lg text-right">
                        <span className="text-[9px] text-soph-text-secondary block font-bold">মোট স্কোর</span>
                        <span className="font-bold text-soph-gold font-mono text-xs">
                          {toBengaliNumerals(surahQuizScore)} / {toBengaliNumerals(surahQuizQuestions.length)}
                        </span>
                      </div>
                    </div>

                    {/* Active Question Box */}
                    <div className="space-y-3">
                      <span className="inline-block text-[9px] font-bold tracking-wider bg-soph-hover text-soph-gold px-2.5 py-1 rounded-full border border-soph-border/40">
                        📖 সূরা ভিত্তিক মূল্যায়ন
                      </span>
                      <h3 className="text-base md:text-lg font-extrabold text-soph-text-primary leading-relaxed">
                        {surahQuizQuestions[surahQuizCurrentIdx]?.q}
                      </h3>
                    </div>

                    {/* Option Selection list */}
                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                      {surahQuizQuestions[surahQuizCurrentIdx]?.options.map((option: string, idx: number) => {
                        const isSelected = surahSelectedAnswer === idx;
                        const isCorrectOption = idx === surahQuizQuestions[surahQuizCurrentIdx].correctAnswerIndex;
                        
                        let btnStyle = "bg-soph-deep border-soph-border hover:border-soph-gold/30 hover:bg-soph-hover";
                        let iconState = <HelpCircle className="h-4.5 w-4.5 text-soph-text-secondary group-hover:text-soph-gold transition" />;

                        if (surahIsSubmitted) {
                          if (isSelected) {
                            if (isCorrectOption) {
                              btnStyle = "bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-950/40";
                              iconState = <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />;
                            } else {
                              btnStyle = "bg-rose-950/40 border-rose-500/50 hover:bg-rose-950/40";
                              iconState = <XCircle className="h-4.5 w-4.5 text-rose-400" />;
                            }
                          } else if (isCorrectOption) {
                            btnStyle = "bg-emerald-950/20 border-emerald-500/35";
                            iconState = <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500/85" />;
                          } else {
                            btnStyle = "bg-soph-deep/30 border-soph-border/30 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={surahIsSubmitted}
                            onClick={() => handleSurahAnswerSubmit(idx)}
                            className={`w-full p-4 rounded-xl border text-left text-xs md:text-sm font-bold flex items-center justify-between group transition cursor-pointer select-none ${btnStyle}`}
                          >
                            <span className={surahIsSubmitted && isCorrectOption ? "text-emerald-400 font-extrabold" : isSelected && !isCorrectOption ? "text-rose-400 font-extrabold" : "text-soph-text-primary"}>
                              {option}
                            </span>
                            {iconState}
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit confirmation and brief Tafsir feedback below */}
                    {surahIsSubmitted && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-soph-hover/50 border border-soph-border/60 space-y-2 mt-4 text-left"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          {surahSelectedAnswer === surahQuizQuestions[surahQuizCurrentIdx].correctAnswerIndex ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-extrabold">
                              <Check className="h-4 w-4" /> আপনার উত্তরটি সঠিক হয়েছে! মাশাআল্লাহ্
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 font-extrabold">
                              <XCircle className="h-4 w-4" /> সঠিক উত্তরটি হলো: {surahQuizQuestions[surahQuizCurrentIdx].options[surahQuizQuestions[surahQuizCurrentIdx].correctAnswerIndex]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-soph-text-secondary leading-relaxed pt-1.5 border-t border-soph-border/20 text-justify">
                          <span className="text-soph-gold font-extrabold">🔑 ব্যাখ্যা:</span> {surahQuizQuestions[surahQuizCurrentIdx].explanation}
                        </p>

                        <div className="pt-3 flex justify-end">
                          <button
                            onClick={handleSurahNextQuestion}
                            className="px-5 py-2.5 bg-soph-gold text-soph-deep font-extrabold text-xs rounded-lg flex items-center gap-1 cursor-pointer hover:bg-soph-gold-light transition"
                          >
                            {surahQuizCurrentIdx + 1 < surahQuizQuestions.length ? "পরবর্তী প্রশ্ন" : "ফলাফল দেখুন"} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  /* RESULTS & MERIT EVALUATION SCREEN with Review answers */
                  <div className="space-y-6">
                    {/* Score Card Banner */}
                    <div className="bg-soph-card border border-soph-border rounded-xl p-6 md:p-8 space-y-6 text-center shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 h-32 w-32 bg-soph-gold/5 blur-3xl rounded-full pointer-events-none"></div>

                      <div className="flex justify-center">
                        <div className="relative">
                          {/* Inner glowing circle */}
                          <div className="h-28 w-28 rounded-full bg-soph-deep border border-soph-gold/40 flex flex-col items-center justify-center shadow-2xl">
                            <Trophy className="h-8 w-8 text-soph-gold animate-bounce" />
                            <span className="text-xl font-mono font-black text-soph-gold pt-1">
                              {toBengaliNumerals(surahQuizScore)} / {toBengaliNumerals(surahQuizQuestions.length)}
                            </span>
                            <span className="text-[9px] text-soph-text-secondary uppercase tracking-widest font-bold">অর্জিত স্কোর</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base md:text-lg font-black text-soph-text-primary">
                          সূরা {ALL_SURAS[selectedSurahIdx]?.bn} কুইজ সম্পন্ন হয়েছে!
                        </h3>
                        
                        {/* "মেধা যাচাই করতে পারবে" */}
                        <div className="max-w-md mx-auto p-4 rounded-xl bg-soph-deep border border-soph-border/60 text-left md:text-center">
                          {surahQuizScore === surahQuizQuestions.length ? (
                            <div className="space-y-1">
                              <span className="text-xs font-black text-soph-gold flex items-center md:justify-center gap-1">
                                🥇 ممتاز (মুমতাজ / অসামান্য মেধা)
                              </span>
                              <p className="text-xs text-soph-text-secondary leading-relaxed text-justify md:text-center">
                                মাশাআল্লাহ! সূরা {ALL_SURAS[selectedSurahIdx]?.bn} সম্পর্কে আপনার জ্ঞান অত্যন্ত সুগভীর ও নিখুঁত। আল্লাহ তাআলা আপনার ইসলামী ইলমকে আরও প্রস্ফুটিত করে দিন। আমীন।
                              </p>
                            </div>
                          ) : surahQuizScore >= surahQuizQuestions.length * 0.6 ? (
                            <div className="space-y-1">
                              <span className="text-xs font-black text-emerald-400 flex items-center md:justify-center gap-1">
                                🥈 جيد جداً (জায়্যিদ জিদ্দান / উত্তম প্রস্তুতি)
                              </span>
                              <p className="text-xs text-soph-text-secondary leading-relaxed text-justify md:text-center">
                                আলহামদুলিল্লাহ! সূরা {ALL_SURAS[selectedSurahIdx]?.bn} সম্পর্কে আপনার জ্ঞান বেশ প্রশংসনীয়। কিছু বিষয়ে আরও যত্নবান হলে ইনশাআল্লাহ সামনে পূর্ণ নম্বর পাবেন। নিয়মিত তিলাওয়াত ও আমল চালিয়ে যান।
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-xs font-black text-amber-500 flex items-center md:justify-center gap-1">
                                📚 আরও পড়াশোনা প্রয়োজন
                              </span>
                              <p className="text-xs text-soph-text-secondary leading-relaxed text-justify md:text-center">
                                ইনশাআল্লাহ্! মন খারাপ না করে সূরা {ALL_SURAS[selectedSurahIdx]?.bn} আবার মনযোগ দিয়ে পড়ার পর কুইজে অংশগ্রহণ করুন। আল্লাহর বাণী গভীর চিন্তাভাবনা সহকারে পড়লে ইলম সুদৃঢ় হয়।
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Control actions */}
                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          onClick={handleResetSurahQuiz}
                          className="px-5 py-2.5 bg-soph-deep border border-soph-border text-soph-text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-soph-hover cursor-pointer transition"
                        >
                          <RotateCcw className="h-4 w-4 text-soph-gold" /> আবার পরীক্ষা দিন
                        </button>
                        <button
                          onClick={handleExitSurahQuiz}
                          className="px-5 py-2.5 bg-soph-gold text-soph-deep font-black text-xs rounded-xl flex items-center gap-1.5 hover:bg-soph-gold-light cursor-pointer transition shadow-lg shadow-soph-gold/10"
                        >
                          <Compass className="h-4 w-4" /> অন্য সূরার কুইজ খেলুন
                        </button>
                      </div>

                      {/* Personal historical attempts for this specific Surah */}
                      {selectedSurahIdx !== null && (
                        <div className="max-w-md mx-auto pt-4 text-left border-t border-soph-border/30 mt-4 space-y-2">
                          <h5 className="text-xs font-black text-soph-text-primary flex items-center gap-1.5 justify-center">
                            <Clock className="h-3.5 w-3.5 text-soph-gold" /> এই সূরার পূর্ববর্তী রেকর্ডসমূহ:
                          </h5>
                          {(() => {
                            const attempts = leaderboard.filter(e => e.surahNo === ALL_SURAS[selectedSurahIdx]?.n);
                            if (attempts.length <= 1) {
                              return (
                                <p className="text-[10px] text-soph-text-secondary text-center">
                                  এটিই এই সূরায় আপনার প্রথম প্রচেষ্টা!
                                </p>
                              );
                            }
                            return (
                              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                {attempts.map((entry, eIdx) => (
                                  <div 
                                    key={entry.id} 
                                    className="bg-soph-deep border border-soph-border/40 p-2 rounded-lg flex items-center justify-between text-[11px]"
                                  >
                                    <span className="text-soph-text-secondary font-mono">
                                      প্রচেষ্টা #{toBengaliNumerals(attempts.length - eIdx)} ({new Date(entry.timestamp).toLocaleDateString("bn-BD", { day: 'numeric', month: 'short' })})
                                    </span>
                                    <span className={`font-bold ${entry.percentage === 100 ? "text-emerald-400" : entry.percentage >= 60 ? "text-blue-400" : "text-amber-500"}`}>
                                      {toBengaliNumerals(entry.score)}/{toBengaliNumerals(entry.totalQuestions)} ({toBengaliNumerals(entry.percentage)}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* "পরীক্ষা শেষে উত্তর যাচাই করতে পারবে" Review Section */}
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="flex items-center gap-2 pb-2 border-b border-soph-border/30">
                        <CheckCheck className="h-5 w-5 text-soph-gold" />
                        <h4 className="text-sm md:text-base font-black text-soph-text-primary">
                          📝 উত্তরমালা ও শরিয়াহ ব্যাখ্যা যাচাই
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {surahQuizHistory.map((hist, hIdx) => {
                          const isCorrect = hist.selectedAnswer === hist.correctAnswerIndex;
                          return (
                            <div 
                              key={hIdx}
                              className="bg-soph-card border border-soph-border rounded-xl p-5 md:p-6 space-y-4 shadow-md"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <h5 className="text-xs md:text-sm font-extrabold text-soph-text-primary leading-relaxed">
                                  প্রশ্ন {toBengaliNumerals(hIdx + 1)}: {hist.q}
                                </h5>
                                <span className={`shrink-0 inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  isCorrect 
                                    ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40 font-extrabold" 
                                    : "bg-rose-950/30 text-rose-400 border-rose-900/40 font-extrabold"
                                }`}>
                                  {isCorrect ? "✅ সঠিক" : "❌ ভুল"}
                                </span>
                              </div>

                              {/* Selected option vs correct */}
                              <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] md:text-xs">
                                  <div className="p-2.5 rounded-lg bg-soph-deep border border-soph-border">
                                    <span className="text-soph-text-secondary block font-semibold mb-0.5">আপনার বাছাইকৃত উত্তর:</span>
                                    <span className={isCorrect ? "text-emerald-400 font-extrabold" : "text-rose-400 font-extrabold"}>
                                      {hist.selectedAnswer !== null ? hist.options[hist.selectedAnswer] : "আপনি উত্তর দেননি"}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-soph-deep border border-soph-border">
                                    <span className="text-soph-text-secondary block font-semibold mb-0.5">সঠিক উত্তর:</span>
                                    <span className="text-emerald-400 font-extrabold">
                                      {hist.options[hist.correctAnswerIndex]}
                                    </span>
                                  </div>
                                </div>

                                {/* Tafsir & info box */}
                                <div className="p-4 bg-soph-hover/40 border border-soph-border/40 rounded-lg text-justify text-xs text-soph-text-secondary leading-relaxed">
                                  <p className="mb-1"><span className="text-soph-gold font-extrabold">🔑 শরিয়াহ ব্যাখ্যা ও তথ্যসূত্র:</span></p>
                                  <p>{hist.explanation}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* MODE 4: GLOBAL LEADERBOARD */}
        {currentMode === "leaderboard" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header / Intro Card */}
            <div className="bg-soph-card border border-soph-border p-6 rounded-2xl text-center space-y-2.5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-soph-gold/5 blur-3xl rounded-full pointer-events-none"></div>
              <h3 className="text-lg md:text-xl font-extrabold text-soph-text-primary flex items-center justify-center gap-2">
                <Globe className="h-6 w-6 text-soph-gold" /> বৈশ্বিক কুইজ লিডারবোর্ড (Global Leaderboard)
              </h3>
              <p className="text-xs md:text-sm text-soph-text-secondary max-w-xl mx-auto leading-relaxed">
                পবিত্র কুরআন ও বুনিয়াদী ইসলামী কুইজের মাধ্যমে বিশ্বজুড়ে অংশগ্রহণকারীদের মাঝে আপনার স্থান যাচাই করুন।
              </p>
            </div>

            {/* My Rank indicator / Authentication Card */}
            <div className="bg-soph-card border border-soph-border p-5 rounded-xl shadow-md text-left space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-soph-text-primary flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-soph-gold" /> আপনার তথ্য ও র‍্যাংকিং
                </h4>
                <button
                  onClick={fetchGlobalLeaderboard}
                  disabled={loadingGlobal}
                  className="p-1 px-2.5 text-[10px] bg-soph-deep border border-soph-border rounded-lg text-soph-gold flex items-center gap-1.5 hover:bg-soph-hover/60 cursor-pointer disabled:opacity-50 font-bold"
                  title="লিডারবোর্ড রিফ্রেশ করুন"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingGlobal ? "animate-spin" : ""}`} /> আপডেট রিফ্রেশ
                </button>
              </div>

              {!currentUser ? (
                <div className="p-4 bg-soph-deep border border-soph-border/70 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="text-xs font-bold text-soph-text-primary block">র‍্যাংকিং ট্র্যাকিং নিষ্ক্রিয় রয়েছে</span>
                    <span className="text-[11px] text-soph-text-secondary block">
                      লিডারবোর্ডে নিজের রিয়েল-টাইম র্যাংক দেখতে ও অন্যদের সাথে প্রতিযোগিতা করতে দয়া করে ওপরে গুগল অ্যাকাউন্ট দিয়ে সাইন ইন করুন।
                    </span>
                  </div>
                  <span className="shrink-0 text-xs px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-md font-bold">
                    সাইন ইন প্রয়োজন
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-soph-deep border border-soph-border/60 p-3.5 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-soph-text-secondary block font-bold uppercase tracking-wider">ব্যবহারকারী</span>
                    <span className="text-xs font-extrabold text-soph-text-primary block truncate">
                      {currentUser.displayName || "ব্যবহারকারী"}
                    </span>
                  </div>
                  <div className="bg-soph-deep border border-soph-border/60 p-3.5 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-soph-text-secondary block font-bold uppercase tracking-wider">র‍্যাংকিং অবস্থান (My Rank)</span>
                    <span className="text-xs font-extrabold text-soph-gold block">
                      {myRank !== null ? `${toBengaliNumerals(myRank)} তম` : "কুইজে অংশ নিন"}
                    </span>
                  </div>
                  <div className="bg-soph-deep border border-soph-border/60 p-3.5 rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-soph-text-secondary block font-bold uppercase tracking-wider">সর্বোচ্চ সঠিকতা</span>
                    <span className="text-xs font-extrabold text-emerald-400 block font-mono">
                      {myHighScore ? `${toBengaliNumerals(myHighScore.percentage)}% (${toBengaliNumerals(myHighScore.score)}/${toBengaliNumerals(myHighScore.totalQuestions)})` : "খেলেননি"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Top 10 Scoring Board */}
            <div className="bg-soph-card border border-soph-border rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-soph-border pb-3">
                <Trophy className="h-5 w-5 text-soph-gold" />
                <h4 className="text-sm md:text-base font-extrabold text-soph-text-primary">
                  বৈশ্বিক শীর্ষ ১০ কুইজ বিজয়ী
                </h4>
              </div>

              {loadingGlobal ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-soph-gold animate-spin mx-auto opacity-70" />
                  <p className="text-xs text-soph-text-secondary">গ্লোবাল ডেটা প্রক্রিয়াকরণ করা হচ্ছে, অপেক্ষা করুন...</p>
                </div>
              ) : globalLeaderboard.length === 0 ? (
                <div className="py-16 text-center space-y-2 text-soph-text-secondary">
                  <Award className="h-10 w-10 mx-auto opacity-30 text-soph-gold" />
                  <p className="text-xs font-semibold">কোনো বৈশ্বিক স্কোর ডাটা পাওয়া যায়নি।</p>
                  <p className="text-[10px]">প্রথম ব্যক্তি হিসেবে কুইজ শেষ করুন এবং নিজের স্থান শীর্ষে রাখুন!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* List Header */}
                  <div className="hidden sm:grid grid-cols-12 px-4 py-1.5 text-[10px] font-bold text-soph-text-secondary border-b border-soph-border/20 uppercase tracking-wider font-mono">
                    <span className="col-span-2">স্থান</span>
                    <span className="col-span-4">খেলোয়াড়</span>
                    <span className="col-span-3 text-center">সর্বোচ্চ স্কোর</span>
                    <span className="col-span-3 text-right">আপডেট সময়</span>
                  </div>

                  {/* List Content */}
                  <div className="space-y-1.5">
                    {globalLeaderboard.map((entry, idx) => {
                      const isMe = currentUser && currentUser.uid === entry.userId;
                      const medalBg = idx === 0 
                        ? "bg-amber-400 text-soph-deep" 
                        : idx === 1 
                        ? "bg-slate-300 text-soph-deep" 
                        : idx === 2 
                        ? "bg-amber-600 text-soph-deep" 
                        : "bg-soph-deep text-soph-text-secondary border border-soph-border/60";
                      
                      const formattedDate = new Date(entry.updatedAt).toLocaleDateString("bn-BD", { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      });

                      return (
                        <div
                          key={entry.userId}
                          className={`grid grid-cols-12 items-center gap-2 px-4 py-3 rounded-xl border transition duration-200 ${
                            isMe 
                              ? "bg-soph-gold/5 border-soph-gold shadow-md" 
                              : "bg-soph-deep/60 hover:bg-soph-deep border-soph-border/40"
                          }`}
                        >
                          {/* Rank / Medal */}
                          <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5">
                            <span className={`h-6 w-11 rounded-lg text-xs font-black flex items-center justify-center font-mono select-none ${medalBg}`}>
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : ""} {toBengaliNumerals(idx + 1)}
                            </span>
                            {isMe && (
                              <span className="hidden xs:inline-block text-[8px] font-black uppercase px-1.5 py-0.5 bg-soph-gold/20 text-soph-gold rounded border border-soph-gold/40">
                                আমি
                              </span>
                            )}
                          </div>

                          {/* Player name */}
                          <div className="col-span-5 sm:col-span-4">
                            <span className={`text-xs block truncate ${isMe ? "font-black text-soph-gold" : "font-extrabold text-soph-text-primary"}`}>
                              {entry.userName}
                            </span>
                            <span className="sm:hidden text-[9px] text-soph-text-secondary block font-mono">
                              {formattedDate}
                            </span>
                          </div>

                          {/* Score / Accuracy info */}
                          <div className="col-span-4 sm:col-span-3 text-center flex flex-col items-center justify-center">
                            <span className="text-[11px] font-black text-soph-gold font-mono">
                              {toBengaliNumerals(entry.percentage)}%
                            </span>
                            <span className="text-[9px] text-soph-text-secondary font-mono leading-none">
                              ({toBengaliNumerals(entry.score)}/{toBengaliNumerals(entry.totalQuestions)})
                            </span>
                          </div>

                          {/* Date updated */}
                          <div className="hidden sm:block col-span-3 text-right text-[10px] text-soph-text-secondary font-mono">
                            {formattedDate}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
