'use client';

import { useState } from 'react';

interface ChartData {
  planets: {
    name: string;
    longitude: number;
    latitude: number;
    sign: string;
    degree: number;
    retrograde: boolean;
    house: number;
  }[];
  houses: {
    number: number;
    longitude: number;
    sign: string;
  }[];
  aspects: {
    planet1: string;
    planet2: string;
    aspect: string;
    angle: number;
    orb: number;
  }[];
}

export default function Home() {
  const [formData, setFormData] = useState({
    date: '',
    time: '12:00',
    latitude: '',
    longitude: '',
    timezone: 'UTC+0'
  });

  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setChartData(null);

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du calcul du thème astral');
      }

      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const timezones = [
    'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6',
    'UTC-5', 'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1',
    'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6', 'UTC+7', 'UTC+8',
    'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
  ];

  return (
    <div className="container">
      <h1>✨ Calculateur de Thème Astral ✨</h1>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="date">Date de naissance</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Heure de naissance</label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="latitude">Latitude</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                step="0.0001"
                placeholder="48.8566 (Paris)"
                value={formData.latitude}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="longitude">Longitude</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                step="0.0001"
                placeholder="2.3522 (Paris)"
                value={formData.longitude}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="timezone">Fuseau horaire</label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                required
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Calcul en cours...' : 'Calculer le Thème Astral'}
          </button>
        </form>
      </div>

      {error && (
        <div className="error-message">
          <strong>Erreur:</strong> {error}
        </div>
      )}

      {chartData && (
        <div className="results-container">
          <div className="chart-grid">
            <div className="chart-section">
              <h2>🪐 Planètes</h2>
              {chartData.planets.map((planet, idx) => (
                <div key={idx} className="planet-item">
                  <span className="planet-name">
                    {planet.name}
                    {planet.retrograde ? ' ℞' : ''}
                  </span>
                  <div className="planet-details">
                    <div>{planet.sign} {planet.degree.toFixed(2)}°</div>
                    <div className="planet-position">Maison {planet.house}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="chart-section">
              <h2>🏠 Maisons</h2>
              {chartData.houses.map((house, idx) => (
                <div key={idx} className="house-item">
                  <span className="house-number">Maison {house.number}</span>
                  <span>{house.sign} {(house.longitude % 30).toFixed(2)}°</span>
                </div>
              ))}
            </div>

            <div className="chart-section">
              <h2>⭐ Aspects Majeurs</h2>
              {chartData.aspects.map((aspect, idx) => (
                <div key={idx} className="planet-item">
                  <span>{aspect.planet1} - {aspect.planet2}</span>
                  <div className="planet-details">
                    <div>{aspect.aspect}</div>
                    <div className="planet-position">Orbe: {aspect.orb.toFixed(2)}°</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
