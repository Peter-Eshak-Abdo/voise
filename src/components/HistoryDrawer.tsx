'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  History,
  Trash2,
  Copy,
  Check,
  Search,
  Cpu,
  Clock,
  HardDrive,
} from 'lucide-react';
import { HistoryItem } from '@/types';
import {
  getAllHistory,
  deleteHistoryItem,
  clearAllHistory,
} from '@/lib/indexedDb';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  onHistoryCountChange?: (count: number) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onSelect,
  onHistoryCountChange,
}) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    getAllHistory()
      .then((data) => {
        if (!ignore) {
          setItems(data);
          setLoading(false);
          onHistoryCountChange?.(data.length);
        }
      })
      .catch(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, onHistoryCountChange]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteHistoryItem(id);
    const updated = items.filter((x) => x.id !== id);
    setItems(updated);
    onHistoryCountChange?.(updated.length);
    toast.success('تم حذف التسجيل من السجل المحلي');
  };

  const handleClearAll = async () => {
    if (window.confirm('هل تريد بالتأكيد مسح كافة التسجيلات المحفوظة محلياً؟')) {
      await clearAllHistory();
      setItems([]);
      onHistoryCountChange?.(0);
      toast.success('تم مسح السجل بالكامل');
    }
  };

  const handleCopyItem = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.refinedText);
      setCopiedId(item.id);
      toast.success('تم نسخ النص');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.refinedText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            dir="rtl"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">سجل التفريغات السابقة</h3>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <HardDrive className="w-3 h-3 text-emerald-400" />
                    <span>محفوظ على جهازك (IndexedDB)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors text-xs flex items-center gap-1"
                    title="مسح كل السجل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            {items.length > 0 && (
              <div className="p-3 border-b border-slate-800/60">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث في التسجيلات السابقة..."
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  جاري تحميل السجل...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-slate-300 text-sm mb-1">
                    {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا يوجد تفريغات مسجلة بعد'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    أي فويس واتساب تفرغه هيتسيف هنا تلقائياً على جهازك
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="group cursor-pointer rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 p-3.5 transition-all hover:bg-slate-950 relative"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span className="font-medium text-slate-300 truncate max-w-[180px]">
                        {item.fileName}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed mb-3 font-sans">
                      {item.refinedText}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <Cpu className="w-3 h-3" />
                        <span>{item.modelUsed}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyItem(e, item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          title="نسخ النص"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
