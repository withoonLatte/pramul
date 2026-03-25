import React, { useState, useEffect } from 'react';
import { db, createSecondaryUser, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  Shield, 
  Briefcase, 
  Mail, 
  Lock,
  Search,
  X,
  Check,
  User as UserIcon,
  ChevronRight,
  AlertCircle,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StaffManagementProps {
  userProfile: any;
}

export default function StaffManagement({ userProfile }: StaffManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    role: 'requester',
    department: 'General'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      const [firstName, ...lastNameParts] = (user.displayName || '').split(' ');
      setFormData({
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        username: user.email?.split('@')[0] || '',
        password: '', // Don't show password
        role: user.role || 'requester',
        department: user.department || 'General'
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        role: 'requester',
        department: 'General'
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const email = `${formData.username.toLowerCase().trim()}@procurement.pro`;
      const displayName = `${formData.firstName} ${formData.lastName}`.trim();

      if (editingUser) {
        // Update Firestore only
        try {
          await updateDoc(doc(db, 'users', editingUser.id), {
            displayName,
            role: formData.role,
            department: formData.department
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.id}`);
        }
      } else {
        // Create Auth + Firestore
        if (!formData.password || formData.password.length < 6) {
          throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        }

        const userCredential = await createSecondaryUser(email, formData.password);
        const newUser = userCredential.user;

        try {
          await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            email: email,
            displayName,
            role: formData.role,
            department: formData.department
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${newUser.uid}`);
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Staff management error:', err);
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานคนนี้? (ข้อมูลในระบบจะถูกลบ แต่บัญชี Auth จะยังอยู่แต่เข้าใช้งานไม่ได้หากลบ Profile)')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roles = [
    { id: 'admin', label: 'ผู้ดูแลระบบ (Admin)', color: 'bg-accent-pink' },
    { id: 'executive', label: 'ผู้บริหาร (Executive)', color: 'bg-purple-600' },
    { id: 'procurement', label: 'เจ้าหน้าที่จัดซื้อ (Procurement)', color: 'bg-accent-green' },
    { id: 'approver', label: 'ผู้อนุมัติ (Approver)', color: 'bg-blue-500' },
    { id: 'requester', label: 'ผู้ขอซื้อ (Requester)', color: 'bg-slate-400' }
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-serif italic text-4xl text-slate-800">จัดการพนักงาน</h2>
          <p className="text-slate-400 text-sm mt-2">เพิ่ม แก้ไข และลบสิทธิ์การใช้งานของพนักงาน</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-8 py-4 bg-accent-green text-white rounded-2xl font-bold hover:shadow-lg transition-all self-start"
        >
          <UserPlus className="w-5 h-5" />
          เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-green transition-colors" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ, อีเมล หรือแผนก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white rounded-[2rem] border-2 border-transparent focus:border-accent-green/20 outline-none shadow-sm transition-all text-slate-700"
          />
        </div>
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">พนักงานทั้งหมด</p>
            <p className="text-3xl font-serif italic text-slate-800">{users.length}</p>
          </div>
          <div className="w-12 h-12 bg-soft-green rounded-2xl flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-accent-green" />
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredUsers.map((user) => (
            <motion.div
              key={user.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(user)}
                  className="p-2 bg-slate-50 hover:bg-blue-50 text-blue-500 rounded-xl transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm(`ส่งอีเมลรีเซ็ตรหัสผ่านไปยัง ${user.email}?`)) {
                      try {
                        await sendPasswordResetEmail(auth, user.email);
                        alert('ส่งอีเมลรีเซ็ตรหัสผ่านเรียบร้อยแล้ว');
                      } catch (err) {
                        console.error('Reset error:', err);
                        alert('ไม่สามารถส่งอีเมลได้');
                      }
                    }
                  }}
                  className="p-2 bg-slate-50 hover:bg-amber-50 text-amber-500 rounded-xl transition-colors"
                  title="รีเซ็ตรหัสผ่าน"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(user.id)}
                  className="p-2 bg-slate-50 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${roles.find(r => r.id === user.role)?.color || 'bg-slate-400'}`}>
                  <UserIcon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{user.displayName}</h4>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Briefcase className="w-3 h-3" />
                    {user.department}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent-green" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {roles.find(r => r.id === user.role)?.label.split(' ')[0]}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-3xl font-serif italic text-slate-800">
                      {editingUser ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">กรอกข้อมูลให้ครบถ้วนเพื่อดำเนินการ</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">ชื่อ (First Name)</label>
                      <input 
                        type="text" 
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">นามสกุล (Last Name)</label>
                      <input 
                        type="text" 
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">แผนก (Department)</label>
                      <input 
                        type="text" 
                        required
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">ตำแหน่ง/สิทธิ์ (Role)</label>
                      <select 
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all appearance-none"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    {!editingUser && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">ชื่อผู้ใช้ (Username)</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              required
                              value={formData.username}
                              onChange={(e) => setFormData({...formData, username: e.target.value})}
                              placeholder="เช่น somchai"
                              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">@procurement.pro</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">รหัสผ่าน (Password)</label>
                          <div className="relative">
                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                              type="password" 
                              required
                              value={formData.password}
                              onChange={(e) => setFormData({...formData, password: e.target.value})}
                              placeholder="อย่างน้อย 6 ตัวอักษร"
                              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-bold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4 pt-6">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-4 bg-accent-green text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? 'กำลังบันทึก...' : (editingUser ? 'บันทึกการแก้ไข' : 'สร้างบัญชีพนักงาน')}
                      {!loading && <Check className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
