import { Clock, MapPin, Shirt, CalendarX, Coffee } from 'lucide-react';
import { Shift, Profile } from '../types';

interface ShiftCardProps {
  shift: Shift;
  profile?: Profile;
}

export default function ShiftCard({ shift, profile }: ShiftCardProps) {
  const isLeave = shift.status === 'on_leave';
  const location = shift.metadata?.location;

  // Logic: เลือกไอคอนตามสถานที่ใน metadata
  const getIcon = () => {
    if (isLeave) return <CalendarX className="w-6 h-6 text-orange-500" />;
    if (location === "Laundry" || location === "ร้านซักผ้า") return <Shirt className="w-6 h-6 text-cyan-400" />;
    if (location === "Branch 2" || location === "ไปสาขา 2") return <MapPin className="w-6 h-6 text-purple-400" />;
    return <Clock className="w-6 h-6 text-emerald-400" />;
  };

  // Logic: จัดรูปแบบเวลา 24 ชม.
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok'
    });
  };

  return (
    <div className={`
      relative overflow-hidden p-6 
      ${isLeave
        ? 'bg-orange-500/10 border border-orange-500/20 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.1)]'
        : 'glass-card'}
    `}>
      <div className="flex items-center justify-between gap-4">
        {/* ส่วนข้อมูลพนักงาน */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border-2 border-white/10">
                <Coffee className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#0a0a0a] ${isLeave ? 'bg-orange-500' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <h3 className="text-base font-normal tracking-tight text-white/90 leading-tight">
              {profile?.full_name || 'Unassigned'}
            </h3>
            <p className="text-sm text-white/40 font-normal mt-1">
              {isLeave ? 'สถานะ: ลา' : `กะ: ${location || 'Main'}`}
            </p>
          </div>
        </div>

        {/* ส่วนข้อมูลเวลา / สถานที่ */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 mb-1">
            {getIcon()}
            <span className={`text-xl font-normal tracking-tight ${isLeave ? 'text-orange-500' : 'text-white'}`}>
              {isLeave ? 'ลา' : location || formatTime(shift.start_time)}
            </span>
          </div>
          {!isLeave && (
            <p className="text-sm text-white/30 font-normal">
              สิ้นสุด {formatTime(shift.end_time)}
            </p>
          )}
        </div>
      </div>

      {/* เอฟเฟกต์แสง Glow บางๆ ด้านล่างกะงาน */}
      <div className={`absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${isLeave ? 'text-orange-500' : 'text-emerald-500'}`} />
    </div>
  );
}