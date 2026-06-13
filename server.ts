import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for Surah verses to make loading ultra-fast and avoid hitting public APIs repeatedly
const surahCache = new Map<number, any>();
const introCache = new Map<number, any>();
const explanationCache = new Map<string, any>();
const pronunciationCache = new Map<string, string>();
const offlineSurahCache = new Map<number, any>();

// Lazy-initialized Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// 114 Surahs lookup data in server
const SURAH_LIST = [
  { n: 1, bn: 'আল ফাতিহা', mn: 'সূচনা', ar: 'الفاتحة', type: 'makki', ayat: 7, en: 'Al-Fatihah' },
  { n: 2, bn: 'আল বাকারা', mn: 'বকনা-বাছুর', ar: 'البقرة', type: 'madani', ayat: 286, en: 'Al-Baqarah' },
  { n: 3, bn: 'আলে ইমরান', mn: 'ইমরানের পরিবার', ar: 'آل عمران', type: 'madani', ayat: 200, en: 'Ali \'Imran' },
  { n: 4, bn: 'আন নিসা', mn: 'নারী', ar: 'النساء', type: 'madani', ayat: 176, en: 'An-Nisa' },
  { n: 5, bn: 'আল মায়িদাহ', mn: 'খাদ্য পরিবেশিত দস্তরখান', ar: 'المائدة', type: 'madani', ayat: 120, en: 'Al-Ma\'idah' },
  { n: 6, bn: 'আল আনআম', mn: 'গৃহপালিত পশু', ar: 'الأنعام', type: 'makki', ayat: 165, en: 'Al-An\'am' },
  { n: 7, bn: 'আল আরাফ', mn: 'উচু স্থানসমূহ', ar: 'الأعراف', type: 'makki', ayat: 206, en: 'Al-A\'raf' },
  { n: 8, bn: 'আল আনফাল', mn: 'যুদ্ধলব্ধ সম্পদ', ar: 'الأنفال', type: 'madani', ayat: 75, en: 'Al-Anfal' },
  { n: 9, bn: 'াত তাওবাহ', mn: 'অনুশোচনা', ar: 'التوبة', type: 'madani', ayat: 129, en: 'At-Tawbah' },
  { n: 10, bn: 'ইউনুস', mn: 'নবী ইউনুস (আঃ)', ar: 'يونس', type: 'makki', ayat: 109, en: 'Yunus' },
  { n: 11, bn: 'হুদ', mn: 'নবী হুদ (আঃ)', ar: 'هود', type: 'makki', ayat: 123, en: 'Hud' },
  { n: 12, bn: 'ইউসুফ', mn: 'নবী ইউসুফ (আঃ)', ar: 'يوسف', type: 'makki', ayat: 111, en: 'Yusuf' },
  { n: 13, bn: 'আর রাদ', mn: 'বজ্রপাত', ar: 'الرعد', type: 'madani', ayat: 43, en: 'Ar-Ra\'d' },
  { n: 14, bn: 'ইব্রাহীম', mn: 'নবী ইব্রাহীম (আঃ)', ar: 'إبراهيم', type: 'makki', ayat: 52, en: 'Ibrahim' },
  { n: 15, bn: 'আল হিজর', mn: 'পাথুরে পাহাড়', ar: 'الحجر', type: 'makki', ayat: 99, en: 'Al-Hijr' },
  { n: 16, bn: 'আন নাহল', mn: 'মৌমাছি', ar: 'النحل', type: 'makki', ayat: 128, en: 'An-Nahl' },
  { n: 17, bn: 'আল ইসরা', mn: 'রাত্রিকালীন ভ্রমণ', ar: 'الإسراء', type: 'makki', ayat: 111, en: 'Al-Isra' },
  { n: 18, bn: 'আল কাহফ', mn: 'গুহা', ar: 'الكهف', type: 'makki', ayat: 110, en: 'Al-Kahf' },
  { n: 19, bn: 'মারইয়াম', mn: 'মারইয়াম (আঃ)', ar: 'مريم', type: 'makki', ayat: 98, en: 'Maryam' },
  { n: 20, bn: 'ত্বা-হা', mn: 'ত্বা-হা', ar: 'طه', type: 'makki', ayat: 135, en: 'Ta-Ha' },
  { n: 21, bn: 'আল আম্বিয়া', mn: 'নবীগণ', ar: 'الأنبياء', type: 'makki', ayat: 112, en: 'Al-Anbiya' },
  { n: 22, bn: 'আল হজ্জ', mn: 'হজ্জ', ar: 'الحج', type: 'madani', ayat: 78, en: 'Al-Hajj' },
  { n: 23, bn: 'আল মুমিনুন', mn: 'বিশ্বাসীগণ', ar: 'المؤمنون', type: 'makki', ayat: 118, en: 'Al-Mu\'minun' },
  { n: 24, bn: 'আন নূর', mn: 'আলো', ar: 'النور', type: 'madani', ayat: 64, en: 'An-Nur' },
  { n: 25, bn: 'আল ফুরকান', mn: 'সত্য-মিথ্যার পার্থক্যকারী', ar: 'الفرقان', type: 'makki', ayat: 77, en: 'Al-Furqan' },
  { n: 26, bn: 'আশ শুআরা', mn: 'কবিগণ', ar: 'الشعراء', type: 'makki', ayat: 227, en: 'Ash-Shu\'ara' },
  { n: 27, bn: 'আন নামল', mn: 'পিঁপড়া', ar: 'النمل', type: 'makki', ayat: 93, en: 'An-Naml' },
  { n: 28, bn: 'আল কাসাস', mn: 'কাহিনীসমূহ', ar: 'القصص', type: 'makki', ayat: 88, en: 'Al-Qasas' },
  { n: 29, bn: 'আল আনকাবুত', mn: 'মাকড়সা', ar: 'العنكبوت', type: 'makki', ayat: 69, en: 'Al-\'Ankabut' },
  { n: 30, bn: 'আর রুম', mn: 'রোমানরা', ar: 'الروم', type: 'makki', ayat: 60, en: 'Ar-Rum' },
  { n: 31, bn: 'লুকমান', mn: 'লুকমান', ar: 'لقمان', type: 'makki', ayat: 34, en: 'Luqman' },
  { n: 32, bn: 'আস সাজদাহ', mn: 'সিজদা', ar: 'السجدة', type: 'makki', ayat: 30, en: 'As-Sajdah' },
  { n: 33, bn: 'আল আহযাব', mn: 'জোটবদ্ধ বাহিনী', ar: 'الأحزاب', type: 'madani', ayat: 73, en: 'Al-Ahzab' },
  { n: 34, bn: 'সাবা', mn: 'সাবার জনগোষ্ঠী', ar: 'سبأ', type: 'makki', ayat: 54, en: 'Saba' },
  { n: 35, bn: 'ফাতির', mn: 'সৃষ্টিকর্তা', ar: 'فاطর', type: 'makki', ayat: 45, en: 'Fatir' },
  { n: 36, bn: 'ইয়া-সীন', mn: 'ইয়া-সীন', ar: 'يس', type: 'makki', ayat: 83, en: 'Ya-Sin' },
  { n: 37, bn: 'আস সাফফাত', mn: 'সারিবদ্ধগণ', ar: 'الصافات', type: 'makki', ayat: 182, en: 'As-Saffat' },
  { n: 38, bn: 'সোয়াদ', mn: 'সোয়াদ', ar: 'ص', type: 'makki', ayat: 88, en: 'Sad' },
  { n: 39, bn: 'আয যুমার', mn: 'দলসমূহ', ar: 'الزمر', type: 'makki', ayat: 75, en: 'Az-Zumar' },
  { n: 40, bn: 'গাফির', mn: 'ক্ষমাশীল', ar: 'غافر', type: 'makki', ayat: 85, en: 'Ghafir' },
  { n: 41, bn: 'ফুস্সিলাত', mn: 'বিশদভাবে বিবৃত', ar: 'فصلت', type: 'makki', ayat: 54, en: 'Fussilat' },
  { n: 42, bn: 'আশ শুরা', mn: 'পরামর্শ', ar: 'الشورى', type: 'makki', ayat: 53, en: 'Ash-Shura' },
  { n: 43, bn: 'আয যুখরুফ', mn: 'সোনার অলংকার', ar: 'الزخرف', type: 'makki', ayat: 89, en: 'Az-Zukhruf' },
  { n: 44, bn: 'আদ দুখান', mn: 'ধোয়া', ar: 'الدخان', type: 'makki', ayat: 59, en: 'Ad-Dukhan' },
  { n: 45, bn: 'আল জাসিয়াহ', mn: 'নতজানু', ar: 'الجاثية', type: 'makki', ayat: 37, en: 'Al-Jathiyah' },
  { n: 46, bn: 'আল আহকাফ', mn: 'বালিয়াড়ি', ar: 'الأحقاف', type: 'makki', ayat: 35, en: 'Al-Ahqaf' },
  { n: 47, bn: 'মুহাম্মদ', mn: 'নবী মুহাম্মদ (সাঃ)', ar: 'محمد', type: 'madani', ayat: 38, en: 'Muhammad' },
  { n: 48, bn: 'আল ফাতহ', mn: 'বিজয়', ar: 'الفتح', type: 'madani', ayat: 29, en: 'Al-Fath' },
  { n: 49, bn: 'আল হুজুরাত', mn: 'কামরাসমূহ', ar: 'الحجرات', type: 'madani', ayat: 18, en: 'Al-Hujurat' },
  { n: 50, bn: 'কাফ', mn: 'কাফ', ar: 'ق', type: 'makki', ayat: 45, en: 'Qaf' },
  { n: 51, bn: 'আয যারিয়াত', mn: 'বিক্ষেপকারী বায়ু', ar: 'الذاريات', type: 'makki', ayat: 60, en: 'Adh-Dhariyat' },
  { n: 52, bn: 'আত তুর', mn: 'পর্বত', ar: 'الطور', type: 'makki', ayat: 49, en: 'At-Tur' },
  { n: 53, bn: 'আন নাজম', mn: 'তারা', ar: 'النجم', type: 'makki', ayat: 62, en: 'An-Najm' },
  { n: 54, bn: 'আল কামার', mn: 'চাঁদ', ar: 'القمر', type: 'makki', ayat: 55, en: 'Al-Qamar' },
  { n: 55, bn: 'আর রাহমান', mn: 'পরম করুণাময়', ar: 'الرحمن', type: 'madani', ayat: 78, en: 'Ar-Rahman' },
  { n: 56, bn: 'আল ওয়াকিয়াহ', mn: 'নিশ্চিত ঘটনা', ar: 'الواقعة', type: 'makki', ayat: 96, en: 'Al-Waqi\'ah' },
  { n: 57, bn: 'আল হাদীদ', mn: 'লোহা', ar: 'الحديد', type: 'madani', ayat: 29, en: 'Al-Hadid' },
  { n: 58, bn: 'আল মুজাদালাহ', mn: 'আবেদনকারিণী', ar: 'المجادلة', type: 'madani', ayat: 22, en: 'Al-Mujadilah' },
  { n: 59, bn: 'আল হাশর', mn: 'সমাবেশ', ar: 'الحشر', type: 'madani', ayat: 24, en: 'Al-Hashr' },
  { n: 60, bn: 'আল মুমতাহিনাহ', mn: 'পরীক্ষিতা নারী', ar: 'الممتحنة', type: 'madani', ayat: 13, en: 'Al-Mumtahanah' },
  { n: 61, bn: 'আস সফ', mn: 'সারিবদ্ধ সৈন্যদল', ar: 'الصف', type: 'madani', ayat: 14, en: 'As-Saff' },
  { n: 62, bn: 'আল জুমুআহ', mn: 'শুক্রবার', ar: 'الجمعة', type: 'madani', ayat: 11, en: 'Al-Jumu\'ah' },
  { n: 63, bn: 'আল মুনাফিকুন', mn: 'মুনাফিকরা', ar: 'المنافقون', type: 'madani', ayat: 11, en: 'Al-Munafiqun' },
  { n: 64, bn: 'আত তাগাবুন', mn: 'মোহমুক্তি', ar: 'التغابن', type: 'madani', ayat: 18, en: 'At-Taghabun' },
  { n: 65, bn: 'আত তালাক', mn: 'তালাক', ar: 'الطلاق', type: 'madani', ayat: 12, en: 'At-Talaq' },
  { n: 66, bn: 'আত তাহরীম', mn: 'নিষিদ্ধকরণ', ar: 'التحريم', type: 'madani', ayat: 12, en: 'At-Tahrim' },
  { n: 67, bn: 'আল মুলক', mn: 'রাজত্ব', ar: 'الملك', type: 'makki', ayat: 30, en: 'Al-Mulk' },
  { n: 68, bn: 'আল কালাম', mn: 'কলম', ar: 'القلم', type: 'makki', ayat: 52, en: 'Al-Qalam' },
  { n: 69, bn: 'আল হাককাহ', mn: 'অনিবার্য', ar: 'الحاقة', type: 'makki', ayat: 52, en: 'Al-Haqqah' },
  { n: 70, bn: 'আল মাআরিজ', mn: 'উর্ধ্বারোহণের সিঁড়ি', ar: 'المعارج', type: 'makki', ayat: 44, en: 'Al-Ma\'arij' },
  { n: 71, bn: 'নুহ', mn: 'নবী নুহ (আঃ)', ar: 'نوح', type: 'makki', ayat: 28, en: 'Nuh' },
  { n: 72, bn: 'আল জিন', mn: 'জিন', ar: 'الجن', type: 'makki', ayat: 28, en: 'Al-Jinn' },
  { n: 73, bn: 'আল মুযযাম্মিল', mn: 'চাদরাবৃত', ar: 'المزمل', type: 'makki', ayat: 20, en: 'Al-Muzzammil' },
  { n: 74, bn: 'আল মুদ্দাস্সির', mn: 'বস্ত্রাবৃত', ar: 'المدثر', type: 'makki', ayat: 56, en: 'Al-Muddaththir' },
  { n: 75, bn: 'আল কিয়ামাহ', mn: 'পুনরুত্থান', ar: 'القيامة', type: 'makki', ayat: 40, en: 'Al-Qiyamah' },
  { n: 76, bn: 'আল ইনসান', mn: 'মানুষ', ar: 'الإنسان', type: 'madani', ayat: 31, en: 'Al-Insan' },
  { n: 77, bn: 'আল মুরসালাত', mn: 'প্রেরিতগণ', ar: 'المرسلات', type: 'makki', ayat: 50, en: 'Al-Mursalat' },
  { n: 78, bn: 'আন নাবা', mn: 'মহাসংবাদ', ar: 'النبأ', type: 'makki', ayat: 40, en: 'An-Naba' },
  { n: 79, bn: 'আন নাযিআত', mn: 'আকর্ষণকারীগণ', ar: 'النازعات', type: 'makki', ayat: 46, en: 'An-Nazi\'at' },
  { n: 80, bn: 'আবাসা', mn: 'তিনি ভ্রুকুটি করলেন', ar: 'عبس', type: 'makki', ayat: 42, en: 'Abasa' },
  { n: 81, bn: 'আত তাকভীর', mn: 'অন্ধকারাচ্ছন্নতা', ar: 'التكوير', type: 'makki', ayat: 29, en: 'At-Takwir' },
  { n: 82, bn: 'আল ইনফিতার', mn: 'বিদীর্ণ হওয়া', ar: 'الانفطار', type: 'makki', ayat: 19, en: 'Al-Infitar' },
  { n: 83, bn: 'আল মুতাফফিফীন', mn: 'মাপে কম দেয় যারা', ar: 'المطففين', type: 'makki', ayat: 36, en: 'Al-Mutaffifin' },
  { n: 84, bn: 'আল ইনশিকাক', mn: 'বিচ্ছিন্ন হওয়া', ar: 'الانشقاق', type: 'makki', ayat: 25, en: 'Al-Inshiqaq' },
  { n: 85, bn: 'আল বুরুজ', mn: 'রাশিচক্র', ar: 'البروج', type: 'makki', ayat: 22, en: 'Al-Buruj' },
  { n: 86, bn: 'আত তারিক', mn: 'রাতের আগমনকারী', ar: 'الطارق', type: 'makki', ayat: 17, en: 'At-Tariq' },
  { n: 87, bn: 'আল আলা', mn: 'সর্বোচ্চ', ar: 'الأعلى', type: 'makki', ayat: 19, en: 'Al-A\'la' },
  { n: 88, bn: 'আল গাশিয়াহ', mn: 'অভিভূতকারী ঘটনা', ar: 'الغاشية', type: 'makki', ayat: 26, en: 'Al-Ghashiyah' },
  { n: 89, bn: 'আল ফজর', mn: 'ভোর', ar: 'الفجر', type: 'makki', ayat: 30, en: 'Al-Fajr' },
  { n: 90, bn: 'আল বালাদ', mn: 'নগর', ar: 'البلদ', type: 'makki', ayat: 20, en: 'Al-Balad' },
  { n: 91, bn: 'আশ শামস', mn: 'সূর্য', ar: 'الشمس', type: 'makki', ayat: 15, en: 'Ash-Shams' },
  { n: 92, bn: 'আল লাইল', mn: 'রাত', ar: 'الليل', type: 'makki', ayat: 21, en: 'Al-Layl' },
  { n: 93, bn: 'আদ দুহা', mn: 'পূর্বাহ্ন', ar: 'الضحى', type: 'makki', ayat: 11, en: 'Ad-Duha' },
  { n: 94, bn: 'আশ শারহ', mn: 'বক্ষ উন্মোচন', ar: 'الشرح', type: 'makki', ayat: 8, en: 'Ash-Sharh' },
  { n: 95, bn: 'আত তীন', mn: 'ডুমুর', ar: 'التين', type: 'makki', ayat: 8, en: 'At-Tin' },
  { n: 96, bn: 'আল আলাক', mn: 'জমাট রক্ত', ar: 'العلق', type: 'makki', ayat: 19, en: 'Al-\'Alaq' },
  { n: 97, bn: 'আল কদর', mn: 'মহিমান্বিত রাত', ar: 'القدر', type: 'makki', ayat: 5, en: 'Al-Qadr' },
  { n: 98, bn: 'আল বাইয়্যিনাহ', mn: 'সুস্পষ্ট প্রমাণ', ar: 'البينة', type: 'madani', ayat: 8, en: 'Al-Bayyinah' },
  { n: 99, bn: 'আয যিলযাল', mn: 'ভূমিকম্প', ar: 'الزلزلة', type: 'madani', ayat: 8, en: 'Az-Zalzalah' },
  { n: 100, bn: 'আল আদিয়াত', mn: 'দৌড়ন্ত অশ্বসমূহ', ar: 'العাদيات', type: 'makki', ayat: 11, en: 'Al-\'Adiyat' },
  { n: 101, bn: 'আল কারিয়াহ', mn: 'মহাবিপর্যয়', ar: 'القارعة', type: 'makki', ayat: 11, en: 'Al-Qari\'ah' },
  { n: 102, bn: 'আত তাকাসুর', mn: 'প্রাচুর্যের প্রতিযোগিতা', ar: 'التكاثر', type: 'makki', ayat: 8, en: 'At-Takathur' },
  { n: 103, bn: 'আল আসর', mn: 'সময়', ar: 'العصر', type: 'makki', ayat: 3, en: 'Al-\'Asr' },
  { n: 104, bn: 'আল হুমাযাহ', mn: 'পরচর্চাকারী', ar: 'الهمزة', type: 'makki', ayat: 9, en: 'Al-Humazah' },
  { n: 105, bn: 'আল ফীল', mn: 'হাতি', ar: 'الفيل', type: 'makki', ayat: 5, en: 'Al-Fil' },
  { n: 106, bn: 'কুরাইশ', mn: 'কুরাইশ গোত্র', ar: 'قريش', type: 'makki', ayat: 4, en: 'Quraysh' },
  { n: 107, bn: 'আল মাউন', mn: 'সামান্য সাহায্য', ar: 'الماعون', type: 'makki', ayat: 7, en: 'Al-Ma\'un' },
  { n: 108, bn: 'আল কাউসার', mn: 'কাউসার', ar: 'الكوثر', type: 'makki', ayat: 3, en: 'Al-Kawthar' },
  { n: 109, bn: 'আল কাফিরুন', mn: 'অবিশ্বাসীগণ', ar: 'الكافرون', type: 'makki', ayat: 6, en: 'Al-Kafirun' },
  { n: 110, bn: 'আন নাসর', mn: 'সাহায্য', ar: 'النصر', type: 'madani', ayat: 3, en: 'An-Nasr' },
  { n: 111, bn: 'আল মাসাদ', mn: 'খেজুরের ছড়া', ar: 'المسد', type: 'makki', ayat: 5, en: 'Al-Masad' },
  { n: 112, bn: 'আল ইখলাস', mn: 'একনিষ্ঠতা', ar: 'الإخلاص', type: 'makki', ayat: 4, en: 'Al-Ikhlas' },
  { n: 113, bn: 'আল ফালাক', mn: 'ভোরের আলো', ar: 'الفلق', type: 'makki', ayat: 5, en: 'Al-Falaq' },
  { n: 114, bn: 'আন নাস', mn: 'মানবজাতি', ar: 'الناس', type: 'makki', ayat: 6, en: 'An-Nas' }
];

