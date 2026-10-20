import React, { useState, useEffect } from 'react';
import { Sparkles, Wand2, Copy, Check, Share2, CreditCard, RefreshCw, Edit3, Heart, AlertCircle } from 'lucide-react';
import { GeneratorFormState, GeneratedWishResult, WishTone, WishLength, WishTheme } from '../types';
import { allWishes } from '../data/wishes';
import { playCelebration, playSoftPop } from '../utils/audio';
import { useEvent } from '../context/EventContext';

interface GreetingGeneratorProps {
  onOpenCardWithWish: (title: string, message: string, recipient: string) => void;
}

const DEFAULT_RELATIONSHIPS = [
  { id: 'mother', label: 'Mẹ kính yêu', defaultPronoun: 'Con - Mẹ' },
  { id: 'wife', label: 'Vợ yêu', defaultPronoun: 'Anh - Em' },
  { id: 'girlfriend', label: 'Bạn gái / Người yêu', defaultPronoun: 'Anh - Em' },
  { id: 'sister', label: 'Chị / Em gái', defaultPronoun: 'Em - Chị' },
  { id: 'teacher', label: 'Cô giáo', defaultPronoun: 'Em - Cô' },
  { id: 'colleague', label: 'Đồng nghiệp nữ', defaultPronoun: 'Tôi - Bạn' },
  { id: 'friend', label: 'Bạn thân', defaultPronoun: 'Mình - Bạn' },
  { id: 'relative', label: 'Người thân trong gia đình', defaultPronoun: 'Cháu - Bác' },
  { id: 'other', label: 'Mối quan hệ khác...', defaultPronoun: '' },
];

const PROFESSIONS = [
  'Nhân viên văn phòng',
  'Giáo viên / Giảng viên',
  'Bác sĩ / Nhân viên y tế',
  'Kinh doanh / Buôn bán',
  'Sinh viên / Học sinh',
  'Nội trợ / Chăm sóc gia đình',
  'Lập trình viên / Công nghệ',
  'Nghệ thuật / Thiết kế',
  'Nghề nghiệp khác...',
];

const TONES: { id: WishTone; label: string; desc: string }[] = [
  { id: 'emotional', label: 'Cảm động', desc: 'Chân thành, lắng đọng, ấm áp' },
  { id: 'refined', label: 'Tinh tế', desc: 'Dịu dàng, thanh lịch, trang nhã' },
  { id: 'humorous', label: 'Hài hước', desc: 'Dí dỏm, vui vẻ, mang tiếng cười' },
  { id: 'cute', label: 'Dễ thương', desc: 'Ngọt ngào, đáng yêu, tươi trẻ' },
  { id: 'formal', label: 'Trang trọng', desc: 'Lịch thiệp, tôn kính, mực thước' },
  { id: 'inspiring', label: 'Truyền cảm hứng', desc: 'Cổ vũ ý chí, bản lĩnh, tự tin' },
];

const LENGTHS: { id: WishLength; label: string; desc: string }[] = [
  { id: 'short', label: 'Ngắn gọn', desc: '1-2 câu súc tích' },
  { id: 'medium', label: 'Vừa phải', desc: '1 đoạn văn trọn vẹn' },
  { id: 'long', label: 'Dài & Sâu lắng', desc: 'Thư chúc tâm huyết' },
];

const THEMES: { id: WishTheme; label: string }[] = [
  { id: 'happiness', label: 'Hạnh phúc & Nụ cười' },
  { id: 'health', label: 'Sức khỏe & Bình an' },
  { id: 'success', label: 'Thành công & Rực rỡ' },
  { id: 'gratitude', label: 'Biết ơn & Tri ân' },
  { id: 'love', label: 'Tình yêu thương' },
];

