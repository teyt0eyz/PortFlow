'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getStocks, addStock, updateStock, deleteStock, generateId } from '@/lib/storage';
import { Stock } from '@/lib/types';
import { calculateStockValue } from '@/lib/stockCalculation';
import { formatTHB, formatUSD } from '@/lib/taxCalculation';
import StockFormModal from '@/components/StockFormModal';

function StockCard({
  stock,
  onEdit,
  onDelete,
}: {
  stock: Stock;
  onEdit: (s: Stock) => void;
  onDelete: (id: string) => void;
}) {
  const { currentValue, profitLoss, profitLossPercent, totalCost } = calculateStockValue(stock);
  const fmt = stock.category === 'us' ? formatUSD : formatTHB;
  const isProfit = profitLoss >= 0;

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{stock.category === 'us' ? '🇺🇸' : '🇹🇭'}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{stock.ticker}</h3>
              <p className="text-sm text-gray-500 leading-tight">{stock.name}</p>
            </div>
          </div>
        </div>
        <span
          className={`text-base font-bold px-3 py-1 rounded-full ${
            isProfit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div>
          <p className="text-gray-400">วันที่ซื้อ</p>
          <p className="font-semibold text-base">{stock.purchaseDate}</p>
        </div>
        <div>
          <p className="text-gray-400">จำนวนหุ้น</p>
          <p className="font-semibold text-base">{stock.shares.toLocaleString('th-TH')} หุ้น</p>
        </div>
        <div>
          <p className="text-gray-400">ราคาซื้อ/หุ้น</p>
          <p className="font-semibold text-base">{fmt(stock.purchasePrice)}</p>
        </div>
        <div>
          <p className="text-gray-400">ราคาปัจจุบัน/หุ้น</p>
          <p className="font-semibold text-base">{fmt(stock.currentPrice)}</p>
        </div>
        <div>
          <p className="text-gray-400">ต้นทุนรวม</p>
          <p className="font-semibold text-base">{fmt(totalCost)}</p>
        </div>
        <div>
          <p className="text-gray-400">มูลค่าปัจจุบัน</p>
          <p className="font-semibold text-base">{fmt(currentValue)}</p>
        </div>
      </div>

      <div className={`rounded-xl px-4 py-3 mb-3 ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex justify-between items-center">
          <span className={`font-bold text-base ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
            {isProfit ? '📈 กำไร' : '📉 ขาดทุน'}
          </span>
          <span className={`text-xl font-black ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}{fmt(profitLoss)}
          </span>
        </div>
      </div>

      {stock.note && (
        <p className="text-gray-500 text-sm italic mb-3 border-l-2 border-gray-200 pl-3">{stock.note}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => onEdit(stock)}
          className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-blue-500 text-blue-600 rounded-xl font-semibold text-base active:bg-blue-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          แก้ไข
        </button>
        <button
          onClick={() => onDelete(stock.id)}
          className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-red-400 text-red-500 rounded-xl font-semibold text-base active:bg-red-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          ลบ
        </button>
      </div>
    </div>
  );
}

function StocksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'us' | 'thai'>(tabParam === 'thai' ? 'thai' : 'us');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setStocks(getStocks());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (tabParam === 'thai') setActiveTab('thai');
    else if (tabParam === 'us') setActiveTab('us');
  }, [tabParam]);

  const filtered = stocks.filter((s) => s.category === activeTab);

  function handleSave(data: Omit<Stock, 'id'>) {
    if (editingStock) {
      const updated = { ...data, id: editingStock.id };
      updateStock(updated);
      setStocks(getStocks());
    } else {
      const newStock: Stock = { ...data, id: generateId() };
      addStock(newStock);
      setStocks(getStocks());
    }
    setShowModal(false);
    setEditingStock(null);
  }

  function handleEdit(stock: Stock) {
    setEditingStock(stock);
    setShowModal(true);
  }

  function handleDelete(id: string) {
    setConfirmDelete(id);
  }

  function confirmDeleteAction() {
    if (confirmDelete) {
      deleteStock(confirmDelete);
      setStocks(getStocks());
      setConfirmDelete(null);
    }
  }

  function switchTab(tab: 'us' | 'thai') {
    setActiveTab(tab);
    router.replace(`/stocks?tab=${tab}`, { scroll: false });
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-800">พอร์ตหุ้น</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 pb-0 border-b border-gray-100">
        <div className="flex gap-0">
          <button
            onClick={() => switchTab('us')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-lg border-b-4 transition-colors ${
              activeTab === 'us'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            <span>🇺🇸</span> หุ้นสหรัฐ
          </button>
          <button
            onClick={() => switchTab('thai')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-lg border-b-4 transition-colors ${
              activeTab === 'thai'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            <span>🇹🇭</span> หุ้นไทย
          </button>
        </div>
      </div>

      {/* Stock list */}
      <div className="px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl">
              📊
            </div>
            <p className="text-gray-400 text-lg font-medium">ยังไม่มีหุ้น{activeTab === 'us' ? 'สหรัฐ' : 'ไทย'}</p>
            <button
              onClick={() => { setEditingStock(null); setShowModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              เพิ่มหุ้น
            </button>
          </div>
        ) : (
          <>
            {filtered.map((stock) => (
              <StockCard
                key={stock.id}
                stock={stock}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>

      {/* Floating Add Button */}
      {filtered.length > 0 && (
        <button
          onClick={() => { setEditingStock(null); setShowModal(true); }}
          className="fixed bottom-24 right-4 z-40 w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center active:bg-blue-700 transition-colors"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Stock Form Modal */}
      {showModal && (
        <StockFormModal
          initial={editingStock}
          defaultCategory={activeTab}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingStock(null); }}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-4">
              <span className="text-5xl">🗑️</span>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-gray-500 text-center mb-5">คุณต้องการลบหุ้นนี้ใช่ไหม? ไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 btn-secondary"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-lg active:bg-red-600"
              >
                ลบเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StocksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StocksContent />
    </Suspense>
  );
}
