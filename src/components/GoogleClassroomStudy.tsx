import React, { useState, useEffect } from "react";
import { 
  GraduationCap, BookOpen, Plus, RefreshCw, AlertCircle, Sparkles, Check, 
  ExternalLink, User, Send, Share2, ClipboardCheck, Info, X, ChevronRight, Bookmark, Video
} from "lucide-react";

interface GoogleClassroomStudyProps {
  currentUser: any;
  accessToken: string | null;
  onTriggerGoogleSignIn: () => Promise<void>;
}

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId: string;
  creationTime?: string;
  alternateLink?: string;
  enrollmentCode?: string;
  courseState: string;
}

interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  text: string;
  alternateLink?: string;
  creationTime: string;
}

const toBengaliNumerals = (num: number | string) => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).split("").map(d => {
    const parsed = parseInt(d);
    return isNaN(parsed) ? d : banglaDigits[parsed];
  }).join("");
};

export default function GoogleClassroomStudy({
  currentUser,
  accessToken,
  onTriggerGoogleSignIn
}: GoogleClassroomStudyProps) {
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active Selected Course
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [announcements, setAnnouncements] = useState<ClassroomAnnouncement[]>([]);
  const [loadingStream, setLoadingStream] = useState(false);

  // Forms states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);

  // Post announcement states
  const [anninementText, setAnninementText] = useState("");
  const [publishingPost, setPublishingPost] = useState(false);

  // Clipboard copies
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Auto-load courses when token is available
  useEffect(() => {
    if (accessToken) {
      fetchCourses();
    }
  }, [accessToken]);

  // Load announcements when course selection changes
  useEffect(() => {
    if (selectedCourse && accessToken) {
      fetchAnnouncements(selectedCourse.id);
    }
  }, [selectedCourse, accessToken]);

  const fetchCourses = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({}));
        throw new Error(errDetail?.error?.message || "গুগল ক্লাসরুমের কোর্সসমূহ লোড করতে ব্যর্থ হয়েছে।");
      }

      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err: any) {
      console.error("fetchCourses Error:", err);
      setError(err?.message || "গুগল ক্লাসরুম সংযোগ সংযোগ করতে ত্রুটি ঘটেছে।");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async (courseId: string) => {
    if (!accessToken) return;
    setLoadingStream(true);
    try {
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/announcements`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error("আপডেট স্ট্রিম লোড করা সম্ভব হয়নি।");
      }

      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      console.error("fetchAnnouncements Error:", err);
      // We don't block the whole UI if stream fetch fails
    } finally {
      setLoadingStream(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setError("ক্লাসের বা কোর্সের একটি নাম দিন।");
      return;
    }

    setCreatingClass(true);
    setError(null);
    setSuccess(null);

    try {
      const body = {
        name: newClassName.trim(),
        section: newClassSection.trim() || undefined,
        descriptionHeading: newClassSubject.trim() || undefined,
        description: newClassDescription.trim() || undefined,
        ownerId: "me",
        courseState: "ACTIVE"
      };

      const res = await fetch("https://classroom.googleapis.com/v1/courses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({}));
        throw new Error(errDetail?.error?.message || "ক্লাস তৈরি করার সময় গোলযোগ ঘটেছে।");
      }

      const createdCourse = await res.json();
      setSuccess(`মাশাআল্লাহ! নতুন ক্লাসটি সফলভাবে তৈরি হয়েছে। কোড: ${createdCourse.enrollmentCode || "N/A"}`);
      setCourses(prev => [createdCourse, ...prev]);
      
      // Reset Form
      setNewClassName("");
      setNewClassSection("");
      setNewClassSubject("");
      setNewClassDescription("");
      setShowCreateForm(false);
      
      // Select newly created course
      setSelectedCourse(createdCourse);
      
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: any) {
      console.error("Course create failed:", err);
      setError(err?.message || "ক্লাস আহ্বান করা সম্ভব হয়নি।");
    } finally {
      setCreatingClass(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!anninementText.trim()) {
      setError("ঘোষণার বিবরণ বা পোস্ট টেক্সট খালি রাখা যাবে না।");
      return;
    }

    setPublishingPost(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourse.id}/announcements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: anninementText.trim(),
          state: "PUBLISHED"
        })
      });

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({}));
        throw new Error(errDetail?.error?.message || "পোস্টটি ক্লাসরুম বোর্ডে সংরক্ষণ করা যায়নি।");
      }

      const newPost = await res.json();
      setAnnouncements(prev => [newPost, ...prev]);
      setAnninementText("");
      setSuccess("মাশাআল্লাহ! দ্বীনি ক্লাসরুম বোর্ডে ঘোষণাটি সফলভাবে পোস্ট করা হয়েছে।");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("Post announcement failed:", err);
      setError(err?.message || "পোস্ট করতে ব্যর্থতা ঘটেছে।");
    } finally {
      setPublishingPost(false);
    }
  };

  const handleShareMaterial = async (type: "sura" | "quiz" | "dua") => {
    if (!selectedCourse) return;
    let materialText = "";
    let materialUrl = window.location.origin;

    if (type === "sura") {
      materialText = "পবিত্র আল-কুরআন তালীম: দ্বীনি ক্লাস থেকে আজকের পড়া নির্ধারণ করা হল। অনুগ্রহ করে নিচের লিংকটি ব্যবহার করে সংশ্লিষ্ট সূরার অনুবাদ ও তাফসীর অধ্যয়ন করুন।";
    } else if (type === "quiz") {
      materialText = "কুরআন কুইজ পরীক্ষা: দ্বীনি তালীম ও সাধারণ জ্ঞান যাচাইয়ের জন্য আজকের কুরআন কুইজে অংশগ্রহণ করুন ও আপনার প্রস্তুতি যাচাই করুন।";
    } else if (type === "dua") {
      materialText = "মাসনুন দু'আ আমল: আজকের ক্লাসের জন্য দৈনন্দিন অত্যন্ত জরুরি দু'আসমূহ অর্থসহ মুখস্থ করুন ও বেশি বেশি আমল করুন।";
    }

    setAnninementText(prev => {
      const spacing = prev ? "\n\n" : "";
      return prev + spacing + `${materialText}\nলিংক: ${materialUrl}`;
    });

    setSuccess("টেম্পলেটটি নিচের পোস্ট বক্সে যুক্ত করা হয়েছে। প্রয়োজনে সম্পাদনা করে পোস্ট বাটনে চাপুন।");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCopyCode = (code: string | undefined, id: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* ALERTS */}
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

      {/* HEADER HERO GUIDE */}
      <div className="relative overflow-hidden rounded-2xl border border-soph-border bg-soph-card/95 p-6 text-left shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-soph-gold/40 via-soph-gold to-soph-gold/40"></div>
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none select-none">
          <GraduationCap className="h-32 w-32 text-soph-gold" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-2 rounded-xl bg-soph-gold/15 text-soph-gold border border-soph-gold/20 shadow-inner">
                <GraduationCap className="h-5 w-5" />
              </span>
              <h3 className="text-base md:text-lg font-extrabold text-soph-text-primary tracking-tight">
                গুগল ক্লাসরুম অনলাইন ইন্টিগ্রেশন (Google Classroom)
              </h3>
            </div>
            <p className="text-xs text-soph-text-secondary leading-relaxed max-w-2xl">
              সহজে নিজের কুরআন শিক্ষা কোর্স বা হাদীস পাঠের অনলাইন ব্যাচ ম্যানেজ করুন। সরাসরি এই প্ল্যাটফর্ম থেকেই গুগলে নতুন ক্লাসরুম তৈরি করতে পারেন, ছাত্রদের ক্লাস কোড শেয়ার করতে পারেন এবং আজকের তাফসীর পৃষ্ঠা বা কুইজ লিংক পোস্ট করতে পারেন।
            </p>
          </div>

          {accessToken && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError(null);
                  setShowCreateForm(!showCreateForm);
                }}
                className="px-4 py-2 bg-soph-gold hover:bg-soph-gold-light active:scale-95 text-soph-deep font-bold text-xs rounded-xl transition duration-150 flex items-center gap-1.5 shadow-md shadow-soph-gold/10 hover:shadow-soph-gold/20 group cursor-pointer"
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition duration-200" />
                <span>নতুন ক্লাস আহ্বান করুন</span>
              </button>
              
              <button
                onClick={fetchCourses}
                disabled={loading}
                className="p-2 bg-soph-hover border border-soph-border hover:border-soph-gold/45 rounded-xl transition text-soph-text-secondary hover:text-soph-gold cursor-pointer"
                title="রিলোড কোর্সসমূহ"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-soph-gold" : ""}`} />
              </button>
            </div>
          )}
        </div>

        {/* NOT AUTHENTICATED STATE */}
        {!accessToken && (
          <div className="mt-5 p-5 bg-soph-deep border border-soph-border rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
            <div className="flex items-start gap-3 text-soph-text-secondary text-left max-w-xl">
              <Info className="h-4 w-4 text-soph-gold shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-bold text-soph-text-primary mb-1">গুগল ক্লাসরুম অথরাইজেশন প্রয়োজন</h4>
                <p className="leading-relaxed text-[11px]">
                  আপনার ছাত্রদের সাথে ক্লাসরুমের সাহায্যে যোগাযোগ করতে এবং নিজের ক্লাস ব্যাচ লোড করতে অনুগ্রহ করে গুগল অ্যাকাউন্ট অনুমোদন সম্পন্ন করুন।
                </p>
              </div>
            </div>
            <button
              onClick={onTriggerGoogleSignIn}
              className="shrink-0 px-4 py-2 bg-soph-hover hover:bg-soph-deep border border-soph-gold/40 hover:border-soph-gold text-soph-gold font-extrabold rounded-xl transition duration-150 flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <GraduationCap className="h-4 w-4" />
              <span>ক্লাসরুম সচল করুন</span>
            </button>
          </div>
        )}
      </div>

      {/* CREATE COURSE FORM PANEL */}
      {showCreateForm && accessToken && (
        <div className="bg-soph-card border border-soph-border rounded-2xl p-6 text-left shadow-2xl relative overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.4px,transparent_0.4px)] [background-size:12px_12px] opacity-5 pointer-events-none"></div>
          
          <h4 className="text-sm md:text-base font-extrabold text-soph-gold flex items-center gap-1.5 mb-4 border-b border-soph-border pb-2.5">
            <Sparkles className="h-4 w-4" /> দ্বীনি শিক্ষার নতুন ক্লাস বা গ্রুপ আহ্বান করুন
          </h4>

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                  ক্লাসের নাম (ম্যান্ডেটরি):
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="যেমন: সূরা সহজ শিক্ষা কোর্স (তাজবীদ)"
                  className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                  সেকশন বা ব্যাচ নং (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  maxLength={50}
                  placeholder="যেমন: ব্যাচ ০১ - শনিবার ও রবিবার"
                  className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                মূল বিষয়ের সংক্ষিপ্ত বর্ণনা (ঐচ্ছিক):
              </label>
              <input
                type="text"
                value={newClassSubject}
                onChange={(e) => setNewClassSubject(e.target.value)}
                maxLength={100}
                placeholder="যেমন: তাজবীদ নিয়মাবলী ও প্রতিদিন একটি সূরার তাফসীর বিশ্লেষণ"
                className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                বিস্তারিত ক্লাস পরিচিতি ও শিক্ষক বিবরণী:
              </label>
              <textarea
                value={newClassDescription}
                onChange={(e) => setNewClassDescription(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="ক্লাসের ছাত্রদের জন্য কোর্স সিলেবাস, প্রয়োজনীয় উপকরণ অথবা শিক্ষক সম্পর্কে সাধারণ বিবরণী লিখুন..."
                className="w-full px-4 py-2.5 bg-soph-deep border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-soph-border hover:bg-soph-hover hover:text-soph-text-primary text-soph-text-secondary font-bold text-xs rounded-xl transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                disabled={creatingClass}
                className="px-5 py-2 bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-bold text-xs rounded-xl transition duration-150 flex items-center gap-1 shadow-md shadow-soph-gold/10 disabled:opacity-50 cursor-pointer"
              >
                {creatingClass ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>ক্লাস তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>গুগল ক্লাসরুম স্পেস সক্রিয় করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CORE INTEGRATION CONTENT */}
      {accessToken && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: CLASSES LIST */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between border-b border-soph-border pb-2.5 text-left">
              <h4 className="text-sm md:text-base font-extrabold text-soph-text-primary flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-soph-gold" /> আমার সংযুক্ত কোর্সসমূহ
              </h4>
              <span className="text-[10px] bg-soph-card border border-soph-border/70 px-2.5 py-1 rounded-full text-soph-text-secondary font-mono">
                মোট: {toBengaliNumerals(courses.length)} টি
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3.5 select-none text-soph-text-secondary text-xs bg-soph-card border border-soph-border rounded-2xl">
                <RefreshCw className="h-7 w-7 text-soph-gold animate-spin" />
                <p>গুগল ক্লাসরুম থেকে কোর্স তালিকা সংগ্রহ করা হচ্ছে...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-soph-card border border-soph-border/60 rounded-2xl p-8 text-center space-y-4">
                <GraduationCap className="h-10 w-10 text-soph-border mx-auto opacity-50" />
                <div className="space-y-1.5">
                  <h5 className="font-bold text-xs text-soph-text-primary">কোনো সক্রিয় ক্লাসরুম পাওয়া যায়নি</h5>
                  <p className="text-[11px] text-soph-text-secondary max-w-sm mx-auto leading-relaxed">
                    আপনার গুগল অ্যাকাউন্টে বর্তমানে কোনো সক্রিয় কোর্স বা ক্লাসরুম খোলা নেই। আপনি উপরে "+" বাটনে চাপ দিয়ে এই মুহূর্তেই নতুন ব্যাচ তৈরি করতে পারেন।
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {courses.map((course) => {
                  const isSelected = selectedCourse?.id === course.id;
                  return (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition relative group ${
                        isSelected 
                          ? "bg-soph-hover border-soph-gold shadow-md" 
                          : "bg-soph-card border-soph-border/70 hover:bg-soph-hover/75 hover:border-soph-border"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-extrabold text-xs text-soph-text-primary group-hover:text-soph-gold transition truncate max-w-[80%]">
                            📖 {course.name}
                          </h5>
                          {course.section && (
                            <span className="text-[9px] bg-soph-deep border border-soph-border text-soph-gold-muted font-bold px-1.5 py-0.5 rounded">
                              {course.section}
                            </span>
                          )}
                        </div>

                        {course.descriptionHeading && (
                          <p className="text-[10px] text-soph-text-secondary line-clamp-1">
                            {course.descriptionHeading}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-soph-text-secondary pt-2 border-t border-soph-border/40 font-mono mt-1">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-soph-text-primary transition uppercase">আইডি: {toBengaliNumerals(course.id.substring(0, 8))}...</span>
                          </div>
                          
                          {course.enrollmentCode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(course.enrollmentCode, course.id);
                              }}
                              className="px-2 py-0.5 bg-soph-deep hover:bg-soph-hover border border-soph-border hover:border-soph-gold/40 text-[10px] rounded flex items-center gap-1 transition"
                            >
                              {copiedCodeId === course.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">কপিড</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-soph-gold">কোড: {course.enrollmentCode}</span>
                                  <Share2 className="h-2.5 w-2.5 text-soph-text-secondary" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CLASSROOM GUIDELINES ACCORDION */}
            <div className="p-4 bg-soph-hover/40 border border-soph-border rounded-2xl text-xs text-left space-y-2">
              <h5 className="font-bold text-soph-gold flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> গুগল ক্লাসরুম ব্যবহারের সুবিধা:
              </h5>
              <p className="text-[11px] text-soph-text-secondary leading-relaxed">
                ১. <strong>কোর্স ও তালীম পরিচালনা</strong>: আপনার স্টুডেন্টদের জন্য স্থায়ী তালীম গ্রুপ খুলুন। <br />
                ২. <strong>সরাসরি আপডেট পোস্ট</strong>: আজকের ক্লাসের পড়া বা অনুবাদ ও প্রশ্নোত্তর সেশন পোস্টবোর্ডে শেয়ার করুন। <br />
                ৩. <strong>সহজ সংযোগ</strong>: ছাত্ররা তাদের নিজস্ব Google Classroom মোবাইল অ্যাপ ব্যবহার করেই এই ভার্চুয়াল বোর্ডে সংযুক্ত থাকতে পারবে।
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED CLASS DASHBOARD & ANNOUNCEMENT WORKSPACE */}
          <div className="lg:col-span-7">
            {selectedCourse ? (
              <div className="bg-soph-card border border-soph-border rounded-2xl p-6 text-left shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.4px,transparent_0.4px)] [background-size:16px_16px] opacity-5 pointer-events-none"></div>

                {/* Dashboard Active Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-soph-border pb-4 gap-3 relative z-10">
                  <div className="space-y-1.5">
                    <span className="text-[9px] bg-soph-gold/15 text-soph-gold border border-soph-gold/25 font-black uppercase px-2 py-0.5 rounded-md">
                      দ্বীনি তালীম ড্যাশবোর্ড
                    </span>
                    <h4 className="text-sm md:text-base font-extrabold text-soph-text-primary tracking-tight">
                      🏫 {selectedCourse.name}
                    </h4>
                    {selectedCourse.section && (
                      <p className="text-xs text-soph-text-secondary">
                        বিভাগ: <span className="text-soph-gold-light font-bold">{selectedCourse.section}</span>
                      </p>
                    )}
                  </div>

                  {selectedCourse.alternateLink && (
                    <a
                      href={selectedCourse.alternateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-soph-hover hover:bg-soph-deep border border-soph-border hover:border-soph-gold text-soph-gold font-bold text-xs rounded-xl transition duration-200 cursor-pointer shadow-md self-start sm:self-auto"
                    >
                      <span>গুগল ক্লাসরুমে যান</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* WORKSPACE & ANNOUNCEMENT FORM */}
                <div className="bg-soph-deep border border-soph-border rounded-xl p-4 space-y-4">
                  <h5 className="text-[11px] font-black text-soph-text-secondary uppercase tracking-wider block">
                    নতুন বার্তা বা পড়া পোস্ট করুন (ঘোষণা):
                  </h5>

                  <form onSubmit={handlePostAnnouncement} className="space-y-3.5">
                    <textarea
                      value={anninementText}
                      onChange={(e) => setAnninementText(e.target.value)}
                      maxLength={1000}
                      rows={4}
                      required
                      placeholder="আসসালামু আলাইকুম, আজকের পাঠ পরিকল্পনা বা জরুরি নোটিশ ক্লাসের বোর্ডে শেয়ার করার জন্য এখানে বিবরণ লিখুন..."
                      className="w-full px-4 py-2.5 bg-soph-card border border-soph-border hover:border-soph-gold/30 focus:border-soph-gold text-soph-text-primary rounded-xl text-xs transition"
                    />

                    {/* Quick templates injector */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-soph-text-secondary font-bold block">
                        দ্রুত তাফসীর বা কুইজ লিংক যুক্ত করুন:
                      </span>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleShareMaterial("sura")}
                          className="px-2.5 py-1 bg-soph-hover hover:bg-soph-border text-soph-text-primary font-bold border border-soph-border rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <BookOpen className="h-3 w-3 text-soph-gold" />
                          <span>আজকের সূরা তাফসীর</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareMaterial("quiz")}
                          className="px-2.5 py-1 bg-soph-hover hover:bg-soph-border text-soph-text-primary font-bold border border-soph-border rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3 text-soph-gold" />
                          <span>আজকের কুইজ পরীক্ষা</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareMaterial("dua")}
                          className="px-2.5 py-1 bg-soph-hover hover:bg-soph-border text-soph-text-primary font-bold border border-soph-border rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <Bookmark className="h-3 w-3 text-soph-gold" />
                          <span>আমল ও দু'আ শিক্ষা</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-soph-border/40">
                      <button
                        type="button"
                        onClick={() => setAnninementText("")}
                        className="px-3 py-1.5 text-[10px] font-bold text-soph-text-secondary hover:text-red-400 cursor-pointer"
                      >
                        লেখা মুছুন
                      </button>
                      <button
                        type="submit"
                        disabled={publishingPost || !anninementText.trim()}
                        className="px-4 py-1.5 bg-soph-gold hover:bg-soph-gold-light text-soph-deep font-bold text-xs rounded-xl transition duration-150 flex items-center gap-1 border border-soph-gold/30 cursor-pointer disabled:opacity-40"
                      >
                        {publishingPost ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>আপলোড হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3" />
                            <span>অনলাইন পোস্টে পাঠান</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* COURSE STREAM UPDATES (READ STATS) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-soph-border pb-1.5">
                    <h5 className="text-[11px] font-black text-soph-text-primary uppercase tracking-wider block">
                      📰 ক্লাসরুম পোস্ট স্ট্রিম ও ফিডব্যাক বোর্ড
                    </h5>
                    <button
                      onClick={() => fetchAnnouncements(selectedCourse.id)}
                      disabled={loadingStream}
                      className="text-[10px] text-soph-gold hover:text-soph-gold-light cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`h-2.5 w-2.5 ${loadingStream ? "animate-spin" : ""}`} />
                      <span>রিফ্রেশ স্ট্রিম</span>
                    </button>
                  </div>

                  {loadingStream ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2 select-none text-soph-text-secondary text-xs">
                      <RefreshCw className="h-5 w-5 text-soph-gold animate-spin" />
                      <p>সাম্প্রতিক বার্তা ও খবরাখবর লোড হচ্ছে...</p>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-soph-text-secondary">
                      ক্লাস বোর্ডে বর্তমানে দ্বীনি আলোচনার কোনো পোস্ট বা ঘোষণা খালি নেই।
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar text-xs">
                      {announcements.map((post) => (
                        <div key={post.id} className="p-3.5 bg-soph-deep/60 border border-soph-border/70 rounded-xl space-y-2 hover:border-soph-border/100 transition">
                          <p className="text-soph-text-primary leading-relaxed whitespace-pre-wrap text-[11px]">
                            {post.text}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-soph-text-secondary border-t border-soph-border/30 pt-1.5 mt-1">
                            <span className="font-semibold text-soph-gold-muted capitalize">{selectedCourse.name} Stream</span>
                            <span className="font-mono">{formatDate(post.creationTime)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-soph-card border border-soph-border/60 rounded-2xl p-16 text-center space-y-4 h-full flex flex-col items-center justify-center min-h-[360px]">
                <GraduationCap className="h-16 w-16 text-soph-border opacity-40 animate-pulse" />
                <div className="space-y-2">
                  <h5 className="font-extrabold text-sm text-soph-text-primary">ক্লাসরুম স্টাডি প্যানেল</h5>
                  <p className="text-xs text-soph-text-secondary max-w-sm mx-auto leading-relaxed">
                    বাম পাশের কোর্স তালিকা থেকে যেকোনো একটি কোর্সে ক্লিক করে তার বিবরণ, ছাত্র কোড, তালীম স্ট্রিম ওপেন করুন এবং সরাসরি পোস্ট বোর্ডে লিখুন।
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
