import React, { useState, useEffect } from "react";
import SuraGrid from "./components/SuraGrid.tsx";
import SuraReader from "./components/SuraReader.tsx";
import TopicalVerses from "./components/TopicalVerses.tsx";
import JuzList from "./components/JuzList.tsx";
import HadithBrowser from "./components/HadithBrowser.tsx";
import QuranQuiz from "./components/QuranQuiz.tsx";
import MySaved from "./components/MySaved.tsx";
import DailyVerse from "./components/DailyVerse.tsx";
import GoogleMeetStudyCircle from "./components/GoogleMeetStudyCircle.tsx";
import GoogleClassroomStudy from "./components/GoogleClassroomStudy.tsx";
import { MASAIL_DATA } from "./data/masail.ts";
import { ALL_SURAS } from "./data.ts";
import { 
  BookOpen, Sparkles, BookCheck, ShieldAlert, Heart, Calendar, 
  Search, Lock, MapPin, Moon, Sun, CheckCircle, HelpCircle, 
  ChevronDown, ChevronUp, User, Settings, LogOut, Info, ClipboardCheck,
  Trophy, Bookmark, Bell, BellOff, Download, Check, Trash2, Database, Wifi, WifiOff, RefreshCw, Video, GraduationCap
} from "lucide-react";

// Firebase Imports
import { 
  auth, db, googleProvider, OperationType, handleFirestoreError 
} from "./lib/firebase.ts";
import { 
  onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser, GoogleAuthProvider 
} from "firebase/auth";
import { 
  doc, setDoc, getDoc, getDocs, collection, deleteDoc 
} from "firebase/firestore";

