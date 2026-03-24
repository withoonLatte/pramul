import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Save, FileText, CheckCircle, XCircle, Clock, Search, Filter, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PRItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Requisition {
  id?: string;
  title: string;
  requesterUid: string;
  department: string;
  items: PRItem[];
  totalAmount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'po_created';
  currentApprovalStep: number;
  createdAt: string;
}

export default function Requisitions({ userProfile }: { userProfile: any }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPR, setCurrentPR] = useState<Requisition>({
    title: '',
    requesterUid: userProfile?.uid || '',
    department: userProfile?.department || 'General',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    totalAmount: 0,
    status: 'draft',
    currentApprovalStep: 0,
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    let q;
    if (userProfile?.role === 'admin' || userProfile?.role === 'procurement' || userProfile?.role === 'executive') {
      q = query(collection(db, 'requisitions'), orderBy('createdAt', 'desc'));
    } else if (userProfile?.role === 'approver') {
      q = query(collection(db, 'requisitions'), where('status', '==', 'pending_approval'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'requisitions'), where('requesterUid', '==', userProfile?.uid), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setRequisitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requisition)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requisitions');
    });
    return unsub;
  }, [userProfile]);

  const handleAddItem = () => {
    setCurrentPR({
      ...currentPR,
      items: [...currentPR.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
  };

  const handleItemChange = (index: number, field: keyof PRItem, value: string | number) => {
    const newItems = [...currentPR.items];
    const item = { ...newItems[index], [field]: value };
    item.total = item.quantity * item.unitPrice;
    newItems[index] = item;
    
    const totalAmount = newItems.reduce((acc, curr) => acc + curr.total, 0);
    setCurrentPR({ ...currentPR, items: newItems, totalAmount });
  };

  const handleSave = async (status: Requisition['status'] = 'draft') => {
    try {
      const prData = { ...currentPR, status, createdAt: new Date().toISOString() };
      if (currentPR.id) {
        const { id, ...data } = prData;
        await updateDoc(doc(db, 'requisitions', id), data);
      } else {
        await addDoc(collection(db, 'requisitions'), prData);
      }
      setIsEditing(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'requisitions');
    }
  };

  const resetForm = () => {
    setCurrentPR({
      title: '',
      requesterUid: userProfile?.uid || '',
      department: userProfile?.department || 'General',
      items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
      totalAmount: 0,
      status: 'draft',
      currentApprovalStep: 0,
      createdAt: new Date().toISOString()
    });
  };

  const handleStatusUpdate = async (prId: string, newStatus: Requisition['status']) => {
    try {
      await updateDoc(doc(db, 'requisitions', prId), { status: newStatus });
      setIsEditing(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'requisitions');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-serif italic text-4xl text-slate-800">ใบขอซื้อ (PR)</h4>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-2">รายการขอซื้อสินค้าและบริการภายในองค์กร</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-3 px-8 py-4 bg-accent-green text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-green/90 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            สร้างใบขอซื้อใหม่
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100"
        >
          <div className="mb-10">
            <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">หัวข้อใบขอซื้อ</label>
            <input 
              type="text" 
              value={currentPR.title}
              onChange={(e) => setCurrentPR({ ...currentPR, title: e.target.value })}
              className="w-full p-5 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-green outline-none transition-all text-lg font-medium"
              placeholder="เช่น อุปกรณ์สำนักงานสำหรับไตรมาสที่ 2"
            />
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h5 className="font-serif italic text-2xl text-slate-800">รายการสินค้า</h5>
              <button 
                onClick={handleAddItem}
                className="text-xs font-bold uppercase text-accent-green hover:text-accent-green/80 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มรายการใหม่
              </button>
            </div>
            
            <div className="space-y-4">
              {currentPR.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end p-6 bg-slate-50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">รายละเอียด</label>
                    <input 
                      type="text" 
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-accent-green transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">จำนวน</label>
                    <input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-accent-green transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">ราคา/หน่วย</label>
                    <input 
                      type="number" 
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-accent-green transition-all"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">รวม</p>
                      <p className="text-sm font-bold text-slate-800">฿{item.total.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newItems = currentPR.items.filter((_, i) => i !== index);
                        setCurrentPR({ ...currentPR, items: newItems, totalAmount: newItems.reduce((acc, curr) => acc + curr.total, 0) });
                      }}
                      className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex justify-between items-center bg-slate-50 p-8 rounded-[2rem]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-accent-green rounded-2xl flex items-center justify-center shadow-sm">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">ยอดรวมสุทธิ</p>
                <h4 className="font-serif italic text-4xl text-slate-800">฿{currentPR.totalAmount.toLocaleString()}</h4>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-8 py-4 bg-white text-slate-500 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
              >
                ยกเลิก
              </button>
              
              {(userProfile?.role === 'approver' || userProfile?.role === 'executive') && currentPR.status === 'pending_approval' ? (
                <>
                  <button 
                    onClick={() => handleStatusUpdate(currentPR.id!, 'rejected')}
                    className="px-8 py-4 bg-red-50 text-red-500 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-red-100 transition-all border border-red-200 flex items-center gap-3"
                  >
                    <XCircle className="w-5 h-5" />
                    ปฏิเสธ
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(currentPR.id!, 'approved')}
                    className="px-8 py-4 bg-accent-green text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-green/90 transition-all shadow-lg flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5" />
                    อนุมัติ
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleSave('draft')}
                    className="px-8 py-4 bg-white text-accent-pink rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-soft-pink transition-all border border-accent-pink/20"
                  >
                    บันทึกร่าง
                  </button>
                  <button 
                    onClick={() => handleSave('pending_approval')}
                    className="px-8 py-4 bg-accent-green text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-green/90 transition-all shadow-lg flex items-center gap-3"
                  >
                    <Save className="w-5 h-5" />
                    ส่งอนุมัติ
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-8 font-serif italic text-lg text-slate-800">หัวข้อ</th>
                  <th className="p-8 font-serif italic text-lg text-slate-800">แผนก</th>
                  <th className="p-8 font-serif italic text-lg text-slate-800">ยอดเงิน</th>
                  <th className="p-8 font-serif italic text-lg text-slate-800">สถานะ</th>
                  <th className="p-8 font-serif italic text-lg text-slate-800">วันที่</th>
                  <th className="p-8 font-serif italic text-lg text-slate-800 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((pr) => (
                  <tr key={pr.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                    <td className="p-8">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-accent-green transition-colors">{pr.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {pr.id?.slice(0, 8)}</p>
                    </td>
                    <td className="p-8">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {pr.department}
                      </span>
                    </td>
                    <td className="p-8 text-sm font-bold text-slate-800">฿{pr.totalAmount?.toLocaleString()}</td>
                    <td className="p-8">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 w-fit ${
                        pr.status === 'approved' ? 'bg-accent-green/10 text-accent-green' : 
                        pr.status === 'rejected' ? 'bg-red-50 text-red-500' : 
                        pr.status === 'pending_approval' ? 'bg-accent-pink/10 text-accent-pink' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {pr.status === 'pending_approval' && <Clock className="w-3 h-3" />}
                        {pr.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {pr.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {pr.status === 'approved' ? 'อนุมัติแล้ว' : pr.status === 'rejected' ? 'ปฏิเสธ' : pr.status === 'pending_approval' ? 'รออนุมัติ' : 'ร่าง'}
                      </span>
                    </td>
                    <td className="p-8 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {new Date(pr.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="p-8 text-right">
                      <div className="flex justify-end gap-3">
                        {(userProfile?.role === 'approver' || userProfile?.role === 'executive') && pr.status === 'pending_approval' && (
                          <>
                            <button 
                              onClick={() => handleStatusUpdate(pr.id!, 'approved')}
                              className="p-3 text-accent-green hover:bg-soft-green rounded-xl transition-all"
                              title="อนุมัติ"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(pr.id!, 'rejected')}
                              className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="ปฏิเสธ"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => { setCurrentPR(pr); setIsEditing(true); }}
                          className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                          title="ดูรายละเอียด"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requisitions.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-xs font-bold uppercase text-slate-300 tracking-[0.3em]">ไม่พบรายการใบขอซื้อ</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
