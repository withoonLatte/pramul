import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { Plus, Trash2, Save, ShoppingCart, FileText, CheckCircle, XCircle, Clock, Search, Printer, Download, X, Building, User } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

    const unsubPRs = onSnapshot(collection(db, 'requisitions'), (snapshot) => {
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

  const [showPreview, setShowPreview] = useState(false);
  const [previewPO, setPreviewPO] = useState<PurchaseOrder | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!previewPO) return;
    const pr = requisitions.find(r => r.id === previewPO.prId);
    const supplier = suppliers.find(s => s.id === previewPO.supplierId);
    
    const doc = new jsPDF();
    
    // Note: Standard jsPDF fonts don't support Thai. 
    // In a real app, we'd embed a Thai font. 
    // For this demo, we'll use English labels where possible or just rely on the print-to-pdf functionality.
    // However, we'll try to generate a basic structure.
    
    doc.setFontSize(20);
    doc.text('PURCHASE ORDER', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`PO Number: ${previewPO.poNumber}`, 20, 40);
    doc.text(`Date: ${new Date(previewPO.createdAt).toLocaleDateString()}`, 20, 45);
    
    doc.text('Vendor:', 20, 60);
    doc.text(supplier?.name || 'Unknown', 20, 65);
    doc.text(supplier?.email || '', 20, 70);
    
    doc.text('Ship To:', 120, 60);
    doc.text('Procurement Pro HQ', 120, 65);
    doc.text('123 Sukhumvit Rd, Bangkok', 120, 70);
    
    const tableData = pr?.items?.map((item: any) => [
      item.description,
      item.quantity,
      item.unitPrice.toLocaleString(),
      item.total.toLocaleString()
    ]) || [];
    
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      foot: [['', '', 'Total Amount', `THB ${previewPO.totalAmount.toLocaleString()}`]],
    });
    
    doc.save(`PO-${previewPO.poNumber}.pdf`);
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
                        <button 
                          onClick={() => { setPreviewPO(po); setShowPreview(true); }}
                          className="p-3 bg-slate-50 hover:bg-soft-green text-slate-400 hover:text-accent-green rounded-xl transition-all"
                          title="พิมพ์ / ดูตัวอย่าง"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => { setPreviewPO(po); handleDownload(); }}
                          className="p-3 bg-slate-50 hover:bg-soft-pink text-slate-400 hover:text-accent-pink rounded-xl transition-all"
                          title="ดาวน์โหลด PDF"
                        >
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
      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && previewPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 print:hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-soft-green rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-accent-green" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">ตัวอย่างใบสั่งซื้อ</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{previewPO.poNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-sm transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    พิมพ์
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 bg-accent-pink text-white rounded-xl font-bold text-sm hover:bg-accent-pink/90 transition-all shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลด PDF
                  </button>
                  <button 
                    onClick={() => setShowPreview(false)}
                    className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30 print:bg-white print:p-0">
                <div id="po-document" className="bg-white p-12 shadow-sm border border-slate-100 rounded-[2rem] max-w-[210mm] mx-auto print:shadow-none print:border-none print:p-0">
                  {/* PO Header */}
                  <div className="flex justify-between items-start mb-12 border-b-2 border-slate-50 pb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-accent-green rounded-xl flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="font-serif italic text-2xl text-slate-800">Procurement Pro</h2>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        123 ถนนสุขุมวิท แขวงคลองเตย<br />
                        เขตคลองเตย กรุงเทพฯ 10110<br />
                        โทร: 02-123-4567
                      </p>
                    </div>
                    <div className="text-right">
                      <h1 className="font-serif italic text-4xl text-accent-pink mb-2">PURCHASE ORDER</h1>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">เลขที่: {previewPO.poNumber}</p>
                        <p className="text-sm text-slate-400 font-medium">วันที่: {new Date(previewPO.createdAt).toLocaleDateString('th-TH')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vendor & Shipping */}
                  <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-slate-300 tracking-[0.2em] mb-4">ผู้ขาย / VENDOR</h4>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">{getSupplierName(previewPO.supplierId)}</p>
                        <p className="text-sm text-slate-500">{suppliers.find(s => s.id === previewPO.supplierId)?.email}</p>
                        <p className="text-sm text-slate-500">{suppliers.find(s => s.id === previewPO.supplierId)?.contact}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-slate-300 tracking-[0.2em] mb-4">ส่งไปที่ / SHIP TO</h4>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">คลังสินค้า Procurement Pro</p>
                        <p className="text-sm text-slate-500">456 ถนนพระราม 4 แขวงลุมพินี</p>
                        <p className="text-sm text-slate-500">เขตปทุมวัน กรุงเทพฯ 10330</p>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full mb-12 border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-800">
                        <th className="py-4 text-left text-xs font-bold uppercase text-slate-800 tracking-widest">รายการ / Description</th>
                        <th className="py-4 text-center text-xs font-bold uppercase text-slate-800 tracking-widest">จำนวน / Qty</th>
                        <th className="py-4 text-right text-xs font-bold uppercase text-slate-800 tracking-widest">ราคาหน่วยละ / Price</th>
                        <th className="py-4 text-right text-xs font-bold uppercase text-slate-800 tracking-widest">รวม / Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requisitions.find(r => r.id === previewPO.prId)?.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-4 text-sm text-slate-600">{item.description}</td>
                          <td className="py-4 text-center text-sm text-slate-600">{item.quantity}</td>
                          <td className="py-4 text-right text-sm text-slate-600">฿{item.unitPrice.toLocaleString()}</td>
                          <td className="py-4 text-right text-sm font-bold text-slate-800">฿{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Footer */}
                  <div className="flex justify-between items-end">
                    <div className="w-1/2 space-y-8">
                      <div className="p-6 bg-slate-50 rounded-2xl">
                        <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">หมายเหตุ / NOTES</h4>
                        <p className="text-xs text-slate-500">กรุณาระบุเลขที่ใบสั่งซื้อในใบส่งสินค้าและใบแจ้งหนี้ทุกครั้ง</p>
                      </div>
                      <div className="flex gap-12 pt-12">
                        <div className="flex-1 text-center">
                          <div className="border-b border-slate-300 h-10 mb-2"></div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">ผู้สั่งซื้อ / AUTHORIZED BY</p>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="border-b border-slate-300 h-10 mb-2"></div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">วันที่ / DATE</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-1/3">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>รวมเงิน / Subtotal</span>
                          <span>฿{previewPO.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>ภาษีมูลค่าเพิ่ม / VAT 7%</span>
                          <span>฿0</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                          <span className="text-xs font-bold uppercase text-slate-800 tracking-widest">ยอดรวมสุทธิ / TOTAL</span>
                          <span className="text-2xl font-serif italic text-accent-pink">฿{previewPO.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #po-document, #po-document * {
            visibility: visible;
          }
          #po-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none;
            box-shadow: none;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
