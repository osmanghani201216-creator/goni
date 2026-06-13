import { Book, Compass, Layers } from "lucide-react";

interface JuzItem {
  id: number;
  bn: string;
  en: string;
  starts: string;
  surahs: string;
}

const JUZ_COVERAGE: JuzItem[] = [
  { id: 1, bn: "১ম পারা", en: "Juz 1", starts: "সূরা ফাতিহা ১:১", surahs: "সূরা ফাতিহা (১) - সূরা বাকারা (২:১৪১)" },
  { id: 2, bn: "২য় পারা", en: "Juz 2", starts: "সূরা বাকারা ২:১৪২", surahs: "সূরা বাকারা (২:১৪২) - সূরা বাকারা (২:২৫২)" },
  { id: 3, bn: "৩য় পারা", en: "Juz 3", starts: "সূরা বাকারা ২:২৫৩", surahs: "সূরা বাকারা (২:২৫৩) - সূরা আলে ইমরান (৩:৯২)" },
  { id: 4, bn: "৪র্থ পারা", en: "Juz 4", starts: "সূরা আলে ইমরান ৩:৯৩", surahs: "সূরা আলে ইমরান (৩:৯৩) - সূরা আন নিসা (৪:২৩)" },
  { id: 5, bn: "৫ম পারা", en: "Juz 5", starts: "সূরা আন নিসা ৪:২৪", surahs: "সূরা আন নিসা (৪:২৪) - সূরা আন নিসা (৪:১৪৭)" },
  { id: 6, bn: "৬ষ্ঠ পারা", en: "Juz 6", starts: "সূরা আন নিসা ৪:১৪৮", surahs: "সূরা আন নিসা (৪:১৪৮) - সূরা আল মায়িদাহ (৫:৮১)" },
  { id: 7, bn: "৭ম পারা", en: "Juz 7", starts: "সূরা আল মায়িদাহ ৫:৮২", surahs: "সূরা আল মায়িদাহ (৫:৮২) - সূরা আল আনআম (৬:১১০)" },
  { id: 8, bn: "৮ম পারা", en: "Juz 8", starts: "সূরা আল আনআম ৬:১১১", surahs: "সূরা আল আনআম (৬:১১১) - সূরা আল আরাফ (৭:৮৭)" },
  { id: 9, bn: "৯ম পারা", en: "Juz 9", starts: "সূরা আল আরাফ ৭:৮৮", surahs: "সূরা আল আরাফ (৭:৮৮) - সূরা আল আনফাল (৮:৪০)" },
  { id: 10, bn: "১০ম পারা", en: "Juz 10", starts: "সূরা আল আনফাল ৮:৪১", surahs: "সূরা আল আনফাল (৮:৪১) - সূরা তাওবাহ (৯:৯২)" },
  { id: 11, bn: "১১শ পারা", en: "Juz 11", starts: "সূরা তাওবাহ ৯:৯৩", surahs: "সূরা তাওবাহ (৯:৯৩) - সূরা হুদ (১১:৫)" },
  { id: 12, bn: "১২শ পারা", en: "Juz 12", starts: "সূরা হুদ ১১:৬", surahs: "সূরা হুদ (১১:৬) - সূরা ইউসুফ (১২:৫২)" },
  { id: 13, bn: "১৩শ পারা", en: "Juz 13", starts: "সূরা ইউসুফ ১২:৫৩", surahs: "সূরা ইউসুফ (১২:৫৩) - সূরা আল হিজর (১৫:১)" },
  { id: 14, bn: "১৪শ পারা", en: "Juz 14", starts: "সূরা আল হিজর ১৫:২", surahs: "সূরা আল হিজর (১৫:২) - সূরা আন নাহল (১৬:১২৮)" },
  { id: 15, bn: "১৫শ পারা", en: "Juz 15", starts: "সূরা আল ইসরা ১৭:১", surahs: "সূরা আল ইসরা (১৭:১) - সূরা আল কাহফ (১৮:৭৪)" },
  { id: 16, bn: "১৬শ পারা", en: "Juz 16", starts: "সূরা আল কাহফ ১৮:৭৫", surahs: "সূরা আল কাহফ (১৮:৭৫) - সূরা ত্বা-হা (২০:১৩৫)" },
  { id: 17, bn: "১৭শ পারা", en: "Juz 17", starts: "সূরা আল আম্বিয়া ২১:১", surahs: "সূরা আল আম্বিয়া (২১) - সূরা আল হজ্জ (২২:৭৮)" },
  { id: 18, bn: "১৮শ পারা", en: "Juz 18", starts: "সূরা আল মুমিনুন ২৩:১", surahs: "সূরা আল মুমিনুন (২৩) - সূরা আল ফুরকান (২৫:২০)" },
  { id: 19, bn: "১৯শ পারা", en: "Juz 19", starts: "সূরা আল ফুরকান ২৫:২১", surahs: "সূরা আল ফুরকান (২৫:২১) - সূরা আন নামল (২৭:৫৫)" },
  { id: 20, bn: "২০শ পারা", en: "Juz 20", starts: "সূরা আন নামল ২৭:৫৬", surahs: "সূরা আন নামল (২৭:৫৬) - সূরা আল আনকাবুট (২৯:৪৫)" },
  { id: 21, bn: "২১শ পারা", en: "Juz 21", starts: "সূরা আল আনকাবুত ২৯:৪৬", surahs: "সূরা আল আনকাবুত (২৯:৪৬) - সূরা আল আহযাব (৩৩:৩০)" },
  { id: 22, bn: "২২শ পারা", en: "Juz 22", starts: "সূরা আল আহযাব ৩৩:৩১", surahs: "সূরা আল আহযাব (৩৩:৩১) - সূরা ইয়াসীন (৩৬:২৭)" },
  { id: 23, bn: "২৩শ পারা", en: "Juz 23", starts: "সূরা ইয়াসীন ৩৬:২৮", surahs: "সূরা ইয়াসীন (৩৬:২৮) - সূরা আয যুমার (৩৯:৩১)" },
  { id: 24, bn: "২৪শ পারা", en: "Juz 24", starts: "সূরা আয যুমার ৩৯:৩২", surahs: "সূরা আয যুমার (৩৯:৩২) - সূরা ফুসসিলাত (৪১:৪৬)" },
  { id: 25, bn: "২৫শ পারা", en: "Juz 25", starts: "সূরা ফুসসিলাত ৪১:৪৭", surahs: "সূরা ফুসসিলাত (৪১:৪৭) - সূরা আল জাসিয়াহ (৪৫:৩৭)" },
  { id: 26, bn: "২৬শ পারা", en: "Juz 26", starts: "সূরা আল আহকাফ ৪৬:১", surahs: "সূরা আল আহকাফ (৪৬) - সূরা আয যারিয়াত (৫১:৩০)" },
  { id: 27, bn: "২৭শ পারা", en: "Juz 27", starts: "সূরা আয যারিয়াত ৫১:৩১", surahs: "সূরা আয যারিয়াত (৫১:৩১) - সূরা আল হাদীদ (৫৭:২৯)" },
  { id: 28, bn: "২৮শ পারা", en: "Juz 28", starts: "সূরা আল মুজাদালাহ ৫৮:১", surahs: "সূরা আল মুজাদালাহ (৫৮) - সূরা আত তাহরীম (৬৬:১২)" },
  { id: 29, bn: "২৯শ পারা", en: "Juz 29", starts: "সূরা আল মুলক ৬৭:১", surahs: "সূরা আল মুলক (৬৭) - সূরা আল মুরসালাত (৭৭:৫০)" },
  { id: 30, bn: "৩০তম পারা", en: "Juz 30", starts: "সূরা আন নাবা ৭৮:১", surahs: "সূরা আন নাবা (৭৮) - সূরা আন নাস (১১৪:৬)" }
];

