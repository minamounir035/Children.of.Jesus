import React, { useState, useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Map as MapIcon, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Plus, 
  Search,
  Phone,
  Mail,
  Facebook,
  MessageCircle,
  Cake,
  Bell,
  Download,
  Filter,
  ArrowLeft,
  User as UserIcon,
  MapPin,
  Camera,
  Menu,
  X,
  Mic,
  Paperclip,
  Maximize2,
  Minimize2,
  FileArchive,
  FileSpreadsheet,
  FileText as FileTextIcon,
  FileJson,
  FileCode,
  FileBox,
  FileVideo,
  FileAudio,
  File as FileIcon,
  Play,
  Pause,
  Square,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isSameDay, parseISO, getMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { MainService, SubServices, Makhdom, Attendance, User, ChatMessage } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CopticCross = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" className={className}>
    <path d="M45 10h10v80H45zM10 45h80v10H10z" />
    <path d="M25 25h2v10h-2zM21 29h10v2H21z" />
    <path d="M73 25h2v10h-2zM69 29h10v2H69z" />
    <path d="M25 65h2v10h-2zM21 69h10v2H21z" />
    <path d="M73 65h2v10h-2zM69 69h10v2H69z" />
  </svg>
);

// --- Components ---

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '', password: '', role: 'servant' as User['role'],
    full_name: '', phone: '', email: '', address: '', confession_father: '',
    study_type: '', whatsapp: '', facebook: '', gmail: '', photo: '',
    assigned_main_service: '' as MainService | '', 
    assigned_sub_services: [] as string[],
    is_servant_elsewhere: false,
    other_service_details: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Sync email with gmail as requested
    if (formData.gmail !== formData.email) {
      setFormData(prev => ({ ...prev, email: prev.gmail }));
    }
  }, [formData.gmail]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      const body = isRegistering ? formData : { username: formData.username, password: formData.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const user = await res.json();
        if (isRegistering) {
          setSuccess('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
          setIsRegistering(false);
        } else {
          onLogin(user);
        }
      } else {
        const data = await res.json();
        setError(data.error || 'حدث خطأ ما');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orthodox-parchment p-4 font-sans overflow-y-auto py-12" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl border-2 border-orthodox-gold/20 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-orthodox-red" />
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-orthodox-red rounded-2xl flex items-center justify-center text-orthodox-gold shadow-lg shadow-orthodox-red/20">
            <CopticCross size={48} />
          </div>
        </div>
        <h1 className="text-3xl font-serif font-bold text-center mb-2 text-orthodox-red">نظام إدارة المخدومين</h1>
        <p className="text-stone-500 text-center mb-8 font-medium">{isRegistering ? 'إنشاء حساب جديد' : 'سجل الدخول للمتابعة'}</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="اسم المستخدم" value={formData.username} onChange={v => setFormData({...formData, username: v})} required />
            <Input label="كلمة المرور" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} required />
            
            {isRegistering && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-500 mb-1">نوع الحساب</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as User['role'], assigned_main_service: '', assigned_sub_services: []})}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orthodox-red outline-none transition-all bg-white"
                  >
                    <option value="servant">خادم</option>
                    <option value="service_coordinator">أمين خدمة</option>
                    <option value="general_coordinator">أمين عام خدمات</option>
                    <option value="priest">كاهن</option>
                  </select>
                </div>

                <Input label="الاسم بالكامل" value={formData.full_name} onChange={v => setFormData({...formData, full_name: v})} required />
                <Input label="رقم التليفون" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                <Input label="جيميل (سيكون هو البريد الإلكتروني)" value={formData.gmail} onChange={v => setFormData({...formData, gmail: v})} />
                <Input label="العنوان" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                <Input label="أب الاعتراف" value={formData.confession_father} onChange={v => setFormData({...formData, confession_father: v})} />
                <Input label="نوع الدراسة / العمل" value={formData.study_type} onChange={v => setFormData({...formData, study_type: v})} />
                <Input label="واتساب" value={formData.whatsapp} onChange={v => setFormData({...formData, whatsapp: v})} />
                <Input label="فيسبوك" value={formData.facebook} onChange={v => setFormData({...formData, facebook: v})} />

                <div className="md:col-span-2 flex flex-col items-center py-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-stone-100 border-2 border-orthodox-gold/20 flex items-center justify-center overflow-hidden shadow-inner">
                      {formData.photo ? (
                        <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={32} className="text-stone-300" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-orthodox-red text-white rounded-lg flex items-center justify-center shadow-lg cursor-pointer hover:bg-orthodox-red/90 transition-all">
                      <Camera size={16} />
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                  <p className="text-xs text-stone-400 mt-2">الصورة الشخصية</p>
                </div>

                {formData.role === 'service_coordinator' && (
                  <div className="md:col-span-2 space-y-4 p-4 bg-orthodox-parchment rounded-2xl border border-orthodox-gold/20">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-1">الخدمة الرئيسية التي ترأسها</label>
                      <select 
                        value={formData.assigned_main_service}
                        onChange={(e) => setFormData({...formData, assigned_main_service: e.target.value as MainService})}
                        className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orthodox-red outline-none transition-all bg-white"
                        required
                      >
                        <option value="">اختر الخدمة</option>
                        {Object.values(MainService).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="is_servant_elsewhere"
                        checked={formData.is_servant_elsewhere}
                        onChange={(e) => setFormData({...formData, is_servant_elsewhere: e.target.checked})}
                        className="w-5 h-5 text-orthodox-red rounded"
                      />
                      <label htmlFor="is_servant_elsewhere" className="text-sm font-bold text-stone-700 cursor-pointer">هل أنت خادم في خدمة أخرى؟</label>
                    </div>

                    {formData.is_servant_elsewhere && (
                      <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-500 mb-1">تفاصيل الخدمة الأخرى (اختياري)</label>
                          <input 
                            type="text"
                            value={formData.other_service_details}
                            onChange={(e) => setFormData({...formData, other_service_details: e.target.value})}
                            placeholder="مثال: خادم في أسرة الجامعيين"
                            className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orthodox-red outline-none transition-all bg-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-500 mb-1">اختر الخدمات الفرعية التي تخدم بها من القائمة</label>
                          <div className="grid grid-cols-1 gap-4 mt-2">
                            {Object.values(MainService).map(main => (
                            <div key={main} className="space-y-2">
                              <p className="text-[10px] font-bold text-orthodox-red uppercase">{main}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {SubServices[main].map(sub => (
                                  <label key={sub} className="flex items-center gap-2 p-2 rounded-lg border border-stone-100 bg-white hover:bg-orthodox-parchment cursor-pointer transition-all">
                                    <input 
                                      type="checkbox" 
                                      checked={formData.assigned_sub_services.includes(sub)}
                                      onChange={(e) => {
                                        const next = e.target.checked 
                                          ? [...formData.assigned_sub_services, sub]
                                          : formData.assigned_sub_services.filter(x => x !== sub);
                                        setFormData({...formData, assigned_sub_services: next});
                                      }}
                                      className="w-4 h-4 text-orthodox-red rounded"
                                    />
                                    <span className="text-xs">{sub}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

                {formData.role === 'servant' && (
                  <div className="md:col-span-2 space-y-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    <label className="block text-xs font-bold text-stone-600 mb-1">اختر الخدمات التي تخدم بها (يمكنك اختيار أكثر من واحدة من مراحل مختلفة)</label>
                    <div className="grid grid-cols-1 gap-6 mt-2">
                      {Object.values(MainService).map(main => (
                        <div key={main} className="space-y-2">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200 pb-1">{main}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {SubServices[main].map(sub => (
                                  <label key={sub} className="flex items-center gap-2 p-2 rounded-lg border border-stone-100 bg-white hover:bg-orthodox-parchment cursor-pointer transition-all">
                                    <input 
                                      type="checkbox" 
                                      checked={formData.assigned_sub_services.includes(sub)}
                                      onChange={(e) => {
                                        const next = e.target.checked 
                                          ? [...formData.assigned_sub_services, sub]
                                          : formData.assigned_sub_services.filter(x => x !== sub);
                                        setFormData({...formData, assigned_sub_services: next});
                                      }}
                                      className="w-4 h-4 text-orthodox-red rounded"
                                    />
                                    <span className="text-xs">{sub}</span>
                                  </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-orthodox-red text-sm text-center font-bold">{success}</p>}
          
          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full bg-orthodox-red text-white py-3 rounded-xl font-bold shadow-lg shadow-orthodox-red/20 hover:bg-orthodox-red/90 transition-all mt-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              isRegistering ? 'إنشاء حساب' : 'دخول'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setSuccess('');
            }}
            className="text-orthodox-red text-sm font-bold hover:underline"
          >
            {isRegistering ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'service' | 'subservice' | 'member' | 'reports' | 'chat' | 'map' | 'profile' | 'users'>('dashboard');
  const [selectedMain, setSelectedMain] = useState<MainService | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Makhdom | null>(null);
  const [makhdomeen, setMakhdomeen] = useState<Makhdom[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatRoom, setChatRoom] = useState<{ type: 'global' | 'main' | 'sub', id?: string }>({ type: 'global' });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [birthMonthFilter, setBirthMonthFilter] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (user) {
      const s = io();
      setSocket(s);
      fetchData();

      s.on('makhdom_added', (m) => setMakhdomeen(prev => [...prev, m]));
      s.on('makhdom_updated', (m) => {
        setMakhdomeen(prev => prev.map(item => item.id === m.id ? m : item));
        setSelectedMember(prev => prev?.id === m.id ? m : prev);
      });
      s.on('makhdom_deleted', (id) => {
        setMakhdomeen(prev => prev.filter(m => m.id !== Number(id)));
        if (selectedMember?.id === Number(id)) {
          setSelectedMember(null);
          setView('subservice');
        }
      });
      s.on('attendance_updated', (a) => setAttendance(prev => {
        const existing = prev.findIndex(item => item.makhdom_id === a.makhdom_id && item.date === a.date && item.type === a.type);
        if (existing !== -1) {
          const next = [...prev];
          next[existing] = { ...next[existing], status: a.status };
          return next;
        }
        return [...prev, a];
      }));
      s.on('new_message', (m) => {
        if (m.room_type === chatRoom.type && (m.room_id || undefined) === (chatRoom.id || undefined)) {
          setMessages(prev => [...prev, m]);
        }
      });
      s.on('notification', (n) => {
        if (n.type === 'birthday_today') {
          alert(`عيد ميلاد اليوم: ${n.makhdom.name}`);
        } else if (n.type === 'birthday_next_week') {
          alert(`عيد ميلاد الأسبوع القادم: ${n.makhdom.name}`);
        }
      });

      return () => { s.disconnect(); };
    }
  }, [user, chatRoom]);

  const fetchData = async () => {
    const [mRes, aRes, uRes] = await Promise.all([
      fetch('/api/makhdomeen'),
      fetch('/api/attendance'),
      fetch('/api/users')
    ]);
    setMakhdomeen(await mRes.json());
    setAttendance(await aRes.json());
    setAllUsers(await uRes.json());
  };

  const fetchMessages = async (room: { type: 'global' | 'main' | 'sub', id?: string }) => {
    const url = `/api/messages?room_type=${room.type}${room.id ? `&room_id=${room.id}` : ''}`;
    const res = await fetch(url);
    setMessages(await res.json());
  };

  useEffect(() => {
    if (user && view === 'chat') {
      fetchMessages(chatRoom);
    }
  }, [user, view, chatRoom]);

  const filteredMainServices = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'priest' || user.role === 'general_coordinator') {
      return Object.values(MainService);
    }
    
    const services = new Set<MainService>();
    
    // Primary service for coordinators
    if (user.assigned_main_service) {
      services.add(user.assigned_main_service);
    }
    
    // Services derived from assigned sub-services
    if (user.assigned_sub_services) {
      user.assigned_sub_services.forEach(sub => {
        for (const [main, subs] of Object.entries(SubServices)) {
          if (subs.includes(sub)) {
            services.add(main as MainService);
          }
        }
      });
    }
    
    return Array.from(services);
  }, [user]);

  const filteredSubServices = (main: MainService) => {
    if (!user) return [];
    
    // Admins/Priests/General Coordinators see everything in the main service
    if (user.role === 'admin' || user.role === 'priest' || user.role === 'general_coordinator') {
      return SubServices[main];
    }
    
    // Service Coordinator sees everything in their primary main service
    if (user.role === 'service_coordinator' && user.assigned_main_service === main) {
      return SubServices[main];
    }
    
    // Otherwise, only see assigned sub-services that belong to this main service
    return (user.assigned_sub_services || []).filter(sub => SubServices[main].includes(sub));
  };

  const counts = useMemo(() => {
    const res: Record<string, number> = {};
    Object.values(MainService).forEach(m => {
      res[m] = makhdomeen.filter(x => x.main_service === m).length;
    });
    return res;
  }, [makhdomeen]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const getAttendanceStats = (main?: MainService, sub?: string) => {
    let filtered = makhdomeen;
    if (main) filtered = filtered.filter(m => m.main_service === main);
    if (sub) filtered = filtered.filter(m => m.sub_service === sub);

    const ids = filtered.map(m => m.id);
    const presentCount = attendance.filter(a => a.date === today && a.type === 'service' && a.status === 'present' && ids.includes(a.makhdom_id)).length;
    const absent = ids.length - presentCount;
    return { present: presentCount, absent, total: ids.length };
  };

  const handleAttendance = async (makhdom_id: number, type: 'mass' | 'service', status: 'present' | 'absent') => {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makhdom_id, date: today, type, status })
    });
  };

  const sendAbsenceMessage = (makhdom: Makhdom) => {
    const msg = `نود إبلاغكم بغياب المخدوم ${makhdom.name} عن الخدمة اليوم. نرجو الاطمئنان عليه.`;
    const url = `https://wa.me/${makhdom.father_phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const recordLocation = async (makhdomId: number) => {
    if (!navigator.geolocation) {
      alert("متصفحك لا يدعم تحديد الموقع");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const res = await fetch(`/api/makhdomeen/${makhdomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_lat: latitude, location_lng: longitude })
      });
      if (res.ok) alert("تم تسجيل الموقع بنجاح");
    }, (error) => alert("فشل في الحصول على الموقع: " + error.message));
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const deleteMakhdom = async (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المخدوم؟ سيتم حذف كافة بياناته وحضوره.")) {
      const res = await fetch(`/api/makhdomeen/${id}`, { method: 'DELETE' });
      if (res.ok) setView('subservice');
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="h-screen bg-stone-50 font-sans text-stone-900 flex flex-col md:flex-row relative overflow-hidden" dir="rtl">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orthodox-red rounded-lg flex items-center justify-center text-orthodox-gold shadow-lg shadow-orthodox-red/20">
            <CopticCross size={16} />
          </div>
          <span className="font-serif font-bold text-base tracking-tight text-orthodox-red">خدمة الكنيسة</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-stone-100 rounded-xl transition-all text-stone-600"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: (isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) ? 0 : '100%' 
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed md:static top-0 right-0 h-screen w-72 bg-white border-l border-stone-200 p-6 flex flex-col shadow-2xl md:shadow-none z-50 transition-transform md:translate-x-0",
          "border-l-orthodox-gold/20"
        )}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orthodox-red rounded-xl flex items-center justify-center text-orthodox-gold shadow-lg shadow-orthodox-red/20">
              <CopticCross size={24} />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-orthodox-red">خدمة الكنيسة</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-stone-100 rounded-xl transition-all text-stone-400"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} icon={<Users size={20}/>} label="الرئيسية" />
          <NavItem active={view === 'reports'} onClick={() => { setView('reports'); setIsSidebarOpen(false); }} icon={<FileText size={20}/>} label="التقارير" />
          <NavItem active={view === 'chat'} onClick={() => { setView('chat'); setIsSidebarOpen(false); }} icon={<MessageSquare size={20}/>} label="الدردشة" />
          <NavItem active={view === 'map'} onClick={() => { setView('map'); setIsSidebarOpen(false); }} icon={<MapIcon size={20}/>} label="الخريطة" />
          {(user.role === 'admin' || user.role === 'priest') && (
            <NavItem active={view === 'users'} onClick={() => { setView('users'); setIsSidebarOpen(false); }} icon={<UserIcon size={20}/>} label="الخدام" />
          )}
        </nav>

        <div className="pt-6 border-t border-stone-100 mt-auto">
          <button 
            onClick={() => { setView('profile'); setIsSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-2 py-3 hover:bg-stone-50 rounded-xl transition-all mb-2"
          >
            <div className="w-10 h-10 bg-stone-200 rounded-xl flex items-center justify-center text-stone-600 overflow-hidden">
              {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <UserIcon size={20} />}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold truncate max-w-[120px]">{user.full_name || user.username}</span>
              <span className="text-[10px] text-stone-500">{user.role}</span>
            </div>
          </button>
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-3 px-4 py-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-hidden",
        view === 'chat' ? "p-0 h-full" : "p-4 md:p-8 overflow-y-auto"
      )}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-5xl mx-auto"
            >
              <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-stone-800">الخدمات الرئيسية</h1>
                  <p className="text-stone-500">اختر خدمة لمتابعة المخدومين والحضور</p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMainServices.map((service) => (
                  <ServiceCard 
                    key={service}
                    title={service}
                    count={counts[service] || 0}
                    onClick={() => {
                      setSelectedMain(service);
                      setView('service');
                    }}
                  />
                ))}
              </div>

              {/* Birthdays Section */}
              <div className="mt-12">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Cake className="text-pink-500" />
                  أعياد ميلاد قادمة
                </h2>
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                  <BirthdayList makhdomeen={makhdomeen} />
                </div>
              </div>
            </motion.div>
          )}

          {view === 'service' && selectedMain && (
            <motion.div 
              key="service"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-5xl mx-auto"
            >
              <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors">
                <ArrowLeft size={20} />
                العودة للرئيسية
              </button>
              
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-stone-800">{selectedMain}</h1>
                <div className="flex gap-4 mt-4">
                  <StatCard label="حضور اليوم" value={getAttendanceStats(selectedMain).present} color="emerald" />
                  <StatCard label="غياب اليوم" value={getAttendanceStats(selectedMain).absent} color="red" />
                  <StatCard label="إجمالي المخدومين" value={getAttendanceStats(selectedMain).total} color="stone" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSubServices(selectedMain).map(sub => (
                  <button 
                    key={sub}
                    onClick={() => {
                      setSelectedSub(sub);
                      setView('subservice');
                    }}
                    className="bg-white p-6 rounded-2xl border border-stone-200 flex items-center justify-between hover:border-orthodox-gold hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-lg">{sub}</span>
                      <span className="text-stone-500 text-sm">{makhdomeen.filter(m => m.main_service === selectedMain && m.sub_service === sub).length} مخدوم</span>
                    </div>
                    <ChevronRight className="text-stone-300 group-hover:text-orthodox-red transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'subservice' && selectedSub && (
            <motion.div 
              key="subservice"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-5xl mx-auto"
            >
              <button onClick={() => setView('service')} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors">
                <ArrowLeft size={20} />
                العودة لـ {selectedMain}
              </button>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-stone-800">{selectedSub}</h1>
                  <p className="text-stone-500">قائمة المخدومين وتسجيل الحضور</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-orthodox-red text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orthodox-red/90 transition-all shadow-lg shadow-orthodox-red/20"
                  >
                    <Plus size={18} />
                    إضافة مخدوم
                  </button>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="بحث بالاسم..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 pl-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-orthodox-red transition-all"
                    />
                  </div>
                  <select 
                    className="px-4 py-2 rounded-xl border border-stone-200 outline-none bg-white"
                    onChange={(e) => setBirthMonthFilter(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">كل الشهور</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i}>{format(new Date(2000, i, 1), 'MMMM', { locale: undefined })}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {makhdomeen
                  .filter(m => m.main_service === selectedMain && m.sub_service === selectedSub)
                  .filter(m => m.name.includes(searchQuery))
                  .filter(m => birthMonthFilter === null || getMonth(parseISO(m.dob)) === birthMonthFilter)
                  .map(m => (
                    <MemberRow 
                      key={m.id} 
                      makhdom={m} 
                      attendance={attendance.filter(a => a.makhdom_id === m.id && a.date === today)}
                      onAttendance={(type, status) => handleAttendance(m.id, type, status)}
                      onNotify={() => sendAbsenceMessage(m)}
                      onClick={() => {
                        setSelectedMember(m);
                        setView('member');
                      }}
                    />
                  ))}
              </div>
            </motion.div>
          )}

          {view === 'member' && selectedMember && (
            <motion.div 
              key="member"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <button onClick={() => setView('subservice')} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors">
                <ArrowLeft size={20} />
                العودة للقائمة
              </button>

              <div className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm">
                <div className="h-32 bg-orthodox-red relative">
                  <div 
                    onClick={() => selectedMember.photo && setPreviewImage(selectedMember.photo)}
                    className={cn(
                      "absolute -bottom-12 right-8 w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden",
                      selectedMember.photo ? "cursor-zoom-in" : ""
                    )}
                  >
                    {selectedMember.photo ? (
                      <img src={selectedMember.photo} alt={selectedMember.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">
                        <Camera size={32} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-16 pb-8 px-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-stone-800">{selectedMember.name}</h1>
                      <p className="text-stone-500">{selectedMember.main_service} - {selectedMember.sub_service}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedMember.location_lat && selectedMember.location_lng && (
                        <ContactButton icon={<MapPin size={18}/>} color="stone" onClick={() => openGoogleMaps(selectedMember.location_lat, selectedMember.location_lng)} />
                      )}
                      <ContactButton icon={<MessageCircle size={18}/>} color="emerald" onClick={() => window.open(`https://wa.me/${selectedMember.whatsapp}`, '_blank')} />
                      <ContactButton icon={<Facebook size={18}/>} color="blue" onClick={() => window.open(selectedMember.facebook, '_blank')} />
                      <ContactButton icon={<Mail size={18}/>} color="red" onClick={() => window.open(`mailto:${selectedMember.gmail}`, '_blank')} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-8">
                    {user.role === 'admin' && (
                      <>
                        <button 
                          onClick={() => setIsAddModalOpen(true)}
                          className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold hover:bg-stone-200 transition-all flex items-center gap-2"
                        >
                          تعديل البيانات
                        </button>
                        <button 
                          onClick={() => recordLocation(selectedMember.id)}
                          className="px-4 py-2 bg-orthodox-parchment text-orthodox-red rounded-xl text-sm font-bold hover:bg-orthodox-red hover:text-white transition-all flex items-center gap-2"
                        >
                          <MapPin size={16} />
                          تسجيل الموقع الحالي
                        </button>
                        <button 
                          onClick={() => deleteMakhdom(selectedMember.id)}
                          className="px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                        >
                          حذف المخدوم
                        </button>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">البيانات الشخصية</h3>
                      <InfoRow label="تاريخ الميلاد" value={selectedMember.dob} icon={<Cake size={16}/>} />
                      <InfoRow label="رقم التليفون" value={selectedMember.phone} icon={<Phone size={16}/>} />
                      <InfoRow label="التليفون الأرضي" value={selectedMember.landline} icon={<Phone size={16}/>} />
                      <InfoRow label="أب الاعتراف" value={selectedMember.confession_father} icon={<UserIcon size={16}/>} />
                      <InfoRow label="العنوان" value={selectedMember.address} icon={<MapPin size={16}/>} />
                    </section>

                    <section>
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">بيانات الوالدين</h3>
                      <div className="mb-4">
                        <p className="text-sm font-bold text-orthodox-red mb-2">الأب</p>
                        <InfoRow label="الوظيفة" value={selectedMember.father_job} />
                        <InfoRow label="التليفون" value={selectedMember.father_phone} />
                        <InfoRow label="أب الاعتراف" value={selectedMember.father_confession} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-orthodox-red mb-2">الأم</p>
                        <InfoRow label="الاسم" value={selectedMember.mother_name} />
                        <InfoRow label="الوظيفة" value={selectedMember.mother_job} />
                        <InfoRow label="التليفون" value={selectedMember.mother_phone} />
                        <InfoRow label="أب الاعتراف" value={selectedMember.mother_confession} />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto"
            >
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-stone-800">التقارير والإحصائيات</h1>
                  <p className="text-stone-500">تحليل الحضور والغياب الشهري</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportToExcel(makhdomeen, attendance)} className="bg-orthodox-red text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orthodox-red/90 transition-all shadow-lg shadow-orthodox-red/20">
                    <Download size={18} />
                    Excel
                  </button>
                  <button onClick={() => exportToPDF(makhdomeen, attendance)} className="bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-700 transition-all">
                    <Download size={18} />
                    PDF
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <ReportCard title="تقرير القداس" type="mass" makhdomeen={makhdomeen} attendance={attendance} />
                <ReportCard title="تقرير الخدمة" type="service" makhdomeen={makhdomeen} attendance={attendance} />
              </div>
            </motion.div>
          )}

          {view === 'chat' && (
            <ChatView 
              user={user} 
              messages={messages} 
              socket={socket} 
              room={chatRoom} 
              setRoom={setChatRoom} 
            />
          )}

          {view === 'users' && (
            <div className="space-y-6">
              {user.role === 'admin' && (
                <div className="flex justify-end max-w-5xl mx-auto">
                  <button 
                    onClick={() => {
                      setSelectedUser({ id: '', username: '', role: 'servant', full_name: '', assigned_sub_services: [] } as any);
                      setIsUserModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-orthodox-red text-white px-6 py-3 rounded-2xl font-bold hover:bg-orthodox-red/90 shadow-lg shadow-orthodox-red/20"
                  >
                    <Plus size={20} />
                    إضافة خادم جديد
                  </button>
                </div>
              )}
              <UsersView 
                user={user} 
                users={allUsers} 
                onEditUser={(u) => {
                  setSelectedUser(u);
                  setIsUserModalOpen(true);
                }}
              />
            </div>
          )}

          {view === 'profile' && (
            <ProfileView 
              user={user} 
              onUpdate={async (data) => {
                const res = await fetch(`/api/users/${user.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) {
                  const updated = await res.json();
                  setUser(updated);
                  alert("تم تحديث الملف الشخصي بنجاح");
                }
              }}
            />
          )}

          {view === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto h-[calc(100vh-120px)] rounded-3xl overflow-hidden border border-stone-200 shadow-sm"
            >
              <InteractiveMap makhdomeen={makhdomeen} />
            </motion.div>
          )}
        </AnimatePresence>

        <MakhdomModal 
          isOpen={isAddModalOpen} 
          initialData={selectedMember && view === 'member' ? selectedMember : undefined}
          onClose={() => setIsAddModalOpen(false)} 
          onSubmit={async (data) => {
            const isEdit = !!data.id;
            const endpoint = isEdit ? `/api/makhdomeen/${data.id}` : '/api/makhdomeen';
            const method = isEdit ? 'PUT' : 'POST';
            
            // If we're in a specific service view and adding new, use those defaults if not provided
            const payload = {
              ...data,
              main_service: data.main_service || selectedMain,
              sub_service: data.sub_service || selectedSub
            };

            const res = await fetch(endpoint, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (res.ok) {
              setIsAddModalOpen(false);
              alert("تم حفظ التعديلات بنجاح");
              fetchData();
            } else {
              alert("حدث خطأ أثناء حفظ البيانات");
            }
          }}
        />

        <UserModal 
          isOpen={isUserModalOpen}
          user={selectedUser}
          currentUser={user}
          onClose={() => setIsUserModalOpen(false)}
          onSubmit={async (data) => {
            const isNew = !data.id;
            const url = isNew ? '/api/users' : `/api/users/${data.id}`;
            const method = isNew ? 'POST' : 'PUT';
            
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (res.ok) {
              setIsUserModalOpen(false);
              alert(isNew ? "تم إضافة الخادم بنجاح" : "تم تحديث بيانات الخادم بنجاح");
              fetchData();
            } else {
              const err = await res.json();
              alert(err.error || "حدث خطأ أثناء الحفظ");
            }
          }}
        />

        <ImageLightbox 
          image={previewImage} 
          onClose={() => setPreviewImage(null)} 
        />
      </main>
    </div>
  );
}

// --- Helper Components ---

const NavItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
      active 
        ? "bg-orthodox-red text-white shadow-lg shadow-orthodox-red/20" 
        : "text-stone-500 hover:bg-stone-50 hover:text-orthodox-red"
    )}
  >
    <div className={cn("transition-colors", active ? "text-orthodox-gold" : "text-stone-400")}>
      {icon}
    </div>
    <span>{label}</span>
  </button>
);

const ServiceCard: React.FC<{ title: string, count: number, onClick: () => void }> = ({ title, count, onClick }) => (
  <motion.button 
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl hover:border-orthodox-gold transition-all text-right group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-orthodox-red/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
    <div className="relative z-10">
      <div className="w-14 h-14 bg-orthodox-parchment text-orthodox-red rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:bg-orthodox-red group-hover:text-white transition-all">
        <CopticCross size={28} />
      </div>
      <h3 className="text-xl font-bold text-stone-800 mb-1 group-hover:text-orthodox-red transition-colors">{title}</h3>
      <p className="text-stone-500 font-medium">{count} مخدوم مسجل</p>
    </div>
  </motion.button>
);

const StatCard = ({ label, value, color }: { label: string, value: number, color: 'emerald' | 'red' | 'stone' }) => {
  const colors = {
    emerald: "bg-orthodox-parchment text-orthodox-red border-orthodox-gold/30",
    red: "bg-red-50 text-red-700 border-red-100",
    stone: "bg-stone-50 text-stone-700 border-stone-100"
  };
  return (
    <div className={cn("flex-1 p-4 rounded-2xl text-center border", colors[color])}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
};

const MemberRow: React.FC<{ makhdom: Makhdom, attendance: Attendance[], onAttendance: (type: 'mass' | 'service', s: 'present' | 'absent') => void, onNotify: () => void, onClick: () => void }> = ({ makhdom, attendance, onAttendance, onNotify, onClick }) => {
  const massAtt = attendance.find(a => a.type === 'mass');
  const serviceAtt = attendance.find(a => a.type === 'service');

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-md transition-all gap-4">
      <div className="flex items-center gap-4 cursor-pointer flex-1 w-full" onClick={onClick}>
        <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden flex items-center justify-center text-stone-400 shrink-0">
          {makhdom.photo ? <img src={makhdom.photo} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
        </div>
        <div>
          <h4 className="font-bold text-stone-800">{makhdom.name}</h4>
          <p className="text-xs text-stone-500">
            <PhoneLink value={makhdom.phone} />
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-stone-400">القداس</span>
          <button 
            onClick={() => onAttendance('mass', massAtt?.status === 'present' ? 'absent' : 'present')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              massAtt?.status === 'present' ? "bg-orthodox-red text-white" : "bg-stone-50 text-stone-400 hover:bg-orthodox-parchment hover:text-orthodox-red"
            )}
          >
            {massAtt?.status === 'present' ? 'حاضر' : 'تسجيل'}
          </button>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-stone-400">الخدمة</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onAttendance('service', serviceAtt?.status === 'present' ? 'absent' : 'present')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                serviceAtt?.status === 'present' ? "bg-orthodox-red text-white" : "bg-stone-50 text-stone-400 hover:bg-orthodox-parchment hover:text-orthodox-red"
              )}
            >
              {serviceAtt?.status === 'present' ? 'حاضر' : 'تسجيل'}
            </button>
            {serviceAtt?.status === 'absent' && (
              <button onClick={onNotify} className="p-2 bg-orthodox-parchment text-orthodox-red rounded-xl hover:bg-orthodox-red hover:text-white transition-all">
                <Bell size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const isPhoneNumber = (label: string) => {
  const phoneLabels = ['رقم التليفون', 'تليفون', 'التليفون', 'موبايل', 'رقم الموبايل', 'تليفون الأب', 'تليفون الأم', 'رقم تليفون'];
  return phoneLabels.includes(label);
};

const PhoneLink = ({ value, className }: { value?: string, className?: string }) => {
  if (!value) return <span className={className}>غير مسجل</span>;
  return (
    <a href={`tel:${value}`} className={cn("text-orthodox-red font-bold hover:underline", className)}>
      {value}
    </a>
  );
};

const InfoRow = ({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
    <div className="flex items-center gap-2 text-stone-500 text-sm">
      {icon}
      <span>{label}</span>
    </div>
    <span className="font-medium text-stone-800">
      {isPhoneNumber(label) ? <PhoneLink value={value} /> : (value || 'غير مسجل')}
    </span>
  </div>
);

const ContactButton = ({ icon, color, onClick }: { icon: React.ReactNode, color: 'emerald' | 'blue' | 'red' | 'stone', onClick: () => void }) => {
  const colors = {
    emerald: "bg-orthodox-parchment text-orthodox-red hover:bg-orthodox-red hover:text-white",
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white",
    red: "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white",
    stone: "bg-stone-100 text-stone-600 hover:bg-stone-600 hover:text-white"
  };
  return (
    <button onClick={onClick} className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", colors[color])}>
      {icon}
    </button>
  );
};

const AudioPlayer = ({ src, isMe }: { src: string, isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl p-3 min-w-[240px]",
      isMe ? "bg-white/10" : "bg-stone-100"
    )}>
      <button 
        onClick={togglePlay}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-95",
          isMe ? "bg-white text-orthodox-red" : "bg-orthodox-red text-white"
        )}
      >
        {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className={cn(
          "h-1.5 rounded-full overflow-hidden",
          isMe ? "bg-white/20" : "bg-stone-200"
        )}>
          <div 
            className={cn(
              "h-full transition-all duration-100",
              isMe ? "bg-white" : "bg-orthodox-red"
            )} 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={cn(
          "text-[10px] font-mono",
          isMe ? "text-white/60" : "text-stone-400"
        )}>رسالة صوتية</span>
      </div>
      <audio 
        ref={audioRef} 
        src={src} 
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        className="hidden" 
      />
    </div>
  );
};

const ChatView = ({ user, messages, socket, room, setRoom }: { user: User, messages: ChatMessage[], socket: Socket | null, room: { type: 'global' | 'main' | 'sub', id?: string }, setRoom: (r: any) => void }) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<{ data: string, type: string, name: string } | null>(null);
  const [selectedMainForSub, setSelectedMainForSub] = useState<MainService | ''>(user.assigned_main_service || '');
  const [showRooms, setShowRooms] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const isFullAccess = user.role === 'admin' || user.role === 'priest' || user.role === 'general_coordinator';
  const isServiceCoordinator = user.role === 'service_coordinator';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFile({ data: reader.result as string, type: f.type, name: f.name });
      };
      reader.readAsDataURL(f);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select best supported mime type
      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      
      const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setFile({ 
            data: reader.result as string, 
            type: supportedMimeType || 'audio/webm', 
            name: `voice_note_${new Date().getTime()}.${supportedMimeType.includes('mp4') ? 'mp4' : 'webm'}` 
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("لا يمكن الوصول للميكروفون أو جهازك لا يدعم التسجيل الصوتي في المتصفح");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !file) || !socket || (room.type !== 'global' && !room.id) || isSending) return;

    setIsSending(true);
    try {
      const payload = {
        sender_id: user.id,
        room_type: room.type,
        room_id: room.id,
        content: content,
        file_data: file?.data,
        file_type: file?.type,
        file_name: file?.name
      };

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to send message');

      setContent('');
      setFile(null);
    } catch (err) {
      console.error("Error sending message:", err);
      alert("فشل في إرسال الرسالة. قد يكون حجم الملف كبيراً جداً.");
    } finally {
      setIsSending(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Camera size={18} />;
    if (type.includes('audio')) return <Mic size={18} />;
    if (type.includes('pdf')) return <FileTextIcon size={18} />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet size={18} />;
    if (type.includes('word') || type.includes('document')) return <FileTextIcon size={18} />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <FileBox size={18} />;
    if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return <FileArchive size={18} />;
    return <FileIcon size={18} />;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        ...(isPopup ? {
          position: 'fixed',
          bottom: 20,
          left: 20,
          width: window.innerWidth < 768 ? 'calc(100% - 40px)' : 450,
          height: 600,
          zIndex: 100,
          borderRadius: '2rem'
        } : {
          width: '100%',
          height: '100%'
        })
      }}
      className={cn(
        "flex bg-white shadow-2xl border border-stone-100 overflow-hidden relative",
        !isPopup && "w-full h-full"
      )}
    >
      {/* Sidebar - Room Selection */}
      <AnimatePresence>
        {showRooms && (
          <motion.div 
            initial={{ x: 288, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 288, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute md:relative inset-y-0 right-0 w-72 border-l border-stone-100 bg-white md:bg-stone-50/50 flex flex-col z-30 shadow-xl md:shadow-none"
          >
            <div className="w-72 flex flex-col h-full">
              <div className="p-6 border-b border-stone-100 bg-white/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.2em]">غرف الدردشة</h3>
                  <button onClick={() => setShowRooms(false)} className="p-1 hover:bg-stone-200 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setRoom({ type: 'global', id: undefined });
                    if (window.innerWidth < 768) setShowRooms(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm mb-2",
                    room.type === 'global' ? "bg-orthodox-red text-white shadow-lg shadow-orthodox-red/20" : "text-stone-500 hover:bg-white hover:text-orthodox-red"
                  )}
                >
                  <Users size={18} />
                  الدردشة العامة
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Main Service Rooms */}
                {(isFullAccess || user.assigned_main_service || (user.assigned_sub_services && user.assigned_sub_services.length > 0)) && (
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-4 mb-3">القطاعات الرئيسية</p>
                    <div className="space-y-1">
                      {isFullAccess ? (
                        Object.values(MainService).map(s => (
                          <button 
                            key={s}
                            onClick={() => {
                              setRoom({ type: 'main', id: s });
                              if (window.innerWidth < 768) setShowRooms(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                              room.type === 'main' && room.id === s ? "bg-orthodox-parchment text-orthodox-red" : "text-stone-500 hover:bg-white"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", room.type === 'main' && room.id === s ? "bg-orthodox-gold" : "bg-stone-300")} />
                            {s}
                          </button>
                        ))
                      ) : (
                        <>
                          {/* Show explicitly assigned main service */}
                          {user.assigned_main_service && (
                            <button 
                              onClick={() => {
                                setRoom({ type: 'main', id: user.assigned_main_service });
                                if (window.innerWidth < 768) setShowRooms(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                                room.type === 'main' && room.id === user.assigned_main_service ? "bg-orthodox-parchment text-orthodox-red" : "text-stone-500 hover:bg-white"
                              )}
                            >
                              <div className={cn("w-1.5 h-1.5 rounded-full", room.type === 'main' && room.id === user.assigned_main_service ? "bg-orthodox-gold" : "bg-stone-300")} />
                              {user.assigned_main_service}
                            </button>
                          )}
                          {/* Also show main services derived from sub-services */}
                          {user.role === 'servant' && user.assigned_sub_services && (
                            Object.entries(SubServices)
                              .filter(([main, subs]) => user.assigned_sub_services?.some(s => subs.includes(s)) && main !== user.assigned_main_service)
                              .map(([main]) => (
                                <button 
                                  key={main}
                                  onClick={() => {
                                    setRoom({ type: 'main', id: main as MainService });
                                    if (window.innerWidth < 768) setShowRooms(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                                    room.type === 'main' && room.id === main ? "bg-orthodox-parchment text-orthodox-red" : "text-stone-500 hover:bg-white"
                                  )}
                                >
                                  <div className={cn("w-1.5 h-1.5 rounded-full", room.type === 'main' && room.id === main ? "bg-orthodox-gold" : "bg-stone-300")} />
                                  {main}
                                </button>
                              ))
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub Service Rooms */}
                {(isFullAccess || isServiceCoordinator || (user.assigned_sub_services && user.assigned_sub_services.length > 0)) && (
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-4 mb-3">الفصول والخدمات الفرعية</p>
                    
                    {isFullAccess && (
                      <select 
                        value={selectedMainForSub} 
                        onChange={(e) => setSelectedMainForSub(e.target.value as MainService)}
                        className="w-[calc(100%-1rem)] mx-2 mb-3 text-[10px] font-bold bg-white border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-orthodox-red"
                      >
                        <option value="">اختر القطاع لرؤية الفصول</option>
                        {Object.values(MainService).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}

                    <div className="space-y-1">
                      {isFullAccess ? (
                        selectedMainForSub && SubServices[selectedMainForSub as MainService]?.map(s => (
                          <button 
                            key={s}
                            onClick={() => {
                              setRoom({ type: 'sub', id: s });
                              if (window.innerWidth < 768) setShowRooms(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                              room.type === 'sub' && room.id === s ? "bg-orthodox-parchment text-orthodox-red" : "text-stone-500 hover:bg-white"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", room.type === 'sub' && room.id === s ? "bg-orthodox-gold" : "bg-stone-300")} />
                            {s}
                          </button>
                        ))
                      ) : isServiceCoordinator ? (
                        user.assigned_main_service && SubServices[user.assigned_main_service]?.map(s => (
                          <button 
                            key={s}
                            onClick={() => {
                              setRoom({ type: 'sub', id: s });
                              if (window.innerWidth < 768) setShowRooms(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                              room.type === 'sub' && room.id === s ? "bg-orthodox-parchment text-orthodox-red" : "text-stone-500 hover:bg-white"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", room.type === 'sub' && room.id === s ? "bg-orthodox-gold" : "bg-stone-300")} />
                            {s}
                          </button>
                        ))
                      ) : (
                        user.assigned_sub_services?.map(s => (
                          <button 
                            key={s}
                            onClick={() => {
                              setRoom({ type: 'sub', id: s });
                              if (window.innerWidth < 768) setShowRooms(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                              room.type === 'sub' && room.id === s ? "bg-orthodox-parchment text-orthodox-red" : "text-stone-500 hover:bg-white"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", room.type === 'sub' && room.id === s ? "bg-orthodox-gold" : "bg-stone-300")} />
                            {s}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-4 md:px-8 py-3 md:py-5 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <button 
              onClick={() => setShowRooms(!showRooms)}
              className={cn(
                "p-2 md:p-3 rounded-xl md:rounded-2xl transition-all shadow-sm border flex items-center gap-2",
                showRooms ? "bg-orthodox-red text-white border-orthodox-red" : "bg-stone-50 text-stone-500 border-stone-100 hover:bg-orthodox-parchment hover:text-orthodox-red"
              )}
            >
              <Menu size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">الغرف</span>
            </button>
            <div className="w-[1px] h-6 bg-stone-100 mx-1 hidden sm:block" />
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orthodox-red text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-orthodox-red/20 flex-shrink-0">
              <CopticCross size={20} />
            </div>
            <div className="truncate">
              <h2 className="font-black text-sm md:text-lg text-stone-800 tracking-tight truncate">
                {room.type === 'global' ? 'الدردشة العامة' : room.id || 'اختر غرفة'}
              </h2>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="w-1.5 h-1.5 bg-orthodox-gold rounded-full animate-pulse" />
                <p className="text-[9px] md:text-[10px] font-bold text-stone-400 uppercase tracking-widest truncate">
                  {room.type === 'global' ? 'متاحة للجميع' : `غرفة ${room.id || '...'}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={() => setIsPopup(!isPopup)}
              className="p-2 md:p-3 bg-stone-50 text-stone-500 rounded-xl md:rounded-2xl border border-stone-100 hover:bg-orthodox-parchment hover:text-orthodox-red transition-all"
              title={isPopup ? "تصغير" : "فتح في نافذة منبثقة"}
            >
              {isPopup ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-8 bg-[#FDFCFB]">
          {!room.id && room.type !== 'global' ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 space-y-4">
              <div className="w-24 h-24 bg-stone-50 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed border-stone-200">
                <ArrowLeft size={32} className="rotate-180" />
              </div>
              <p className="text-sm font-bold text-stone-400">اختر غرفة من القائمة الجانبية للبدء</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 space-y-4">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center border-2 border-dashed border-stone-200">
                <MessageSquare size={32} />
              </div>
              <p className="text-sm font-medium">لا توجد رسائل بعد. كن أول من يرسل!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === user.id;
                const prevMsg = messages[idx - 1];
                const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                return (
                  <div key={msg.id} className={cn("flex gap-4 group", isMe ? "flex-row-reverse" : "flex-row", !showAvatar && "mt-1")}>
                    <div className="w-10 flex-shrink-0">
                      {showAvatar && (
                        <div className="w-10 h-10 rounded-2xl bg-stone-100 overflow-hidden shadow-sm border-2 border-white">
                          {msg.sender_photo ? <img src={msg.sender_photo} className="w-full h-full object-cover" /> : <UserIcon size={20} className="m-2.5 text-stone-400" />}
                        </div>
                      )}
                    </div>
                    <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                      {showAvatar && (
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <span className="text-[11px] font-black text-stone-800">{msg.sender_name}</span>
                          <span className="text-[9px] font-bold bg-orthodox-parchment px-2 py-0.5 rounded-full text-orthodox-red uppercase tracking-tighter">{msg.sender_role}</span>
                        </div>
                      )}
                      <div className={cn(
                        "p-4 rounded-[1.5rem] text-sm shadow-sm relative transition-all group-hover:shadow-md",
                        isMe 
                          ? "bg-orthodox-red text-white rounded-tr-none" 
                          : "bg-white text-stone-800 rounded-tl-none border border-stone-100"
                      )}>
                        {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                        {msg.file_data && (
                          <div className="mt-2">
                            {msg.file_type?.startsWith('image/') ? (
                              <div className="rounded-xl overflow-hidden border border-stone-100 shadow-sm">
                                <img 
                                  src={msg.file_data} 
                                  alt={msg.file_name} 
                                  className="max-w-full max-h-64 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : msg.file_type?.startsWith('audio/') ? (
                              <AudioPlayer src={msg.file_data} isMe={isMe} />
                            ) : (
                              <div className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                isMe 
                                  ? "bg-orthodox-wood/20 border-white/20 hover:bg-orthodox-wood/30" 
                                  : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                              )}>
                                <div className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm",
                                  isMe ? "bg-white/20 text-white" : "bg-white text-orthodox-red"
                                )}>
                                  {getFileIcon(msg.file_type || '')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm font-medium truncate",
                                    isMe ? "text-white" : "text-stone-700"
                                  )}>{msg.file_name}</p>
                                  <p className={cn(
                                    "text-[10px] uppercase tracking-wider",
                                    isMe ? "text-white/60" : "text-stone-400"
                                  )}>{msg.file_type?.split('/')[1] || 'file'}</p>
                                </div>
                                <a 
                                  href={msg.file_data} 
                                  download={msg.file_name}
                                  className={cn(
                                    "p-2 rounded-lg transition-all",
                                    isMe ? "text-white hover:bg-white/20" : "text-stone-400 hover:bg-white hover:shadow-sm"
                                  )}
                                >
                                  <Download size={18} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-stone-400 mt-1.5 px-1">{format(parseISO(msg.timestamp), 'HH:mm')}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-white border-t border-stone-100">
          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-orthodox-parchment rounded-[1.25rem] border border-orthodox-gold/30 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 text-orthodox-red">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                  {file.type.includes('image') ? (
                    <img src={file.data} className="w-full h-full object-cover" />
                  ) : (
                    getFileIcon(file.type)
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold truncate max-w-[250px]">{file.name}</p>
                  <p className="text-[10px] opacity-60 uppercase font-black">جاهز للإرسال</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)} 
                className="w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-xl shadow-sm hover:bg-red-50 transition-all"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
          <form onSubmit={sendMessage} className="flex gap-4 items-end">
            <div className="flex-1 bg-stone-50 rounded-[1.5rem] md:rounded-[2rem] border border-stone-200 p-1 md:p-2 flex items-end gap-1 md:gap-2 focus-within:ring-4 focus-within:ring-orthodox-red/10 focus-within:border-orthodox-red transition-all">
              <div className="flex gap-0.5 md:gap-1">
                <label className="p-3 md:p-4 text-stone-400 hover:text-orthodox-red transition-all cursor-pointer bg-white rounded-xl md:rounded-[1.5rem] shadow-sm border border-stone-100">
                  <Paperclip size={24} />
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
                <button 
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                  className={cn(
                    "p-3 md:p-4 rounded-xl md:rounded-[1.5rem] shadow-sm border transition-all flex items-center justify-center",
                    isRecording 
                      ? "bg-red-500 text-white border-red-600 animate-pulse" 
                      : "bg-white text-stone-400 border-stone-100 hover:text-orthodox-red"
                  )}
                >
                  {isRecording ? <Square size={24} /> : <Mic size={24} />}
                </button>
              </div>
              <textarea 
                rows={1}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e as any);
                  }
                }}
                placeholder={isRecording ? "جاري التسجيل..." : "اكتب هنا..."}
                className="flex-1 bg-transparent px-2 md:px-4 py-3 md:py-4 outline-none text-xs md:text-sm font-medium resize-none max-h-32 md:max-h-48"
                disabled={isRecording}
              />
            </div>
            <button 
              type="submit" 
              disabled={(!content.trim() && !file) || (!room.id && room.type !== 'global') || isRecording || isSending}
              className="w-12 h-12 md:w-16 md:h-16 bg-orthodox-red text-white rounded-xl md:rounded-[2rem] flex items-center justify-center shadow-xl shadow-orthodox-red/40 hover:bg-orthodox-red hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none border-2 md:border-4 border-white flex-shrink-0"
            >
              {isSending ? (
                <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={28} className="mr-0.5 md:mr-1" />
              )}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

const UsersView = ({ user, users, onEditUser }: { user: User, users: User[], onEditUser: (u: User) => void }) => {
  const [search, setSearch] = useState('');
  const canEditAny = user.role === 'admin' || user.role === 'priest' || user.role === 'general_coordinator';
  const isCoordinator = user.role === 'service_coordinator';

  const filteredUsers = useMemo(() => {
    let list = users;
    if (isCoordinator) {
      // Service coordinator sees everyone in their main service
      list = users.filter(u => u.assigned_main_service === user.assigned_main_service);
    } else if (!canEditAny) {
      // Servants see everyone but can't edit
    }
    return list.filter(u => 
      u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      u.username.toLowerCase().includes(search.toLowerCase()) || 
      u.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search, user, isCoordinator, canEditAny]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-stone-800 tracking-tight mb-2">خدام الكنيسة</h1>
          <p className="text-stone-500 font-medium">
            {isCoordinator ? `إدارة خدام قطاع ${user.assigned_main_service}` : 'قائمة بجميع الخدام والمسؤولين في الخدمة'}
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو الدور..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-12 pl-4 py-3 rounded-2xl border border-stone-200 outline-none focus:ring-4 focus:ring-orthodox-red/10 focus:border-orthodox-red transition-all bg-white shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => (
          <motion.div 
            key={u.id} 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col gap-6 hover:shadow-xl transition-all relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-orthodox-red opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-50 overflow-hidden flex-shrink-0 border border-stone-100 shadow-inner">
                {u.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : <UserIcon size={24} className="m-5 text-stone-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-stone-800 truncate">{u.full_name || u.username}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-orthodox-red uppercase tracking-widest bg-orthodox-parchment px-2 py-0.5 rounded-lg">
                    {u.role === 'servant' ? 'خادم' : 
                     u.role === 'service_coordinator' ? 'أمين خدمة' : 
                     u.role === 'general_coordinator' ? 'أمين عام' : 
                     u.role === 'priest' ? 'كاهن' : 'مدير'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-stone-500">
                <div className="w-8 h-8 bg-stone-50 rounded-xl flex items-center justify-center">
                  <Users size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">القطاع والخدمة</p>
                  <p className="text-xs font-bold text-stone-700 truncate">
                    {u.assigned_main_service || 'كل القطاعات'}
                    {u.assigned_sub_services && u.assigned_sub_services.length > 0 && (
                      <span className="text-stone-400 font-medium"> • {u.assigned_sub_services.join(', ')}</span>
                    )}
                  </p>
                </div>
              </div>

              {u.phone && (
                <div className="flex items-center gap-3 text-stone-500">
                  <div className="w-8 h-8 bg-stone-50 rounded-xl flex items-center justify-center">
                    <Phone size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">رقم التليفون</p>
                    <PhoneLink value={u.phone} className="text-xs font-bold text-stone-700" />
                  </div>
                </div>
              )}
            </div>

            {(canEditAny || (isCoordinator && u.role === 'servant')) && (
              !(user.role === 'general_coordinator' && (u.role === 'admin' || u.role === 'priest' || u.role === 'general_coordinator')) && (
                <button 
                  onClick={() => onEditUser(u)}
                  className="w-full mt-2 py-3 bg-stone-50 text-stone-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orthodox-red hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                >
                  تعديل البيانات
                  <ChevronRight size={16} className="group-hover/btn:translate-x-[-4px] transition-transform" />
                </button>
              )
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const ProfileView = ({ user, onUpdate }: { user: User, onUpdate: (data: any) => Promise<void> }) => {
  const [formData, setFormData] = useState({ ...user });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Sync email with gmail as requested
    if (formData.gmail !== formData.email) {
      setFormData(prev => ({ ...prev, email: prev.gmail }));
    }
  }, [formData.gmail]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const roles = [
    { value: 'servant', label: 'خادم' },
    { value: 'service_coordinator', label: 'أمين خدمة' },
    { value: 'general_coordinator', label: 'أمين عام خدمات' },
    { value: 'priest', label: 'كاهن' },
    { value: 'admin', label: 'مدير النظام' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden"
    >
                <div className="h-32 bg-orthodox-red relative">
        <div className="absolute -bottom-12 right-8 w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden">
          {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <UserIcon size={32} className="m-6 text-stone-300" />}
          {isEditing && (
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white cursor-pointer opacity-0 hover:opacity-100 transition-all">
              <Camera size={24} />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>
      </div>

      <div className="pt-16 pb-8 px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">{user.full_name || user.username}</h1>
            {isEditing && (user.role === 'admin' || user.role === 'priest') ? (
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as User['role']})}
                className="mt-1 text-sm bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-orthodox-red"
              >
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            ) : (
              <p className="text-stone-500">{roles.find(r => r.value === user.role)?.label || user.role}</p>
            )}
          </div>
          <button 
            onClick={() => {
              if (isEditing) onUpdate(formData);
              setIsEditing(!isEditing);
            }}
            className={cn(
              "px-6 py-2 rounded-xl font-bold transition-all",
              isEditing ? "bg-orthodox-red text-white" : "bg-stone-100 text-stone-700"
            )}
          >
            {isEditing ? 'حفظ التغييرات' : 'تعديل الملف الشخصي'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileField label="الاسم بالكامل" value={formData.full_name} isEditing={isEditing} onChange={v => setFormData({...formData, full_name: v})} />
          <ProfileField label="رقم التليفون" value={formData.phone || ''} isEditing={isEditing} onChange={v => setFormData({...formData, phone: v})} />
          <ProfileField label="البريد الإلكتروني" value={formData.email || ''} isEditing={isEditing} onChange={v => setFormData({...formData, email: v})} />
          <ProfileField label="العنوان" value={formData.address || ''} isEditing={isEditing} onChange={v => setFormData({...formData, address: v})} />
          <ProfileField label="أب الاعتراف" value={formData.confession_father || ''} isEditing={isEditing} onChange={v => setFormData({...formData, confession_father: v})} />
          <ProfileField label="نوع الدراسة / العمل" value={formData.study_type || ''} isEditing={isEditing} onChange={v => setFormData({...formData, study_type: v})} />
          <ProfileField label="واتساب" value={formData.whatsapp || ''} isEditing={isEditing} onChange={v => setFormData({...formData, whatsapp: v})} />
          <ProfileField label="فيسبوك" value={formData.facebook || ''} isEditing={isEditing} onChange={v => setFormData({...formData, facebook: v})} />
          <ProfileField label="جيميل" value={formData.gmail || ''} isEditing={isEditing} onChange={v => setFormData({...formData, gmail: v})} />
        </div>
      </div>
    </motion.div>
  );
};

const ProfileField = ({ label, value, isEditing, onChange }: { label: string, value: string, isEditing: boolean, onChange: (v: string) => void }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</label>
    {isEditing ? (
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-orthodox-red transition-all text-sm"
      />
    ) : (
      <div className="text-sm font-medium text-stone-800 bg-stone-50 px-4 py-2 rounded-xl border border-transparent min-h-[40px] flex items-center">
        {isPhoneNumber(label) ? <PhoneLink value={value} /> : (value || '---')}
      </div>
    )}
  </div>
);

const UserModal = ({ isOpen, user, currentUser, onClose, onSubmit }: { isOpen: boolean, user: User | null, currentUser: User, onClose: () => void, onSubmit: (data: any) => Promise<void> }) => {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [newSubService, setNewSubService] = useState('');

  useEffect(() => {
    if (user) setFormData({ ...user });
  }, [user]);

  if (!isOpen || !user) return null;

  const isNew = !user.id;
  const canEditRole = currentUser.role === 'admin' || currentUser.role === 'priest' || currentUser.role === 'general_coordinator';
  const canEditServices = currentUser.role === 'admin' || currentUser.role === 'priest' || currentUser.role === 'general_coordinator' || currentUser.role === 'service_coordinator';
  const isCoordinator = currentUser.role === 'service_coordinator';

  const roles = [
    { value: 'servant', label: 'خادم' },
    { value: 'service_coordinator', label: 'أمين خدمة' },
    { value: 'general_coordinator', label: 'أمين عام خدمات' },
    { value: 'priest', label: 'كاهن' },
    { value: 'admin', label: 'مدير النظام' }
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addSubService = (service: string) => {
    const current = formData.assigned_sub_services || [];
    if (!current.includes(service)) {
      setFormData({ ...formData, assigned_sub_services: [...current, service] });
    }
  };

  const removeSubService = (service: string) => {
    const current = formData.assigned_sub_services || [];
    setFormData({ ...formData, assigned_sub_services: current.filter(s => s !== service) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h2 className="text-xl font-bold text-stone-800">{isNew ? 'إضافة خادم جديد' : 'تعديل بيانات الخادم'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-xl transition-all"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isNew && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orthodox-parchment rounded-2xl border border-orthodox-gold/20">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">اسم المستخدم (للدخول)</label>
                <input 
                  value={formData.username || ''} 
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="مثال: mark_servant"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">كلمة المرور</label>
                <input 
                  type="password"
                  value={(formData as any).password || ''} 
                  onChange={e => setFormData({...formData, [ 'password' as any]: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 rounded-2xl bg-stone-100 overflow-hidden border-2 border-stone-200">
              {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <UserIcon size={32} className="m-6 text-stone-300" />}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white cursor-pointer opacity-0 hover:opacity-100 transition-all">
                <Camera size={24} />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-stone-500 mb-1">الاسم بالكامل</label>
              <input 
                value={formData.full_name || ''} 
                onChange={e => setFormData({...formData, full_name: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">نوع الحساب (الصلاحية)</label>
              <select 
                value={formData.role}
                disabled={!canEditRole}
                onChange={(e) => setFormData({...formData, role: e.target.value as User['role']})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-stone-50 disabled:text-stone-400"
              >
                {roles.filter(r => {
                  if (currentUser.role === 'general_coordinator') {
                    return r.value === 'servant' || r.value === 'service_coordinator';
                  }
                  return true;
                }).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">رقم التليفون</label>
              <input 
                value={formData.phone || ''} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">واتساب</label>
              <input 
                value={formData.whatsapp || ''} 
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">أب الاعتراف</label>
              <input 
                value={formData.confession_father || ''} 
                onChange={e => setFormData({...formData, confession_father: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">الخدمة الرئيسية</label>
              <select 
                value={formData.assigned_main_service || ''}
                disabled={isCoordinator}
                onChange={(e) => setFormData({...formData, assigned_main_service: e.target.value as MainService})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-stone-50 disabled:text-stone-400"
              >
                <option value="">كل الخدمات</option>
                {Object.values(MainService).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">جيميل</label>
              <input 
                value={formData.gmail || ''} 
                onChange={e => setFormData({...formData, gmail: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {canEditServices && (
            <div className="space-y-4 p-5 bg-stone-50 rounded-[1.5rem] border border-stone-100">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest">الخدمات الفرعية المسندة</label>
              
              <div className="flex flex-wrap gap-2">
                {(formData.assigned_sub_services || []).map(s => (
                  <span key={s} className="flex items-center gap-2 bg-white border border-stone-200 pl-2 pr-3 py-1.5 rounded-xl text-xs font-bold text-stone-700 shadow-sm">
                    {s}
                    <button onClick={() => removeSubService(s)} className="w-5 h-5 flex items-center justify-center bg-stone-100 text-stone-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"><X size={12}/></button>
                  </span>
                ))}
                {(formData.assigned_sub_services || []).length === 0 && (
                  <p className="text-[10px] text-stone-400 font-bold italic">لم يتم إسناد خدمات فرعية بعد</p>
                )}
              </div>

              <div className="pt-2 border-t border-stone-200/50">
                <p className="text-[10px] font-bold text-stone-400 mb-2">إضافة خدمة فرعية:</p>
                <div className="flex flex-wrap gap-2">
                  {(isCoordinator ? SubServices[currentUser.assigned_main_service!] : 
                    (formData.assigned_main_service ? SubServices[formData.assigned_main_service as MainService] : [])
                  )?.map(s => (
                    <button
                      key={s}
                      onClick={() => addSubService(s)}
                      disabled={formData.assigned_sub_services?.includes(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                        formData.assigned_sub_services?.includes(s)
                          ? "bg-stone-100 text-stone-300 border-transparent cursor-not-allowed"
                          : "bg-white text-orthodox-red border-orthodox-gold/20 hover:border-orthodox-red hover:shadow-sm"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                  {(!isCoordinator && !formData.assigned_main_service) && (
                    <p className="text-[10px] text-stone-400 italic">اختر خدمة رئيسية أولاً لرؤية الخدمات الفرعية المتاحة</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-stone-100 bg-stone-50 flex gap-3">
          <button 
            onClick={() => onSubmit(formData)}
            className="flex-1 bg-orthodox-red text-white py-3 rounded-2xl font-bold hover:bg-orthodox-red/90 transition-all shadow-lg shadow-orthodox-red/20"
          >
            {isNew ? 'إضافة الخادم' : 'حفظ التغييرات'}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-white text-stone-600 py-3 rounded-2xl font-bold border border-stone-200 hover:bg-stone-50 transition-all"
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const BirthdayList = ({ makhdomeen }: { makhdomeen: Makhdom[] }) => {
  const upcoming = useMemo(() => {
    const now = new Date();
    return makhdomeen.filter(m => {
      const dob = parseISO(m.dob);
      const bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      const diff = (bday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= -1 && diff <= 7;
    }).sort((a, b) => {
      const dobA = parseISO(a.dob);
      const dobB = parseISO(b.dob);
      return dobA.getDate() - dobB.getDate();
    });
  }, [makhdomeen]);

  if (upcoming.length === 0) return <p className="text-stone-400 text-center py-4">لا توجد أعياد ميلاد قريبة</p>;

  return (
    <div className="space-y-4">
      {upcoming.map(m => (
        <div key={m.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center">
              <Cake size={18} />
            </div>
            <div>
              <p className="font-bold text-sm">{m.name}</p>
              <p className="text-xs text-stone-500">{format(parseISO(m.dob), 'dd MMMM')}</p>
            </div>
          </div>
          <button 
            onClick={() => window.open(`https://wa.me/${m.whatsapp}?text=${encodeURIComponent(`كل سنة وأنت طيب يا ${m.name} بمناسبة عيد ميلادك! 🎉`)}`, '_blank')}
            className="p-2 bg-orthodox-parchment text-orthodox-red rounded-xl hover:bg-orthodox-red hover:text-white transition-all"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

const ReportCard = ({ title, type, makhdomeen, attendance }: { title: string, type: 'mass' | 'service', makhdomeen: Makhdom[], attendance: Attendance[] }) => {
  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthAttendance = attendance.filter(a => {
      const d = parseISO(a.date);
      return a.type === type && d >= monthStart && d <= monthEnd;
    });

    return makhdomeen.map(m => {
      const present = monthAttendance.filter(a => a.makhdom_id === m.id && a.status === 'present').length;
      // Total days in month could be used, but usually it's based on number of Fridays or specific dates.
      // For simplicity, we'll just show present count. 
      // If the user wants "absent", we'd need to know how many service days occurred.
      return { name: m.name, present };
    });
  }, [makhdomeen, attendance, type]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
      <h3 className="text-lg font-bold mb-4">{title} - هذا الشهر</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {stats.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-stone-50 last:border-0">
            <span className="font-medium">{s.name}</span>
            <div className="flex gap-4">
              <span className="text-orthodox-red font-bold">حضور: {s.present}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MakhdomModal: React.FC<{ isOpen: boolean, initialData?: Makhdom, onClose: () => void, onSubmit: (data: any) => Promise<void> }> = ({ isOpen, initialData, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: undefined as number | undefined,
    name: '', dob: '', phone: '', landline: '', confession_father: '', address: '',
    whatsapp: '', facebook: '', gmail: '', photo: '', father_job: '', father_phone: '',
    father_confession: '', mother_name: '', mother_job: '', mother_phone: '', mother_confession: '',
    main_service: '' as MainService | '', sub_service: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        dob: initialData.dob || '',
        phone: initialData.phone || '',
        landline: initialData.landline || '',
        confession_father: initialData.confession_father || '',
        address: initialData.address || '',
        whatsapp: initialData.whatsapp || '',
        facebook: initialData.facebook || '',
        gmail: initialData.gmail || '',
        photo: initialData.photo || '',
        father_job: initialData.father_job || '',
        father_phone: initialData.father_phone || '',
        father_confession: initialData.father_confession || '',
        mother_name: initialData.mother_name || '',
        mother_job: initialData.mother_job || '',
        mother_phone: initialData.mother_phone || '',
        mother_confession: initialData.mother_confession || '',
        main_service: initialData.main_service || '',
        sub_service: initialData.sub_service || ''
      });
    } else {
      setFormData({
        id: undefined,
        name: '', dob: '', phone: '', landline: '', confession_father: '', address: '',
        whatsapp: '', facebook: '', gmail: '', photo: '', father_job: '', father_phone: '',
        father_confession: '', mother_name: '', mother_job: '', mother_phone: '', mother_confession: '',
        main_service: '', sub_service: ''
      });
    }
  }, [initialData, isOpen]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData({ ...formData, photo: compressedDataUrl });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{formData.id ? 'تعديل بيانات مخدوم' : 'إضافة مخدوم جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><XCircle size={24} className="text-stone-400" /></button>
        </div>

        <form 
          onSubmit={async (e) => { 
            e.preventDefault(); 
            setIsSubmitting(true);
            try {
              await onSubmit(formData);
            } finally {
              setIsSubmitting(false);
            }
          }} 
          className="space-y-6"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-stone-100 border-2 border-orthodox-gold/20 flex items-center justify-center overflow-hidden shadow-inner">
                {formData.photo ? (
                  <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={48} className="text-stone-300" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-orthodox-red text-white rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:bg-orthodox-red/90 transition-all">
                <Camera size={20} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm font-bold text-stone-600 mt-4">صورة المخدوم</p>
            <p className="text-xs text-stone-400">اضغط على الأيقونة لاختيار صورة من الاستوديو</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="الاسم بالكامل" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
            <Input label="تاريخ الميلاد" type="date" value={formData.dob} onChange={v => setFormData({...formData, dob: v})} required />
            <Input label="رقم التليفون" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
            
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">الخدمة الرئيسية</label>
              <select 
                value={formData.main_service} 
                onChange={e => setFormData({...formData, main_service: e.target.value as MainService, sub_service: ''})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white"
                required
              >
                <option value="">اختر الخدمة</option>
                {Object.values(MainService).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">الخدمة الفرعية</label>
              <select 
                value={formData.sub_service} 
                onChange={e => setFormData({...formData, sub_service: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white"
                required
                disabled={!formData.main_service}
              >
                <option value="">اختر الفصل</option>
                {formData.main_service && SubServices[formData.main_service as MainService].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <Input label="التليفون الأرضي" value={formData.landline} onChange={v => setFormData({...formData, landline: v})} />
            <Input label="أب الاعتراف" value={formData.confession_father} onChange={v => setFormData({...formData, confession_father: v})} />
            <Input label="العنوان" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
            <Input label="واتساب" value={formData.whatsapp} onChange={v => setFormData({...formData, whatsapp: v})} />
            <Input label="فيسبوك" value={formData.facebook} onChange={v => setFormData({...formData, facebook: v})} />
            <Input label="جيميل" value={formData.gmail} onChange={v => setFormData({...formData, gmail: v})} />
          </div>

          <div className="border-t pt-6">
            <h3 className="font-serif font-bold text-orthodox-red mb-4">بيانات الأب</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="وظيفة الأب" value={formData.father_job} onChange={v => setFormData({...formData, father_job: v})} />
              <Input label="تليفون الأب" value={formData.father_phone} onChange={v => setFormData({...formData, father_phone: v})} />
              <Input label="أب اعتراف الأب" value={formData.father_confession} onChange={v => setFormData({...formData, father_confession: v})} />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-serif font-bold text-orthodox-red mb-4">بيانات الأم</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="اسم الأم" value={formData.mother_name} onChange={v => setFormData({...formData, mother_name: v})} />
              <Input label="وظيفة الأم" value={formData.mother_job} onChange={v => setFormData({...formData, mother_job: v})} />
              <Input label="تليفون الأم" value={formData.mother_phone} onChange={v => setFormData({...formData, mother_phone: v})} />
              <Input label="أب اعتراف الأم" value={formData.mother_confession} onChange={v => setFormData({...formData, mother_confession: v})} />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-8">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all disabled:opacity-50">إلغاء</button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-2 bg-orthodox-red text-white rounded-xl font-bold hover:bg-orthodox-red/90 shadow-lg shadow-orthodox-red/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = "text", required = false }: { label: string, value: string, onChange: (v: string) => void, type?: string, required?: boolean }) => (
  <div>
    <label className="block text-xs font-bold text-stone-500 mb-1">{label} {required && "*"}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      required={required}
      className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-orthodox-red transition-all"
    />
  </div>
);

const ImageLightbox: React.FC<{ image: string | null, onClose: () => void }> = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative max-w-full max-h-full"
      >
        <img 
          src={image} 
          alt="Preview" 
          className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        />
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-900 shadow-xl"
        >
          <X size={24} />
        </button>
      </motion.div>
    </div>
  );
};

const InteractiveMap = ({ makhdomeen }: { makhdomeen: Makhdom[] }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
  });

  const center = { lat: 30.0444, lng: 31.2357 }; // Cairo

  if (!isLoaded) return <div className="w-full h-full bg-stone-100 animate-pulse flex items-center justify-center">جاري تحميل الخريطة...</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={10}
    >
      {makhdomeen.filter(m => m.location_lat && m.location_lng).map(m => (
        <Marker 
          key={m.id} 
          position={{ lat: m.location_lat, lng: m.location_lng }} 
          title={m.name}
        />
      ))}
    </GoogleMap>
  );
};

// --- Export Logic ---

const exportToExcel = (makhdomeen: Makhdom[], attendance: Attendance[]) => {
  const data = makhdomeen.map(m => ({
    'الاسم': m.name,
    'الخدمة': m.main_service,
    'الخدمة الفرعية': m.sub_service,
    'تاريخ الميلاد': m.dob,
    'التليفون': m.phone,
    'العنوان': m.address,
    'عدد مرات الحضور': attendance.filter(a => a.makhdom_id === m.id && a.status === 'present').length,
    'عدد مرات الغياب': attendance.filter(a => a.makhdom_id === m.id && a.status === 'absent').length,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المخدومين");
  XLSX.writeFile(wb, "تقرير_المخدومين.xlsx");
};

const exportToPDF = (makhdomeen: Makhdom[], attendance: Attendance[]) => {
  const doc = new jsPDF();
  doc.text("تقرير حضور وغياب المخدومين", 105, 10, { align: 'center' });
  
  const body = makhdomeen.map(m => [
    m.name,
    m.main_service,
    attendance.filter(a => a.makhdom_id === m.id && a.status === 'present').length,
    attendance.filter(a => a.makhdom_id === m.id && a.status === 'absent').length
  ]);

  (doc as any).autoTable({
    head: [['الاسم', 'الخدمة', 'حضور', 'غياب']],
    body: body,
    startY: 20,
    styles: { font: 'helvetica', halign: 'right' }
  });

  doc.save("تقرير_المخدومين.pdf");
};