// Endpoint: Get list of all 114 Surahs
app.get("/api/surahs", (req, res) => {
  res.json(SURAH_LIST);
});

// Endpoint: Get detailed Surah verses (Arabic and Bangla matched)
app.get("/api/surah/:id", async (req, res) => {
  const surahId = parseInt(req.params.id);
  if (isNaN(surahId) || surahId < 1 || surahId > 114) {
    return res.status(400).json({ error: "Invalid Surah number. Must be between 1 and 114." });
  }

  // Check cache first
  if (surahCache.has(surahId)) {
    return res.json(surahCache.get(surahId));
  }

  try {
    // We query both the simple Arabic text and the standard Muhiuddin Khan translation together
    const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-simple,bn.bengali`);
    if (response.data && response.data.code === 200) {
      const arabicEdition = response.data.data[0];
      const bengaliEdition = response.data.data[1];

      const ayahs = arabicEdition.ayahs.map((ayah: any, index: number) => {
        return {
          number: ayah.number,
          numberInSurah: ayah.numberInSurah,
          text: ayah.text,
          translation: bengaliEdition.ayahs[index] ? bengaliEdition.ayahs[index].text : '',
          juz: ayah.juz
        };
      });

      const meta = SURAH_LIST.find(s => s.n === surahId);
      const isFatihahOrTawbah = surahId === 1 || surahId === 9;

      const surahResult = {
        ...meta,
        hasBismillah: !isFatihahOrTawbah,
        ayahs
      };

      // Store in memory cache
      surahCache.set(surahId, surahResult);
      return res.json(surahResult);
    } else {
      throw new Error("Failed to receive valid status from Quran API.");
    }
  } catch (error: any) {
    console.error(`Error fetching surah ${surahId}:`, error.message);
    return res.status(500).json({ error: "অনলাইন তথ্যভাণ্ডার থেকে সূরা লোড করতে ব্যর্থ হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।" });
  }
});

// Endpoint: Robust Offline All-in-One Surah API (Arabic + Translation + Pronunciation)
app.get("/api/quran/offline/:id", async (req, res) => {
  const surahId = parseInt(req.params.id);
  if (isNaN(surahId) || surahId < 1 || surahId > 114) {
    return res.status(400).json({ error: "Invalid Surah number. Must be between 1 and 114." });
  }

  if (offlineSurahCache.has(surahId)) {
    return res.json(offlineSurahCache.get(surahId));
  }

  try {
    let surahData;
    if (surahCache.has(surahId)) {
      surahData = surahCache.get(surahId);
    } else {
      const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-simple,bn.bengali`);
      if (response.data && response.data.code === 200) {
        const arabicEdition = response.data.data[0];
        const bengaliEdition = response.data.data[1];
        const ayahs = arabicEdition.ayahs.map((ayah: any, index: number) => ({
          number: ayah.number,
          numberInSurah: ayah.numberInSurah,
          text: ayah.text,
          translation: bengaliEdition.ayahs[index] ? bengaliEdition.ayahs[index].text : '',
          juz: ayah.juz
        }));
        const meta = SURAH_LIST.find(s => s.n === surahId);
        surahData = { ...meta, hasBismillah: surahId !== 1 && surahId !== 9, ayahs };
        surahCache.set(surahId, surahData);
      }
    }

    if (!surahData) {
      throw new Error(`Unable to fetch Surah data for id ${surahId}`);
    }

    const ayahsWithPronunciation = [];
    const missingVerses = [];

    for (const ayah of surahData.ayahs) {
      const key = `${surahId}:${ayah.numberInSurah}`;
      if (pronunciationCache.has(key)) {
        ayahsWithPronunciation.push({
          ...ayah,
          pronunciation: pronunciationCache.get(key)
        });
      } else {
        missingVerses.push(ayah);
        ayahsWithPronunciation.push({
          ...ayah,
          pronunciation: null
        });
      }
    }

    if (missingVerses.length > 0) {
      try {
        const genAI = getGenAI();
        const chunkSize = 25;
        for (let i = 0; i < missingVerses.length; i += chunkSize) {
          const chunk = missingVerses.slice(i, i + chunkSize);
          const prompt = `আল কুরআনের সূরা নম্বর ${surahId} এর নিম্নলিখিত আয়াতগুলোর জন্য বাংলায় অতি সহজবোধ্য এবং নির্ভুল উচ্চারণ (Bengali phonetic transliteration/pronunciation) প্রস্তুত করুন।
          ${chunk.map(c => `আয়াত ${c.numberInSurah}: "${c.text}"`).join("\n")}
          
          json ফরম্যাটে উত্তরটি দিন যেখানে কী (key) হবে আয়াত নম্বর (সংখ্যায়) এবং ভ্যালু (value) হবে বাংলা উচ্চারণ:
          {
            ${chunk.map(c => `"${c.numberInSurah}": "বাংলা উচ্চারণ"`).join(",\n")}
          }
          কোনো প্রকার ভূমিকা বা অতিরিক্ত ডেকোরেশন ছাড়া শুধুমাত্র বাংলা উচ্চারণ সম্বলিত JSON অবজেক্টটি ফেরত দিন।`;

          const response = await genAI.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });

          const responseText = response.text ? response.text.trim() : "";
          const parsed = JSON.parse(responseText);
          for (const key of Object.keys(parsed)) {
            const num = parseInt(key);
            const val = parsed[key];
            if (!isNaN(num) && val) {
              pronunciationCache.set(`${surahId}:${num}`, val);
              const idx = ayahsWithPronunciation.findIndex(a => a.numberInSurah === num);
              if (idx !== -1) {
                ayahsWithPronunciation[idx].pronunciation = val;
              }
            }
          }
        }
      } catch (geminiErr: any) {
        console.error(`Gemini automatic pronunciation failed for surah ${surahId}:`, geminiErr.message);
      }

      for (const ayah of ayahsWithPronunciation) {
        if (!ayah.pronunciation) {
          ayah.pronunciation = `বিসমিল্লাহ ও আল্লাহর স্মরণ সহকারে অফলাইনে তিলাওয়াত করুন।`;
        }
      }
    }

    const finalResult = {
      ...surahData,
      ayahs: ayahsWithPronunciation
    };

    offlineSurahCache.set(surahId, finalResult);
    return res.json(finalResult);

  } catch (error: any) {
    console.error(`Offline Surah processing error: ${error.message}`);
    return res.status(500).json({ error: "সূরাটির প্রতিটি আয়াতের বাংলা উচ্চারণসহ অফলাইন ব্যাকআপ এপিআই ফাইল প্রস্তুত করতে সমস্যা হয়েছে।" });
  }
});