export const GreetingGenerator: React.FC<GreetingGeneratorProps> = ({ onOpenCardWithWish }) => {
  const { activeHoliday, holidayConfig } = useEvent();
  const currentRelationships = holidayConfig.relationships?.length ? holidayConfig.relationships : DEFAULT_RELATIONSHIPS;

  const [formData, setFormData] = useState<GeneratorFormState>({
    recipientName: '',
    ageGroup: '26-35',
    profession: activeHoliday === '20-11' ? 'Giáo viên / Giảng viên' : 'Nhân viên văn phòng',
    customProfession: '',
    relationship: currentRelationships[0]?.label || 'Mẹ kính yêu',
    customRelationship: '',
    pronoun: currentRelationships[0]?.defaultPronoun || 'Con - Mẹ',
    tone: 'refined',
    length: 'medium',
    theme: activeHoliday === '20-11' ? 'gratitude' : 'happiness',
  });

  // Sync default relationship when holiday changes
  useEffect(() => {
    const firstRel = currentRelationships[0];
    if (firstRel) {
      setFormData((prev) => ({
        ...prev,
        relationship: firstRel.label,
        pronoun: firstRel.defaultPronoun,
        profession: activeHoliday === '20-11' ? 'Giáo viên / Giảng viên' : prev.profession,
        theme: activeHoliday === '20-11' ? 'gratitude' : prev.theme,
      }));
    }
  }, [activeHoliday]);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratedWishResult | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editableMessage, setEditableMessage] = useState<string>('');
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [shared, setShared] = useState<boolean>(false);

  // Generate fallback wish from local dataset with intelligent personalization
  const generateFallbackWish = (form: GeneratorFormState): GeneratedWishResult => {
    let candidates = allWishes.filter((w) => w.tone === form.tone && w.length === form.length);
    if (candidates.length === 0) {
      candidates = allWishes.filter((w) => w.tone === form.tone);
    }
    if (candidates.length === 0) {
      candidates = allWishes;
    }

    const baseWish = candidates[Math.floor(Math.random() * candidates.length)];
    let customizedText = baseWish.content;

    if (form.recipientName.trim()) {
      const name = form.recipientName.trim();
      customizedText = customizedText
        .replace(/mẹ/gi, `mẹ ${name}`)
        .replace(/em/gi, `em ${name}`)
        .replace(/chị/gi, `chị ${name}`)
        .replace(/cô/gi, `cô ${name}`)
        .replace(/thầy/gi, `thầy ${name}`)
        .replace(/bạn/gi, `bạn ${name}`);
    }

    return {
      title: `${baseWish.title} (${holidayConfig.shortDate})`,
      message: customizedText,
      tone: form.tone,
      recipientType: form.relationship,
      isAiGenerated: false,
      modelNote: `Đã chọn từ kho lời chúc tuyển chọn cho ${holidayConfig.name}`,
    };
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCopied(false);
    setShared(false);
    setIsEditing(false);

    try {
      // Call server Gemini endpoint with holiday context
      const response = await fetch('/api/gemini/generate-wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: formData.recipientName,
          ageGroup: formData.ageGroup,
          profession: formData.profession === 'Nghề nghiệp khác...' ? formData.customProfession : formData.profession,
          relationship: formData.relationship === 'Mối quan hệ khác...' ? formData.customRelationship : formData.relationship,
          pronoun: formData.pronoun,
          tone: formData.tone,
          length: formData.length,
          theme: formData.theme,
          holiday: activeHoliday,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      if (data && data.message) {
        const title = data.title || `Lời chúc ${holidayConfig.shortDate} ý nghĩa`;
        setResult({
          title,
          message: data.message,
          tone: formData.tone,
          recipientType: formData.relationship,
          isAiGenerated: data.isAiGenerated !== false,
          modelNote: data.modelNote,
        });
        setEditableTitle(title);
        setEditableMessage(data.message);
        playCelebration();
      } else {
        throw new Error('Invalid response structure');
      }
    } catch {
      // Robust Fallback
      const fallback = generateFallbackWish(formData);
      setResult(fallback);
      setEditableTitle(fallback.title);
      setEditableMessage(fallback.message);
      playCelebration();
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      const fullText = `${editableTitle}\n\n${editableMessage}`;
      await navigator.clipboard.writeText(fullText);
      playSoftPop();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: editableTitle,
      text: `${editableTitle}\n\n${editableMessage}\n\n— Gửi từ 20/10 Trao Lời Yêu Thương`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } catch {
        // User cancelled
      }
    } else {
      // Fallback to clipboard
      handleCopy();
    }
  };

  return (
    <section id="generator" className="py-16 bg-white dark:bg-[#140317] relative transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-full text-xs font-semibold text-rose-700 dark:text-rose-300 mb-3">
            <Wand2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Cá Nhân Hóa Bằng Trí Tuệ Nhân Tạo & Thư Viện</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Tạo Lời Chúc Riêng Cho Người Bạn Yêu Thương
          </h2>
          <p className="mt-2 text-stone-600 dark:text-stone-400 text-sm sm:text-base">
            Chỉ với vài lựa chọn đơn giản, nhận ngay lời chúc chuẩn mực, cảm xúc và phù hợp với từng hoàn cảnh.
          </p>
        </div>

        {/* Generator Form */}
        <form
          onSubmit={handleGenerate}
          className="p-6 sm:p-8 rounded-3xl bg-[#FFFDF9] dark:bg-stone-900 border border-rose-200/80 dark:border-stone-800 shadow-md space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Field: Recipient Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Tên người nhận <span className="text-stone-400 font-normal">(Tùy chọn)</span>
              </label>
              <input
                type="text"
                placeholder="VD: Mẹ Lan, Mai Anh, Cô Thảo..."
                maxLength={40}
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
              />
            </div>

            {/* Field: Relationship */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Mối quan hệ <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => {
                  const selectedRel = currentRelationships.find((r) => r.label === e.target.value);
                  setFormData({
                    ...formData,
                    relationship: e.target.value,
                    pronoun: selectedRel?.defaultPronoun || formData.pronoun,
                  });
                }}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {currentRelationships.map((rel) => (
                  <option key={rel.id} value={rel.label}>
                    {rel.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Pronouns / Address */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Cách xưng hô mong muốn
              </label>
              <input
                type="text"
                placeholder="VD: Con - Mẹ, Anh - Em, Em - Chị..."
                maxLength={30}
                value={formData.pronoun}
                onChange={(e) => setFormData({ ...formData, pronoun: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Field: Profession */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Nghề nghiệp người nhận
              </label>
              <select
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {PROFESSIONS.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Custom Profession if selected */}
            {formData.profession === 'Nghề nghiệp khác...' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Nhập nghề nghiệp cụ thể
                </label>
                <input
                  type="text"
                  placeholder="VD: Dược sĩ, Họa sĩ, Kế toán..."
                  maxLength={30}
                  value={formData.customProfession}
                  onChange={(e) => setFormData({ ...formData, customProfession: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            )}

            {/* Field: Age Group */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Độ tuổi / Nhóm tuổi
              </label>
              <select
                value={formData.ageGroup}
                onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="Dưới 18">Dưới 18 tuổi (Học sinh)</option>
                <option value="18-25">18 - 25 tuổi (Thanh niên / Sinh viên)</option>
                <option value="26-35">26 - 35 tuổi (Người đi làm)</option>
                <option value="36-50">36 - 50 tuổi (Trưởng thành / Trung niên)</option>
                <option value="Trên 50">Trên 50 tuổi (Người lớn tuổi / Bà)</option>
              </select>
            </div>

            {/* Field: Theme */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Chủ đề lời chúc
              </label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value as WishTheme })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {THEMES.map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.label}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Tone Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Phong cách mong muốn:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, tone: t.id })}
                  className={`p-3 rounded-2xl text-left border-2 transition-all duration-200 cursor-pointer hover:scale-102 ${
                    formData.tone === t.id
                      ? 'bg-gradient-to-br from-purple-50 via-rose-50 to-amber-50 dark:from-purple-950 dark:via-rose-950 dark:to-amber-950 border-purple-500 text-purple-950 dark:text-purple-200 shadow-md ring-2 ring-purple-200 dark:ring-purple-900'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-purple-300 hover:shadow-sm'
                  }`}
                >
                  <div className="text-xs font-bold leading-none">{t.label}</div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Length Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Độ dài lời chúc:
            </label>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((len) => (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, length: len.id })}
                  className={`px-4 py-2 rounded-xl text-xs font-medium border-2 transition-all duration-200 cursor-pointer hover:scale-103 ${
                    formData.length === len.id
                      ? 'bg-purple-700 text-white border-purple-700 shadow-md font-bold'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-purple-300'
                  }`}
                >
                  <span className="font-semibold">{len.label}</span>
                  <span className="opacity-80 ml-1.5 font-normal">({len.desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 text-center sm:text-right">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-3.5 bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500 hover:from-purple-800 hover:to-amber-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-300 hover:shadow-xl hover:scale-105 active:scale-98 transition-all duration-200 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang dệt nên lời chúc...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Tạo lời chúc {holidayConfig.shortDate} với AI</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Result Area */}
        {result && (
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-stone-900 border border-rose-200 dark:border-stone-800 shadow-lg relative overflow-hidden animate-fade-in">
            {/* Top gradient highlight */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-400 to-amber-400" />

            {/* Badge bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-md border border-rose-200 dark:border-rose-900/60">
                  <Sparkles className="w-3 h-3 text-rose-500" />
                  {result.isAiGenerated ? 'Gemini AI Sáng Tạo' : `Kho Tuyển Chọn ${holidayConfig.shortDate}`}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  Dành cho: <strong className="text-stone-700 dark:text-stone-200 font-medium">{result.recipientType}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Xong chỉnh sửa' : 'Chỉnh sửa lời chúc'}</span>
              </button>
            </div>

            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-100 border-b border-rose-300 dark:border-rose-700 bg-transparent pb-1 mb-4 focus:outline-none"
              />
            ) : (
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4">
                {editableTitle}
              </h3>
            )}

            {/* Content Textarea / Card */}
            {isEditing ? (
              <textarea
                rows={5}
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                className="w-full p-4 text-stone-800 dark:text-stone-200 font-serif leading-relaxed text-base rounded-2xl border border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-stone-800/60 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            ) : (
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] dark:bg-stone-800/80 border border-rose-100 dark:border-stone-700 font-serif text-stone-800 dark:text-stone-200 text-base sm:text-lg leading-relaxed shadow-inner">
                "{editableMessage}"
              </div>
            )}

            {/* Model note if using sample */}
            {result.modelNote && !result.isAiGenerated && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{result.modelNote}</span>
              </div>
            )}

            {/* Actions Toolbar */}
            <div className="mt-6 pt-5 border-t border-rose-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="text-xs font-semibold text-stone-600 hover:text-rose-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tạo lời chúc khác</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300">Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>{shared ? 'Đã chia sẻ' : 'Chia sẻ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenCardWithWish(editableTitle, editableMessage, formData.recipientName || result.recipientType)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all cursor-pointer shadow-sm shadow-rose-200"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Chuyển sang mẫu thiệp</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
