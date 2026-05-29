'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface WeatherData {
  current: {
    temp: number;
    description: string;
    humidity: number;
    windSpeed: number;
    icon: string;
    pop: number;
    rain: number;
  } | null;
  hourly: {
    time: string;
    temp: number;
    icon: string;
    pop: number;
    rain: number;
  }[];
  error?: string;
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch('/api/weather');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch weather widget data:', error);
        setData({ current: null, hourly: [], error: 'Failed to load' });
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border-2 border-black rounded-[32px] p-8 shadow-sm w-full min-h-[220px] flex flex-col md:flex-row gap-8 animate-pulse">
        <div className="flex-1 space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3"></div>
          <div className="h-16 bg-gray-100 rounded w-1/2"></div>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 w-16 bg-gray-100 rounded-[20px] shrink-0"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.error || !data.current) {
    return (
      <div className="bg-white border-2 border-black rounded-[32px] p-8 shadow-sm w-full min-h-[220px] flex items-center justify-center">
        <p className="text-black font-normal">ไม่สามารถดึงข้อมูลสภาพอากาศได้</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fdfcf0] border-2 border-black rounded-[32px] p-6 md:p-8 shadow-sm w-full min-h-[220px] flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-md transition-shadow duration-300">
      {/* Current Weather (Left side on desktop) */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-normal text-black tracking-wide">สภาพอากาศปัจจุบัน</h2>
          <p className="text-sm font-normal text-black mb-2">ตำบลบึงคำพร้อย ลำลูกกา</p>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-medium text-black tracking-tight">{data.current.temp}°C</span>
            <span className="text-lg font-normal text-black capitalize">{data.current.description}</span>
          </div>
          <div className="flex gap-4 mt-3">
            <span className="text-sm text-black">ความชื้น: {data.current.humidity}%</span>
            <span className="text-sm text-black">ลม: {data.current.windSpeed} m/s</span>
          </div>
          <div className="text-sm font-normal text-black antialiased mt-2">
            💧 โอกาสเกิดฝน: {data.current.pop}%
            {data.current.rain > 0 && ` ปริมาณ: ${data.current.rain} mm`}
          </div>
        </div>
        <div className="hidden sm:block shrink-0 opacity-80">
          <Image
            src={`https://openweathermap.org/img/wn/${data.current.icon}@4x.png`}
            alt={data.current.description}
            width={100}
            height={100}
            className="drop-shadow-sm scale-110"
          />
        </div>
      </div>

      {/* Hourly Forecast (Right side on desktop) */}
      <div className="flex-1 md:max-w-md w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-black ml-1">พยากรณ์รายชั่วโมง</h3>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
          {data.hourly.map((hour, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center min-w-[72px] p-3 border-2 border-black rounded-[20px] bg-gray-50/50 hover:bg-gray-50 transition-colors"
            >
              {/* บังคับข้อความเวลากางเต็ม 100% และจัดกึ่งกลาง */}
              <span className="w-full text-center text-sm font-medium text-black">{hour.time}</span>
              <Image
                src={`https://openweathermap.org/img/wn/${hour.icon}@2x.png`}
                alt="weather icon"
                width={48}
                height={48}
                className="opacity-90 my-1 mx-auto"
              />
              {/* บังคับช่องโอกาสฝนเป็น Flex ตรงกลาง และใช้สีดำล้วน */}
              <span className="w-full text-center flex items-center justify-center gap-1 text-xs font-normal text-black antialiased mb-1">
                <span>💧</span>
                <span>{hour.pop}%</span>
              </span>
              {/* บังคับข้อความอุณหภูมิกางเต็ม 100% และจัดกึ่งกลาง */}
              <span className="w-full text-center text-base font-medium text-black">{hour.temp}°C</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WeatherWidget;