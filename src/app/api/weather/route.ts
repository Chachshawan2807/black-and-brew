import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error('[WEATHER_API] Missing OPENWEATHER_API_KEY');
      return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    }

    const lat = '13.9312';
    const lon = '100.6756';
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=th`;

    const response = await fetch(url, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      console.error(`[WEATHER_API] OpenWeatherMap Error: ${response.statusText}`);
      throw new Error(`OpenWeatherMap responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.list || data.list.length === 0) {
      throw new Error('Invalid data format received from OpenWeatherMap');
    }

    // Current weather from the first item (closest to now)
    const currentData = data.list[0];
    const current = {
      temp: Math.round(currentData.main.temp),
      description: currentData.weather[0]?.description || 'ไม่ทราบสภาพอากาศ',
      humidity: currentData.main.humidity,
      windSpeed: currentData.wind.speed,
      icon: currentData.weather[0]?.icon || '01d',
      pop: Math.round((currentData.pop || 0) * 100), // โอกาสฝน %
      rain: currentData.rain ? (currentData.rain['3h'] || 0) : 0 // ปริมาณฝน mm
    };

    // Hourly forecast for the next 5 periods (every 3 hours)
    const hourly = data.list.slice(1, 6).map((item: any) => {
      const date = new Date(item.dt * 1000);
      return {
        // แปลงเวลาเป็นโซนไทย (HH:MM)
        time: date.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }),
        temp: Math.round(item.main.temp),
        icon: item.weather[0]?.icon || '01d',
        pop: Math.round((item.pop || 0) * 100), // โอกาสฝน %
        rain: item.rain ? (item.rain['3h'] || 0) : 0 // ปริมาณฝน mm
      };
    });

    return NextResponse.json({ current, hourly }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600',
      }, // เพิ่ม Cache-Control headers เพื่อประสิทธิภาพการแคช
    });
  } catch (error) {
    console.error('[WEATHER_API] Error fetching weather:', error);
    // Fallback data structure to prevent frontend crash
    return NextResponse.json(
      {
        current: null,
        hourly: [],
        error: 'Unable to fetch weather data at this time.'
      },
      { status: 200 } // Return 200 with error property so client can handle it gracefully without crashing
    );
  }
}
