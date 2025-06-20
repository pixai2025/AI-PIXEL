import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Dashboard from '../components/Dashboard';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');
  const [isValidId, setIsValidId] = useState(false);

  // Obtener tracking ID de la URL o localStorage
  useEffect(() => {
    const urlTrackingId = router.query.id;
    const storedTrackingId = localStorage.getItem('ai-pixel-tracking-id');

    if (urlTrackingId) {
      setTrackingId(urlTrackingId);
      setIsValidId(true);
      localStorage.setItem('ai-pixel-tracking-id', urlTrackingId);
    } else if (storedTrackingId) {
      setTrackingId(storedTrackingId);
      setIsValidId(true);
    }
  }, [router.query]);

  const handleTrackingIdSubmit = (e) => {
    e.preventDefault();
    if (trackingId.trim()) {
      setIsValidId(true);
      localStorage.setItem('ai-pixel-tracking-id', trackingId.trim());
      router.push(`/?id=${trackingId.trim()}`);
    }
  };

  return (
    <>
      <Head>
        <title>AI Pixel Tracker - Dashboard</title>
        <meta name="description" content="Rastrea bots de IA en tu sitio web" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!isValidId ? (
            <div className="max-w-md mx-auto mt-20">
              <div className="bg-white shadow rounded-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  AI Pixel Tracker
                </h1>
                <p className="text-gray-600 mb-6">
                  Ingresa tu Tracking ID para ver el dashboard
                </p>
                <form onSubmit={handleTrackingIdSubmit}>
                  <div className="mb-4">
                    <label htmlFor="trackingId" className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking ID
                    </label>
                    <input
                      type="text"
                      id="trackingId"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      placeholder="aip_xxxxxxxxx_xxxxxxxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Ver Dashboard
                  </button>
                </form>
                <div className="mt-6 text-sm text-gray-500">
                  <p>¿No tienes un Tracking ID?</p>
                  <a href="/setup" className="text-blue-600 hover:text-blue-800">
                    Configura AI Pixel Tracker →
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <Dashboard trackingId={trackingId} />
          )}
        </div>
      </main>
    </>
  );
}
