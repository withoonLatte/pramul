import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, getDocs, limit, orderBy, onSnapshot, where } from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, FileText, Users, ShoppingCart } from 'lucide-react';

export default function Dashboard({ userProfile }: { userProfile: any }) {
  const [stats, setStats] = useState({
    totalSpend: 0,
    activePRs: 0,
    activeSuppliers: 0,
    pendingPOs: 0
  });
  const [spendData, setSpendData] = useState<any[]>([]);
  const [recentPRs, setRecentPRs] = useState<any[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    // Real-time stats
    // Filter PRs based on role for the dashboard
    let prQuery;
    if (userProfile.role === 'admin' || userProfile.role === 'procurement') {
      prQuery = query(collection(db, 'requisitions'), orderBy('createdAt', 'desc'), limit(50));
    } else {
      prQuery = query(collection(db, 'requisitions'), where('requesterUid', '==', userProfile.uid), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsubPRs = onSnapshot(prQuery, (snapshot) => {
      const prs = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({ ...prev, activePRs: prs.filter(p => p.status !== 'po_created' && p.status !== 'rejected').length }));
      setRecentPRs(prs.slice(0, 5));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requisitions');
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setStats(prev => ({ ...prev, activeSuppliers: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
    });

    // Filter Orders based on role
    let orderQuery;
    if (userProfile.role === 'admin' || userProfile.role === 'procurement') {
      orderQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      // Requesters might not have direct orders, but let's say they can't see them for now
      // or we could filter by PRs they own. For simplicity, if not admin/procurement, return empty or limited.
      orderQuery = query(collection(db, 'orders'), where('status', '==', 'none')); // Dummy query that returns nothing
    }

    const unsubOrders = onSnapshot(orderQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => doc.data());
      const total = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      setStats(prev => ({ 
        ...prev, 
        totalSpend: total,
        pendingPOs: orders.filter(o => o.status === 'issued').length
      }));
      
      // Group by month for chart
      const monthly = orders.reduce((acc: any, curr: any) => {
        if (!curr.createdAt) return acc;
        const date = curr.createdAt.toDate ? curr.createdAt.toDate() : new Date(curr.createdAt);
        const month = date.toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + (curr.totalAmount || 0);
        return acc;
      }, {});
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const chartData = months
        .filter(m => monthly[m] !== undefined)
        .map(month => ({
          name: month,
          amount: monthly[month]
        }));
      setSpendData(chartData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubPRs();
      unsubSuppliers();
      unsubOrders();
    };
  }, [userProfile]);

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, bgColor = 'bg-white' }: any) => (
    <div className={`${bgColor} rounded-[2.5rem] p-10 shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:-translate-y-2 duration-500 group relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-500">
          <Icon className="w-8 h-8 text-slate-700" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase ${trend === 'up' ? 'bg-accent-green/10 text-accent-green' : 'bg-red-50 text-red-500'}`}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] mb-3 relative z-10">{title}</p>
      <h4 className="font-serif italic text-4xl text-slate-800 relative z-10">
        {typeof value === 'number' && (title.includes('ยอดใช้จ่าย') || title.includes('Spend')) ? `฿${value.toLocaleString()}` : value}
      </h4>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="ยอดใช้จ่ายทั้งหมด" value={stats.totalSpend} icon={DollarSign} trend="up" trendValue="+12.5%" bgColor="bg-soft-green/40" />
        <StatCard title="ใบขอซื้อที่รอดำเนินการ" value={stats.activePRs} icon={FileText} bgColor="bg-soft-pink/40" />
        <StatCard title="ซัพพลายเออร์" value={stats.activeSuppliers} icon={Users} bgColor="bg-white" />
        <StatCard title="ใบสั่งซื้อที่รอรับสินค้า" value={stats.pendingPOs} icon={ShoppingCart} trend="down" trendValue="-2.1%" bgColor="bg-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Spend Analysis Chart */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-12 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h5 className="font-serif italic text-3xl text-slate-800">วิเคราะห์การใช้จ่าย</h5>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">ภาพรวมค่าใช้จ่ายรายเดือน (บาท)</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-soft-green/30 rounded-full">
                <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ปกติ</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-soft-pink/30 rounded-full">
                <div className="w-2 h-2 bg-accent-pink rounded-full"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">เร่งด่วน</span>
              </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendData.length > 0 ? spendData : [{name: 'ม.ค.', amount: 4000}, {name: 'ก.พ.', amount: 3000}, {name: 'มี.ค.', amount: 2000}]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => `฿${value}`}
                  dx={-15}
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC', radius: 12 }}
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: 'none', 
                    borderRadius: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    padding: '20px'
                  }}
                  itemStyle={{ color: '#1E293B', fontWeight: 700, fontSize: '14px' }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}
                />
                <Bar dataKey="amount" radius={[12, 12, 0, 0]} barSize={48}>
                  {spendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10B981' : '#EC4899'} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-100 flex flex-col">
          <h5 className="font-serif italic text-3xl text-slate-800 mb-10">ใบขอซื้อล่าสุด</h5>
          <div className="space-y-8 flex-1">
            {recentPRs.length > 0 ? recentPRs.map((pr, i) => (
              <div key={i} className="flex items-center gap-5 p-5 rounded-[2rem] hover:bg-slate-50 transition-all cursor-pointer group border border-transparent hover:border-slate-100">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                  pr.status === 'approved' ? 'bg-soft-green text-accent-green' : 
                  pr.status === 'rejected' ? 'bg-red-50 text-red-500' : 
                  'bg-soft-pink text-accent-pink'
                }`}>
                  <FileText className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-accent-pink transition-colors">{pr.title}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{pr.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">฿{pr.totalAmount?.toLocaleString()}</p>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mt-2 inline-block ${
                    pr.status === 'approved' ? 'bg-accent-green/10 text-accent-green' : 
                    pr.status === 'rejected' ? 'bg-red-50 text-red-500' : 
                    'bg-accent-pink/10 text-accent-pink'
                  }`}>
                    {pr.status === 'approved' ? 'อนุมัติ' : pr.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจ'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-xs font-bold uppercase text-slate-300 tracking-[0.3em]">ไม่พบกิจกรรมล่าสุด</p>
              </div>
            )}
          </div>
          <button className="w-full mt-10 py-5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] transition-all border border-slate-100">
            ดูบันทึกทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
