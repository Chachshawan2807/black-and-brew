import { NextResponse } from 'next/server';

const STORE_LAT = '13.9312';
const STORE_LON = '100.6756';
const CACHE_SECONDS = 1800;
const CACHE_CONTROL = `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`;

const FALLBACK_PAYLOAD = {
  current: null,
  hourly: [] as Array<{
    time: string;
    temp: number;
    icon: string;
    pop: number;
    rain: number;
  }>,
  error: 'Unable to fetch weather data at this time.',
};

export async function GET() {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error('[WEATHER_API] Missing OPENWEATHER_API_KEY');
      return NextResponse.json(
        { ...FALLBACK_PAYLOAD, error: 'Missing API Key' },
        { status: 200, headers: { 'Cache-Control': CACHE_CONTROL } }
      );
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${STORE_LAT}&lon=${STORE_LON}&appid=${apiKey}&units=metric&lang=th`;

    const response = await fetch(url, {
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      console.error(`[WEATHER_API] OpenWeatherMap Error: ${response.statusText}`);
      throw new Error(`OpenWeatherMap responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.list || data.list.length === 0) {
      throw new Error('Invalid data format received from OpenWeatherMap');
    }

    const currentData = data.list[0];
    const current = {
      temp: Math.round(currentData.main?.temp ?? 0),
      description: currentData.weather?.[0]?.description || 'ไม่ทราบสภาพอากาศ',
      humidity: currentData.main?.humidity ?? 0,
      windSpeed: currentData.wind?.speed ?? 0,
      icon: currentData.weather?.[0]?.icon || '01d',
      pop: Math.round((currentData.pop || 0) * 100),
      rain: currentData.rain ? (currentData.rain['3h'] || 0) : 0,
    };

    const hourly = data.list.slice(1, 6).map((item: {
      dt: number;
      main: { temp: number };
      weather: { icon: string }[];
      pop?: number;
      rain?: Record<string, number>;
    }) => {
      const date = new Date(item.dt * 1000);
      return {
        time: date.toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
        }),
        temp: Math.round(item.main?.temp ?? 0),
        icon: item.weather?.[0]?.icon || '01d',
        pop: Math.round((item.pop || 0) * 100),
        rain: item.rain ? (item.rain['3h'] || 0) : 0,
      };
    });

    return NextResponse.json(
      { current, hourly },
      {
        headers: { 'Cache-Control': CACHE_CONTROL },
      }
    );
  } catch (error) {
    console.error('[WEATHER_API] Error fetching weather:', error);
    return NextResponse.json(FALLBACK_PAYLOAD, {
      status: 200,
      headers: { 'Cache-Control': CACHE_CONTROL },
    });
  }
}
