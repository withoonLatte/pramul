import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { 
  Camera, 
  Upload, 
  FileSearch, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Plus,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface BiddingProps {
  userProfile: any;
}

export default function Bidding({ userProfile }: BiddingProps) {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch approved requisitions that don't have a PO yet
    const q = query(
      collection(db, 'requisitions'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequisitions(prs);
    });

    // Fetch suppliers for mapping
    getDocs(collection(db, 'suppliers')).then(snapshot => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedPR) {
      const q = query(
        collection(db, 'quotations'),
        where('prId', '==', selectedPR.id)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setQuotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsubscribe;
    }
  }, [selectedPR]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPR) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        await performOCR(base64Data);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setIsScanning(false);
    }
  };

  const performOCR = async (base64Image: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Extract quotation data from this image. Identify the supplier name, total price, and key terms. Return as JSON." },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supplierName: { type: Type.STRING },
              totalPrice: { type: Type.NUMBER },
              terms: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    total: { type: Type.NUMBER }
                  }
                }
              }
            },
            required: ["supplierName", "totalPrice"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setScanResult(data);
    } catch (error) {
      console.error('OCR error:', error);
      alert('ไม่สามารถสแกนใบเสนอราคาได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsScanning(false);
    }
  };

  const saveQuotation = async () => {
    if (!scanResult || !selectedPR) return;

    // Find supplier ID by name or create a placeholder
    let supplierId = suppliers.find(s => s.name.toLowerCase().includes(scanResult.supplierName.toLowerCase()))?.id;
    
    if (!supplierId) {
      // Create new supplier if not found
      const newSup = await addDoc(collection(db, 'suppliers'), {
        name: scanResult.supplierName,
        status: 'active',
        rating: 0,
        contact: 'Auto-generated from scan'
      });
      supplierId = newSup.id;
    }

    await addDoc(collection(db, 'quotations'), {
      prId: selectedPR.id,
      supplierId,
      supplierName: scanResult.supplierName,
      price: scanResult.totalPrice,
      terms: scanResult.terms || 'N/A',
      items: scanResult.items || [],
      isSelected: false,
      createdAt: new Date().toISOString()
    });

    setScanResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectWinner = async (quoteId: string) => {
    // Reset all for this PR
    for (const q of quotations) {
      await updateDoc(doc(db, 'quotations', q.id), { isSelected: q.id === quoteId });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif italic text-4xl text-slate-800">ระบบประมูล & เปรียบเทียบราคา</h2>
          <p className="text-slate-400 text-sm mt-2">สแกนใบเสนอราคาและเลือกผู้ชนะการประมูล</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PR List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <FileSearch className="w-4 h-4" /> ใบขอซื้อที่รอการประมูล
          </h3>
          <div className="space-y-3">
            {requisitions.map(pr => (
              <button
                key={pr.id}
                onClick={() => setSelectedPR(pr)}
                className={`w-full text-left p-6 rounded-[2rem] transition-all border-2 ${
                  selectedPR?.id === pr.id 
                    ? 'bg-white border-accent-green shadow-xl scale-[1.02]' 
                    : 'bg-white/50 border-transparent hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-accent-green bg-soft-green px-2 py-1 rounded-full">
                    {pr.department}
                  </span>
                  <span className="text-xs font-mono text-slate-400">#{pr.id.slice(0, 5)}</span>
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{pr.title}</h4>
                <p className="text-xl font-serif italic text-slate-900">฿{pr.totalAmount.toLocaleString()}</p>
              </button>
            ))}
            {requisitions.length === 0 && (
              <div className="p-12 text-center bg-white/30 rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-sm italic">ไม่มีใบขอซื้อที่รอการประมูล</p>
              </div>
            )}
          </div>
        </div>

        {/* Comparison & Scanning */}
        <div className="lg:col-span-2 space-y-8">
          {selectedPR ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Action Bar */}
              <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 flex flex-wrap items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-serif italic text-slate-800">{selectedPR.title}</h3>
                  <p className="text-slate-400 text-xs mt-1">เปรียบเทียบใบเสนอราคาสำหรับรายการนี้</p>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-6 py-3 bg-accent-green text-white rounded-2xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    สแกนใบเสนอราคา
                  </button>
                </div>
              </div>

              {/* Scan Result Preview */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-accent-green/5 border-2 border-accent-green/20 rounded-[3rem] p-8"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-bold text-accent-green flex items-center gap-2">
                        <Zap className="w-5 h-5" /> ตรวจพบข้อมูลใบเสนอราคา
                      </h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setScanResult(null)}
                          className="px-4 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest"
                        >
                          ยกเลิก
                        </button>
                        <button 
                          onClick={saveQuotation}
                          className="px-6 py-2 bg-accent-green text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md"
                        >
                          บันทึกข้อมูล
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ผู้ขาย</p>
                        <p className="text-lg font-bold text-slate-800">{scanResult.supplierName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ราคาสุทธิ</p>
                        <p className="text-2xl font-serif italic text-accent-green">฿{scanResult.totalPrice.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">เงื่อนไข</p>
                        <p className="text-sm text-slate-600">{scanResult.terms}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quotations.map(quote => (
                  <div 
                    key={quote.id}
                    className={`bg-white rounded-[3rem] p-8 shadow-lg border-2 transition-all ${
                      quote.isSelected ? 'border-accent-green ring-4 ring-accent-green/10' : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      {quote.isSelected && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-accent-green text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" /> ผู้ชนะ
                        </div>
                      )}
                    </div>
                    
                    <h4 className="text-xl font-bold text-slate-800 mb-1">{quote.supplierName}</h4>
                    <p className="text-3xl font-serif italic text-slate-900 mb-4">฿{quote.price.toLocaleString()}</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-accent-green" />
                        <span>เงื่อนไข: {quote.terms}</span>
                      </div>
                      {quote.price < selectedPR.totalAmount && (
                        <div className="flex items-center gap-2 text-xs text-accent-green font-bold">
                          <TrendingDown className="w-4 h-4" />
                          <span>ประหยัดได้ ฿{(selectedPR.totalAmount - quote.price).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {!quote.isSelected && (
                      <button 
                        onClick={() => selectWinner(quote.id)}
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                      >
                        เลือกเป็นผู้ชนะ
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {quotations.length === 0 && !isScanning && !scanResult && (
                  <div className="col-span-2 p-20 text-center bg-white/30 rounded-[4rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] mx-auto mb-6 flex items-center justify-center">
                      <Plus className="w-10 h-10 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-400 mb-2">ยังไม่มีใบเสนอราคา</h4>
                    <p className="text-slate-400 text-sm">ใช้กล้องมือถือสแกนใบเสนอราคาเพื่อเริ่มเปรียบเทียบ</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-white/30 rounded-[4rem] border-2 border-dashed border-slate-200 text-center">
              <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-8">
                <FileSearch className="w-10 h-10 text-accent-green" />
              </div>
              <h3 className="text-2xl font-serif italic text-slate-800 mb-2">กรุณาเลือกใบขอซื้อ</h3>
              <p className="text-slate-400 text-sm max-w-xs">เลือกรายการใบขอซื้อจากแถบด้านซ้ายเพื่อเริ่มกระบวนการประมูลและเปรียบเทียบราคา</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
