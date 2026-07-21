'use client';
import { useState } from 'react';
import Link from 'next/link';

const TOTAL_CITIES = 262; // approximate
const BATCH_SIZE = 8;
const TOTAL_BATCHES = Math.ceil(TOTAL_CITIES / BATCH_SIZE);

export default function BulkScrapeOntario() {
  const [running, setRunning] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ processed: 0, scraped: 0, skipped: 0, errors: 0 });

  const runAllBatches = async () => {
    setRunning(true);
    setResults([]);
    setDone(false);
    setStats({ processed: 0, scraped: 0, skipped: 0, errors: 0 });

    let batch = 0;
    let keepGoing = true;

    while (keepGoing) {
      setCurrentBatch(batch);
      try {
        const res = await fetch(`/api/admin/bulk-scrape-ontario?batch=${batch}`, {
          headers: { Authorization: 'Bearer RealtyPropFlow-cron-2026' }
        });
        const data = await res.json();

        if (data.message === 'All cities processed!') {
          keepGoing = false;
          setDone(true);
          break;
        }

        setResults(prev => [...prev, ...data.results]);
        setStats(prev => {
          const scraped = data.results.filter(r => r.status === 'done').length;
          const skipped = data.results.filter(r => r.status === 'skipped').length;
          const errors = data.results.filter(r => r.status === 'error').length;
          return {
            processed: prev.processed + data.processed,
            scraped: prev.scraped + scraped,
            skipped: prev.skipped + skipped,
            errors: prev.errors + errors
          };
        });

        if (data.next_batch === null) {
          keepGoing = false;
          setDone(true);
        } else {
          batch = data.next_batch;
          // Small delay between batches to avoid rate limits
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err) {
        setResults(prev => [...prev, { city: `Batch ${batch}`, status: 'error', reason: err.message }]);
        break;
      }
    }

    setRunning(false);
  };

  const progress = Math.min(100, Math.round((currentBatch / TOTAL_BATCHES) * 100));

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: 'white', padding: '40px 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/superadmin" style={{ color: '#C9A227', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Super Admin
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginTop: '12px' }}>
            🏙️ Ontario Bulk Property Scraper
          </h1>
          <p style={{ color: '#94A3B8', marginTop: '8px' }}>
            Scrapes property listings from Zillow for all {TOTAL_CITIES}+ Ontario municipalities and stores them in the database.
            Run this once to populate all cities. It runs in batches of {BATCH_SIZE} cities.
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Cities', value: TOTAL_CITIES, color: '#3B82F6' },
            { label: 'Scraped', value: stats.scraped, color: '#10B981' },
            { label: 'Skipped', value: stats.skipped, color: '#F59E0B' },
            { label: 'Errors', value: stats.errors, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', textAlign: 'center', border: `1px solid ${s.color}33` }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        {running && (
          <div style={{ marginBottom: '24px', background: '#1E293B', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#94A3B8', fontSize: '14px' }}>
                Processing Batch {currentBatch + 1} of ~{TOTAL_BATCHES}...
              </span>
              <span style={{ color: '#C9A227', fontWeight: '700' }}>{progress}%</span>
            </div>
            <div style={{ height: '10px', background: '#0F172A', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #C9A227, #F59E0B)',
                borderRadius: '999px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        )}

        {/* Done Banner */}
        {done && (
          <div style={{ background: '#064E3B', border: '1px solid #10B981', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <strong style={{ marginLeft: '8px' }}>All Ontario cities have been scraped successfully!</strong>
            <p style={{ color: '#6EE7B7', fontSize: '13px', margin: '4px 0 0' }}>
              Data is now available in the database for all chatbots.
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={runAllBatches}
          disabled={running}
          style={{
            background: running ? '#374151' : 'linear-gradient(135deg, #C9A227, #F59E0B)',
            color: running ? '#9CA3AF' : '#000',
            border: 'none',
            borderRadius: '10px',
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: running ? 'not-allowed' : 'pointer',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {running ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
              Scraping in progress... please wait
            </>
          ) : (
            <>🚀 Start Ontario Bulk Scrape</>
          )}
        </button>

        {/* Warning */}
        <div style={{ background: '#1C1917', border: '1px solid #F59E0B55', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px' }}>
          <strong style={{ color: '#F59E0B' }}>⚠️ Important Notes:</strong>
          <ul style={{ color: '#D1D5DB', fontSize: '13px', marginTop: '8px', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>This process will take <strong>30–60 minutes</strong> to complete all cities. Keep this tab open.</li>
            <li>Each city fetches up to <strong>15 properties</strong> to stay within the 300MB database limit.</li>
            <li>Cities already scraped today will be automatically <strong>skipped</strong>.</li>
            <li>You can run this once a week to refresh the data.</li>
          </ul>
        </div>

        {/* Results Log */}
        {results.length > 0 && (
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>📋 Scrape Log</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {results.map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#0F172A',
                  borderRadius: '8px',
                  fontSize: '13px',
                  borderLeft: `3px solid ${r.status === 'done' ? '#10B981' : r.status === 'skipped' ? '#F59E0B' : '#EF4444'}`
                }}>
                  <span style={{ color: '#E2E8F0' }}>{r.city}</span>
                  <span style={{ color: r.status === 'done' ? '#10B981' : r.status === 'skipped' ? '#F59E0B' : '#EF4444' }}>
                    {r.status === 'done' ? `✅ ${r.count} properties` : r.status === 'skipped' ? '⏭ Skipped' : `❌ ${r.reason}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
