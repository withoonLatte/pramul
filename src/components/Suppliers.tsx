import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Save, Users, Star, Mail, Phone, ExternalLink, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Supplier {
  id?: string;
  name: string;
  contact: string;
  email: string;
  rating: number;
  status: 'active' | 'inactive';
}

export default function Suppliers({ userProfile }: { userProfile: any }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSupplier, setCurrentSupplier] = useState<Supplier>({
    name: '',
    contact: '',
    email: '',
    rating: 5,
    status: 'active'
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'suppliers'), orderBy('name')), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    try {
      if (currentSupplier.id) {
        const { id, ...data } = currentSupplier;
        await updateDoc(doc(db, 'suppliers', id), data);
      } else {
        await addDoc(collection(db, 'suppliers'), currentSupplier);
      }
      setIsEditing(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'suppliers');
    }
  };

  const resetForm = () => {
    setCurrentSupplier({
      name: '',
      contact: '',
      email: '',
      rating: 5,
      status: 'active'
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'suppliers');
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-serif italic text-4xl text-slate-800">รายชื่อผู้ขาย</h4>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-2">จัดการข้อมูลคู่ค้าและคะแนนประเมิน</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-3 px-8 py-4 bg-accent-green text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-green/90 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            เพิ่มผู้ขายใหม่
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-green transition-colors" />
          <input 
            type="text" 
            placeholder="ค้นหาผู้ขายด้วยชื่อหรืออีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] text-sm focus:ring-2 focus:ring-accent-green outline-none shadow-sm transition-all"
          />
        </div>
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
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ชื่อบริษัท</label>
                <input 
                  type="text" 
                  value={currentSupplier.name}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-green outline-none transition-all font-medium"
                  placeholder="เช่น บริษัท เอบีซี จำกัด"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ผู้ติดต่อ</label>
                <input 
                  type="text" 
                  value={currentSupplier.contact}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, contact: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-green outline-none transition-all font-medium"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">อีเมล</label>
                <input 
                  type="email" 
                  value={currentSupplier.email}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, email: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-green outline-none transition-all font-medium"
                  placeholder="เช่น contact@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">คะแนน (1-5)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="5"
                    value={currentSupplier.rating}
                    onChange={(e) => setCurrentSupplier({ ...currentSupplier, rating: Number(e.target.value) })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-green outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">สถานะ</label>
                  <select 
                    value={currentSupplier.status}
                    onChange={(e) => setCurrentSupplier({ ...currentSupplier, status: e.target.value as any })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-green outline-none transition-all font-medium appearance-none"
                  >
                    <option value="active">ใช้งานอยู่</option>
                    <option value="inactive">ระงับการใช้งาน</option>
                  </select>
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
              className="px-8 py-4 bg-accent-green text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-green/90 transition-all shadow-lg flex items-center gap-3"
            >
              <Save className="w-5 h-5" />
              บันทึกข้อมูล
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-soft-green transition-colors duration-500">
                  <Users className="w-8 h-8 text-slate-400 group-hover:text-accent-green transition-colors duration-500" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <button 
                    onClick={() => { setCurrentSupplier(supplier); setIsEditing(true); }}
                    className="p-3 bg-slate-50 hover:bg-soft-pink text-slate-400 hover:text-accent-pink rounded-xl transition-all"
                    title="แก้ไข"
                  >
                    <Star className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(supplier.id!)}
                    className="p-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                    title="ลบ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <h5 className="font-serif italic text-2xl text-slate-800 mb-2">{supplier.name}</h5>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-6">{supplier.contact}</p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium truncate">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-accent-green" />
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < supplier.rating ? 'fill-accent-green text-accent-green' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">คะแนน: {supplier.rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full ${
                  supplier.status === 'active' ? 'bg-accent-green/10 text-accent-green' : 'bg-slate-100 text-slate-400'
                }`}>
                  {supplier.status === 'active' ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                </span>
                <button className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-800 flex items-center gap-2 transition-colors">
                  ดูประวัติ <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {filteredSuppliers.length === 0 && (
            <div className="lg:col-span-3 py-32 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
              <Users className="w-16 h-16 text-slate-200 mb-6" />
              <p className="text-xs font-bold uppercase text-slate-300 tracking-[0.3em]">ไม่พบข้อมูลผู้ขาย</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
