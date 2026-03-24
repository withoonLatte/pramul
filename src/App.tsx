import React, { useState, useEffect } from 'react';
import { auth, db, loginWithEmail, logOut, onAuthStateChanged, FirebaseUser } from './firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShoppingCart, 
  PackageCheck, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  Menu,
  X,
  Plus,
  Lock,
  User as UserInputIcon,
  Zap,
  TrendingDown,
  ShieldCheck,
  Building,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import Dashboard from './components/Dashboard';
import Requisitions from './components/Requisitions';
import Suppliers from './components/Suppliers';
import Workflows from './components/Workflows';
import Orders from './components/Orders';
import Receipts from './components/Receipts';
import Bidding from './components/Bidding';
import StaffManagement from './components/StaffManagement';
import Settings from './components/Settings';

type View = 'dashboard' | 'requisitions' | 'suppliers' | 'workflows' | 'orders' | 'receipts' | 'bidding' | 'staff' | 'settings';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>({ companyName: 'Procurement Pro', companyLogo: '' });
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch company settings
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
          setCompanySettings(settingsDoc.data());
        }

        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          let data = userDoc.data();
          // Special case for admin by email or username mapping
          const isAdminEmail = 
            firebaseUser.email === 'nywithoon@gmail.com' || 
            firebaseUser.email === 'nywithoon@procurement.pro' ||
            firebaseUser.email === 'admin@procurement.pro';
          
          if (isAdminEmail && data.role !== 'admin') {
            data.role = 'admin';
            await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
          }
          if (firebaseUser.email === 'staff@procurement.pro' && data.role !== 'procurement' && data.role !== 'admin') {
            data.role = 'procurement';
            await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'procurement' });
          }
          setUserProfile(data);
        } else {
          // Create default profile for new user
          const email = firebaseUser.email || '';
          const isAdminEmail = 
            email === 'nywithoon@gmail.com' || 
            email === 'nywithoon@procurement.pro' ||
            email === 'admin@procurement.pro';
          const isStaffEmail = email === 'staff@procurement.pro';
          
          const defaultProfile = {
            uid: firebaseUser.uid,
            email: email,
            displayName: email.split('@')[0] || 'User',
            role: isAdminEmail ? 'admin' : (isStaffEmail ? 'procurement' : 'requester'),
            department: 'General'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), defaultProfile);
          setUserProfile(defaultProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      // Map username to a dummy email for Firebase Auth if it's not already an email
      let email = username.toLowerCase().trim();
      if (!email.includes('@')) {
        email = `${email}@procurement.pro`;
      }
      await loginWithEmail(email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setLoginError('ระบบล็อกอินด้วยชื่อผู้ใช้ยังไม่ถูกเปิดใช้งานใน Firebase Console กรุณาติดต่อผู้พัฒนา');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
        setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setLoginError('เกิดข้อผิดพลาด: ' + (error.message || 'กรุณาลองใหม่'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-green border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 tracking-widest text-xs">กำลังเริ่มต้นระบบ...</p>
        </div>
      </div>
    );
  }

  // If user is logged in but profile is still loading, show loading
  if (user && !userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-pink border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 tracking-widest text-xs">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-green to-soft-pink flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[3rem] p-12 shadow-2xl border border-white/40"
        >
          <div className="mb-12 text-center">
            <div className="w-24 h-24 bg-white rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-lg rotate-6 hover:rotate-0 transition-transform duration-500 border border-slate-100">
              <ShoppingCart className="w-12 h-12 text-accent-green" />
            </div>
            <h1 className="font-serif italic text-5xl text-slate-800 mb-4">Procurement Pro</h1>
            <p className="font-sans text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">เข้าสู่ระบบจัดการจัดซื้อ</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">ชื่อผู้ใช้ (Username)</label>
              <div className="relative group">
                <UserInputIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-green transition-colors" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น admin, staff"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-green/30 focus:bg-white rounded-2xl outline-none transition-all font-sans text-slate-700 placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-4">รหัสผ่าน (Password)</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-pink transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-accent-pink/30 focus:bg-white rounded-2xl outline-none transition-all font-sans text-slate-700 placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            {loginError && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-red-500 text-center bg-red-50 py-3 rounded-xl"
              >
                {loginError}
              </motion.p>
            )}
            
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-5 bg-accent-green text-white rounded-2xl font-sans font-bold text-lg hover:bg-accent-green/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              {!isLoggingIn && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
              หากยังไม่มีบัญชี กรุณาติดต่อผู้ดูแลระบบ<br/>
              © 2026 Procurement Pro System
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'แผงควบคุม', icon: LayoutDashboard, roles: ['admin', 'requester', 'approver', 'procurement'] },
    { id: 'requisitions', label: 'ใบขอซื้อ', icon: FileText, roles: ['admin', 'requester', 'approver', 'procurement'] },
    { id: 'bidding', label: 'ประมูล & เปรียบเทียบ', icon: Zap, roles: ['admin', 'procurement'] },
    { id: 'suppliers', label: 'ผู้ขาย', icon: Building, roles: ['admin', 'procurement'] },
    { id: 'orders', label: 'ใบสั่งซื้อ', icon: ShoppingCart, roles: ['admin', 'procurement'] },
    { id: 'receipts', label: 'ใบรับสินค้า', icon: PackageCheck, roles: ['admin', 'procurement'] },
    { id: 'staff', label: 'จัดการพนักงาน', icon: Users, roles: ['admin'] },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: SettingsIcon, roles: ['admin'] },
    { id: 'workflows', label: 'การอนุมัติ', icon: FileText, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    userProfile?.role === 'admin' || 
    userProfile?.email === 'nywithoon@gmail.com' || 
    userProfile?.email === 'nywithoon@procurement.pro' || 
    userProfile?.email === 'admin@procurement.pro' ||
    item.roles.includes(userProfile?.role)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white transition-all duration-500 ease-in-out flex flex-col z-20 shadow-xl border-r border-slate-100`}
      >
        <div className="p-8 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-slate-100">
                {companySettings.companyLogo ? (
                  <img src={companySettings.companyLogo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ShoppingCart className="w-6 h-6 text-accent-green" />
                )}
              </div>
              <h2 className="font-serif italic text-2xl text-slate-800 truncate max-w-[160px]">{companySettings.companyName}</h2>
            </div>
          )}
          {!isSidebarOpen && (
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md mx-auto overflow-hidden border border-slate-100">
              {companySettings.companyLogo ? (
                <img src={companySettings.companyLogo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <ShoppingCart className="w-6 h-6 text-accent-green" />
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${
                currentView === item.id 
                  ? 'bg-soft-green text-accent-green font-semibold shadow-sm' 
                  : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
            >
              <item.icon className={`w-6 h-6 transition-colors ${currentView === item.id ? 'text-accent-green' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {isSidebarOpen && (
                <span className="text-sm tracking-wide">{item.label}</span>
              )}
              {currentView === item.id && isSidebarOpen && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-6 bg-accent-green rounded-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className={`bg-slate-50 rounded-3xl p-4 mb-4 transition-all ${isSidebarOpen ? '' : 'flex justify-center'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-pink text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{userProfile?.displayName}</p>
                  <p className="text-[10px] uppercase text-slate-400 font-medium tracking-wider">{userProfile?.role}</p>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={logOut}
            className={`w-full flex items-center gap-4 p-4 hover:bg-red-50 text-red-500 rounded-2xl transition-all ${isSidebarOpen ? '' : 'justify-center'}`}
          >
            <LogOut className="w-6 h-6" />
            {isSidebarOpen && <span className="text-sm font-medium">ออกจากระบบ</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-24 bg-white/80 backdrop-blur-md px-10 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h3 className="font-serif italic text-3xl text-slate-800">
                {navItems.find(n => n.id === currentView)?.label || currentView}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse"></div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-[0.2em]">ระบบกำลังทำงานปกติ</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {(userProfile?.role === 'admin' || 
              userProfile?.email === 'nywithoon@gmail.com' || 
              userProfile?.email === 'nywithoon@procurement.pro' || 
              userProfile?.email === 'admin@procurement.pro') && (
              <div className="flex items-center gap-2 px-4 py-2 bg-soft-pink rounded-full border border-accent-pink/10">
                <div className="w-2 h-2 bg-accent-pink rounded-full"></div>
                <span className="text-[10px] font-bold text-accent-pink uppercase tracking-wider">โหมดผู้ดูแลระบบ</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              {currentView === 'dashboard' && <Dashboard userProfile={userProfile} />}
              {currentView === 'requisitions' && <Requisitions userProfile={userProfile} />}
              {currentView === 'suppliers' && <Suppliers userProfile={userProfile} />}
              {currentView === 'workflows' && <Workflows userProfile={userProfile} />}
              {currentView === 'orders' && <Orders userProfile={userProfile} />}
              {currentView === 'receipts' && <Receipts userProfile={userProfile} />}
              {currentView === 'bidding' && <Bidding userProfile={userProfile} />}
              {currentView === 'staff' && <StaffManagement userProfile={userProfile} />}
              {currentView === 'settings' && <Settings userProfile={userProfile} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
