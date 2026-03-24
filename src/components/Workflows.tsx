import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Plus, Trash2, Save, ChevronRight, Settings, Users, DollarSign, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WorkflowStep {
  role: string;
  approverUid?: string;
}

interface Workflow {
  id?: string;
  name: string;
  department: string;
  minAmount: number;
  maxAmount: number;
  steps: WorkflowStep[];
}

export default function Workflows({ userProfile }: { userProfile: any }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow>({
    name: '',
    department: 'all',
    minAmount: 0,
    maxAmount: 1000000,
    steps: [{ role: 'approver' }]
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'workflows'), (snapshot) => {
      setWorkflows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workflow)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workflows');
    });
    return unsub;
  }, []);

  const handleAddStep = () => {
    setCurrentWorkflow({
      ...currentWorkflow,
      steps: [...currentWorkflow.steps, { role: 'approver' }]
    });
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = currentWorkflow.steps.filter((_, i) => i !== index);
    setCurrentWorkflow({ ...currentWorkflow, steps: newSteps });
  };

  const handleStepChange = (index: number, field: keyof WorkflowStep, value: string) => {
    const newSteps = [...currentWorkflow.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setCurrentWorkflow({ ...currentWorkflow, steps: newSteps });
  };

  const handleSave = async () => {
    try {
      if (currentWorkflow.id) {
        const { id, ...data } = currentWorkflow;
        await updateDoc(doc(db, 'workflows', id), data);
      } else {
        await addDoc(collection(db, 'workflows'), currentWorkflow);
      }
      setIsEditing(false);
      setCurrentWorkflow({
        name: '',
        department: 'all',
        minAmount: 0,
        maxAmount: 1000000,
        steps: [{ role: 'approver' }]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workflows');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await deleteDoc(doc(db, 'workflows', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'workflows');
      }
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-serif italic text-4xl text-slate-800">ลำดับการอนุมัติ</h4>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-2">ตั้งค่าขั้นตอนการอนุมัติอัตโนมัติสำหรับแต่ละแผนก</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-3 px-8 py-4 bg-accent-pink text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-pink/90 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            สร้างลำดับใหม่
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
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ชื่อลำดับการอนุมัติ</label>
                <input 
                  type="text" 
                  value={currentWorkflow.name}
                  onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, name: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-pink outline-none transition-all font-medium"
                  placeholder="เช่น อนุมัติการจัดซื้อทั่วไป"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ขอบเขตแผนก</label>
                <select 
                  value={currentWorkflow.department}
                  onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, department: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-pink outline-none transition-all font-medium appearance-none"
                >
                  <option value="all">ทุกแผนก</option>
                  <option value="IT">ไอที</option>
                  <option value="HR">ทรัพยากรบุคคล</option>
                  <option value="Marketing">การตลาด</option>
                  <option value="Operations">ปฏิบัติการ</option>
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ยอดเงินขั้นต่ำ (฿)</label>
                  <input 
                    type="number" 
                    value={currentWorkflow.minAmount}
                    onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, minAmount: Number(e.target.value) })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-pink outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">ยอดเงินสูงสุด (฿)</label>
                  <input 
                    type="number" 
                    value={currentWorkflow.maxAmount}
                    onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, maxAmount: Number(e.target.value) })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-accent-pink outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="font-serif italic text-2xl text-slate-800 border-b border-slate-50 pb-4">ขั้นตอนการอนุมัติ</h5>
            <div className="space-y-4">
              {currentWorkflow.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-50 group">
                  <div className="w-10 h-10 bg-accent-pink text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <select 
                      value={step.role}
                      onChange={(e) => handleStepChange(index, 'role', e.target.value)}
                      className="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-accent-pink"
                    >
                      <option value="approver">ผู้จัดการแผนก</option>
                      <option value="procurement">เจ้าหน้าที่จัดซื้อ</option>
                      <option value="admin">ผู้บริหาร</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="UID ผู้ใช้เฉพาะเจาะจง (ไม่บังคับ)"
                      value={step.approverUid || ''}
                      onChange={(e) => handleStepChange(index, 'approverUid', e.target.value)}
                      className="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-accent-pink"
                    />
                  </div>
                  <button 
                    onClick={() => handleRemoveStep(index)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddStep}
              className="w-full py-6 border-2 border-dashed border-slate-100 rounded-3xl text-xs font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-accent-pink hover:border-accent-pink/30 hover:bg-soft-pink transition-all"
            >
              + เพิ่มขั้นตอนการอนุมัติ
            </button>
          </div>

          <div className="mt-12 flex justify-end gap-4">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-8 py-4 bg-white text-slate-500 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
            >
              ยกเลิก
            </button>
            <button 
              onClick={handleSave}
              className="px-8 py-4 bg-accent-pink text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-accent-pink/90 transition-all shadow-lg flex items-center gap-3"
            >
              <Save className="w-5 h-5" />
              บันทึกการตั้งค่า
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {workflows.map((workflow) => (
            <div 
              key={workflow.id}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h5 className="font-serif italic text-2xl text-slate-800 mb-2">{workflow.name}</h5>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-accent-pink" />
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{workflow.department}</span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <button 
                    onClick={() => { setCurrentWorkflow(workflow); setIsEditing(true); }}
                    className="p-3 bg-slate-50 hover:bg-soft-pink text-slate-400 hover:text-accent-pink rounded-xl transition-all"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(workflow.id!)}
                    className="p-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-8 p-6 bg-slate-50/50 rounded-3xl">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">ช่วงงบประมาณ</p>
                  <p className="text-sm font-bold text-slate-700">฿{workflow.minAmount.toLocaleString()} - ฿{workflow.maxAmount.toLocaleString()}</p>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">ขั้นตอน</p>
                  <p className="text-sm font-bold text-slate-700">{workflow.steps.length} ผู้อนุมัติ</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {workflow.steps.map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-full shadow-sm">
                      <div className="w-5 h-5 bg-accent-pink text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {step.role === 'approver' ? 'ผู้จัดการแผนก' : step.role === 'procurement' ? 'เจ้าหน้าที่จัดซื้อ' : 'ผู้บริหาร'}
                      </span>
                    </div>
                    {i < workflow.steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-200" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="md:col-span-2 py-32 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
              <Settings className="w-16 h-16 text-slate-200 mb-6" />
              <p className="text-xs font-bold uppercase text-slate-300 tracking-[0.3em]">ยังไม่มีการตั้งค่าลำดับการอนุมัติ</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
