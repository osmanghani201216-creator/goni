export interface SurahSummary {
  n: number;      // Surah number
  bn: string;     // Bangla name
  en: string;     // English name
  ar: string;     // Arabic name
  mn: string;     // Meaning of the Surah name in Bangla
  type: 'makki' | 'madani'; // Classification
  ayat: number;   // Verse count
}

export interface Ayah {
  number: number;         // Global Ayah number
  numberInSurah: number;  // Ayah number inside the Surah
  text: string;           // Arabic text
  translation: string;    // Bangla translation text
  juz: number;
  pronunciation?: string; // Optional Bengali transliteration / pronunciation
}

export interface SurahDetails extends SurahSummary {
  ayahs: Ayah[];
  hasBismillah: boolean;
}

export interface TafsirResponse {
  pronunciation: string;  // Bengali pronunciation
  explanation: string;    // Bengali explanation/tafsir
  lessons: string;        // Lessons for daily life in Bangla
  context?: string;       // Shan-e-Nuzul if available
}

export interface SurahIntroduction {
  summary: string;        // Overall summary of the Surah
  theme: string;          // Main themes & lessons
  background: string;     // Historical background
}

export interface StudyCircle {
  id: string;
  title: string;
  description?: string;
  hostUid: string;
  hostName: string;
  hostPhoto?: string;
  meetLink: string;
  scheduledTime: string;
  createdAt: string;
}