interface JuzListProps {
  onSelectSurah: (n: number) => void;
}

export default function JuzList({ onSelectSurah }: JuzListProps) {
  // Simple handler to open the starting Sura of a Juz
  function handleJuzClick(startingSuraName: string) {
    if (startingSuraName.includes("ফাতিহা")) onSelectSurah(1);
    else if (startingSuraName.includes("বাকারা")) onSelectSurah(2);
    else if (startingSuraName.includes("আলে ইমরান")) onSelectSurah(3);
    else if (startingSuraName.includes("নিসা")) onSelectSurah(4);
    else if (startingSuraName.includes("মায়িদাহ")) onSelectSurah(5);
    else if (startingSuraName.includes("আনআম")) onSelectSurah(6);
    else if (startingSuraName.includes("আরাফ")) onSelectSurah(7);
    else if (startingSuraName.includes("আনফাল")) onSelectSurah(8);
    else if (startingSuraName.includes("তাওবাহ")) onSelectSurah(9);
    else if (startingSuraName.includes("হুদ")) onSelectSurah(11);
    else if (startingSuraName.includes("ইউসুফ")) onSelectSurah(12);
    else if (startingSuraName.includes("হিজর")) onSelectSurah(15);
    else if (startingSuraName.includes("আম্বিয়া")) onSelectSurah(21);
    else if (startingSuraName.includes("মুমিনুন")) onSelectSurah(23);
    else if (startingSuraName.includes("ফুরকান")) onSelectSurah(25);
    else if (startingSuraName.includes("নামল")) onHexSura(27);
    else if (startingSuraName.includes("নিকাবুত") || startingSuraName.includes("আনকাবুত")) onSelectSurah(29);
    else if (startingSuraName.includes("আহযাব")) onSelectSurah(33);
    // basic fallbacks
    else if (startingSuraName.includes("মুলক")) onSelectSurah(67);
    else if (startingSuraName.includes("নাবা")) onSelectSurah(78);
    else onSelectSurah(1);
  }

  function onHexSura(id: number) {
    onSelectSurah(id);
  }

  return (
    <div className="space-y-4">
      <div className="bg-soph-card border border-soph-border rounded-2xl p-5 flex items-start gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_0.4px,transparent_0.4px)] [background-size:20px_20px] opacity-5 pointer-events-none"></div>
        <Layers className="h-5 w-5 text-soph-gold mt-0.5 shrink-0 relative z-10" />
        <div className="relative z-10">
          <h3 className="text-sm font-bold text-soph-text-primary font-sans">পবিত্র কুরআনের ৩০টি পারা (Juz Index)</h3>
          <p className="text-soph-text-secondary text-xs mt-1 leading-relaxed text-justify">
            ৩০টি পারার সূরার বিন্যাস কভারেজ দেখুন এবং ক্লিক করে সরাসরি পড়বার মূল পর্বে প্রবেশ করুন।
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {JUZ_COVERAGE.map((j) => (
          <div
            key={j.id}
            onClick={() => handleJuzClick(j.starts)}
            className="group bg-soph-card border border-soph-border hover:border-soph-gold/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:shadow-lg hover:shadow-black/50 transition duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-soph-deep text-soph-gold border border-soph-border group-hover:bg-soph-hover group-hover:border-soph-gold font-bold text-xs flex items-center justify-center font-mono shadow-inner transition">
                {j.id}
              </div>
              <div>
                <h4 className="text-sm font-bold text-soph-text-primary group-hover:text-soph-gold transition">
                  {j.bn} ({j.en})
                </h4>
                <p className="text-[11px] text-soph-text-secondary font-medium">
                  {j.surahs}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="inline-block text-[10px] font-bold bg-soph-deep text-soph-gold border border-soph-border px-2.5 py-1 rounded-md">
                শুরু: {j.starts}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