const toBengaliNumber = (num: number) => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).split("").map(d => {
    const parsed = parseInt(d);
    return isNaN(parsed) ? d : banglaDigits[parsed];
  }).join("");
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"quran" | "hadith" | "quiz" | "prayer" | "masail" | "dua" | "admin-panel" | "saved" | "meetings" | "classroom">("quran");
  const [quranTab, setQuranTab] = useState<"suras" | "topics" | "juz">("suras");
  const [activeSurah, setActiveSurah] = useState<number | null>(null);
  const [meetAccessToken, setMeetAccessToken] = useState<string | null>(null);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Bookmark state & storage
  const [savedVerses, setSavedVerses] = useState<{ surahId: number; surahName: string; verseNumber: number; ar: string; bn: string }[]>([]);
  const [savedHadiths, setSavedHadiths] = useState<{ id: string; book: string; ar: string; bn: string; narrator?: string; chapter?: string }[]>([]);
  const [recitedDuas, setRecitedDuas] = useState<Record<number, number>>({});

  // Auth observer and synchronization logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Create or sync profile in Firestore
        const userRef = doc(db, "users", user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || "",
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Firestore user profile error:", error);
        }

        // Synchronize and load Saved Verses
        const versesPath = `users/${user.uid}/saved_verses`;
        try {
          const verseDocs = await getDocs(collection(db, versesPath));
          const dbVerses = verseDocs.docs.map(doc => {
            const data = doc.data();
            return {
              surahId: data.surahId,
              surahName: data.surahName,
              verseNumber: data.verseNumber,
              ar: data.ar,
              bn: data.bn
            };
          });

          const localVersesJSON = localStorage.getItem("saved_verses");
          const localVerses = localVersesJSON ? JSON.parse(localVersesJSON) : [];
          const combined = [...dbVerses];

          for (const l of localVerses) {
            const existsInDb = dbVerses.some(d => d.surahId === l.surahId && d.verseNumber === l.verseNumber);
            if (!existsInDb) {
              combined.push(l);
              const docId = `${l.surahId}_${l.verseNumber}`;
              await setDoc(doc(db, `users/${user.uid}/saved_verses`, docId), {
                ...l,
                savedAt: new Date().toISOString()
              });
            }
          }
          setSavedVerses(combined);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, versesPath);
        }

        // Synchronize and load Saved Hadiths
        const hadithsPath = `users/${user.uid}/saved_hadiths`;
        try {
          const hadithDocs = await getDocs(collection(db, hadithsPath));
          const dbHadiths = hadithDocs.docs.map(doc => {
            const data = doc.data();
            return {
              id: data.id,
              book: data.book,
              ar: data.ar,
              bn: data.bn,
              narrator: data.narrator,
              chapter: data.chapter
            };
          });

          const localHadithsJSON = localStorage.getItem("saved_hadiths");
          const localHadiths = localHadithsJSON ? JSON.parse(localHadithsJSON) : [];
          const combined = [...dbHadiths];

          for (const l of localHadiths) {
            const existsInDb = dbHadiths.some(d => d.id === l.id);
            if (!existsInDb) {
              combined.push(l);
              const docId = l.id.replace(/[^a-zA-Z0-9_\-]/g, "_");
              await setDoc(doc(db, `users/${user.uid}/saved_hadiths`, docId), {
                ...l,
                savedAt: new Date().toISOString()
              });
            }
          }
          setSavedHadiths(combined);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, hadithsPath);
        }

        // Synchronize and load Recited Duas
        const recitedDuasPath = `users/${user.uid}/recited_duas`;
        try {
          const recitedDocs = await getDocs(collection(db, recitedDuasPath));
          const dbRecited: Record<number, number> = {};
          recitedDocs.docs.forEach(doc => {
            const data = doc.data();
            if (typeof data.duaId === "number" && (typeof data.count === "number" || typeof data.count === "string")) {
              dbRecited[data.duaId] = Number(data.count);
            }
          });

          const localRecitedJSON = localStorage.getItem("recited_duas");
          const localRecited: Record<number, number> = localRecitedJSON ? JSON.parse(localRecitedJSON) : {};
          const combinedRecited = { ...dbRecited };

          for (const [duaIdStr, localCount] of Object.entries(localRecited)) {
            const dId = Number(duaIdStr);
            const dbCount = dbRecited[dId] || 0;
            if (localCount > dbCount) {
              combinedRecited[dId] = localCount;
              const docId = String(dId);
              await setDoc(doc(db, `users/${user.uid}/recited_duas`, docId), {
                duaId: dId,
                count: localCount,
                updatedAt: new Date().toISOString()
              });
            }
          }
          setRecitedDuas(combinedRecited);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, recitedDuasPath);
        }
      } else {
        // Fallback to local storage when logged out
        try {
          const localV = localStorage.getItem("saved_verses");
          setSavedVerses(localV ? JSON.parse(localV) : []);
          const localH = localStorage.getItem("saved_hadiths");
          setSavedHadiths(localH ? JSON.parse(localH) : []);
          const localR = localStorage.getItem("recited_duas");
          setRecitedDuas(localR ? JSON.parse(localR) : {});
        } catch {
          setSavedVerses([]);
          setSavedHadiths([]);
          setRecitedDuas({});
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setMeetAccessToken(credential.accessToken);
      }
    } catch (error) {
      console.error("Google sign in failed:", error);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleToggleVerse = async (surahId: number, surahName: string, verseNumber: number, ar: string, bn: string) => {
    const exists = savedVerses.some(v => v.surahId === surahId && v.verseNumber === verseNumber);
    let updated;
    if (exists) {
      updated = savedVerses.filter(v => !(v.surahId === surahId && v.verseNumber === verseNumber));
      if (auth.currentUser) {
        const docId = `${surahId}_${verseNumber}`;
        const path = `users/${auth.currentUser.uid}/saved_verses/${docId}`;
        try {
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/saved_verses`, docId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    } else {
      const newVerse = { surahId, surahName, verseNumber, ar, bn };
      updated = [...savedVerses, newVerse];
      if (auth.currentUser) {
        const docId = `${surahId}_${verseNumber}`;
        const path = `users/${auth.currentUser.uid}/saved_verses/${docId}`;
        try {
          await setDoc(doc(db, `users/${auth.currentUser.uid}/saved_verses`, docId), {
            ...newVerse,
            savedAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    }
    setSavedVerses(updated);
    if (!auth.currentUser) {
      localStorage.setItem("saved_verses", JSON.stringify(updated));
    }
  };

  const handleToggleHadith = async (key: string, book: string, ar: string, bn: string, narrator?: string, chapter?: string) => {
    const exists = savedHadiths.some(h => h.id === key);
    let updated;
    if (exists) {
      updated = savedHadiths.filter(h => h.id !== key);
      if (auth.currentUser) {
        const docId = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const path = `users/${auth.currentUser.uid}/saved_hadiths/${docId}`;
        try {
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/saved_hadiths`, docId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    } else {
      const newHadith = { id: key, book, ar, bn, narrator: narrator || "", chapter: chapter || "" };
      updated = [...savedHadiths, newHadith];
      if (auth.currentUser) {
        const docId = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const path = `users/${auth.currentUser.uid}/saved_hadiths/${docId}`;
        try {
          await setDoc(doc(db, `users/${auth.currentUser.uid}/saved_hadiths`, docId), {
            ...newHadith,
            savedAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    }
    setSavedHadiths(updated);
    if (!auth.currentUser) {
      localStorage.setItem("saved_hadiths", JSON.stringify(updated));
    }
  };

  const handleIncrementRecite = async (duaId: number) => {
    const currentCount = recitedDuas[duaId] || 0;
    const newCount = currentCount + 1;
    const updated = { ...recitedDuas, [duaId]: newCount };
    setRecitedDuas(updated);

    if (auth.currentUser) {
      const docId = String(duaId);
      const path = `users/${auth.currentUser.uid}/recited_duas/${docId}`;
      try {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/recited_duas`, docId), {
          duaId,
          count: newCount,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      localStorage.setItem("recited_duas", JSON.stringify(updated));
    }
  };

  const handleResetRecite = async (duaId: number) => {
    const updated = { ...recitedDuas };
    delete updated[duaId];
    setRecitedDuas(updated);

    if (auth.currentUser) {
      const docId = String(duaId);
      const path = `users/${auth.currentUser.uid}/recited_duas/${docId}`;
      try {
        await deleteDoc(doc(db, `users/${auth.currentUser.uid}/recited_duas`, docId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      localStorage.setItem("recited_duas", JSON.stringify(updated));
    }
  };

  // States for other tabs
  const [searchDua, setSearchDua] = useState("");
  const [selectedDuaCat, setSelectedDuaCat] = useState("all");
  const [searchMasail, setSearchMasail] = useState("");
  const [selectedMasailCat, setSelectedMasailCat] = useState("all");
  const [selectedCity, setSelectedCity] = useState("ঢাকা");
  
  // Expanded states for acordions
  const [expandedMasail, setExpandedMasail] = useState<number | null>(null);
  const [expandedDua, setExpandedDua] = useState<number | null>(null);

  // Admin login states
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Android Developer Hub Sub-Tabs
  const [adminSubTab, setAdminSubTab] = useState<"server" | "android">("android");
  const [androidSubTab, setAndroidSubTab] = useState<"retrofit" | "room" | "sync" | "offline">("retrofit");
  const [copiedCodeText, setCopiedCodeText] = useState<string | null>(null);

  // Offline Surah interactive states
  const [offlineSurahId, setOfflineSurahId] = useState<number>(1);
  const [offlineDataPreview, setOfflineDataPreview] = useState<string | null>(null);
  const [isFetchingOffline, setIsFetchingOffline] = useState<boolean>(false);

  // Advanced Visual Offline Sync & Caching States for Admin Dashboard
  const [downloadedAdminIds, setDownloadedAdminIds] = useState<number[]>([]);
  const [isAdminSyncingAll, setIsAdminSyncingAll] = useState(false);
  const [adminSyncProgress, setAdminSyncProgress] = useState(0);
  const [currentSyncingSurahName, setCurrentSyncingSurahName] = useState("");
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [saveLocalProgress, setSaveLocalProgress] = useState(0);
  const [saveLocalStatusText, setSaveLocalStatusText] = useState("");
  const [adminOnline, setAdminOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setAdminOnline(true);
    const handleOffline = () => setAdminOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const scanAdminOfflineCache = () => {
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
    const uniqIds = Array.from(new Set(ids));
    setDownloadedAdminIds(uniqIds.sort((a, b) => a - b));
  };

  useEffect(() => {
    scanAdminOfflineCache();
  }, []);

  const saveToLocalStorageOffline = async (id: number) => {
    if (isSavingLocal) return;
    setIsSavingLocal(true);
    setSaveLocalProgress(15);
    setSaveLocalStatusText("ডাটাবেসের সাথে সংযুক্ত করা হচ্ছে...");
    try {
      const response = await fetch(`/api/quran/offline/${id}`);
      setSaveLocalProgress(45);
      setSaveLocalStatusText("সূরাটির বাংলা উচ্চারণ ও আয়াতসমূহ প্রস্তুত হচ্ছে...");
      if (!response.ok) throw new Error("Failed to fetch surah data");
      const data = await response.json();
      
      setSaveLocalProgress(75);
      setSaveLocalStatusText("ব্রাউজার লোকাল মেমোরিতে ফাইল সিঙ্ক করা হচ্ছে...");
      localStorage.setItem(`quran_surah_offline_${id}`, JSON.stringify(data));
      localStorage.setItem(`quran_surah_offline_details_${id}`, JSON.stringify(data));
      
      setSaveLocalProgress(100);
      setSaveLocalStatusText("সফলভাবে অফলাইন স্টোরেজে সংরক্ষিত হয়েছে!");
      scanAdminOfflineCache();
      setOfflineDataPreview(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setSaveLocalStatusText("ডাউনলোড করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setTimeout(() => {
        setIsSavingLocal(false);
        setSaveLocalProgress(0);
        setSaveLocalStatusText("");
      }, 1500);
    }
  };

  const syncAllSurahsAdmin = async () => {
    if (isAdminSyncingAll) return;
    setIsAdminSyncingAll(true);
    setAdminSyncProgress(0);
    const allIds = ALL_SURAS.map(s => s.n);
    let count = 0;
    
    for (const id of allIds) {
      const surahInfo = ALL_SURAS.find(s => s.n === id);
      if (surahInfo) {
        setCurrentSyncingSurahName(`${id}. ${surahInfo.bn} (${surahInfo.en})`);
      }
      try {
        const res = await fetch(`/api/quran/offline/${id}`);
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(`quran_surah_offline_${id}`, JSON.stringify(data));
          localStorage.setItem(`quran_surah_offline_details_${id}`, JSON.stringify(data));
          scanAdminOfflineCache();
        }
      } catch (err) {
        console.error(`Failed to sync surah ${id} in admin`, err);
      }
      count++;
      setAdminSyncProgress(Math.round((count / allIds.length) * 100));
    }
    
    setIsAdminSyncingAll(false);
    setCurrentSyncingSurahName("");
  };

  const fetchOfflineSurahData = async (id: number) => {
    setIsFetchingOffline(true);
    try {
      const response = await fetch(`/api/quran/offline/${id}`);
      if (!response.ok) throw new Error("Failed to fetch surah data");
      const data = await response.json();
      setOfflineDataPreview(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setOfflineDataPreview(JSON.stringify({ error: "অনলাইন তথ্য সংগ্রহ করতে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযুক্ত করে পুনরায় চেষ্টা করুন।" }, null, 2));
    } finally {
      setIsFetchingOffline(false);
    }
  };

  useEffect(() => {
    if (androidSubTab === "offline") {
      fetchOfflineSurahData(offlineSurahId);
    }
  }, [offlineSurahId, androidSubTab]);

  const handleCopyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeText(label);
    setTimeout(() => {
      setCopiedCodeText(null);
    }, 2000);
  };

  // Dark mode (Aesthetic custom preferences)
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Background interval check for scheduled reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const enabled = localStorage.getItem("daily_reminder_enabled") === "true";
      const time = localStorage.getItem("daily_reminder_time") || "09:00";
      if (!enabled) return;

      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, "0");
      const currentMinutes = now.getMinutes().toString().padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr === time) {
        // To prevent multiple triggers in the same minute
        const todayStr = now.toDateString();
        const lastTriggered = localStorage.getItem("daily_reminder_last_triggered");

        if (lastTriggered !== todayStr) {
          localStorage.setItem("daily_reminder_last_triggered", todayStr);
          
          // Trigger browser native Notification
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("🕌 শিবিরের আজকের ঐশী আলো • আয়াত অব দ্য ডে", {
                body: "আজকের বিশেষ আয়াত ও তাফসীর পড়ার সময় হয়েছে। অ্যাপটি ওপেন করে পড়ুন!",
                icon: "/favicon.ico"
              });
            } catch (e) {
              console.error("Failed to show native notification", e);
            }
          }
        }
      }
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, []);

  // Curated Duas
  const DUAS = [
    {
      id: 1,
      title: "ঘুম থেকে ওঠার দু'আ",
      ar: "الْحَمْدُ للَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
      tr: "আলহামদু লিল্লাহিল্লাযী আহ ইয়ানা বা’দা মা আমাতানা ওয়া ইলাইহিন নুশূর।",
      bn: "সমস্ত প্রশংসা আল্লাহর জন্য, যিনি আমাদেরকে মৃত্যুর (ঘুমের) পর পুনরায় জীবিত করলেন এবং তাঁর দিকেই আমাদের ফিরে যেতে হবে।",
      source: "সহীহ বুখারী",
      category: "Daily"
    },
    {
      id: 2,
      title: "খাবার শুরু করার সুন্নাত দু'আ",
      ar: "بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ",
      tr: "বিসমিল্লাহি ওয়া আলা বারাকাতিল্লাহ।",
      bn: "আল্লাহর নামে এবং আল্লাহর বরকতের ওপর ভরসা করে খাওয়া শুরু করছি।",
      source: "আল-আজকার",
      category: "Daily"
    },
    {
      id: 3,
      title: "মসজিদে প্রবেশের অত্যন্ত সুন্দর দু'আ",
      ar: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
      tr: "আল্লাহুম্মাফ তাহলী আবওয়াবা রাহমাতিক।",
      bn: "হে আল্লাহ! আমার জন্য আপনার অফুরন্ত রহমতের দরজাগুলো উন্মুক্ত করে দিন।",
      source: "সহীহ মুসলিম",
      category: "Prayer"
    },
    {
      id: 4,
      title: "পিতা-মাতার কল্যাণের জন্য আজীবন সেরা দু'আ",
      ar: "رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
      tr: "রাব্বির হামহুমা কামা রাব্বাইয়ানী সাগীরা।",
      bn: "হে আমার প্রতিপালক! তাদের উভয়ের ওপর দয়া করুন, ঠিক যেভাবে তারা শৈশবে আমাকে পরম দয়া ও যত্নে লালন-পালন করেছিলেন।",
      source: "সূরা বনী ইসরাঈল: ২৪",
      category: "Parents"
    },
    {
      id: 5,
      title: "জ্ঞান বৃদ্ধির জন্য পবিত্র কুরআনী দু'আ",
      ar: "رَّبِّ زِدْنِي عِلْمًا",
      tr: "রাব্বি জিদনী ইলমা।",
      bn: "হে আমার প্রতিপালক! আমার জ্ঞান বাড়িয়ে দিন।",
      source: "সূরা ত্বা-হা: ১১৪",
      category: "Daily"
    },
    {
      id: 6,
      title: "শয়তান ও সবরকম ক্ষতি থেকে বাঁচার দু'আ",
      ar: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
      tr: "বিসমিল্লাহিল্লাযী লা ইয়াদুররু মা'আসমিহী শাইয়ুন ফিল আরদ্বি ওয়ালা ফিস সামা-ই ওয়াহুয়াস সামী'উল 'আলীম।",
      bn: "আল্লাহর নামে, যাঁর নামের বরকতে আসমান ও জমিনের কোনো কিছুই কোনো ক্ষতি করতে পারে না, আর তিনি সর্বশ্রোতা, সর্বজ্ঞ।",
      source: "সুনানে আবু দাউদ",
      category: "Protection"
    },
    {
      id: 7,
      title: "বিপদ-আপদ ও দুশ্চিন্তা থেকে মুক্তির দু'আ",
      ar: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ",
      tr: "আল্লাহুম্মা ইন্নী আউযু বিকা মিনাল হাম্মি ওয়াল হাযানি, ওয়াল 'আজযি ওয়াল কাসালি, ওয়াল বুখলি ওয়াল জুবনি, ওয়া দ্বালাইদ দ্বাইনি ওয়া গালাবাতির রিজাল।",
      bn: "হে আল্লাহ! আমি আপনার আশ্রয় নিচ্ছি দুশ্চিন্তা ও দুঃখ-বেদনা থেকে, অপারগতা ও অলসতা থেকে, কৃপণতা ও ভীরুতা থেকে, ঋণের বোঝা ও মানুষের দমন-পীড়ন থেকে।",
      source: "সহীহ বুখারী",
      category: "Protection"
    },
    {
      id: 8,
      title: "পিতা-মাতা ও নিজের জন্য ক্ষমা প্রার্থনার দু'আ",
      ar: "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
      tr: "রাব্বানাগফিরলী ওয়ালিওয়ালিদাইয়্যা ওয়া লিলমু'মিনীনা ইয়াওমা ইয়াকূমুল হিসাব।",
      bn: "হে আমাদের প্রতিপালক! যেদিন হিসাব অনুষ্ঠিত হবে, সেদিন আমাকে, আমার পিতা-মাতাকে এবং সমস্ত মুমিনদের ক্ষমা করে দিন।",
      source: "সূরা ইব্রাহীম: ৪১",
      category: "Parents"
    },
    {
      id: 9,
      title: "সালাতের সিজদাহ্‌য় পড়ার দু'আ",
      ar: "سُبْحَانَ رَبِّيَ الأَعْلَى",
      tr: "সুবহানা রাব্বিয়াল আ'লা।",
      bn: "আমার সুমহান প্রতিপালকের পবিত্রতা ঘোষণা করছি।",
      source: "সহীহ মুসলিম",
      category: "Prayer"
    },
    {
      id: 10,
      title: "সালাতে সালাম ফেরানোর পর পড়ার চমৎকার ইস্তিগফার",
      ar: "أَسْتَغْفِرُ اللَّهَ ، أَسْتَغْفِرُ اللَّهَ ، أَسْتَغْفِرُ اللَّهَ ، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
      tr: "আস্তাগফিরুল্লাহ, আস্তাগফিরুল্লাহ, আস্তাগফিরুল্লাহ। আল্লাহুম্মা আনতাস সালামু ওয়া মিনকাস সালামু তাবারকতা ইয়া যাল জালালি ওয়াল ইকরম।",
      bn: "আমি আল্লাহর নিকট ক্ষমা প্রার্থনা করছি (৩ বার)। হে আল্লাহ! আপনিই শান্তি এবং আপনার পক্ষ থেকেই শান্তি অবতীর্ণ হয়। আপনি বরকতময়, হে মহিমাময় ও মহানুভব।",
      source: "সহীহ মুসলিম",
      category: "Prayer"
    }
  ];

  // Curated Masail
  const MASAIL = MASAIL_DATA;

  // Prayer Schedules for cities
  const PRAYER_TIMES_BY_CITY: Record<string, { fajar: string; zohar: string; asar: string; magrib: string; esha: string; sunrise: string }> = {
    "ঢাকা": { fajar: "৪:০৫ AM", sunrise: "৫:২৫ AM", zohar: "১২:০৫ PM", asar: "৪:৪০ PM", magrib: "৬:৪৫ PM", esha: "৮:১০ PM" },
    "চট্টগ্রাম": { fajar: "৪:০১ AM", sunrise: "৫:২১ AM", zohar: "১২:০১ PM", asar: "৪:৩৬ PM", magrib: "৬:৪১ PM", esha: "৮:০৬ PM" },
    "সিলেট": { fajar: "৩:৫৬ AM", sunrise: "৫:১৬ AM", zohar: "১১:৫৭ AM", asar: "৪:৩৬ PM", magrib: "৬:৩৮ PM", esha: "৮:০৫ PM" },
    "খুলনা": { fajar: "৪:১০ AM", sunrise: "৫:৩০ AM", zohar: "১২:১০ PM", asar: "৪:৪৫ PM", magrib: "৬:৫০ PM", esha: "৮:১৫ PM" },
    "রাজশাহী": { fajar: "৪:০৮ AM", sunrise: "৫:২৮ AM", zohar: "১২:১০ PM", asar: "৪:৪৬ PM", magrib: "৬:৫১ PM", esha: "৮:১৬ PM" },
    "বরিশাল": { fajar: "৪:০৭ AM", sunrise: "৫:২৭ AM", zohar: "১২:০৭ PM", asar: "৪:৪২ PM", magrib: "৬:৪৭ PM", esha: "৮:১২ PM" },
    "মক্কা": { fajar: "৪:১৫ AM", sunrise: "৫:৩৮ AM", zohar: "১২:২২ PM", asar: "৩:৪৮ PM", magrib: "৭:0৬ PM", esha: "৮:৩৬ PM" },
    "মদিনা": { fajar: "৪:১০ AM", sunrise: "৫:৩৫ AM", zohar: "১২:২৩ PM", asar: "৩:৫৩ PM", magrib: "৭:১১ PM", esha: "৮:৪১ PM" }
  };

  const activePrayer = PRAYER_TIMES_BY_CITY[selectedCity] || PRAYER_TIMES_BY_CITY["ঢাকা"];

  // Prayer Notification States
  const [prayerNotifications, setPrayerNotifications] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("prayer_notification_settings");
      return saved ? JSON.parse(saved) : {
        fajar: false,
        sunrise: false,
        zohar: false,
        asar: false,
        magrib: false,
        esha: false
      };
    } catch {
      return {
        fajar: false,
        sunrise: false,
        zohar: false,
        asar: false,
        magrib: false,
        esha: false
      };
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Helper parser for Bengali prayer times
  const parseBengaliTime = (bengaliTimeStr: string) => {
    const bnToEnMap: Record<string, string> = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
    };
    let englishStr = "";
    for (let i = 0; i < bengaliTimeStr.length; i++) {
      const char = bengaliTimeStr[i];
      englishStr += bnToEnMap[char] || char;
    }
    const match = englishStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hours < 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }
    return { hours, minutes };
  };

  const togglePrayerNotification = (key: string, name: string) => {
    const isEnabling = !prayerNotifications[key];
    
    if (isEnabling && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
          if (permission === "granted") {
            const updated = { ...prayerNotifications, [key]: true };
            setPrayerNotifications(updated);
            localStorage.setItem("prayer_notification_settings", JSON.stringify(updated));
            new Notification(`🕌 ${name} নোটিফিকেশন সচল হয়েছে`, {
              body: `${selectedCity} এলাকার সময় অনুযায়ী ${name}-এর নোটিফিকেশন সচল করা হয়েছে।`,
              icon: "/favicon.ico"
            });
          }
        });
        return;
      } else if (Notification.permission === "denied") {
        alert("আপনার ব্রাউজারে নোটিফিকেশন বন্ধ করা আছে। দয়া করে ব্রাউজার সেটিংস থেকে নোটিফিকেশন পারমিশন দিন।");
        return;
      }
    }

    const updated = { ...prayerNotifications, [key]: isEnabling };
    setPrayerNotifications(updated);
    try {
      localStorage.setItem("prayer_notification_settings", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Background interval check for prayer alerts
  useEffect(() => {
    const prayerInterval = setInterval(() => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const todayStr = now.toDateString();

      const cityPrayers = PRAYER_TIMES_BY_CITY[selectedCity] || PRAYER_TIMES_BY_CITY["ঢাকা"];

      Object.entries(cityPrayers).forEach(([key, value]) => {
        if (prayerNotifications[key]) {
          const parsed = parseBengaliTime(value);
          if (parsed && parsed.hours === currentHours && parsed.minutes === currentMinutes) {
            const storageKey = `prayer_last_triggered_${selectedCity}_${key}`;
            const lastTriggered = localStorage.getItem(storageKey);

            if (lastTriggered !== todayStr) {
              localStorage.setItem(storageKey, todayStr);

              const keyToName: Record<string, string> = {
                fajar: "ফজর",
                sunrise: "সূর্যোদয়",
                zohar: "যোহর",
                asar: "আসর",
                magrib: "মাগরিব",
                esha: "ইশা"
              };
              const prayerName = keyToName[key] || key;

              try {
                new Notification(`🕌 ${prayerName}-এর সময় হয়েছে!`, {
                  body: `${selectedCity} এলাকার সময় অনুযায়ী এখন ${prayerName} (${value}) আদায়ে প্রস্তুত হোন।`,
                  icon: "/favicon.ico"
                });
              } catch (e) {
                console.error("Failed to trigger prayer notification", e);
              }
            }
          }
        }
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(prayerInterval);
  }, [selectedCity, prayerNotifications]);

  // Admin login handling
  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if ((adminUser === "admin" || adminUser === "admin@shibir.com") && adminPass === "admin123") {
      setIsAdminLoggedIn(true);
      setAdminError("");
    } else {
      setAdminError("ভুল ইমেইল অথবা পাসওয়ার্ড! ডেমো: admin / admin123");
    }
  }

  function handleAdminLogout() {
    setIsAdminLoggedIn(false);
    setAdminUser("");
    setAdminPass("");
    setActiveTab("quran");
  }

  return (
    <div className="min-h-screen bg-soph-deep text-soph-text-primary flex flex-col font-sans transition-colors duration-150 selection:bg-soph-gold/25 selection:text-soph-gold-light">
      {/* HEADER / NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-soph-card/95 backdrop-blur-md text-soph-text-primary shadow-lg border-b border-soph-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          {/* Logo Brand */}
          <div 
            onClick={() => { setActiveSurah(null); setActiveTab("quran"); }} 
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="h-9 w-9 bg-soph-deep group-hover:bg-soph-gold rounded-xl flex items-center justify-center font-serif text-lg font-bold border border-soph-border group-hover:border-soph-gold transition duration-200 shadow-inner">
              <span className="text-soph-gold group-hover:text-soph-deep transition">☪</span>
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-none text-soph-text-primary font-sans group-hover:text-soph-gold transition">
                শিবির.কম
              </h1>
              <p className="text-[10px] text-soph-gold tracking-wider font-semibold font-sans mt-0.5 uppercase">
                আল কুরআন ও তাফসীর
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => { setActiveTab("quran"); setActiveSurah(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "quran" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
              }`}
            >
              কুরআন শরীফ
            </button>
            <button
              onClick={() => setActiveTab("hadith")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "hadith" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
              }`}
            >
              হাদীস সমগ্র
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "quiz" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
              }`}
            >
              কুরআন কুইজ
            </button>
            <button
              onClick={() => setActiveTab("prayer")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "prayer" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
              }`}
            >
              নামাজের সময়
            </button>
            <button
              onClick={() => setActiveTab("masail")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "masail" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
              }`}
            >
              ইসলামিক মাসায়েল
            </button>
            <button
              onClick={() => setActiveTab("dua")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "dua" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
              }`}
            >
              দৈনন্দিন দু'আ
            </button>
            <button
               onClick={() => setActiveTab("saved")}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                 activeTab === "saved" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
               }`}
             >
               <Bookmark className="h-3.5 w-3.5" /> সংরক্ষিত তথ্য
             </button>
             <button
               onClick={() => setActiveTab("meetings")}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                 activeTab === "meetings" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
               }`}
             >
               <Video className="h-3.5 w-3.5 text-soph-gold" />  শিক্ষা বৈঠক
             </button>
             <button
               onClick={() => setActiveTab("classroom")}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                 activeTab === "classroom" ? "bg-soph-hover text-soph-gold border border-soph-border" : "text-soph-text-secondary hover:text-soph-text-primary hover:bg-soph-hover"
               }`}
             >
               <GraduationCap className="h-3.5 w-3.5 text-soph-gold" />  গুগল ক্লাসরুম
             </button>
             <a
               href="https://youtube.com/playlist?list=PLDPHd_U0ECxE7GOaRDsCObxCJXDX3zmQm&si=fJR5TEe2WeJLaC1N"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer shadow-sm"
              title="সূরা সহজে শিক্ষা - ফ্রি আরবি কোর্স"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>ফ্রি আরবি কোর্স</span>
            </a>
          </nav>

          {/* Actions: Theme Toggle, User Profile/Auth, Admin panel */}
          <div className="flex items-center gap-2 select-none">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-soph-hover rounded-xl transition text-soph-gold hover:text-soph-gold-light cursor-pointer"
              title={darkMode ? "লাইট থিমে পরিবর্তন করুন" : "ডার্ক থিমে পরিবর্তন করুন"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Google Authentication Section */}
            {isAuthLoading ? (
              <div className="h-8 w-8 rounded-full border border-zinc-700 border-t-soph-gold animate-spin"></div>
            ) : currentUser ? (
              <div className="flex items-center gap-2 bg-soph-hover border border-soph-border pl-1.5 pr-3 py-1 rounded-2xl">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="profile" 
                    className="h-6 w-6 rounded-full border border-soph-gold/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-soph-deep border border-soph-gold/40 flex items-center justify-center text-xs text-soph-gold font-bold uppercase">
                    {currentUser.displayName ? currentUser.displayName[0] : "U"}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-[10px] font-black leading-tight text-soph-text-primary capitalize truncate max-w-[80px]">
                    {currentUser.displayName || "ব্যবহারকারী"}
                  </p>
                  <p className="text-[8px] font-medium leading-none text-soph-gold-light mt-0.5">
                    ক্লাউড ব্যাকআপ সচল
                  </p>
                </div>
                <button
                  onClick={handleGoogleSignOut}
                  className="p-1 text-red-400 hover:bg-red-950/20 rounded-lg transition ml-1 cursor-pointer"
                  title="সাইন আউট করুন"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="bg-soph-deep hover:bg-soph-hover border border-soph-gold/30 hover:border-soph-gold/60 text-soph-gold text-xs font-black px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-soph-gold/5"
              >
                <span>Google লগইন</span>
              </button>
            )}

            {isAdminLoggedIn ? (
              <button
                onClick={() => setActiveTab("admin-panel")}
                className="bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-bold px-3 py-1.5 rounded-xl text-[11px] uppercase transition flex items-center gap-1 shadow-md shadow-soph-gold/10"
              >
                <User className="h-3 w-3" /> ড্যাশবোর্ড
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("admin-panel")}
                className="bg-soph-hover hover:bg-soph-deep border border-soph-border font-semibold px-2.5 py-1.5 rounded-xl text-[10px] text-soph-text-secondary hover:text-soph-gold transition cursor-pointer"
              >
                অ্যাডমিন
              </button>
            )}
          </div>
        </div>

        {/* MOBILE NAVIGATION BAR */}
        <div className="md:hidden flex bg-soph-card border-t border-soph-border text-soph-text-primary overflow-x-auto select-none no-scrollbar py-1">
          <button
            onClick={() => { setActiveTab("quran"); setActiveSurah(null); }}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "quran" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            কুরআন
          </button>
          <button
            onClick={() => setActiveTab("hadith")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "hadith" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            হাদীস
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "quiz" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            কুইজ
          </button>
          <button
            onClick={() => setActiveTab("prayer")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "prayer" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            নামাজ সময়
          </button>
          <button
            onClick={() => setActiveTab("masail")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "masail" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            মাসায়েল
          </button>
          <button
            onClick={() => setActiveTab("dua")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "dua" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            দু'আ
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "saved" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            সংরক্ষিত
          </button>
          <button
            onClick={() => setActiveTab("meetings")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "meetings" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            শিক্ষা বৈঠক
          </button>
          <button
            onClick={() => setActiveTab("classroom")}
            className={`shrink-0 px-4 py-2 text-[11px] font-bold ${activeTab === "classroom" ? "text-soph-gold" : "text-soph-text-secondary"}`}
          >
            গুগল ক্লাসরুম
          </button>
          <a
            href="https://youtube.com/playlist?list=PLDPHd_U0ECxE7GOaRDsCObxCJXDX3zmQm&si=fJR5TEe2WeJLaC1N"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
            title="সূরা সহজে শিক্ষা - ফ্রি আরবি কোর্স"
          >
            <Sparkles className="h-3 w-3 inline-block text-emerald-400 animate-pulse" />
            <span>ফ্রি কোর্স</span>
          </a>
        </div>
      </header>

      {/* HERO SECTION FOR MAIN HOMEPAGE / BRANDING */}
      {activeTab === "quran" && !activeSurah && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-12 px-6 text-center select-none shadow-lg border-b border-soph-border relative overflow-hidden">
          {/* Subtle gold grid element */}
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
          
          <div className="max-w-3xl mx-auto space-y-3 relative z-10">
            <span className="font-serif text-3xl font-normal text-soph-gold select-none tracking-wide block mb-1">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-sans tracking-tight text-soph-text-primary">
              আল কুরআনুল কারীম ও ঐশী আলোর সন্ধান
            </h2>
            <p className="text-xs md:text-sm text-soph-text-secondary leading-relaxed max-w-xl mx-auto">
              বাংলা ভাবানুবাদ, তাফসীর ও শান-ই-নুযূলসহ পূর্ণাঙ্গ ডিজিটাল কুরআন শিক্ষা কেন্দ্র। সূরা বা আয়াতের ওপরে ক্লিক করে গভীর ঐশ্বরিক তাফসীর জেনারেট করুন।
            </p>

            {/* Global Stats */}
            <div className="flex flex-wrap gap-4 md:gap-8 justify-center pt-4">
              <div className="text-center bg-soph-card/60 backdrop-blur border border-soph-border px-4 py-2 rounded-2xl min-w-24 shadow-md shadow-black/30">
                <div className="text-soph-gold text-lg font-extrabold font-mono">১১৪</div>
                <div className="text-[10px] text-soph-text-secondary uppercase font-bold tracking-wider">সূরা সমূহ</div>
              </div>
              <div className="text-center bg-soph-card/60 backdrop-blur border border-soph-border px-4 py-2 rounded-2xl min-w-24 shadow-md shadow-black/30">
                <div className="text-soph-gold text-lg font-extrabold font-mono">৬,২৩৬</div>
                <div className="text-[10px] text-soph-text-secondary uppercase font-bold tracking-wider">পবিত্র আয়াত</div>
              </div>
              <div className="text-center bg-soph-card/60 backdrop-blur border border-soph-border px-4 py-2 rounded-2xl min-w-24 shadow-md shadow-black/30">
                <div className="text-soph-gold text-lg font-extrabold font-mono">৩০</div>
                <div className="text-[10px] text-soph-text-secondary uppercase font-bold tracking-wider">পারা / জুয</div>
              </div>
              <div className="text-center bg-soph-card/60 backdrop-blur border border-soph-border px-4 py-2 rounded-2xl min-w-24 shadow-md shadow-black/30">
                <div className="text-soph-gold text-lg font-extrabold font-mono">২৪/৭</div>
                <div className="text-[10px] text-soph-text-secondary uppercase font-bold tracking-wider">পরম শিক্ষা</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HADITH PAGE HERO */}
      {activeTab === "hadith" && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-10 px-6 text-center select-none border-b border-soph-border shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>
          <div className="max-w-3xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center justify-center gap-1.5">
              <BookCheck className="h-6 w-6 text-soph-gold" /> বিশুদ্ধ হাদীস সমগ্র
            </h2>
            <p className="text-xs text-soph-text-secondary max-w-xl mx-auto">
              সহীহ আল-বুখারী ও সহীহ মুসলিমের মতো সর্বজনগ্রাহ্য হাদীসগ্রন্থ থেকে দৈনন্দিন জীবনের গুরুত্বপূর্ণ দিকনির্দেশনামূলক সহীহ বাণীসমূহ।
            </p>
          </div>
        </section>
      )}

      {/* QUIZ PAGE HERO */}
      {activeTab === "quiz" && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-10 px-6 text-center select-none border-b border-soph-border shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>
          <div className="max-w-3xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center justify-center gap-1.5">
              <Trophy className="h-6 w-6 text-soph-gold" /> ইন্টারেক্টিভ কুরআন কুইজ
            </h2>
            <p className="text-xs text-soph-text-secondary max-w-xl mx-auto">
              কুরআনের সূরা পরিচিতি, পারার বিন্যাস ও বুনিয়াদী ইসলামী জ্ঞান যাচাই করুন। ফ্ল্যাশকার্ডের সাহায্যে মেধা ঝালিয়ে নিন।
            </p>
          </div>
        </section>
      )}

      {/* PRAYER PAGE HERO */}
      {activeTab === "prayer" && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-10 px-6 text-center select-none border-b border-soph-border shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>
          <div className="max-w-3xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center justify-center gap-1.5">
              <Calendar className="h-6 w-6 text-soph-gold" /> নামাজের নিখুঁত আবশ্যিক সময়সূচি
            </h2>
            <p className="text-xs text-soph-text-secondary max-w-xl mx-auto">
              ঢাকা ও বাংলাদেশের প্রধান জেলাসমূহ এবং বৈশ্বিক পুণ্যভূমি মক্কা ও মদিনাতুল মুনাওয়্যারার নামাজের নিখুঁত ও নির্ভুল সময়সূচি।
            </p>
          </div>
        </section>
      )}

      {/* MASAIL HERO */}
      {activeTab === "masail" && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-10 px-6 text-center select-none border-b border-soph-border shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>
          <div className="max-w-3xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center justify-center gap-1.5">
              <ShieldAlert className="h-6 w-6 text-soph-gold" /> শরয়ী জটিল মাসয়ালা মাসায়েল
            </h2>
            <p className="text-xs text-soph-text-secondary max-w-xl mx-auto">
              দৈনন্দিন অজু, গোসল, ফরয আদায়ে অবহেলা এবং ব্যবসা-বাণিজ্যের জটিল প্রশ্নের বিশ্বস্ত ও শাস্ত্রসম্মত সমাধান।
            </p>
          </div>
        </section>
      )}

      {/* DUA HERO */}
      {activeTab === "dua" && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-10 px-6 text-center select-none border-b border-soph-border shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>
          <div className="max-w-3xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center justify-center gap-1.5">
              <Heart className="h-6 w-6 text-soph-gold" /> আধ্যাত্মিক আরাম ও আল কুরআনী দু’আ
            </h2>
            <p className="text-xs text-soph-text-secondary max-w-xl mx-auto">
              ঘুম থেকে ওঠা থেকে শুরু করে ঘুমাতে যাওয়া পর্যন্ত এবং পিতা-মাতার কল্যাণের জন্য পবিত্র কুরআনে বর্ণিত সর্বশ্রেষ্ঠ মিনতিসমূহ।
            </p>
          </div>
        </section>
      )}

      {/* SAVED ITEMS HERO */}
      {activeTab === "saved" && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-10 px-6 text-center select-none border-b border-soph-border shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>
          <div className="max-w-3xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center justify-center gap-1.5">
              <Bookmark className="h-6 w-6 text-soph-gold" /> আমার সংরক্ষিত বিষয়সমূহ
            </h2>
            <p className="text-xs text-soph-text-secondary max-w-xl mx-auto">
              আল কুরআন ও হাদীস সমগ্র থেকে আপনার প্রিয় ও গুরুত্বপূর্ণ আয়াত এবং অমূল্য হাদীসসমূহ যা স্থানীয় মেমোরিতে সংরক্ষিত রেখেছেন।
            </p>
          </div>
        </section>
      )}

      {/* MEETINGS HERO */}
      {activeTab === "meetings" && (
        <section className="bg-gradient-to-br from-soph-card via-soph-deep to-soph-hover text-soph-text-primary py-10 px-6 text-center select-none border-b border-soph-border shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>
          <div className="max-w-3xl mx-auto space-y-2 relative z-10">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center justify-center gap-1.5">
              <Video className="h-6 w-6 text-soph-gold animate-pulse" /> ভার্চুয়াল কুরআন ও তালীম বৈঠক
            </h2>
            <p className="text-xs text-soph-text-secondary max-w-xl mx-auto">
              গুগল মিট (Google Meet) ব্যবহারের সাহায্যে বিশ্বের যেকোনো প্রান্তের দ্বীনি ভাইদের সাথে লাইভ সরাসরি কুরআন গবেষণা, তাজবিদ শিক্ষা ও সহীহ হাদীস তালীম।
            </p>
          </div>
        </section>
      )}

      {/* MAIN LAYOUT AND CORE ROUTER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 font-sans">
        {/* QURAN TAB CONTENT */}
        {activeTab === "quran" && (
          <div className="space-y-6 animate-fade-in">
            {/* If a Sura is selected, show SuraReader, else show Sura list */}
            {activeSurah !== null ? (
              <SuraReader 
                surahId={activeSurah} 
                onBack={() => setActiveSurah(null)} 
                savedVerses={savedVerses}
                onToggleVerseBookmark={handleToggleVerse}
              />
            ) : (
              <div className="space-y-6">
                {/* Daily Verse (Ayat of the Day) with Tafsir & Reminders */}
                <DailyVerse onGotoSurah={(surahId) => { setActiveSurah(surahId); }} />

                {/* Quran Subtabs */}
                <div className="flex border-b border-soph-border pb-px">
                  <button
                    onClick={() => setQuranTab("suras")}
                    className={`pb-3 text-xs md:text-sm font-bold border-b-2 px-4 transition ${
                      quranTab === "suras"
                        ? "border-soph-gold text-soph-gold"
                        : "border-transparent text-soph-text-secondary hover:text-soph-text-primary"
                    }`}
                  >
                    ১১৪ সূরার তালিকা
                  </button>
                  <button
                    onClick={() => setQuranTab("topics")}
                    className={`pb-3 text-xs md:text-sm font-bold border-b-2 px-4 transition ${
                      quranTab === "topics"
                        ? "border-soph-gold text-soph-gold"
                        : "border-transparent text-soph-text-secondary hover:text-soph-text-primary"
                    }`}
                  >
                    বিষয়ভিত্তিক আয়াত ও তাফসীর
                  </button>
                  <button
                    onClick={() => setQuranTab("juz")}
                    className={`pb-3 text-xs md:text-sm font-bold border-b-2 px-4 transition ${
                      quranTab === "juz"
                        ? "border-soph-gold text-soph-gold"
                        : "border-transparent text-soph-text-secondary hover:text-soph-text-primary"
                    }`}
                  >
                    ৩০টি পারার সূচী
                  </button>
                </div>

                {/* Subtab Contents */}
                {quranTab === "suras" && (
                  <SuraGrid onSelectSurah={(n) => setActiveSurah(n)} />
                )}
                {quranTab === "topics" && (
                  <TopicalVerses 
                    savedVerses={savedVerses}
                    onToggleVerseBookmark={handleToggleVerse}
                  />
                )}
                {quranTab === "juz" && (
                  <JuzList onSelectSurah={(n) => { setQuranTab("suras"); setActiveSurah(n); }} />
                )}
              </div>
            )}
          </div>
        )}

        {/* MEETINGS TAB CONTENT */}
        {activeTab === "meetings" && (
          <div className="animate-fade-in">
            <GoogleMeetStudyCircle
              currentUser={currentUser}
              meetAccessToken={meetAccessToken}
              setMeetAccessToken={setMeetAccessToken}
              onTriggerGoogleSignIn={handleGoogleSignIn}
            />
          </div>
        )}

        {/* CLASSROOM TAB CONTENT */}
        {activeTab === "classroom" && (
          <div className="animate-fade-in">
            <GoogleClassroomStudy
              currentUser={currentUser}
              accessToken={meetAccessToken}
              onTriggerGoogleSignIn={handleGoogleSignIn}
            />
          </div>
        )}

        {/* HADITH TAB CONTENT */}
        {activeTab === "hadith" && (
          <HadithBrowser 
            savedHadiths={savedHadiths}
            onToggleHadithBookmark={handleToggleHadith}
          />
        )}

        {/* SAVED ITEMS TAB CONTENT */}
        {activeTab === "saved" && (
          <MySaved 
            savedVerses={savedVerses}
            savedHadiths={savedHadiths}
            onRemoveVerse={(surahId, verseNumber) => {
              setSavedVerses(prev => {
                const updated = prev.filter(v => !(v.surahId === surahId && v.verseNumber === verseNumber));
                localStorage.setItem("saved_verses", JSON.stringify(updated));
                return updated;
              });
            }}
            onRemoveHadith={(id) => {
              setSavedHadiths(prev => {
                const updated = prev.filter(h => h.id !== id);
                localStorage.setItem("saved_hadiths", JSON.stringify(updated));
                return updated;
              });
            }}
            onGotoSurah={(surahId) => {
              setActiveSurah(surahId);
              setActiveTab("quran");
            }}
            onGotoHadith={() => {
              setActiveTab("hadith");
            }}
          />
        )}

        {/* QUIZ TAB CONTENT */}
        {activeTab === "quiz" && (
          <QuranQuiz currentUser={currentUser} />
        )}

        {/* PRAYER TAB CONTENT */}
        {activeTab === "prayer" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-soph-card border border-soph-border rounded-2xl p-6 shadow-lg space-y-6">
              {/* City selector */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-soph-text-primary flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-soph-gold" /> এলাকা পরিবর্তন করুন:
                  </h3>
                  <p className="text-[11px] text-soph-text-secondary mt-0.5">সবচেয়ে নিকটবর্তী জেলা বা শহরটি নির্বাচন করুন। ব্রাউজারে নামাজের অ্যালার্ট পেতে নির্দিষ্ট ওয়াক্তের ঘণ্টা আইকনটি সক্রিয় করুন।</p>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(PRAYER_TIMES_BY_CITY).map((city) => (
                    <button
                      key={city}
                      onClick={() => setSelectedCity(city)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                        selectedCity === city
                          ? "bg-soph-gold text-soph-deep border-soph-gold shadow-md shadow-soph-gold/15"
                          : "bg-soph-deep hover:bg-soph-hover text-soph-text-secondary border-soph-border"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Today Date */}
              <div className="text-center py-4 bg-soph-deep border border-soph-border rounded-2xl">
                <span className="text-xs font-bold text-soph-gold block">আজকের তারিখ</span>
                <span className="text-sm md:text-base font-extrabold text-soph-text-primary mt-1 block">
                  {new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-[10px] text-soph-text-secondary font-mono mt-0.5 block">২৮ জিলহজ্জ, ১৪৪৭ হিজরী</span>

                {/* Notification status info */}
                {("Notification" in window) && (
                  <div className="mt-3 flex justify-center items-center gap-1.5 text-[10px] text-soph-text-secondary border-t border-soph-border/30 pt-2 mx-6 md:mx-12">
                    {notificationPermission === "granted" ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold justify-center">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        নামাজের পুশ নোটিফিকেশন সচল রয়েছে
                      </span>
                    ) : notificationPermission === "denied" ? (
                      <span className="flex items-center gap-1.5 text-rose-400 font-bold justify-center">
                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                        নোটিফিকেশন ব্লক করা আছে (ব্রাউজার সেটিংস থেকে অনুমতি দিন)
                      </span>
                    ) : (
                      <span className="text-soph-text-secondary justify-center flex items-center gap-1.5 font-bold">
                        ঘণ্টা চিহ্নে ক্লিক করে নামাজের ওয়াক্তে পুশ নোটিফিকেশন সচল করুন
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Prayer Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: "fajar", name: "ফজর", time: activePrayer.fajar, desc: "নামাজ আরম্ভ" },
                  { key: "sunrise", name: "সূর্যোদয়", time: activePrayer.sunrise, desc: "নামাজ নিষিদ্ধ সময়" },
                  { key: "zohar", name: "যোহর", time: activePrayer.zohar, desc: "মধ্যাহ্ন নামাজ" },
                  { key: "asar", name: "আসর", time: activePrayer.asar, desc: "অপরাহ্ন নামাজ" },
                  { key: "magrib", name: "মাগরিব", time: activePrayer.magrib, desc: "সন্ধ্যা নামাজ (ইফতার)" },
                  { key: "esha", name: "ইশা", time: activePrayer.esha, desc: "রাত্রিকালীন নামাজ" }
                ].map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-soph-deep p-4 rounded-2xl border border-soph-border text-center space-y-2 group hover:border-soph-gold/40 transition duration-150 relative"
                  >
                    {/* Notification toggle bell */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePrayerNotification(p.key, p.name);
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded-full border transition-all duration-150 cursor-pointer ${
                        prayerNotifications[p.key]
                          ? "bg-soph-gold/15 text-soph-gold border-soph-gold/30 hover:bg-soph-gold/25"
                          : "text-soph-text-secondary border-transparent hover:border-soph-border hover:bg-soph-hover"
                      }`}
                      title={prayerNotifications[p.key] ? "নোটিফিকেশন বন্ধ করুন" : "নোটিফিকেশন চালু করুন"}
                    >
                      {prayerNotifications[p.key] ? (
                        <Bell className="h-3 w-3" />
                      ) : (
                        <BellOff className="h-3 w-3" />
                      )}
                    </button>

                    <span className="text-xs font-bold text-soph-gold block tracking-tight pt-1">
                      {p.name}
                    </span>
                    <span className="text-base font-black text-soph-text-primary block font-mono">
                      {p.time}
                    </span>
                    <span className="text-[9px] font-sans font-medium text-soph-text-secondary block uppercase tracking-wider">
                      {p.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Jamaat guidelines */}
              <div className="flex gap-2 items-start bg-soph-deep p-4 rounded-xl border border-soph-border">
                <Info className="h-4 w-4 text-soph-gold shrink-0 mt-0.5" />
                <p className="text-[11px] text-soph-text-secondary leading-relaxed text-justify">
                  নামাজের সময়সূচি সাধারণত ইসলামিক রিসার্চ ব্যুরো এবং সূর্য অবস্থানের হিসাব অনুযায়ী চূড়ান্ত করা হয়েছে। ঋতু পরিবর্তনের ভিত্তিতে সময়ের সামান্য হেরফের হতে পারে। আপনার এলাকার নিকটস্থ মসজিদের আজানের সাথে সময়ের সামঞ্জস্য রক্ষা করুন।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MASAIL TAB CONTENT */}
        {activeTab === "masail" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Search and filter controls */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="নামাজ, ওযু, হালাল-হারাম বা শরিয়া সংক্রান্ত প্রশ্নের মূল কী-ওয়ার্ড দিয়ে খুঁজুন..."
                  className="w-full pl-11 pr-4 py-3 bg-soph-card border border-soph-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-soph-gold text-soph-text-primary placeholder-zinc-500 shadow-md"
                  value={searchMasail}
                  onChange={(e) => setSearchMasail(e.target.value)}
                />
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-soph-gold-muted" />
              </div>

              {/* Category buttons list */}
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {[
                  { id: "all", label: "সব বিষয়" },
                  { id: "সালাত", label: "সালাত / নামাজ" },
                  { id: "সওম", label: "সওম / রোজা" },
                  { id: "যাকাত", label: "যাকাত ও ফিতরা" },
                  { id: "পবিত্রতা", label: "পবিত্রতা ও ওযু" },
                  { id: "হজ ও উমরাহ", label: "হজ ও উমরাহ" },
                  { id: "কুরবানি", label: "কুরবানি ও আকিকা" },
                  { id: "হালাল-হারাম", label: "হালাল ও হারাম" },
                  { id: "স্থাবর-অস্থাবর", label: "জায়গা-জমি ও উত্তরাধিকার" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedMasailCat(cat.id);
                      setExpandedMasail(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 border cursor-pointer ${
                      selectedMasailCat === cat.id
                        ? "bg-soph-gold text-soph-deep border-soph-gold shadow-md"
                        : "bg-soph-deep text-soph-text-secondary border-soph-border hover:bg-soph-hover"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion Questions */}
            <div className="space-y-3">
              {MASAIL_DATA.filter((m) => {
                if (selectedMasailCat !== "all" && m.cat !== selectedMasailCat) return false;
                const searchLower = searchMasail.toLowerCase();
                return (
                  m.q.toLowerCase().includes(searchLower) ||
                  m.a.toLowerCase().includes(searchLower) ||
                  m.cat.toLowerCase().includes(searchLower)
                );
              }).map((m) => {
                const isOpen = expandedMasail === m.id;
                return (
                  <div
                    key={m.id}
                    className="bg-soph-card border border-soph-border rounded-2xl overflow-hidden shadow-md hover:border-soph-gold/30 transition duration-150"
                  >
                    <button
                      onClick={() => setExpandedMasail(isOpen ? null : m.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold px-2.5 py-0.5 bg-soph-hover text-soph-gold rounded-full shrink-0 border border-soph-border">
                          {m.cat}
                        </span>
                        <h4 className="text-sm font-bold text-soph-text-primary leading-snug">
                          {m.q}
                        </h4>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-soph-gold" /> : <ChevronDown className="h-4 w-4 shrink-0 text-soph-text-secondary" />}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-3 border-t border-soph-border bg-soph-deep space-y-2">
                        <div className="flex gap-2 items-start text-xs text-soph-gold font-bold uppercase tracking-wider mb-1.5 label-section">
                          <ClipboardCheck className="h-4 w-4 text-soph-gold shrink-0 mt-px" />
                          <span>মুফতিগণের প্রামাণিক উত্তর:</span>
                        </div>
                        <p className="text-sm text-soph-text-primary leading-relaxed text-justify">
                          {m.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {MASAIL_DATA.filter((m) => {
                if (selectedMasailCat !== "all" && m.cat !== selectedMasailCat) return false;
                const searchLower = searchMasail.toLowerCase();
                return (
                  m.q.toLowerCase().includes(searchLower) ||
                  m.a.toLowerCase().includes(searchLower) ||
                  m.cat.toLowerCase().includes(searchLower)
                );
              }).length === 0 && (
                <div className="text-center py-10 bg-soph-card border border-soph-border rounded-3xl space-y-2">
                  <p className="text-sm text-soph-text-secondary font-bold">কোনো মাসয়ালা পাওয়া যায়নি!</p>
                  <p className="text-xs text-soph-text-secondary/70">দয়া করে অন্য কী-ওয়ার্ড অথবা ভিন্ন ক্যাটাগরি নির্বাচিত করুন।</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DUA TAB CONTENT */}
        {activeTab === "dua" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Search Dua */}
            <div className="relative">
              <input
                type="text"
                placeholder="ঘুম, খাওয়া, পিতা-মাতা বা যেকোনো আমলের দু'আ খুঁজুন..."
                className="w-full pl-11 pr-4 py-3 bg-soph-card border border-soph-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-soph-gold text-soph-text-primary placeholder-zinc-500 shadow-md"
                value={searchDua}
                onChange={(e) => setSearchDua(e.target.value)}
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-soph-gold-muted" />
            </div>

            {/* Curated Category Filters with Color Coding */}
            <div className="space-y-2">
              <span className="text-[10px] tracking-wider uppercase font-extrabold text-soph-gold-muted block px-1">
                বিষয়ভিত্তিক দু'আ ফিল্টার:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", name: "সব দু'আ", icon: "✨", bg: "bg-soph-hover/60", text: "text-soph-gold", border: "border-soph-border" },
                  { key: "Daily", name: "দৈনন্দিন (Daily)", icon: "☀️", bg: "bg-amber-950/40 hover:bg-amber-900/40", text: "text-amber-400 font-bold", border: "border-amber-900/50" },
                  { key: "Prayer", name: "নামাজ ও ইবাদত (Prayer)", icon: "🕌", bg: "bg-emerald-950/40 hover:bg-emerald-900/40", text: "text-emerald-400 font-bold", border: "border-emerald-900/50" },
                  { key: "Protection", name: "সুরক্ষা (Protection)", icon: "🛡️", bg: "bg-cyan-950/40 hover:bg-cyan-900/40", text: "text-cyan-400 font-bold", border: "border-cyan-900/50" },
                  { key: "Parents", name: "পিতা-মাতা (Parents)", icon: "❤️", bg: "bg-rose-950/40 hover:bg-rose-900/40", text: "text-rose-400 font-bold", border: "border-rose-900/50" }
                ].map((cat) => {
                  const isActive = selectedDuaCat === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedDuaCat(cat.key)}
                      className={`px-3 py-1.5 rounded-full text-xs transition duration-200 flex items-center gap-1.5 border cursor-pointer ${
                        isActive
                          ? `${cat.bg} ${cat.text} ${cat.border} ring-1 ring-soph-gold/30 shadow-md`
                          : "bg-soph-card/50 text-soph-text-secondary border-soph-border hover:bg-soph-hover hover:text-soph-text-primary"
                      }`}
                    >
                      <span className="text-xs leading-none">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="space-y-4">
              {(() => {
                const filtered = DUAS.filter(d => {
                  const matchesSearch = (d.title.toLowerCase().includes(searchDua.toLowerCase()) || 
                                         d.bn.toLowerCase().includes(searchDua.toLowerCase()) || 
                                         d.tr.toLowerCase().includes(searchDua.toLowerCase()));
                  const matchesCat = selectedDuaCat === "all" || d.category === selectedDuaCat;
                  return matchesSearch && matchesCat;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 bg-soph-card border border-soph-border rounded-3xl shadow-inner max-w-lg mx-auto">
                      <span className="text-2xl block mb-2 text-soph-gold-muted">🔍</span>
                      <p className="text-sm font-bold text-soph-text-primary font-sans">কোনো দু'আ খুঁজে পাওয়া যায়নি</p>
                      <p className="text-xs text-soph-text-secondary mt-1 max-w-xs mx-auto">অন্য শব্দ দিয়ে অনুসন্ধান করুন অথবা ভিন্ন কোনো বিষয়ভিত্তিক ফিল্টার নির্বাচন করে চেষ্টা করুন।</p>
                    </div>
                  );
                }

                const catBadgeStyles: Record<string, { bg: string, text: string, border: string, name: string, icon: string }> = {
                  Daily: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", name: "দৈনন্দিন", icon: "☀️" },
                  Prayer: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", name: "নামাজ", icon: "🕌" },
                  Protection: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", name: "সুরক্ষা", icon: "🛡️" },
                  Parents: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", name: "পিতা-মাতা", icon: "❤️" }
                };

                return filtered.map((d) => {
                  const isOpen = expandedDua === d.id;
                  const catStyle = d.category ? catBadgeStyles[d.category] : null;
                  const hasRecited = (recitedDuas[d.id] || 0) > 0;
                  return (
                    <div
                      key={d.id}
                      className="bg-soph-card border border-soph-border rounded-2xl overflow-hidden shadow-md transition duration-200 hover:border-soph-gold/20"
                    >
                      <button
                        onClick={() => setExpandedDua(isOpen ? null : d.id)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                      >
                        <h4 className="text-sm md:text-base font-bold text-soph-text-primary leading-snug hover:text-soph-gold transition">
                          🤲 {d.title}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          {hasRecited && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-full select-none">
                              <span>✅</span>
                              <span>{toBengaliNumber(recitedDuas[d.id])} বার পঠিত</span>
                            </span>
                          )}
                          {catStyle && (
                            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                              <span>{catStyle.icon}</span>
                              <span>{catStyle.name}</span>
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-soph-gold bg-soph-hover px-2 py-0.5 rounded-md border border-soph-border">
                            {d.source}
                          </span>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-soph-gold" /> : <ChevronDown className="h-4 w-4 text-soph-text-secondary" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-3 border-t border-soph-border bg-soph-deep space-y-4 animate-fade-in">
                          {/* Category badge for mobile (visible only on very small screens since desktop badge is in header) */}
                          {catStyle && (
                            <div className="sm:hidden flex">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                                <span>{catStyle.icon}</span>
                                <span>{catStyle.name}</span>
                              </span>
                            </div>
                          )}

                          {/* Arabic text with rich typography */}
                          <div className="font-serif text-2xl text-right text-soph-text-primary font-bold dir-rtl leading-relaxed select-all">
                            {d.ar}
                          </div>

                          {/* Pronunciation */}
                          <div className="space-y-1 bg-soph-card p-3 rounded-xl border border-soph-border">
                            <span className="text-[10px] uppercase font-bold text-soph-gold block">বাংলা উচ্চারণ:</span>
                            <p className="text-xs font-semibold text-soph-text-primary leading-relaxed">
                              {d.tr}
                            </p>
                          </div>

                          {/* Simple Bangla meaning */}
                          <div className="space-y-1 bg-soph-card p-3 rounded-xl border border-soph-border">
                            <span className="text-[10px] uppercase font-bold text-soph-gold block">অনুবাদ বা মিনতি:</span>
                            <p className="text-xs font-medium text-soph-text-primary leading-relaxed border-l-2 border-soph-gold pl-4 mt-1">
                              {d.bn}
                            </p>
                          </div>

                          {/* Custom Recite Counter Action Panel */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-soph-card/60 p-4 rounded-xl border border-soph-border shadow-inner">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-soph-hover rounded-xl flex items-center justify-center text-lg text-soph-gold border border-soph-border shadow-inner select-none shrink-0">
                                📿
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-extrabold text-soph-gold-muted block tracking-wider">পঠিত সংখ্যা ট্র্যাকার:</span>
                                <p className="text-xs text-soph-text-primary font-medium">
                                  {hasRecited ? (
                                    <>আজ এই দু'আটি <span className="text-emerald-400 font-bold decoration-dotted underline underline-offset-2">{toBengaliNumber(recitedDuas[d.id])} বার</span> পাঠ করা হয়েছে।</>
                                  ) : (
                                    "আজ এখনও এটি পাঠ করা হয়নি।"
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIncrementRecite(d.id);
                                }}
                                className="px-3.5 py-1.5 bg-soph-gold hover:bg-soph-gold-light active:scale-95 text-soph-deep font-bold text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-soph-gold/5 border border-soph-gold/20"
                              >
                                <span>➕ পঠিত হয়েছে (+১)</span>
                              </button>
                              
                              {hasRecited && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetRecite(d.id);
                                  }}
                                  className="p-1.5 bg-soph-deep border border-soph-border hover:border-red-900/40 hover:bg-red-950/20 text-soph-text-secondary hover:text-red-400 rounded-lg transition duration-150 cursor-pointer"
                                  title="রিসেট করুন"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ADMIN PANEL TAB / ROUTER */}
        {activeTab === "admin-panel" && (
          <div className="max-w-md mx-auto my-12 animate-fade-in">
            {!isAdminLoggedIn ? (
              <div className="bg-soph-card border border-soph-border rounded-3xl p-8 shadow-md">
                <div className="text-center space-y-2 mb-6">
                  <div className="h-12 w-12 bg-soph-hover text-soph-gold rounded-2xl flex items-center justify-center font-serif text-2xl mx-auto shadow-inner border border-soph-border">
                    🔐
                  </div>
                  <h3 className="text-lg font-bold text-soph-text-primary font-sans">শিবির ড্যাশবোর্ড</h3>
                  <p className="text-xs text-soph-text-secondary font-medium">ড্যাশবোর্ড সিস্টেমে প্রবেশ করুন</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  {adminError && (
                    <div className="text-xs text-red-400 bg-red-950/25 p-3 rounded-xl border border-red-900/30 flex items-center gap-1.5 font-medium">
                      <ShieldAlert className="h-4 w-4 text-red-400" /> {adminError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-soph-text-secondary block">ইমেইল / ব্যবহারকারী নাম</label>
                    <input
                      type="text"
                      placeholder="admin"
                      className="w-full px-4 py-2 bg-soph-deep border border-soph-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-soph-gold text-soph-text-primary placeholder-zinc-500"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-soph-text-secondary block">গোপন পাসওয়ার্ড</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2 bg-soph-deep border border-soph-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-soph-gold text-soph-text-primary placeholder-zinc-500 font-mono"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-bold text-xs rounded-xl shadow-md shadow-soph-gold/10 transition mt-2 cursor-pointer"
                  >
                    নিরাপদ প্রবেশ নিশ্চিত করুন
                  </button>
                </form>

                <div className="text-center space-y-1 mt-6 border-t border-soph-border pt-4">
                  <span className="text-[10px] text-soph-text-secondary font-mono uppercase tracking-wider block">ডেমো ক্রেডেনশিয়াল:</span>
                  <span className="text-[11px] font-semibold text-soph-gold font-mono block">
                    admin / admin123
                  </span>
                </div>
              </div>
            ) : (
              /* Actual Admin Dashboard panel */
              <div className="bg-soph-card border border-soph-border rounded-3xl p-6 shadow-md space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between border-b border-soph-border pb-4">
                  <div>
                    <h3 className="text-base font-bold text-soph-text-primary flex items-center gap-1.5">
                      <CheckCircle className="h-5 w-5 text-soph-gold" /> অ্যাডমিন সিকিউর জোন
                    </h3>
                    <p className="text-[10px] text-soph-text-secondary">শিবির.কম ইসলামিক পোর্টাল অ্যাডমিনিস্ট্রেটর</p>
                  </div>
                  <button
                    onClick={handleAdminLogout}
                    className="flex items-center gap-1 px-3 py-1 bg-red-950/25 text-red-400 text-[11px] font-black rounded-lg hover:bg-red-900/30 transition cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" /> লগআউট
                  </button>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-soph-deep p-4 border border-soph-border rounded-2xl">
                    <span className="text-xs font-bold text-soph-text-secondary block">কুরআন ডাটা কভারেজ</span>
                    <span className="text-lg font-extrabold text-soph-gold block mt-1">১১৪টি সূরা (১০০%)</span>
                  </div>
                  <div className="bg-soph-deep p-4 border border-soph-border rounded-2xl">
                    <span className="text-xs font-bold text-soph-text-secondary block">AI জেনারেটেড লিমিট</span>
                    <span className="text-lg font-extrabold text-soph-gold block mt-1">আনলিমিটেড এপিআই</span>
                  </div>
                </div>

                {/* Dashboard Tab Selector */}
                <div className="flex border-b border-soph-border mt-2">
                  <button
                    onClick={() => setAdminSubTab("android")}
                    className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                      adminSubTab === "android"
                        ? "border-soph-gold text-soph-gold font-extrabold"
                        : "border-transparent text-soph-text-secondary hover:text-soph-text-primary"
                    }`}
                  >
                    📱 অ্যান্ড্রয়েড ইন্টিগ্রেশন সেন্টার
                  </button>
                  <button
                    onClick={() => setAdminSubTab("server")}
                    className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                      adminSubTab === "server"
                        ? "border-soph-gold text-soph-gold font-extrabold"
                        : "border-transparent text-soph-text-secondary hover:text-soph-text-primary"
                    }`}
                  >
                    ⚙️ সার্ভার কনফিগারেশন
                  </button>
                </div>

                {/* Sub Tab Contents */}
                {adminSubTab === "server" ? (
                  <div className="space-y-3 pt-2 animate-fade-in">
                    <h4 className="text-xs font-black uppercase text-soph-text-secondary tracking-wider">সার্ভার সেটিংস</h4>
                    <div className="p-4 bg-soph-deep border border-soph-border rounded-2xl flex gap-3 items-start">
                      <Settings className="h-5 w-5 text-soph-gold shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-soph-text-primary">সার্ভার এবং ক্যাশ স্টোরেজ</h5>
                        <p className="text-[10px] text-soph-text-secondary leading-relaxed mt-0.5 text-justify">
                          অনলাইন কুরআন এপিআই এবং জেমিনি এআই ব্যবহারের নিখুঁত অনুপাত ধরে রাখতে মেমোরি ক্যাশ সচল রয়েছে। পরবর্তী ডেভলপমেন্টে ডাটাবেস সমন্বয় করার সুবিধা রয়েছে।
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 animate-fade-in">
                    <div className="bg-soph-deep border border-soph-border rounded-xl p-3 text-[11px] text-soph-text-secondary leading-relaxed">
                      মোবাইল কুরআন অ্যাপকে আমাদের সার্ভার ব্যাকএন্ডের সাথে যুক্ত করতে নিচের ডেভলপার কোড স্নিপেটসমূহ সরাসরি অনুলিপি (Copy) করে ব্যবহার করুন।
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAndroidSubTab("retrofit")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition tracking-wider cursor-pointer ${
                          androidSubTab === "retrofit"
                            ? "bg-soph-gold text-soph-deep"
                            : "bg-soph-deep text-soph-text-secondary border border-soph-border hover:bg-soph-hover"
                        }`}
                      >
                        Retrofit API Service
                      </button>
                      <button
                        onClick={() => setAndroidSubTab("room")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition tracking-wider cursor-pointer ${
                          androidSubTab === "room"
                            ? "bg-soph-gold text-soph-deep"
                            : "bg-soph-deep text-soph-text-secondary border border-soph-border hover:bg-soph-hover"
                        }`}
                      >
                        Room DB Schema
                      </button>
                      <button
                        onClick={() => setAndroidSubTab("sync")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition tracking-wider cursor-pointer ${
                          androidSubTab === "sync"
                            ? "bg-soph-gold text-soph-deep"
                            : "bg-soph-deep text-soph-text-secondary border border-soph-border hover:bg-soph-hover"
                        }`}
                      >
                        Sync Worker
                      </button>
                      <button
                        onClick={() => setAndroidSubTab("offline")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition tracking-wider cursor-pointer ${
                          androidSubTab === "offline"
                            ? "bg-soph-gold text-soph-deep"
                            : "bg-soph-deep text-soph-text-secondary border border-soph-border hover:bg-soph-hover"
                        }`}
                      >
                        Surah Offline API
                      </button>
                    </div>

                    {androidSubTab !== "offline" ? (
                      <>
                        {/* Developer Code Editor Style Blocks */}
                        <div className="bg-soph-deep rounded-2xl border border-soph-border p-4 relative font-mono text-[11px] overflow-hidden">
                          <div className="flex items-center justify-between border-b border-soph-border/40 pb-2 mb-3 text-[10px] text-soph-text-secondary">
                            <span className="flex items-center gap-1 select-none">📂 app/src/main/java/com/app/quran/{
                              androidSubTab === "retrofit" ? "AlQuranApiService.kt" : androidSubTab === "room" ? "QuranDao.kt" : "GeminiSyncWorker.kt"
                            }</span>
                            <button
                              onClick={() => {
                                const code = androidSubTab === "retrofit" ? retrofitCode : androidSubTab === "room" ? roomCode : syncCode;
                                handleCopyCode(code, androidSubTab);
                              }}
                              className="flex items-center gap-1 text-soph-gold hover:text-soph-gold-light transition cursor-pointer font-sans text-xs font-bold"
                            >
                              {copiedCodeText === androidSubTab ? (
                                <>
                                  <ClipboardCheck className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="text-teal-400">অনুলিপি হয়েছে!</span>
                                </>
                              ) : (
                                <>
                                  <span>অনুলিপি করুন</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="max-h-72 overflow-y-auto whitespace-pre text-left text-soph-text-primary leading-relaxed cursor-text pr-2 scrollbar-thin">
                            {androidSubTab === "retrofit" && retrofitCode}
                            {androidSubTab === "room" && roomCode}
                            {androidSubTab === "sync" && syncCode}
                          </div>
                        </div>

                        <div className="p-3 bg-yellow-950/15 border border-yellow-900/35 rounded-xl text-[11px] text-yellow-300/90 leading-relaxed flex items-start gap-2 select-none">
                          <Info className="h-4 w-4 shrink-0 mt-0.5 text-soph-gold" />
                          <div>
                            <strong>ডেভেলপার নোট: </strong>
                            {androidSubTab === "retrofit" && "আপনার অ্যান্ড্রয়েড অ্যাপ্লিকেশনে এই ইন্টিগ্রেশন সার্ভিসটি ব্যবহার করে সরাসরি আমাদের কুরআন ও তাফসীর পোর্টালের সাথে ডাটা বাফারিং ও প্রনান্সিয়েশন সিঙ্ক সচল করুন।"}
                            {androidSubTab === "room" && "অফলাইনে কুরআন তিলাওয়াত, বাংলা অর্থ ও উচ্চারণ জমিয়ে রাখতে Room Database-এর Entity ও DAO ইন্টারফেসগুলো ব্যবহার করুন।"}
                            {androidSubTab === "sync" && "ডিভাইস ইন্টারনেট সংযোগ পাওয়ার সঙ্গে সঙ্গে স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক চালু করতে Android WorkManager ব্যবহারকারী প্রসেসটি সচল রাখুন।"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4 animate-fade-in text-left">
                        {/* Offline Sync State Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-soph-deep border border-soph-border rounded-xl p-4 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                              adminOnline ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400" : "bg-red-950/40 border-red-500/30 text-red-400"
                            }`}>
                              {adminOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5 animate-pulse" />}
                            </div>
                            <div>
                              <p className="text-[10px] text-soph-text-secondary font-bold uppercase tracking-wider">ইন্টারনেট সংযোগ</p>
                              <h5 className="text-xs font-black text-soph-text-primary">{adminOnline ? "অনলাইন (ডাটা সিঙ্ক সচল)" : "অফলাইন (সীমিত সুবিধা)"}</h5>
                            </div>
                          </div>

                          <div className="bg-soph-deep border border-soph-border rounded-xl p-4 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                              downloadedAdminIds.length === 114 ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400" : "bg-soph-hover border-soph-border text-soph-gold"
                            }`}>
                              <Database className="h-5 w-5 text-soph-gold" />
                            </div>
                            <div>
                              <p className="text-[10px] text-soph-text-secondary font-bold uppercase tracking-wider">অফলাইন স্টোরেজ ব্যাকআপ</p>
                              <h5 className="text-xs font-black text-soph-text-primary">{downloadedAdminIds.length} / ১১৪ টি সূরা রেডি</h5>
                            </div>
                          </div>

                          <div className="bg-soph-deep border border-soph-border rounded-xl p-4 flex flex-col justify-center">
                            <div className="flex gap-2 justify-end w-full">
                              <button
                                disabled={isAdminSyncingAll || !adminOnline}
                                onClick={syncAllSurahsAdmin}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-1 ${
                                  downloadedAdminIds.length === 114 
                                    ? "bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 w-full"
                                    : "bg-soph-gold text-soph-deep hover:bg-soph-gold-light w-full"
                                }`}
                              >
                                <RefreshCw className={`h-3 w-3 ${isAdminSyncingAll ? "animate-spin" : ""}`} />
                                <span>১১৪ সূরা সিঙ্ক</span>
                              </button>
                              
                              {downloadedAdminIds.length > 0 && (
                                <button
                                  onClick={() => {
                                    if (confirm("আপনি কি অফলাইন স্টোরেজ থেকে ডাউনলোড করা সব সুরার ব্যাকআপ ফাইল মুছে ফেলতে চান?")) {
                                      for (let i = 1; i <= 114; i++) {
                                        localStorage.removeItem(`quran_surah_offline_${i}`);
                                        localStorage.removeItem(`quran_surah_offline_details_${i}`);
                                      }
                                      scanAdminOfflineCache();
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>মুছুন</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Sync Progress Bars */}
                        {(isAdminSyncingAll || isSavingLocal) && (
                          <div className="bg-soph-deep border-2 border-soph-gold/30 rounded-2xl p-5 space-y-4 animate-fade-in shadow-lg shadow-soph-gold/5">
                            <div className="flex justify-between items-center select-none">
                              <span className="flex items-center gap-2 text-xs font-bold text-soph-gold">
                                <RefreshCw className="h-4 w-4 animate-spin text-soph-gold" />
                                <span>
                                  {isAdminSyncingAll ? "১১৪ সূরা অফলাইন লোকাল স্টোরেজে সিঙ্ক হচ্ছে..." : saveLocalStatusText}
                                </span>
                              </span>
                              <span className="text-xs font-black text-soph-gold font-mono">
                                {isAdminSyncingAll ? `${adminSyncProgress}%` : `${saveLocalProgress}%`}
                              </span>
                            </div>

                            {/* Standard Visual Progress Bar */}
                            <div className="w-full bg-soph-card rounded-full h-2.5 overflow-hidden border border-soph-border">
                              <div
                                className="bg-gradient-to-r from-soph-gold to-amber-500 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(197,160,89,0.55)]"
                                style={{ width: `${isAdminSyncingAll ? adminSyncProgress : saveLocalProgress}%` }}
                              ></div>
                            </div>

                            {/* Detail Text */}
                            <div className="flex justify-between items-center text-[10px] text-soph-text-secondary select-none font-medium">
                              <span>
                                {isAdminSyncingAll && currentSyncingSurahName && (
                                  <>বর্তমানে ডাটা রেন্ডারিং হচ্ছে: <strong className="text-soph-text-primary font-bold">{currentSyncingSurahName}</strong></>
                                )}
                                {isSavingLocal && (
                                  <>ব্রাউজার ক্যাশ ও সিকিউরিটি ইন্টিগ্রিটি রিভাইস করা হচ্ছে...</>
                                )}
                              </span>
                              <span>
                                {isAdminSyncingAll ? `${Math.round(adminSyncProgress * 1.14)} / ১১৪ সূরা সম্পন্ন` : "১টি অফলাইন অবজেক্ট রেন্ডারিং"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Single Surah Offline Interactive Bench */}
                        <div className="bg-soph-deep border border-soph-border rounded-2xl p-5 space-y-4">
                          <div className="flex justify-between items-start gap-4 flex-wrap">
                            <div>
                              <h4 className="text-sm font-black text-soph-gold uppercase tracking-wider flex items-center gap-2 select-none">
                                <Database className="h-4 w-4 text-soph-gold" />
                                <span>সূরাভিত্তিক অফলাইন ক্যাশ জেনারেটর বেঞ্চ</span>
                              </h4>
                              <p className="text-[11.5px] text-soph-text-secondary max-w-xl leading-relaxed mt-1">
                                প্রতিটি সূরার জন্য এই এন্ডপয়েন্টটি আরবী আয়াত, সরল বাংলা অনুবাদ এবং নিখুঁত বাংলা উচ্চারণ একসাথে প্রস্তুত করে একটি শক্তিশালী গতিশীল অফলাইন অবজেক্ট হিসেবে ব্রাউজারে স্টোর করে।
                              </p>
                            </div>

                            {/* Downloaded State Badge */}
                            <div className="select-none">
                              {downloadedAdminIds.includes(offlineSurahId) ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 shadow-sm animate-pulse">
                                  <Check className="h-3 w-3" />
                                  <span>Synced offline</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase bg-soph-card text-soph-text-secondary border border-soph-border">
                                  <span>Not Cached Locally</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="h-px bg-soph-border/40 my-1"></div>

                          <div className="flex flex-col sm:flex-row gap-3 items-center select-none pt-1">
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                              <span className="text-xs text-soph-text-primary font-bold whitespace-nowrap">সূরা সিলেক্ট করুন:</span>
                              <select
                                value={offlineSurahId}
                                onChange={(e) => setOfflineSurahId(Number(e.target.value))}
                                className="bg-soph-card border border-soph-border text-soph-text-primary text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:border-soph-gold cursor-pointer flex-1 sm:flex-initial"
                              >
                                {ALL_SURAS.map((s) => (
                                  <option key={s.n} value={s.n}>
                                    {s.n}. {s.bn} ({s.en}) {downloadedAdminIds.includes(s.n) ? "✓" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
                              <button
                                onClick={() => fetchOfflineSurahData(offlineSurahId)}
                                disabled={isFetchingOffline || isAdminSyncingAll}
                                className="px-4 py-2 rounded-xl bg-soph-card hover:bg-soph-hover text-soph-text-primary border border-soph-border font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${isFetchingOffline ? "animate-spin text-soph-gold" : ""}`} />
                                <span>রিফ্রেশ পে-লোড</span>
                              </button>

                              <button
                                onClick={() => saveToLocalStorageOffline(offlineSurahId)}
                                disabled={isSavingLocal || isAdminSyncingAll || !adminOnline}
                                className="px-4 py-2 rounded-xl bg-soph-gold text-soph-deep hover:bg-soph-gold-light border border-soph-gold/20 font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>{isSavingLocal ? "সংরক্ষণ হচ্ছে..." : "রিয়েল-টাইম অফলাইন ডাউনলোড"}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Sandbox Code Block */}
                        <div className="bg-soph-deep rounded-2xl border border-soph-border p-4 relative font-mono text-[11px] overflow-hidden text-left">
                          <div className="flex items-center justify-between border-b border-soph-border/40 pb-2 mb-3 text-[10px] text-soph-text-secondary">
                            <span className="flex items-center gap-1.5 select-none text-soph-gold">
                              🌐 GET /api/quran/offline/{offlineSurahId}
                            </span>
                            <button
                              onClick={() => {
                                if (offlineDataPreview) {
                                  handleCopyCode(offlineDataPreview, "offline-json");
                                }
                              }}
                              className="flex items-center gap-1 text-soph-gold hover:text-soph-gold-light transition cursor-pointer font-sans text-xs font-bold"
                            >
                              {copiedCodeText === "offline-json" ? (
                                <>
                                  <ClipboardCheck className="h-3.5 w-3.5 text-teal-400" />
                                  <span className="text-teal-400 font-bold">অনুলিপি হয়েছে!</span>
                                </>
                              ) : (
                                <>
                                  <span>Copy JSON Payload</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="max-h-[320px] overflow-y-auto whitespace-pre text-left text-teal-400/95 leading-relaxed cursor-text pr-2 scrollbar-thin">
                            {isFetchingOffline ? (
                              <div className="py-16 text-center text-soph-text-secondary font-sans leading-relaxed">
                                <RefreshCw className="h-8 w-8 text-soph-gold animate-spin mx-auto mb-3" />
                                <p className="animate-pulse text-xs font-bold text-soph-gold">জেমিনি এআই ও ডাটাবেস সমন্বয়ে সূরাটির প্রতিটি আয়াতের বাংলা উচ্চারণসহ অফলাইন এপিআই প্যাক রিসোর্স প্রস্তুত হচ্ছে...</p>
                                <p className="text-[10px] text-soph-text-secondary mt-1">অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন, এটি সম্পূর্ণ প্রনান্সিয়েশন ডাটা কমপাইল করছে।</p>
                              </div>
                            ) : (
                              offlineDataPreview || "// কোনো ডাটা লোড হয়নি। এন্ডপয়েন্ট থেকে ডাটা রিট্রিভ করতে ওপরে রিফ্রেশ দিন।"
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-teal-950/15 border border-teal-900/35 rounded-xl text-[11px] text-teal-400 leading-relaxed flex items-start gap-2 select-none text-left font-sans">
                          <Info className="h-4 w-4 shrink-0 mt-0.5 text-teal-400" />
                          <div>
                            <strong>অফলাইন কুয়েরি গাইড:</strong> আপনার অ্যান্ড্রয়েড অ্যাপ্লিকেশনে প্রতিটা সূরার অফলাইন সাপোর্ট সচল করতে অ্যাপের প্রথম ওপেনিং-এ ব্যাকগ্রাউন্ড সিঙ্ক প্রসেসে এই এন্ডপয়েন্টটি কল করে ডাটাগুলো সরাসরি অফলাইন SQLite (Room Database)-এ সেভ করে নিন। এটি একবারে সম্পূর্ণ ডাটা তিলাওয়াতের জন্য রেডি করে দেয়।
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-soph-card border-t border-soph-border text-soph-text-secondary py-8 text-center select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-3">
          <p className="text-xs font-bold tracking-wide uppercase text-soph-gold">
            আল কুরআনুল কারিম ও তাফসীর সেবামূলক ডিজিটাল পোর্টাল
          </p>
          <p className="text-[11px] text-soph-text-secondary max-w-md mx-auto leading-relaxed">
            এই পোর্টালের আরবি আয়াতসমূহ, সরল বাংলা অনুবাদ ও অডিও রেকর্ডিংসমূহ নির্ভরযোগ্য ইসলামিক ডেটাবেস এবং আল-কুরআন ক্লাউড এপিআই থেকে সরাসরি সরবরাহ করা হয়েছে। এবং সূরা ও আয়াত ভিত্তিক সকল উচ্চারণ, শান-ই-নুযূল ও ব্যাখ্যা তাৎক্ষণিকভাবে জেমিনি কৃত্রিম বুদ্ধিমত্তা (Gemini AI) দ্বারা প্রস্তুতকৃত।
          </p>
          <div className="text-[10px] font-mono text-soph-text-secondary pt-2 border-t border-soph-border/40 w-max mx-auto px-6">
            © {new Date().getFullYear()} শিবির.কম - নিখিল জ্ঞান চর্চা কেন্দ্র
          </div>
        </div>
      </footer>
    </div>
  );
}

const retrofitCode = `package com.app.quran.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface AlQuranApiService {
    // ১. ১১৪ সূরার সাধারণ তালিকা
    @GET("api/surahs")
    suspend fun getSurahs(): Response<List<SurahSummary>>

    // ২. নির্দিষ্ট সূরার সব আয়াত ও বাংলা অর্থ
    @GET("api/surah/{id}")
    suspend fun getSurahDetails(@Path("id") surahId: Int): Response<SurahResponse>

    // ৩. আরবী আয়াত অনুযায়ী বাংলা উচ্চারণ ব্যাচ জেনারেশন
    @POST("api/batch-pronounce")
    suspend fun batchPronounce(@Body request: BatchPronounceRequest): Response<Map<Int, String>>

    // ৪. জেমিনি এআই তাফসীর ও শান-ই-নুযূল
    @POST("api/explain")
    suspend fun explainAyah(@Body request: ExplainAyahRequest): Response<TafsirResponse>
}

data class SurahSummary(
    val n: Int,
    val bn: String,
    val ar: String,
    val type: String,
    val ayat: Int,
    val en: String
)

data class SurahResponse(
    val n: Int,
    val bn: String,
    val ayahs: List<AyahModel>
)

data class AyahModel(
    val number: Int,
    val numberInSurah: Int,
    val text: String,
    val translation: String,
    val juz: Int
)

data class BatchPronounceRequest(
    val surahId: Int,
    val verses: List<AyahTextItem>
)

data class AyahTextItem(
    val numberInSurah: Int,
    val text: String
)

data class ExplainAyahRequest(
    val surah: Int,
    val ayah: Int,
    val text: String,
    val translation: String
)

data class TafsirResponse(
    val pronunciation: String,
    val context: String,
    val explanation: String,
    val lessons: String
)`;

const roomCode = `package com.app.quran.db

import android.content.Context
import androidx.room.*

@Entity(tableName = "quran_verses")
data class QuranVerse(
    @PrimaryKey val id: Int, // ইউনিক কী
    val surah_number: Int,  // সূরার নম্বর
    val verse_number: Int,  // আয়াত নম্বর
    val arabic_text: String, // আরবী মূল পাঠ
    val bangla_translation: String, // সরল বাংলা অনুবাদ
    val pronunciation: String? = null // বাংলা উচ্চারণ (ঐচ্ছিক)
)

// SQLite-এর দ্রুত স্পিড ও অ্যাডভান্সড ব্যবহারের জন্য FTS4 ফুল-টেক্সট সার্চ টেবিল
@Fts4(contentEntity = QuranVerse::class)
@Entity(tableName = "quran_verses_fts")
data class QuranVerseFts(
    val arabic_text: String,
    val bangla_translation: String,
    val pronunciation: String?
)

@Dao
interface QuranDao {
    // নির্দিষ্ট সূরার সব আয়াত একসাথে অফলাইনে নেওয়ার জন্য
    @Query("SELECT * FROM quran_verses WHERE surah_number = :surahId ORDER BY verse_number ASC")
    suspend fun getSurahVerses(surahId: Int): List<QuranVerse>

    // নতুন আয়াত ডেটা অফলাইনে প্রথমবার ইনসার্ট বা হালনাগাদ করা
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVerses(verses: List<QuranVerse>)

    // নির্দিষ্ট কোন আয়াতের বাংলা উচ্চারণ আপডেট করা
    @Query("UPDATE quran_verses SET pronunciation = :pronunciation WHERE surah_number = :surahId AND verse_number = :verseId")
    suspend fun updatePronunciation(surahId: Int, verseId: Int, pronunciation: String)

    // ১. বাংলা বা আরবি শব্দের জন্য চমৎকার সাবস্ট্রিং বা অফলাইন ফুল-টেক্সট সার্চ
    @Query("""
        SELECT * FROM quran_verses 
        WHERE bangla_translation LIKE '%' || :query || '%' 
           OR arabic_text LIKE '%' || :query || '%' 
           OR pronunciation LIKE '%' || :query || '%' 
        ORDER BY surah_number ASC, verse_number ASC
    """)
    suspend fun searchOffline(query: String): List<QuranVerse>

    // ২. FTS4 ব্যবহার করে মিলি-সেকেন্ডে ফাস্ট ফুল-টেক্সট সার্চ কুয়েরি 
    @Query("""
        SELECT quran_verses.* FROM quran_verses 
        JOIN quran_verses_fts ON quran_verses.id = quran_verses_fts.rowid 
        WHERE quran_verses_fts MATCH :query
    """)
    suspend fun searchFts(query: String): List<QuranVerse>
}

@Database(entities = [QuranVerse::class, QuranVerseFts::class], version = 1, exportSchema = false)
abstract class QuranDatabase : RoomDatabase() {
    
    abstract fun quranDao(): QuranDao

    companion object {
        @Volatile
        private var INSTANCE: QuranDatabase? = null

        fun getDatabase(context: Context): QuranDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    QuranDatabase::class.java,
                    "quran.db"
                )
                .createFromAsset("databases/quran.db") // এই লাইনটি অফলাইন করার ম্যাজিক!
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

/*
// ব্যবহার বিধি বা কুয়েরি করার চমৎকার উদাহরণ:
// ১ নম্বর সূরা (সূরা ফাতিহা) অফলাইনে অত্যন্ত দ্রুত লোড করতে নিচের কোডটি ব্যবহার করুন:
lifecycleScope.launch {
    val quranDb = QuranDatabase.getDatabase(applicationContext)
    val versesList = quranDb.quranDao().getSurahVerses(1) // সূরা আইডি ১ (সূরা ফাতিহা)

    // এখন versesList থেকে ডেটা নিয়ে আপনার RecyclerView বা Jetpack Compose UI-তে দেখিয়ে দিন
    // এটি সম্পূর্ণ ইন্টারনেট ছাড়াই চোখের পলকে অবিশ্বাস্য দ্রুত গতিতে কাজ করবে!
}

// অফলাইন সার্চ ব্যবহারের চমৎকার উদাহরণ (বাংলা বা আরবি শব্দ দিয়ে অনুসন্ধান):
lifecycleScope.launch {
    val quranDb = QuranDatabase.getDatabase(applicationContext)
    
    // "রহমান" বা "الحمد" লিখে অফলাইনে সার্চ করুন:
    val searchResults = quranDb.quranDao().searchOffline("রহমান")
    
    // searchResults এ পাওয়া আয়াতগুলো আপনার সার্চ ইউজার ইন্টারফেসে লাইভ আপডেট করে দিন!
}
*/`;

const syncCode = `package com.app.quran.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.app.quran.api.AlQuranApiService
import com.app.quran.api.BatchPronounceRequest
import com.app.quran.api.AyahTextItem
import com.app.quran.db.AppDatabase
import com.app.quran.db.QuranVerse

class GeminiSyncWorker(
    context: Context,
    workerParams: WorkerParameters,
    private val apiService: AlQuranApiService
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val db = AppDatabase.getDatabase(applicationContext)
        val dao = db.quranDao()

        // ১. উচ্চারণ ও তাফসীর বিহীন অফলাইন আয়াতগুলো চিহ্নিত করুন
        val unsyncedSurahs = listOf(1) // উদাহরণস্বরূপ সূরা ফাতিহা

        for (surahId in unsyncedSurahs) {
            val localVerses = dao.getSurahVerses(surahId)
            val needPronounce = localVerses.filter { it.pronunciation.isNullOrEmpty() }

            if (needPronounce.isNotEmpty()) {
                val apiVerses = needPronounce.map { AyahTextItem(it.verse_number, it.arabic_text) }
                
                try {
                    // ২. আমাদের ওয়েবসাইটের এক্সপ্রেস এপিআই-তে রিকোয়েস্ট পাঠান
                    val response = apiService.batchPronounce(BatchPronounceRequest(surahId, apiVerses))
                    if (response.isSuccessful && response.body() != null) {
                        val pronMap = response.body()!!
                        // ৩. রুম ডাটাবেজে উচ্চারণগুলো সিঙ্ক করুন
                        for ((verseNo, pronText) in pronMap) {
                            dao.updatePronunciation(surahId, verseNo, pronText)
                        }
                    }
                } catch (e: Exception) {
                    return Result.retry()
                }
            }
        }
        return Result.success()
    }
}`;