// Endpoint: Dynamic AI Introduction for the Surah
app.get("/api/surah-intro/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1 || id > 114) {
    return res.status(400).json({ error: "Invalid surah number." });
  }

  if (introCache.has(id)) {
    return res.json(introCache.get(id));
  }

  try {
    const meta = SURAH_LIST.find(s => s.n === id);
    if (!meta) throw new Error("Surah not found.");

    const genAI = getGenAI();
    const prompt = `আল কুরআনের সূরা '${meta.bn}' (সূরা নম্বর ${meta.n}, আয়াত সংখ্যা ${meta.ayat}, এবং এটি একটি ${meta.type === 'makki' ? 'মাক্কী' : 'মাদানী'} সূরা) এর জন্য অনুগ্রহ করে একটি হৃদয়গ্রাহী ও বুদ্ধিদীপ্ত পরিচিতি বা শান-ই-নুযূল প্রস্তুত করুন।

নিম্নলিখিত JSON বিন্যাসে উত্তরটি দিন:
{
  "summary": "সূরাটির সামগ্রিক সারসংক্ষেপ বাংলা ভাষায় ১-২ প্যারাগ্রাফে লিখুন। এটি কিসের ওপর আলোকপাত করে?",
  "theme": "সূরাটির মূল বিষয়বস্তুসমূহ ও প্রধান গাইডলাইনগুলো ৩-৪টি সুন্দর পয়েন্টে ভেঙে লিখুন।",
  "background": "সূরাটির অবতরণের ঐতিহাসিক প্রেক্ষাপট ও শান-ই-নুযূল বিস্তারিতভাবে সুন্দর করে বাংলা ভাষায় বিবৃত করুন।"
}

অবশ্যই কোনো প্রকার চ্যাট গালগল্প বা ব্যাকটিকস ছাড়া শুধুমাত্র শুদ্ধ বাংলা ভাষায় উপরোক্ত নিখুঁত JSON ফেরত পাঠান।`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            theme: { type: Type.STRING },
            background: { type: Type.STRING }
          },
          required: ["summary", "theme", "background"]
        }
      }
    });

    const text = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(text);
    introCache.set(id, parsed);
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Introduction error:", err.message);
    // Return standard offline fallback intro
    const fallback = {
      summary: "এই সূরাটি আল কুরআনের একটি অত্যন্ত গুরুত্বপূর্ণ অধ্যায়। এর বাণী ও হিদায়াত আমাদের ঈমানকে মজবুত করে এবং সঠিক পথ প্রদর্শন করে।",
      theme: "• তাওহীদ, আখিরাত এবং আমল\n• মুমিনদের গুণাবলী ও দায়িত্ব\n• অন্যায় বর্জনের তাগিদ ও আল্লাহর দয়া",
      background: "এই সূরাটির ঐতিহাসিক প্রেক্ষাপট গভীর এবং এতে মানবজাতির কল্যাণ ও সঠিক জীবন পরিচালনার জন্য অমূল্য দিকনির্দেশনা রয়েছে।"
    };
    return res.json(fallback);
  }
});

