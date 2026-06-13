import React, { useState, useEffect } from "react";
import { 
  Video, VideoOff, Clock, Plus, ExternalLink, Trash2, Calendar, 
  Sparkles, Check, ChevronRight, RefreshCw, AlertCircle, User, Info, Lock
} from "lucide-react";
import { 
  collection, query, orderBy, onSnapshot, setDoc, deleteDoc, doc, getDocs 
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db, googleProvider } from "../lib/firebase.ts";
import { StudyCircle } from "../types.ts";

interface GoogleMeetStudyCircleProps {
  currentUser: any;
  meetAccessToken: string | null;
  setMeetAccessToken: (token: string | null) => void;
  onTriggerGoogleSignIn: () => Promise<void>;
}

const toBengaliNumerals = (num: number | string) => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).split("").map(d => {
    const parsed = parseInt(d);
    return isNaN(parsed) ? d : banglaDigits[parsed];
  }).join("");
};

export default function GoogleMeetStudyCircle({
  currentUser,
  meetAccessToken,
  setMeetAccessToken,
  onTriggerGoogleSignIn
}: GoogleMeetStudyCircleProps) {
  const [circles, setCircles] = useState<StudyCircle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create circular session variables
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);

  // Load and subscribe to study circles
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "study_circles"), orderBy("scheduledTime", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as StudyCircle);
      setCircles(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to query study circles natively:", err);
      // Fallback query without sorting (in case index is still generating)
      const fallbackQuery = query(collection(db, "study_circles"));
      getDocs(fallbackQuery).then(snap => {
        const list = snap.docs.map(doc => doc.data() as StudyCircle);
        // sort manually in memory
        list.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
        setCircles(list);
        setLoading(false);
      }).catch(fallbackErr => {
        console.error("Fallback query failed:", fallbackErr);
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle active status (check if a circle is within some minutes of scheduled time)
  const isCircleActive = (scheduledTimeStr: string) => {
    try {
      const scheduled = new Date(scheduledTimeStr).getTime();
      const now = Date.now();
      const diffMs = now - scheduled;
      
      // Active if 15 mins before to 2 hours after scheduled time
      const fifteenMinsBefore = -15 * 60 * 1000;
      const twoHoursAfter = 2 * 60 * 60 * 1000;
      
      return diffMs >= fifteenMinsBefore && diffMs <= twoHoursAfter;
    } catch {
      return false;
    }
  };

  // Format date-time in Bengali
  const formatBanglaDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      const formatted = date.toLocaleDateString('bn-BD', options);
      return formatted;
    } catch {
      return dateStr;
    }
  };

  // Explicitly authenticate to obtain Google Meet scopes containing accesstoken
  const handleMeetAuthorize = async () => {
    setAuthorizing(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setMeetAccessToken(credential.accessToken);
        setSuccess("গুগল মিট সেবা সফলভাবে সংযুক্ত হয়েছে!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error("গুগল মিট টোকেন সংগৃহীত হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
      }
    } catch (err: any) {
      console.error("Google Meet authorization failed:", err);
      setError(err?.message || "গুগল মিট সংযোগ করার সময় ব্যর্থতা ঘটেছে।");
    } finally {
      setAuthorizing(false);
    }
  };

  // Create Google Meet links and save circles in Firestore
  const handleCreateStudyCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("বৈঠকের একটি সুন্দর বিষয় বা শিরোনাম দিন।");
      return;
    }
    if (!scheduledTime) {
      setError("বৈঠকের সময়সূচি নির্বাচন করুন।");
      return;
    }
    if (!meetAccessToken) {
      setError("আপনার গুগল মিট সেবা অনুমোদিত নয়। অনুগ্রহ করে 'গুগল মিট অনুমোদন করতে ক্লিক করুন' বাটনে চাপুন।");
      return;
    }

    setCreating(true);
    try {
      // 1. Create space using Google Meet Spaces API
      const meetRes = await fetch("https://meet.googleapis.com/v2/spaces", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${meetAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (!meetRes.ok) {
        const errBody = await meetRes.json().catch(() => ({}));
        console.error("Google Meet Spaces API error details:", errBody);
        throw new Error(errBody?.error?.message || "হায়রে! গুগল মিট লিংক জেনারেট করা সম্ভব হয়নি। টোকেনের মেয়াদ উত্তীর্ণ হয়ে থাকতে পারে।");
      }

      const meetData = await meetRes.json();
      const meetLink = meetData.meetingUri;

      if (!meetLink) {
        throw new Error("গুগল মিট সার্ভার থেকে কোনো বৈঠক লিংক পাওয়া যায়নি।");
      }

      // 2. Put meeting details to Firestore
      const circleId = doc(collection(db, "study_circles")).id;
      const newCircleData: StudyCircle = {
        id: circleId,
        title: title.trim(),
        description: description.trim() || undefined,
        hostUid: currentUser.uid,
        hostName: currentUser.displayName || "দ্বীনি ভাই",
        hostPhoto: currentUser.photoURL || undefined,
        meetLink,
        scheduledTime,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "study_circles", circleId), newCircleData);
      
      // Reset form on success
      setTitle("");
      setDescription("");
      setScheduledTime("");
      setShowForm(false);
      setSuccess(`মাশাআল্লাহ! "${newCircleData.title}" দ্বীনি বৈঠকটি সফলভাবে তৈরি হয়েছে এবং মিট লিংক জেনারেট হয়েছে।`);
      
      // Auto clear success alert
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Create circle flow error:", err);
      // If unauthorized, clear token cache so they re-authenticate
      if (err?.message?.includes("invalid") || err?.message?.includes("expired") || err?.message?.includes("token")) {
        setMeetAccessToken(null);
        setError("আপনার গুগল মিট অথরাইজেশন টোকেনের মেয়াদ শেষ হয়েছে। দয়া করে গুগলে পুনরায় কানেক্ট করে তৈরি করুন।");
      } else {
        setError(err?.message || "বৈঠক তৈরিতে গোলযোগ ঘটেছে। দুঃখিত!");
      }
    } finally {
      setCreating(false);
    }
  };

  // Cancel/Delete meeting with user confirmation
  const handleDeleteStudyCircle = async (id: string, meetingTitle: string) => {
    const isConfirmed = window.confirm(`আপনি কি আসলেই "${meetingTitle}" দ্বীনি বৈঠকটি মুছে ফেলতে চান? এটি স্থায়ীভাবে বাতিল হয়ে যাবে।`);
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "study_circles", id));
      setSuccess("বৈঠকটি সফলভাবে বাতিল বা মুছে ফেলা হয়েছে।");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      console.error("Delete study circle failed:", err);
      setError("বৈঠকটি বাতিল করা সম্ভব হয়নি। আপনি কি এই বৈঠকের হোস্ট?");
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* SUCCESS & ERROR TOASTS */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-bold rounded-xl flex items-start gap-2.5 shadow-xl animate-fade-in text-left">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs font-bold rounded-xl flex items-start gap-2.5 shadow-xl animate-fade-in text-left">
          <Sparkles className="h-4 w-4 text-soph-gold shrink-0 mt-0.5 animate-pulse" />
          <p className="leading-relaxed">{success}</p>
        </div>
      )}

      {/* CORE INFO CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-soph-border bg-soph-card/90 ps-6 pe-6 pt-6 pb-6 text-left shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-soph-gold/40 via-soph-gold to-soph-gold/40"></div>
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none select-none">
          <Video className="h-40 w-40 text-soph-gold" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center p-1.5 rounded-xl bg-soph-gold/15 text-soph-gold border border-soph-gold/20 shadow-inner">
                <Video className="h-5 w-5" />
              </span>
              <h3 className="text-base md:text-lg font-extrabold text-soph-text-primary tracking-tight">
                অনলাইন দ্বীনি বৈঠক ও তালীম
              </h3>
            </div>
            <p className="text-xs text-soph-text-secondary leading-relaxed max-w-xl">
              পবিত্র কুরআন গবেষণা, হাদীস পাঠ এবং দ্বীনি আলোচনার জন্য গুগল মিট (Google Meet) ব্যবহারের মাধ্যমে এক ক্লিকের সাহায্যে ভার্চুয়াল শিক্ষা বৈঠকের আয়োজন করুন।
            </p>
          </div>

          {currentUser && (
            <button
              onClick={() => {
                setError(null);
                setShowForm(!showForm);
              }}
              className="px-4 py-2 bg-soph-gold hover:bg-soph-gold-light active:scale-95 text-soph-deep font-bold text-xs rounded-xl transition duration-150 flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-soph-gold/10 hover:shadow-soph-gold/20 group cursor-pointer"
            >
              <Plus className="h-4 w-4 group-hover:rotate-90 transition duration-200" />
              <span>{showForm ? "বৈঠক প্যানেল বন্ধ করুন" : "নতুন অনলাইন তালীম বসান"}</span>
            </button>
          )}
        </div>

        {/* NOT LOGGED IN WARNING */}
        {!currentUser && (
          <div className="mt-5 p-4 bg-soph-deep border border-soph-border rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-soph-text-secondary text-left">
              <Lock className="h-4 w-4 text-soph-gold shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                বৈঠকের সময়সূচি নির্ধারণ করতে, নতুন লাইভ ক্লাস বসাতে অথবা আপনার নিজের গুগল মিট সংযুক্ত করতে অনুগ্রহ করে প্রথমে সাইন-ইন সম্পন্ন করুন।
              </p>
            </div>
            <button
              onClick={onTriggerGoogleSignIn}
              className="shrink-0 px-4 py-1.5 bg-soph-hover hover:bg-soph-deep border border-soph-gold/40 hover:border-soph-gold text-soph-gold font-extrabold rounded-lg transition text-left cursor-pointer"
            >
              গুগল লগইন করুন
            </button>
          </div>
        )}
      </div>

      {/* CREATE NEW STUDY SESSION FORM Panel */}
      {showForm && currentUser && (
        <div className="bg-soph-card border border-soph-border rounded-2xl p-6 text-left shadow-2xl relative overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.4px,transparent_0.4px)] [background-size:12px_12px] opacity-5 pointer-events-none"></div>
          
          <h4 className="text-sm md:text-base font-extrabold text-soph-gold flex items-center gap-1.5 mb-4 border-b border-soph-border pb-2.5">
            <Sparkles className="h-4 w-4" /> দ্বীনি হায়ার এস্টেট বৈঠক আহ্বান করুন
          </h4>

          {/* Checks Meet integration presence */}
          {!meetAccessToken ? (
            <div className="mb-6 p-4 bg-amber-950/20 border border-amber-900/40 text-amber-500 rounded-xl space-y-3">
              <div className="flex gap-2 text-xs">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold mb-1">গুগল মিট (Workspace) সচল করুন</h5>
                  <p className="leading-relaxed text-[11px] text-soph-text-secondary">
                    আপনার গুগল একাউন্ট ব্যবহার করে দ্বীনি বৈঠক লিংক ও আইডি জেনারেট করতে মিট অথরাইজেশন অনুমোদন করতে হবে। নিচের বাটনে ক্লিক করে অনুমোদন দিন।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleMeetAuthorize}
                disabled={authorizing}
                className="w-full sm:w-auto px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-soph-deep font-extrabold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/15 disabled:opacity-50"
              >
                {authorizing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>অনুমোদন সংযোগ করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Video className="h-3.5 w-3.5" />
                    <span>গুগল মিট অনুমোদন করতে ক্লিক করুন</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mb-5 p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center justify-between text-xs text-emerald-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold">গুগল মিট সংযোগ সক্রিয় করা আছে।</span>
              </div>
              <button 
                onClick={() => setMeetAccessToken(null)}
                className="text-[10px] text-soph-text-secondary hover:text-red-400 underline underline-offset-2 transition"
              >
                সংযোগ ডিসকানেক্ট
              </button>
            </div>
          )}

          <form onSubmit={handleCreateStudyCircle} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                বৈঠকের পবিত্র শিরোনাম:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
                placeholder="যেমন: সূরা আর-রহমান তাফসীর সভা বা সহীহ বুখারী রিডিং সেশন"
                className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                  বৈঠকের সময়সূচি (তারিখ ও সময়):
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs font-mono transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                  হায়ার শিক্ষক বা তালীম হোস্ট:
                </label>
                <div className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border/60 text-soph-text-secondary rounded-xl text-xs flex items-center gap-2 select-none">
                  <User className="h-3.5 w-3.5 text-soph-gold" />
                  <span className="font-bold text-soph-text-primary truncate">
                    {currentUser.displayName || "আপনি নিজে (লগইন ব্যবহারকারী)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                সংক্ষিপ্ত আলোচ্য বিষয় বা তাফসীর বিবরণ (ঐচ্ছিক):
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="দ্বীনি বৈঠকের মূল বিষয়বস্তু বা পাঠ পরিচিতি সংক্ষেপে লিখুন যা অংশগ্রহণকারীরা জানতে পারবে..."
                className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-soph-border hover:bg-soph-hover hover:text-soph-text-primary text-soph-text-secondary font-bold text-xs rounded-xl transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                disabled={creating || !meetAccessToken}
                className="px-5 py-2 bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-bold text-xs rounded-xl transition duration-150 flex items-center gap-1 shadow-md shadow-soph-gold/10 disabled:opacity-50 cursor-pointer"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>গুগল মিট বসানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Video className="h-3.5 w-3.5" />
                    <span>গুগল মিট জেনারেট ও বুক করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MEETINGS LIST VIEW */}
      <div className="space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-soph-border pb-2.5">
          <h4 className="text-sm md:text-base font-extrabold text-soph-text-primary flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-soph-gold" /> আসন্ন অনলাইন দ্বীনি বৈঠকসমূহ
          </h4>
          <span className="text-[10px] bg-soph-card border border-soph-border/70 px-2.5 py-1 rounded-full text-soph-text-secondary font-mono">
            মোট: {toBengaliNumerals(circles.length)} টি বৈঠক
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3.5 select-none text-soph-text-secondary text-xs">
            <RefreshCw className="h-8 w-8 text-soph-gold animate-spin" />
            <p>আসন্ন দ্বীনি বৈঠক ও ভার্চুয়াল ক্লাস লোড হচ্ছে...</p>
          </div>
        ) : circles.length === 0 ? (
          <div className="bg-soph-card border border-soph-border/60 rounded-2xl p-10 text-center space-y-4">
            <VideoOff className="h-12 w-12 text-soph-border mx-auto opacity-50" />
            <div className="space-y-1.5">
              <h5 className="font-bold text-sm text-soph-text-primary">বর্তমানে কোনো দ্বীনি বৈঠক বা লাইভ ক্লাস খালি নেই</h5>
              <p className="text-xs text-soph-text-secondary max-w-md mx-auto leading-relaxed">
                পবিত্র কুরআন ও হাদীসের আলোচনার মহিমান্বিত তালীম শুরু করতে আপনি নিজেই উপরে লগইন করে নতুন একটি গুগল মিট ক্লাস আয়োজন করতে পারেন।
              </p>
            </div>
            {currentUser && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 border border-soph-gold/30 hover:bg-soph-gold/10 text-soph-gold font-bold text-xs rounded-xl transition cursor-pointer"
              >
                তালীম আহবান করুন
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {circles.map((circle) => {
              const isActive = isCircleActive(circle.scheduledTime);
              const isCurrentUserHost = currentUser && circle.hostUid === currentUser.uid;

              return (
                <div
                  key={circle.id}
                  className={`bg-soph-card hover:bg-soph-card/95 border rounded-2xl p-5 hover:scale-[1.01] transition-all flex flex-col justify-between space-y-5 shadow-lg relative overflow-hidden ${
                    isActive 
                      ? "border-emerald-500/50 shadow-emerald-500/5" 
                      : "border-soph-border/80"
                  }`}
                >
                  {/* Decorative glowing back indicator for active meeting */}
                  {isActive && (
                    <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
                  )}

                  {/* Header Title / Host Info */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-black py-0.5 px-2 bg-soph-hover border border-soph-border text-soph-gold-muted rounded-md uppercase tracking-wider">
                        <Clock className="h-3 w-3" />
                        <span>{isActive ? "লাইভ বৈঠক" : "আসন্ন"}</span>
                      </div>
                      
                      {isActive && (
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-extrabold text-sm md:text-base text-soph-text-primary tracking-tight leading-snug">
                        📖 {circle.title}
                      </h5>
                      {circle.description && (
                        <p className="text-[11px] text-soph-text-secondary leading-relaxed line-clamp-2">
                          {circle.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Meeting Meta & Bottom Actions */}
                  <div className="space-y-4 pt-2 border-t border-soph-border/50">
                    <div className="space-y-2 text-xs">
                      {/* Host */}
                      <div className="flex items-center gap-2">
                        {circle.hostPhoto ? (
                          <img 
                            src={circle.hostPhoto} 
                            alt="host" 
                            className="h-5 w-5 rounded-full border border-soph-gold/40 shadow-inner"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-soph-deep border border-soph-gold/40 flex items-center justify-center text-[10px] text-soph-gold font-bold">
                            {circle.hostName[0]}
                          </div>
                        )}
                        <span className="text-[11px] text-soph-text-secondary">
                          হোস্ট বা শিক্ষক: <span className="font-extrabold text-soph-text-primary capitalize">{circle.hostName}</span>
                        </span>
                      </div>

                      {/* Scheduled Time */}
                      <div className="flex items-start gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-soph-gold shrink-0 mt-0.5" />
                        <span className="text-[11px] text-soph-gold-muted font-bold block leading-relaxed">
                          {formatBanglaDate(circle.scheduledTime)}
                        </span>
                      </div>
                    </div>

                    {/* Button actions */}
                    <div className="flex items-center justify-between gap-2.5 pt-1">
                      {isCurrentUserHost ? (
                        <button
                          onClick={() => handleDeleteStudyCircle(circle.id, circle.title)}
                          className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-900/15 border border-red-900/30 hover:border-red-600/40 text-red-400 font-bold text-[10px] rounded-lg transition duration-200 flex items-center gap-1 cursor-pointer"
                          title="আপনার আয়োজন বাতিল করুন"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>বাতিল করুন</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      <a
                        href={circle.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-4 py-1.5 font-bold text-[11px] rounded-lg transition duration-200 flex items-center justify-center gap-1.5 shadow shadow-soph-gold/5 cursor-pointer border ${
                          isActive 
                            ? "bg-emerald-500 hover:bg-emerald-400 text-soph-deep border-emerald-400" 
                            : "bg-soph-hover hover:bg-soph-deep text-soph-gold border-soph-border hover:border-soph-gold/50"
                        }`}
                      >
                        <span>বৈঠকে যোগ দিন (Meet)</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADDITIONAL GUIDELINE BOX */}
      <div className="p-4 bg-soph-hover/60 border border-soph-border rounded-2xl flex items-start gap-3 text-left">
        <Info className="h-4 w-4 text-soph-gold shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h5 className="text-[11px] font-black text-soph-text-primary uppercase tracking-wider">
            দ্বীনি বৈঠক আদব ও গাইডলাইন:
          </h5>
          <p className="text-[10px] text-soph-text-secondary leading-relaxed">
            ১. ক্লাস বা বৈঠকে যোগদানের সময় আপনার মাইক্রোফোন মিউট রাখতে চেষ্টা করুন। <br />
            ২. গুগল মিট (Google Meet) ব্যবহারের সময় সুরুচিপূর্ণ পোশাক পরিধান করুন ও আদব রক্ষা করে প্রশ্ন করুন। <br />
            ৩. কোনো অবান্তর বা অনৈসলামিক তর্কে জড়ানো থেকে বিরত থাকতে সকল অংশগ্রহণকারী ভাইদের প্রতি আনুরোধ রইলো।
          </p>
        </div>
      </div>
    </div>
  );
}
