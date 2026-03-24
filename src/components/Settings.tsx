import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Settings as SettingsIcon, 
  Building, 
  Image as ImageIcon, 
  Save, 
  Database, 
  Check, 
  AlertCircle,
  Loader2,
  Upload,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';

const KOREAN_IDOLS = [
  'Lisa (Blackpink)', 'Jennie (Blackpink)', 'Jisoo (Blackpink)', 'Rosé (Blackpink)',
  'IU (Lee Ji-eun)', 'V (BTS)', 'Jungkook (BTS)', 'Jimin (BTS)', 'Jin (BTS)',
  'Suga (BTS)', 'RM (BTS)', 'J-Hope (BTS)', 'Cha Eun-woo', 'Park Seo-joon',
  'Son Ye-jin', 'Hyun Bin', 'Song Hye-kyo', 'Gong Yoo', 'Bae Suzy', 'Lee Min-ho'
];

interface SettingsProps {
  userProfile: any;
}

export default function Settings({ userProfile }: SettingsProps) {
  const [companyName, setCompanyName] = useState('Procurement Pro');
  const [companyLogo, setCompanyLogo] = useState('https://ais-dev-rraqh4ockror6izdtxygjx-600790570761.run.app/logo.png');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showConfirmSeed, setShowConfirmSeed] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCompanyName(docSnap.data().companyName || 'Procurement Pro');
        setCompanyLogo(docSnap.data().companyLogo || '');
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        companyName,
        companyLogo,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile.uid
      });
      setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64 in Firestore
        setMessage({ type: 'error', text: 'ขนาดไฟล์ใหญ่เกินไป (จำกัด 500KB)' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const seedDemoData = async () => {
    setSeeding(true);
    setShowConfirmSeed(false);
    try {
      // 1. Suppliers
      const supplierDocs = [];
      const suppliers = Array.from({ length: 15 }).map((_, i) => ({
        name: `บริษัท ${KOREAN_IDOLS[i % KOREAN_IDOLS.length]} เอ็นเตอร์เทนเมนต์`,
        contact: KOREAN_IDOLS[i % KOREAN_IDOLS.length],
        email: `contact@${KOREAN_IDOLS[i % KOREAN_IDOLS.length].toLowerCase().replace(/\s/g, '')}.com`,
        status: i % 5 === 0 ? 'inactive' : 'active',
        rating: 4 + (i % 2 === 0 ? 0.5 : -0.5),
        createdAt: new Date().toISOString()
      }));

      for (const s of suppliers) {
        try {
          const docRef = await addDoc(collection(db, 'suppliers'), s);
          supplierDocs.push({ id: docRef.id, ...s });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'suppliers');
        }
      }

      // 2. Requisitions
      const requisitionIds: string[] = [];
      const requisitions = Array.from({ length: 15 }).map((_, i) => {
        const idolName = KOREAN_IDOLS[(i + 5) % KOREAN_IDOLS.length];
        return {
          title: `ขอซื้ออุปกรณ์สำหรับโปรเจกต์ ${idolName}`,
          description: `รายการอุปกรณ์จำเป็นสำหรับการถ่ายทำ/ฝึกซ้อมของ ${idolName}`,
          totalAmount: 5000 + (i * 1000),
          status: i % 5 === 0 ? 'draft' : (i % 5 === 1 ? 'pending_approval' : (i % 5 === 2 ? 'approved' : (i % 5 === 3 ? 'po_created' : 'rejected'))),
          requesterUid: userProfile.uid,
          requesterName: idolName,
          department: i % 2 === 0 ? 'Production' : 'Artist Management',
          items: [
            { description: 'ไมโครโฟนไร้สาย', quantity: 2, unitPrice: 2500, total: 5000 },
            { description: 'ชุดแต่งหน้า', quantity: 1, unitPrice: 3500, total: 3500 }
          ],
          currentApprovalStep: 0,
          createdAt: new Date().toISOString()
        };
      });

      for (const r of requisitions) {
        try {
          const docRef = await addDoc(collection(db, 'requisitions'), r);
          requisitionIds.push(docRef.id);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'requisitions');
        }
      }

      // 3. Quotations (Bidding)
      const supplierIds = supplierDocs.map(d => d.id);
      for (let i = 0; i < 15; i++) {
        const prId = requisitionIds[i % requisitionIds.length];
        const sId = supplierIds[i % supplierIds.length];
        const sName = `บริษัท ${KOREAN_IDOLS[i % KOREAN_IDOLS.length]} เอ็นเตอร์เทนเมนต์`;
        
        try {
          await addDoc(collection(db, 'quotations'), {
            prId,
            supplierId: sId,
            supplierName: sName,
            price: 4500 + (i * 950),
            terms: 'Credit 30 days',
            items: [{ description: 'อุปกรณ์ประกอบฉาก', quantity: 1, unitPrice: 4500 + (i * 950), total: 4500 + (i * 950) }],
            isSelected: i % 3 === 0,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'quotations');
        }
      }

      // 4. Orders
      const orderIds: string[] = [];
      for (let i = 0; i < 15; i++) {
        const prId = requisitionIds[i % requisitionIds.length];
        const sId = supplierIds[i % supplierIds.length];
        
        try {
          const docRef = await addDoc(collection(db, 'orders'), {
            prId,
            supplierId: sId,
            poNumber: `PO-KPOP-${(i + 1).toString().padStart(3, '0')}`,
            totalAmount: 12000 + (i * 500),
            status: i % 3 === 0 ? 'issued' : (i % 3 === 1 ? 'received_fully' : 'cancelled'),
            createdAt: new Date().toISOString()
          });
          orderIds.push(docRef.id);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'orders');
        }
      }

      // 5. Receipts
      for (let i = 0; i < 15; i++) {
        const poId = orderIds[i % orderIds.length];
        const idolName = KOREAN_IDOLS[(i + 10) % KOREAN_IDOLS.length];
        try {
          await addDoc(collection(db, 'receipts'), {
            poId,
            receivedItems: [{ description: 'Stage Equipment', quantity: 2 }],
            receivedAt: new Date().toISOString(),
            receivedBy: idolName
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'receipts');
        }
      }

      // 6. Workflows
      const workflows = Array.from({ length: 15 }).map((_, i) => ({
        name: `ขั้นตอนการอนุมัติโปรเจกต์ ${KOREAN_IDOLS[i % KOREAN_IDOLS.length]}`,
        department: i % 4 === 0 ? 'Production' : (i % 4 === 1 ? 'Management' : (i % 4 === 2 ? 'Marketing' : 'Operations')),
        minAmount: i * 1000,
        maxAmount: (i + 1) * 10000,
        steps: [
          { role: 'approver' },
          { role: i % 2 === 0 ? 'procurement' : 'admin' }
        ],
        createdAt: new Date().toISOString()
      }));

      for (const w of workflows) {
        try {
          await addDoc(collection(db, 'workflows'), w);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'workflows');
        }
      }

      setMessage({ type: 'success', text: 'สร้างข้อมูลตัวอย่าง 90 รายการเรียบร้อยแล้ว!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการสร้างข้อมูล: ' + (err instanceof Error ? err.message : String(err)) });
    } finally {
      setSeeding(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="font-serif italic text-4xl text-slate-800">ตั้งค่าระบบ</h2>
        <p className="text-slate-400 text-sm mt-2">จัดการข้อมูลบริษัทและข้อมูลตัวอย่าง</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Settings */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-soft-green rounded-2xl flex items-center justify-center">
              <Building className="w-6 h-6 text-accent-green" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">ข้อมูลบริษัท</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">ชื่อบริษัท</label>
              <div className="relative group">
                <Building className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-green transition-colors" />
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">โลโก้บริษัท</label>
              <div className="flex flex-col gap-4">
                <div className="relative group">
                  <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-green transition-colors" />
                  <input 
                    type="text" 
                    value={companyLogo}
                    onChange={(e) => setCompanyLogo(e.target.value)}
                    placeholder="URL โลโก้ หรืออัปโหลดไฟล์"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/20 focus:bg-white rounded-2xl outline-none transition-all"
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 hover:border-accent-green/40 rounded-2xl cursor-pointer transition-all group">
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-accent-green transition-colors" />
                    <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700">อัปโหลดรูปภาพ</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  
                  {companyLogo && (
                    <button 
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl text-sm font-bold transition-all"
                    >
                      ล้างรูปภาพ
                    </button>
                  )}
                </div>
              </div>
              
              {companyLogo && (
                <div className="mt-4 p-6 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-slate-200">
                  <img src={companyLogo} alt="Preview" className="max-h-32 object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            {message.text && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {message.text}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-accent-green text-white rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึกการตั้งค่า
            </button>
          </form>
        </motion.div>

        {/* Demo Data Seeding */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-soft-pink rounded-2xl flex items-center justify-center">
              <Database className="w-6 h-6 text-accent-pink" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">ข้อมูลตัวอย่าง (Demo Data)</h3>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-slate-600 text-sm leading-relaxed">
                ปุ่มนี้จะทำการสร้างข้อมูลจำลองจำนวน 15 รายการในทุกฟังก์ชันของระบบ (รวม 90 รายการ) โดยใช้ชื่อศิลปินเกาหลี เพื่อใช้ในการทดสอบระบบ
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-accent-green" /> รายชื่อผู้ขาย (Suppliers)</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-accent-green" /> ใบขอซื้อ (Requisitions)</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-accent-green" /> การประมูล (Bidding)</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-accent-green" /> ใบสั่งซื้อ (Orders)</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-accent-green" /> ใบรับสินค้า (Receipts)</li>
              </ul>
            </div>

            {message.text && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {message.text}
              </div>
            )}

            {!showConfirmSeed ? (
              <button 
                onClick={() => setShowConfirmSeed(true)}
                disabled={seeding}
                className="w-full py-10 border-2 border-dashed border-slate-200 hover:border-accent-pink/40 hover:bg-soft-pink/20 rounded-[2rem] transition-all group flex flex-col items-center justify-center gap-4 disabled:opacity-50"
              >
                {seeding ? (
                  <Loader2 className="w-10 h-10 text-accent-pink animate-spin" />
                ) : (
                  <Database className="w-10 h-10 text-slate-300 group-hover:text-accent-pink transition-colors" />
                )}
                <div className="text-center">
                  <p className="font-bold text-slate-600 group-hover:text-accent-pink transition-colors">
                    {seeding ? 'กำลังสร้างข้อมูล...' : 'คลิกเพื่อสร้างข้อมูล Demo'}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">สร้าง 15 รายการต่อฟังก์ชัน</p>
                </div>
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-6 bg-soft-pink/20 rounded-3xl border border-accent-pink/20 text-center">
                  <p className="text-sm font-bold text-accent-pink mb-4">คุณแน่ใจหรือไม่ที่จะสร้างข้อมูลตัวอย่าง?</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={seedDemoData}
                      className="flex-1 py-4 bg-accent-pink text-white rounded-2xl font-bold hover:shadow-lg transition-all"
                    >
                      ยืนยันการสร้าง
                    </button>
                    <button 
                      onClick={() => setShowConfirmSeed(false)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
