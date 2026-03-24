import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { Plus, Trash2, Save, ShoppingCart, FileText, CheckCircle, XCircle, Clock, Search, Printer, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PurchaseOrder {
  id?: string;
  prId: string;
  supplierId: string;
  poNumber: string;
  status: 'issued' | 'received_partially' | 'received_fully' | 'cancelled';
  totalAmount: number;
  createdAt: string;
}

export default function Orders({ userProfile }: { userProfile: any }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPO, setCurrentPO] = useState<PurchaseOrder>({
    prId: '',
    supplierId: '',
    poNumber: `PO-${Date.now().toString().slice(-6)}`,
    status: 'issued',
    totalAmount: 0,
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
    });

    const unsubPRs = onSnapshot(query(collection(db, 'requisitions'), where('status', '==', 'approved')), (snapshot) => {
      setRequisitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requisitions');
    });

    return () => {
      unsubOrders();
      unsubSuppliers();
      unsubPRs();
    };
  }, []);

  const handleSave = async () => {
    try {
      if (currentPO.id) {
        const { id, ...data } = currentPO;
        await updateDoc(doc(db, 'orders', id), data);
      } else {
        await addDoc(collection(db, 'orders'), currentPO);
        // Update PR status to po_created
        if (currentPO.prId) {
          await updateDoc(doc(db, 'requisitions', currentPO.prId), { status: 'po_created' });
        }
      }
      setIsEditing(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  const resetForm = () => {
    setCurrentPO({
      prId: '',
      supplierId: '',
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      status: 'issued',
      totalAmount: 0,
      createdAt: new Date().toISOString()
    });
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown';
  const getPRTitle = (id: string) => requisitions.find(r => r.id === id)?.title || 'Unknown PR';

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-serif italic text-4xl text-slate-800">ใบสั่งซื้อ (PO)</h4>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-2">ใบสั่งซื้ออย่างเป็นทางการสำหรับส่งให้ผู้ขาย</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-3 px-8 py-4 bg-accent-pink text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-pink/90 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            สร้างใบสั่งซื้อใหม่
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
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">เลขที่ใบสั่งซื้อ</label>
                <input 
                  type="text" 
                  value={currentPO.poNumber}
                  readOnly
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-400 font-medium cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">เลือกใบขอซื้อที่อนุมัติแล้ว</label>
                <select 
                  value={currentPO.prId}
                  onChange={(e) => {
                    const pr = requisitions.find(r => r.id === e.target.value);
                    setCurrentPO({ ...currentPO, prId: e.target.value, totalAmount: pr?.totalAmount || 0 });
                  }}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-pink outline-none transition-all font-medium appearance-none"
                >
                  <option value="">เลือกใบขอซื้อ...</option>
                  {requisitions.map(pr => (
                    <option key={pr.id} value={pr.id}>{pr.title} (฿{pr.totalAmount.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">เลือกผู้ขาย</label>
                <select 
                  value={currentPO.supplierId}
                  onChange={(e) => setCurrentPO({ ...currentPO, supplierId: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-pink outline-none transition-all font-medium appearance-none"
                >
                  <option value="">เลือกผู้ขาย...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ยอดรวม</label>
                <div className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 flex justify-between items-center font-medium">
                  <span className="text-slate-400">THB</span>
                  <span className="text-2xl font-serif italic text-accent-pink">฿{currentPO.totalAmount.toLocaleString()}</span>
                </div>
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
              className="px-8 py-4 bg-accent-pink text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-pink/90 transition-all shadow-lg flex items-center gap-3"
            >
              <Save className="w-5 h-5" />
              ออกใบสั่งซื้อ
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">เลขที่ PO</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">ผู้ขาย</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">อ้างอิงใบขอซื้อ</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">ยอดเงิน</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest">สถานะ</th>
                  <th className="p-6 text-xs font-bold uppercase text-slate-400 tracking-widest text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-800">{po.poNumber}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-300 tracking-wider mt-1">
                        {new Date(po.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="p-6 text-sm font-medium text-slate-600">{getSupplierName(po.supplierId)}</td>
                    <td className="p-6 text-sm font-medium text-slate-600 truncate max-w-[200px]">{getPRTitle(po.prId)}</td>
                    <td className="p-6 text-sm font-bold text-accent-pink">฿{po.totalAmount?.toLocaleString()}</td>
                    <td className="p-6">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 w-fit ${
                        po.status === 'received_fully' ? 'bg-accent-green/10 text-accent-green' : 
                        po.status === 'cancelled' ? 'bg-red-50 text-red-500' : 
                        'bg-accent-pink/10 text-accent-pink'
                      }`}>
                        {po.status === 'issued' && <Clock className="w-3 h-3" />}
                        {po.status === 'received_fully' && <CheckCircle className="w-3 h-3" />}
                        {po.status === 'issued' ? 'ออกใบสั่งซื้อแล้ว' : 
                         po.status === 'received_fully' ? 'รับสินค้าครบแล้ว' : 
                         po.status === 'received_partially' ? 'รับสินค้าบางส่วน' : 'ยกเลิก'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-3 bg-slate-50 hover:bg-soft-green text-slate-400 hover:text-accent-green rounded-xl transition-all">
                          <Printer className="w-5 h-5" />
                        </button>
                        <button className="p-3 bg-slate-50 hover:bg-soft-pink text-slate-400 hover:text-accent-pink rounded-xl transition-all">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <ShoppingCart className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-xs font-bold uppercase text-slate-300 tracking-[0.3em]">ไม่พบข้อมูลใบสั่งซื้อ</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
