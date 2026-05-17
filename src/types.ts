export enum MainService {
  MALAIKA = "ملايكة",
  PRIMARY = "ابتدائي",
  PREPARATORY = "اعدادي",
  SECONDARY = "ثانوي",
  YOUTH = "شباب"
}

export const SubServices: Record<MainService, string[]> = {
  [MainService.MALAIKA]: ["Baby", "KG1", "KG2"],
  [MainService.PRIMARY]: ["الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي", "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي"],
  [MainService.PREPARATORY]: ["الصف الأول الاعدادي", "الصف الثاني الاعدادي", "الصف الثالث الاعدادي"],
  [MainService.SECONDARY]: ["الصف الأول ثانوي", "الصف الثاني ثانوي", "الصف الثالث ثانوي"],
  [MainService.YOUTH]: ["أولى كلية", "ثانية كلية", "ثالثة كلية", "رابعة كلية", "خامسة كلية", "خريج"]
};

export interface Makhdom {
  id: number;
  name: string;
  dob: string;
  phone: string;
  landline: string;
  confession_father: string;
  address: string;
  location_lat: number;
  location_lng: number;
  whatsapp: string;
  facebook: string;
  gmail: string;
  photo: string;
  main_service: MainService;
  sub_service: string;
  father_job: string;
  father_phone: string;
  father_confession: string;
  mother_name: string;
  mother_job: string;
  mother_phone: string;
  mother_confession: string;
}

export interface Attendance {
  id: number;
  makhdom_id: number;
  date: string;
  type: 'mass' | 'service';
  status: 'present' | 'absent';
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'priest' | 'general_coordinator' | 'service_coordinator' | 'servant';
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  location_lat?: number;
  location_lng?: number;
  confession_father?: string;
  study_type?: string;
  whatsapp?: string;
  facebook?: string;
  gmail?: string;
  photo?: string;
  assigned_main_service?: MainService;
  assigned_sub_services?: string[];
  is_servant_elsewhere?: boolean;
  other_service_details?: string;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_photo?: string;
  sender_role: string;
  room_type: 'global' | 'main' | 'sub';
  room_id?: string;
  content: string;
  file_data?: string;
  file_type?: string;
  file_name?: string;
  timestamp: string;
}