// Endpoint: Dynamic AI Verse Translation, Pronunciation, and Tafsir
app.post("/api/explain", async (req, res) => {
  const { surah, ayah, text, translation } = req.body;
  if (!surah || !ayah) {
    return res.status(400).json({ error: "Missing required fields surah and ayah." });
  }

  const cacheKey = `${surah}:${ayah}`;
  if (explanationCache.has(cacheKey)) {
    return res.json(explanationCache.get(cacheKey));
  }

  try {
    const meta = SURAH_LIST.find(s => s.n === Number(surah));
    const genAI = getGenAI();

    const prompt = `আল কুরআনের সূরা '${meta ? meta.bn : surah}' (সূরা নম্বর ${surah}), আয়াত নম্বর ${ayah} এর বিস্তারিত তাফসীর, বাংলা উচ্চারণ ও শিক্ষা প্রয়োজন।
আরবী আয়াত: "${text || ''}"
বাংলা অর্থ: "${translation || ''}"

নিম্নলিখিত নির্দিষ্ট JSON বিন্যাসে উত্তর দিন:
{
  "pronunciation": "বাংলা অক্ষরে সঠিক সহজবোধ্য উচ্চারণ (যাতে সাধারণ মানুষ সহজে পাঠ করতে পারেন)। উদাহরণ: 'আলহামদু লিল্লাহি রাব্বিল আলামীন।'",
  "context": "এই আয়াতের শান-ই-নুযূল বা বিশেষ ঐতিহাসিক কারণ (যদি থাকে, অন্যথায় 'সাধারণ আলোচনা' লিখে শুরু করুন) সুন্দর বাংলা ভাষায় প্রদান করুন",
  "explanation": "এই আয়াতের গভীর তাৎপর্য, তাফসীর ও তাত্ত্বিক আলোচনা ৩-৪টি সুন্দর বাক্যে বুঝিয়ে বলুন",
  "lessons": "এই আয়াত থেকে আমাদের মানবজীবন ও দৈনিক আমলের জন্য ২-৩টি গুরুত্বপূর্ণ বাস্তব শিক্ষা বুলেটে দিন"
}

অবশ্যই কোনো প্রকার অতিরিক্ত ব্যাকটিকস বা অন্য কিছু না লিখে শুধু বিশুদ্ধ বাংলা ভাষার JSON ফেরত দেবেন।`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pronunciation: { type: Type.STRING },
            context: { type: Type.STRING },
            explanation: { type: Type.STRING },
            lessons: { type: Type.STRING }
          },
          required: ["pronunciation", "context", "explanation", "lessons"]
        }
      }
    });

    const responseText = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(responseText);
    explanationCache.set(cacheKey, parsed);
    return res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Verse Explain error:", err.message);
    const fallback = {
      pronunciation: "উচ্চারণ সংযোগের কারণে তাৎক্ষণিকভাবে লোড করা সম্ভব হয়নি। অনুগ্রহ করে কিছুক্ষণ পর পুনরায় চেষ্টা করুন।",
      context: "এই আয়াতে ইসলাম ও সঠিক জীবনব্যবস্থা নিয়ে অত্যন্ত মূল্যবান সত্য উন্মোচন করা হয়েছে।",
      explanation: "আল্লাহ তাআলা তাঁর পবিত্র বাণীতে মানবসমাজকে অন্ধকার থেকে আলোর দিকে ডাকার নির্দেশনা দিয়েছেন এবং সকল বিষয়ে সত্যের অনুগামী হতে আহ্বান জানিয়েছেন।",
      lessons: "১. আল্লাহর প্রতি দৃঢ়ভাবে বিশ্বাস ও ভীতি রাখা।\n২. সৎ কাজে সদা নিয়োজিত থাকা এবং পাপ কাজে নিরুৎসাহিত করা।"
    };
    return res.json(fallback);
  }
});

