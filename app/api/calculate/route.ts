import { NextRequest, NextResponse } from 'next/server';

const PLANET_NAMES = ['Soleil', 'Lune', 'Mercure', 'Vénus', 'Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton', 'Nœud Nord'];
const SIGN_NAMES = ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'];

function getZodiacSign(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  return SIGN_NAMES[signIndex % 12];
}

function getDegreeInSign(longitude: number): number {
  return longitude % 30;
}

function calculateJulianDay(date: string, time: string, timezone: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const tzOffset = parseInt(timezone.replace('UTC', '')) || 0;
  const utcHours = hours - tzOffset;
  const decimalTime = utcHours + minutes / 60;

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  return jdn + (decimalTime - 12) / 24;
}

function calculatePlanetPosition(jd: number, planetIndex: number): { longitude: number; latitude: number; retrograde: boolean } {
  const T = (jd - 2451545.0) / 36525;

  const planetData = [
    { L0: 280.46646, L1: 36000.76983, L2: 0.0003032 }, // Sun
    { L0: 218.3164477, L1: 481267.88123421, L2: -0.0015786 }, // Moon
    { L0: 252.25032350, L1: 149472.67411175, L2: 0.00000535 }, // Mercury
    { L0: 181.97909950, L1: 58517.81538729, L2: 0.00000165 }, // Venus
    { L0: 355.43299958, L1: 19140.30268499, L2: 0.00000261 }, // Mars
    { L0: 34.39644051, L1: 3034.74612775, L2: 0.00022330 }, // Jupiter
    { L0: 49.95424423, L1: 1222.49362201, L2: -0.00025200 }, // Saturn
    { L0: 313.23810451, L1: 428.48202785, L2: 0.00030390 }, // Uranus
    { L0: 304.88003400, L1: 218.45945325, L2: 0.00000480 }, // Neptune
    { L0: 238.92903833, L1: 145.20780515, L2: 0.00000000 }, // Pluto
    { L0: 125.04452, L1: -1934.136261, L2: 0.0020708 }, // North Node
  ];

  const planet = planetData[planetIndex];
  let L = planet.L0 + planet.L1 * T + planet.L2 * T * T;
  L = L % 360;
  if (L < 0) L += 360;

  const latitude = Math.sin(T) * (planetIndex === 1 ? 5.14 : planetIndex * 0.8);

  const prevT = T - 0.01;
  const prevL = (planet.L0 + planet.L1 * prevT + planet.L2 * prevT * prevT) % 360;
  const retrograde = (L < prevL && Math.abs(L - prevL) < 180) || (prevL - L > 180);

  return { longitude: L, latitude, retrograde };
}

function calculateHouseCusps(jd: number, latitude: number, longitude: number): number[] {
  const T = (jd - 2451545.0) / 36525;
  const GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
  const LST = (GMST + longitude) % 360;

  const obliquity = 23.439291 - 0.0130042 * T;
  const oblRad = obliquity * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;

  const houses: number[] = [];

  for (let i = 0; i < 12; i++) {
    const angle = (LST + i * 30) % 360;
    const angleRad = angle * Math.PI / 180;

    const ascRad = Math.atan2(Math.cos(angleRad), -Math.sin(angleRad) * Math.cos(oblRad) - Math.tan(latRad) * Math.sin(oblRad));
    let asc = ascRad * 180 / Math.PI;
    if (asc < 0) asc += 360;

    houses.push(asc);
  }

  return houses;
}

function calculateAspects(planets: any[]): any[] {
  const aspects = [];
  const aspectTypes = [
    { name: 'Conjonction', angle: 0, orb: 8 },
    { name: 'Sextile', angle: 60, orb: 6 },
    { name: 'Carré', angle: 90, orb: 8 },
    { name: 'Trigone', angle: 120, orb: 8 },
    { name: 'Opposition', angle: 180, orb: 8 },
  ];

  for (let i = 0; i < planets.length - 1; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;

      for (const aspectType of aspectTypes) {
        const orb = Math.abs(diff - aspectType.angle);
        if (orb <= aspectType.orb) {
          aspects.push({
            planet1: planets[i].name,
            planet2: planets[j].name,
            aspect: aspectType.name,
            angle: aspectType.angle,
            orb: orb
          });
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

function getPlanetHouse(planetLongitude: number, houses: number[]): number {
  for (let i = 0; i < 12; i++) {
    const currentHouse = houses[i];
    const nextHouse = houses[(i + 1) % 12];

    if (nextHouse > currentHouse) {
      if (planetLongitude >= currentHouse && planetLongitude < nextHouse) {
        return i + 1;
      }
    } else {
      if (planetLongitude >= currentHouse || planetLongitude < nextHouse) {
        return i + 1;
      }
    }
  }
  return 1;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, time, latitude, longitude, timezone } = body;

    if (!date || !time || !latitude || !longitude || !timezone) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    const jd = calculateJulianDay(date, time, timezone);
    const houseCusps = calculateHouseCusps(jd, parseFloat(latitude), parseFloat(longitude));

    const planets = PLANET_NAMES.map((name, index) => {
      const position = calculatePlanetPosition(jd, index);
      return {
        name,
        longitude: position.longitude,
        latitude: position.latitude,
        sign: getZodiacSign(position.longitude),
        degree: getDegreeInSign(position.longitude),
        retrograde: position.retrograde,
        house: getPlanetHouse(position.longitude, houseCusps)
      };
    });

    const houses = houseCusps.map((cusp, index) => ({
      number: index + 1,
      longitude: cusp,
      sign: getZodiacSign(cusp)
    }));

    const aspects = calculateAspects(planets);

    return NextResponse.json({
      planets,
      houses,
      aspects
    });

  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul du thème astral' },
      { status: 500 }
    );
  }
}
