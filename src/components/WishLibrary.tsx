import React, { useState, useMemo, useEffect } from 'react';
import { Search, Heart, Copy, Check, Sparkles, Bookmark, CreditCard, Shuffle, Filter } from 'lucide-react';
import { allWishes, categoryLabels, toneLabels } from '../data/wishes';
import { WishItem, RecipientCategory, WishTone } from '../types';
import { playSoftPop } from '../utils/audio';
import { useEvent } from '../context/EventContext';
import { safeLocalStorage } from '../utils/storage';

interface WishLibraryProps {
  onOpenCardWithWish: (title: string, message: string, recipient: string) => void;
}

export const WishLibrary: React.FC<WishLibraryProps> = ({ onOpenCardWithWish }) => {
  const { activeHoliday, holidayConfig } = useEvent();
  const [selectedCategory, setSelectedCategory] = useState<RecipientCategory | 'all' | 'favorites'>('all');
  const [selectedTone, setSelectedTone] = useState<WishTone | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-suggest category based on active holiday
  useEffect(() => {
    if (activeHoliday === '20-11') {
      setSelectedCategory('teachers');
    } else {
      setSelectedCategory('all');
    }
  }, [activeHoliday]);

  // Favorites stored in safeLocalStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('wish_favorites_2010');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    playSoftPop();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        safeLocalStorage.setItem('wish_favorites_2010', JSON.stringify(next));
      } catch {
        //
      }
      return next;
    });
  };

  const handleCopyWish = async (wish: WishItem) => {
    try {
      await navigator.clipboard.writeText(`${wish.title}\n\n${wish.content}`);
      playSoftPop();
      setCopiedId(wish.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      //
    }
  };

  // Filtered wishes
  const filteredWishes = useMemo(() => {
    return allWishes.filter((wish) => {
      // Category or Favorites filter
      if (selectedCategory === 'favorites') {
        if (!favorites.includes(wish.id)) return false;
      } else if (selectedCategory !== 'all') {
        if (wish.recipientCategory !== selectedCategory) return false;
      }

      // Tone filter
      if (selectedTone !== 'all' && wish.tone !== selectedTone) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = wish.title.toLowerCase().includes(query);
        const matchContent = wish.content.toLowerCase().includes(query);
        const matchRecipient = wish.recipient.toLowerCase().includes(query);
        const matchTags = wish.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchTitle && !matchContent && !matchRecipient && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, selectedTone, searchQuery, favorites]);

  const handlePickRandom = () => {
    if (filteredWishes.length === 0) return;
    const random = filteredWishes[Math.floor(Math.random() * filteredWishes.length)];
    handleCopyWish(random);
  };

  const categories = Object.keys(categoryLabels) as RecipientCategory[];

  return (
    <section id="library" className="py-16 bg-[#FFFDF9] dark:bg-[#120216] relative transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-full text-xs font-semibold text-rose-700 dark:text-rose-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Kho Tuyển Chọn 120+ Lời Chúc Ý Nghĩa</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Kho Tàng Lời Chúc · {holidayConfig.name}
          </h2>
          <p className="mt-2 text-stone-600 dark:text-stone-400 text-sm sm:text-base">
            Tra cứu theo đối tượng, phong cách hoặc chủ đề cho dịp {holidayConfig.shortDate}. Lưu lại những câu chúc bạn yêu thích nhất để gửi tặng.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm lời chúc theo từ khóa, người nhận (mẹ, vợ, cô giáo, bác sĩ...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Tone Selector */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-stone-400 shrink-0 hidden sm:block" />
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as WishTone | 'all')}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm"
              >
                <option value="all">Mọi phong cách</option>
                {Object.entries(toneLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Random button */}
              <button
                type="button"
                onClick={handlePickRandom}
                title="Chọn ngẫu nhiên 1 câu"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gợi ý ngẫu nhiên</span>
              </button>
            </div>

          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-rose-300'
              }`}
            >
              Tất cả ({allWishes.length})
            </button>

            <button
              onClick={() => setSelectedCategory('favorites')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>Đã lưu ({favorites.length})</span>
            </button>

            {categories.map((catKey) => {
              const info = categoryLabels[catKey];
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === catKey
                      ? 'bg-rose-600 text-white shadow-sm font-semibold'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-rose-300'
                  }`}
                >
                  {info.label} ({info.count})
                </button>
              );
            })}
          </div>

        </div>

        {/* Wish Cards Grid */}
        {filteredWishes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8">
            <Heart className="w-12 h-12 text-rose-300 mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold text-stone-800">
              Không tìm thấy lời chúc phù hợp
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Hãy thử chọn danh mục khác hoặc xóa từ khóa tìm kiếm để khám phá thêm lời chúc.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedTone('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 cursor-pointer"
            >
              Xem lại tất cả lời chúc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWishes.map((wish) => {
              const isFav = favorites.includes(wish.id);
              const isCopied = copiedId === wish.id;

              return (
                <div
                  key={wish.id}
                  className="bg-white rounded-2xl p-5 border border-rose-100/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header metadata (Zero-pill discipline per frontend-design) */}
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-2.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="text-rose-700 font-semibold">{wish.recipient}</span>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span>{toneLabels[wish.tone]}</span>
                      </div>
                      
                      {/* Bookmark button */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(wish.id)}
                        title={isFav ? 'Bỏ lưu' : 'Lưu vào danh sách yêu thích'}
                        aria-label={isFav ? 'Bỏ lưu' : 'Lưu vào danh sách yêu thích'}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isFav ? 'text-amber-500 hover:text-amber-600' : 'text-stone-300 hover:text-stone-500'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-base font-bold text-stone-900 group-hover:text-rose-900 transition-colors mb-2.5 leading-snug">
                      {wish.title}
                    </h3>

                    {/* Content */}
                    <p className="font-serif text-stone-700 text-sm leading-relaxed mb-4">
                      "{wish.content}"
                    </p>
                  </div>

                  {/* Card Footer: Tags & Actions */}
                  <div className="pt-3 border-t border-rose-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-stone-400">
                      <span>#{wish.tags[0]}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyWish(wish)}
                        title="Sao chép lời chúc"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenCardWithWish(wish.title, wish.content, wish.recipient)}
                        title="Tạo thiệp điện tử với lời chúc này"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Tạo thiệp</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