// Endpoint: Batch generation of Bengali Pronunciations for Surah verses (for offline/default view)
app.post("/api/batch-pronounce", async (req, res) => {
  const { surahId, verses } = req.body;
  if (!surahId || !Array.isArray(verses) || verses.length === 0) {
    return res.status(400).json({ error: "Missing required fields: surahId or verses." });
  }

  // Check cache first
  const results: Record<number, string> = {};
  const versesToFetch: { numberInSurah: number; text: string }[] = [];

  for (const v of verses) {
    const key = `${surahId}:${v.numberInSurah}`;
    if (pronunciationCache.has(key)) {
      results[v.numberInSurah] = pronunciationCache.get(key)!;
    } else {
      versesToFetch.push(v);
    }
  }

  if (versesToFetch.length === 0) {
    return res.json(results);
  }

  try {
    const genAI = getGenAI();
    const chunkSize = 25; // chunk size for stability and token limits

    for (let i = 0; i < versesToFetch.length; i += chunkSize) {
      const chunk = versesToFetch.slice(i, i + chunkSize);
      
      const prompt = `আল কুরআনের সূরা নম্বর ${surahId} এর নিম্নলিখিত আয়াতগুলোর জন্য বাংলায় অতি সহজবোধ্য এবং নির্ভুল উচ্চারণ (Bengali phonetic transliteration/pronunciation) প্রস্তুত করুন। সাধারণ বাঙালি মুসলিম যাতে আরবী পড়তে না জেনেও এই উচ্চারণ দেখে সহজে মায়োর্জ করে সহীহ তিলাওয়াত করতে পারেন।
      
      নিম্নলিখিত আরবী আয়াতগুলো দেওয়া হলো:
      ${chunk.map(c => `আয়াত ${c.numberInSurah}: "${c.text}"`).join("\n")}
      
      নিম্নলিখিত JSON বিন্যাসে উত্তরটি দিন যেখানে কী (key) হবে আয়াত নম্বর (সংখ্যায়) এবং ভ্যালু (value) হবে বাংলা উচ্চারণ:
      {
        ${chunk.map(c => `"${c.numberInSurah}": "বাংলা উচ্চারণ"`).join(",\n")}
      }
      
      কোনো প্রকার চ্যাট, ভূমিকা, ব্যাকটিকস বা অন্য কোনো টেক্সট ছাড়া শুধুমাত্র বাংলা উচ্চারণ সম্বলিত JSON অবজেক্টটি ফেরত দিন।`;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text ? response.text.trim() : "";
      try {
        const parsed = JSON.parse(responseText);
        for (const key of Object.keys(parsed)) {
          const num = parseInt(key);
          const val = parsed[key];
          if (!isNaN(num) && val) {
            results[num] = val;
            pronunciationCache.set(`${surahId}:${num}`, val);
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse batch pronunciation response", responseText, parseErr);
        // Fallback for this chunk so we don't block
        for (const c of chunk) {
          results[c.numberInSurah] = `উচ্চারণ লোড করা যাচ্ছে না।`;
        }
      }
    }

    return res.json(results);
  } catch (err: any) {
    console.error("Batch pronunciation error:", err.message);
    // Return graceful partial results if we failed
    for (const v of versesToFetch) {
      if (!results[v.numberInSurah]) {
        results[v.numberInSurah] = "উচ্চারণ সংযোগের কারণে তাৎক্ষণিকভাবে লোড করা সম্ভব হয়নি।";
      }
    }
    return res.json(results);
  }
});

// Endpoint: Dynamic AI Hadith Lookup and Explanation matching muslimbangla.com
app.post("/api/hadith-lookup", async (req, res) => {
  const { query, book, hadithNumber } = req.body;
  
  try {
    const genAI = getGenAI();
    let prompt = "";
    
    if (book && hadithNumber) {
      prompt = `অনুগ্রহ করে নির্ভরযোগ্য হাদীস গ্রন্থ '${book}' হতে হাদীস নম্বর '${hadithNumber}' খুঁজে বের করুন এবং তা বিস্তারিত বাংলা ও আরবী সহ উপস্থাপন করুন। যদি আপনি নির্দিষ্ট ওই হাদীসটি খুঁজে না পান, তবে তার কাছাকাছি বিষয়ের ওপর উক্ত গ্রন্থের একটি সহীহ হাদীস প্রদান করুন।

নিম্নলিখিত JSON ফরম্যাটে তথ্যটি প্রদান করুন:
{
  "book": "গ্রন্থের নাম এবং হাদীস নম্বর (যেমন: সহীহ বুখারী, হাদীস: ৫)",
  "chapter": "হাদীসের মূল অধ্যায় বা অনুচ্ছেদের নাম বাংলায়",
  "narrator": "হাদীসের প্রধান রাবী বা বর্ণনাকারীর নাম (যেমন: হযরত আবু হুরায়রা (রাঃ) হতে বর্ণিত)",
  "ar": "হাদীসের মূল আরবী টেক্সট (অবশ্যই শুদ্ধ আরবী ও হরকত যুক্ত)",
  "bn": "হাদীসের শুদ্ধ ও চমৎকার বাংলা অনুবাদ",
  "relevance": "হাদীসটি কেন অত্যন্ত গুরুত্বপূর্ণ এবং ও আমাদের বাস্তব জীবনে এর প্রধান শিক্ষা কীভাবে প্রয়োগ করব সে সম্পর্কে আলোচনা",
  "status": "হাদীসের মান বা শুদ্ধতা স্তর (যেমন: সহীহ / হাসান / যয়ীফ)"
}

কোনো ভূমিকা, অতিরিক্ত আলোচনা বা ব্যাকটিকস ছাড়া শুধুমাত্র উল্লিখিত বাংলা ভাষার JSON ফেরত দেবেন।`;
    } else {
      prompt = `ব্যবহারকারী হাদীস গ্রন্থ বা কোনো ইসলামি বিষয়ের ওপর হাদীসটি সার্চ করেছেন: "${query || 'রাসূলুল্লাহর বাণী'}"।
এই বিষয়ের ওপর নির্ভরযোগ্য হাদীস গ্রন্থ (যেমন: সহীহ বুখারী, সহীহ মুসলিম, তিরমিযী, আবু দাউদ, ইত্যাদি) হতে একটি অত্যন্ত বিখ্যাত ও সহীহ হাদীস খুঁজে বের করুন।

নিম্নলিখিত JSON ফরম্যাটে তথ্যটি প্রদান করুন:
{
  "book": "গ্রন্থের নাম এবং হাদীস নম্বর (যেমন: সহীহ বুখারী, হাদীস: ১)",
  "chapter": "হাদীসের অধ্যায় বা চ্যাপ্টারের নাম বাংলায়",
  "narrator": "হাদীসের রাবী বা প্রথম বর্ণনাকারীর নাম এবং (রাঃ) বা (আনহা)",
  "ar": "হাদীসের আরবী টেক্সট (অবশ্যই শুদ্ধ আরবী হরকত সহ)",
  "bn": "হাদীসের শুদ্ধ বাংলা অনুবাদ",
  "relevance": "হাদীসটির মূল শিক্ষা, গুরুত্ব এবং আমাদের বাস্তব জীবনে এর উপকারিতা ও আমল",
  "status": "হাদীসের মান (যেমন: সহীহ)"
}

কোনো প্রকার অতিরিক্ত চ্যাট বা ব্যাকটিকস ছাড়া শুধুমাত্র উল্লিখিত বাংলা ভাষার সূক্ষ্ম JSON ফেরত দেবেন।`;
    }

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            book: { type: Type.STRING },
            chapter: { type: Type.STRING },
            narrator: { type: Type.STRING },
            ar: { type: Type.STRING },
            bn: { type: Type.STRING },
            relevance: { type: Type.STRING },
            status: { type: Type.STRING }
          },
          required: ["book", "chapter", "narrator", "ar", "bn", "relevance", "status"]
        }
      }
    });

    const responseText = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(responseText);
    return res.json(parsed);
  } catch (err: any) {
    console.error("Hadith Lookup error:", err.message);
    return res.status(500).json({ error: "হাদীসটি অনুসন্ধান করতে সমস্যা হয়েছে। অনুগ্রহ করে বিষয়ের নাম পরিবর্তন করে আবার চেষ্টা করুন।" });
  }
});

// Vite middleware configuration for Development vs. Production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite().catch(err => {
  console.error("Failed to start server:", err);
});
