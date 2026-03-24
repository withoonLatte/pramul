import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { Plus, Trash2, Save, PackageCheck, FileText, CheckCircle, Clock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoodsReceipt {
  id?: string;
  poId: string;
  receivedItems: any[];
  receivedAt: string;
  receivedBy: string;
}

export default function Receipts({ userProfile }: { userProfile: any }) {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<GoodsReceipt>({
    poId: '',
    receivedItems: [],
    receivedAt: new Date().toISOString(),
    receivedBy: userProfile?.displayName || 'System'
  });

  useEffect(() => {
    const unsubReceipts = onSnapshot(query(collection(db, 'receipts'), orderBy('receivedAt', 'desc')), (snapshot) => {
      setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GoodsReceipt)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'receipts');
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('status', '==', 'issued')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubReceipts();
      unsubOrders();
    };
  }, [userProfile]);

  const handleSave = async () => {
    try {
      if (currentReceipt.id) {
        const { id, ...data } = currentReceipt;
        await updateDoc(doc(db, 'receipts', id), data);
      } else {
        await addDoc(collection(db, 'receipts'), currentReceipt);
        // Update PO status to received_fully
        if (currentReceipt.poId) {
          await updateDoc(doc(db, 'orders', currentReceipt.poId), { status: 'received_fully' });
        }
      }
      setIsEditing(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'receipts');
    }
  };

  const resetForm = () => {
    setCurrentReceipt({
      poId: '',
      receivedItems: [],
      receivedAt: new Date().toISOString(),
      receivedBy: userProfile?.displayName || 'System'
    });
  };

  const getPONumber = (id: string) => orders.find(o => o.id === id)?.poNumber || 'Unknown PO';

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-serif italic text-4xl text-slate-800">ใบรับสินค้า</h4>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-2">บันทึกและตรวจสอบการรับสินค้าจากผู้ขาย</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-3 px-8 py-4 bg-accent-green text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-green/90 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            บันทึกการรับสินค้า
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">เลือกใบสั่งซื้อ (PO)</label>
                <select 
                  value={currentReceipt.poId}
                  onChange={(e) => setCurrentReceipt({ ...currentReceipt, poId: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-green outline-none transition-all font-medium appearance-none"
                >
                  <option value="">เลือก PO...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>{o.poNumber} - ฿{o.totalAmount.toLocaleString()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ผู้รับสินค้า</label>
                <input 
                  type="text" 
                  value={currentReceipt.receivedBy}
                  readOnly
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-400 font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button 
              onClick={() => { setIsEditing(false); resetForm(); }}
              className="px-8 py-4 bg-white text-slate-500 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
            >
              ยกเลิก
            </button>
            <button 
              onClick={handleSave}
              className="px-8 py-4 bg-accent-green text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-green/90 transition-all shadow-lg flex items-center gap-3"
            >
              <Save className="w-5 h-5" />
              ยืนยันการรับสินค้า
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">รหัสใบรับ</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">อ้างอิง PO</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">ผู้รับสินค้า</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">วันที่รับ</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-800">#{receipt.id?.slice(-8).toUpperCase()}</p>
                    </td>
                    <td className="p-6 text-sm font-medium text-slate-600">{getPONumber(receipt.poId)}</td>
                    <td className="p-6 text-sm font-medium text-slate-600">{receipt.receivedBy}</td>
                    <td className="p-6">
                      <p className="text-sm font-medium text-slate-600">
                        {new Date(receipt.receivedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] font-bold uppercase text-slate-300 tracking-wider mt-1">
                        {new Date(receipt.receivedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </p>
                    </td>
                    <td className="p-6 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-accent-green/10 text-accent-green flex items-center gap-2 w-fit ml-auto">
                        <CheckCircle className="w-3 h-3" />
                        ตรวจสอบแล้ว
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {receipts.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <PackageCheck className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-xs font-bold uppercase text-slate-300 tracking-[0.3em]">ยังไม่มีรายการรับสินค้า</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
