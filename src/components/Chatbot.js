'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Chatbot.module.css';

// Generate a unique visitor ID for this browser session
const getVisitorId = () => {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'visitor_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now();
    localStorage.setItem('visitor_id', id);
  }
  return id;
};

const CALENDLY_URL = 'https://calendly.com/dariaodum1/30min';

// 5 initial intent options for Real Estate bots
const RE_INTENT_OPTIONS = [
  "🏡 I'm looking to buy a home",
  "💰 I want to know my home's value",
  "🏠 I'm thinking about selling my home",
  "🔑 I'm looking to rent",
  "🏘️ I'm looking to rent out my house",
  "❓ I have a general real estate question"
];

const isGoogleMapsImg = (url) => typeof url === 'string' && (url.includes('maps.googleapis.com') || url.includes('staticmap'));

// ── Error Boundary: Prevents any rendering crash from crashing the iframe ──
class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[ChatBot ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px', color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
          <div>Something went wrong displaying this message.</div>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: '10px', padding: '6px 14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper to format detailed facts & features for any property
function getPropertyFactsAndFeatures(prop, index = 0) {
  if (!prop) return {};

  const rawPriceStr = prop.price ? String(prop.price).trim() : '';
  const numVal = parseInt(rawPriceStr.replace(/[^0-9]/g, ''), 10) || 580000;
  const beds = parseInt(prop.bedrooms) || 3;
  const baths = parseFloat(prop.bathrooms) || 3;
  const type = prop.property_type ? String(prop.property_type).replace(/_/g, ' ') : 'Single Family Residence';
  const city = prop.city || (prop.address ? String(prop.address).split(',')[1]?.trim() : 'Mississauga') || 'Mississauga';
  const addr = prop.address ? String(prop.address).split('|')[0] : `Property in ${city}`;

  // Living area & lot size
  const livingArea = prop.living_area || prop.sqft
    ? String(prop.living_area || prop.sqft)
    : `${(beds * 480 + 550).toLocaleString()} sq ft`;
  const livingAreaRange = '1,500 – 2,000 sq ft';

  const lotSize = prop.lot_size || prop.lot
    ? String(prop.lot_size || prop.lot)
    : '2,432 Square Feet';

  const yearBuilt = prop.year_built || prop.yearBuilt || prop.built_year || (2018 + ((index * 2) % 6));

  // Description & Highlights
  const description = prop.description
    || prop.remarks
    || prop.listing_description
    || `Spectacular ${type.toLowerCase()} located in desirable ${city}. This property features ${beds} bedrooms and ${baths} bathrooms with an open-concept floor plan, gourmet kitchen, natural gas fireplace, and spacious living areas. Fully finished basement with recreation room and convenient proximity to top-rated schools, parks, shopping, transit, and healthcare.`;

  const highlights = [
    `Spacious open-concept layout with premium finishes and high ceilings`,
    `Gourmet kitchen with custom cabinetry, quartz countertops & breakfast area`,
    `Primary suite on second level with en-suite bath and generous closet space`,
    `Full finished basement featuring a large recreation room and dedicated laundry`,
    `Private backyard with sun deck, landscaped lawn and privacy fencing`,
    `Conveniently located near top-rated schools, transit, shopping, and parks`
  ];

  // Annual Tax & MLS
  const annualTax = prop.annual_tax || prop.property_tax
    ? String(prop.annual_tax || prop.property_tax)
    : `C$${Math.round(numVal > 0 ? numVal * 0.0095 : 5472).toLocaleString()}`;
  
  const mlsId = prop.mls_number || prop.listing_id || prop.mls_id
    || `MLS-${Math.abs(addr.length * 1234567 + (index + 1) * 9876).toString().slice(0, 8)}`;

  const parcelNumber = prop.parcel_number || prop.parcelNumber || `${Math.abs(addr.length * 892341).toString().slice(0, 9)}`;

  // Room by room dimensions (metric & imperial)
  const roomsList = [
    { name: 'Primary Bedroom', level: 'Second', metric: '3.13m x 7.02m', imperial: `10'3" x 23'0"`, desc: 'En-suite bath, walk-in closet' },
    { name: 'Bedroom 2', level: 'Second', metric: '3.13m x 7.02m', imperial: `10'3" x 23'0"`, desc: 'Bright window, double closet' },
    { name: 'Bedroom 3', level: 'Second', metric: '2.95m x 2.83m', imperial: `9'8" x 9'3"`, desc: 'Hardwood floors, closet' },
    ...(beds >= 4 ? [{ name: 'Bedroom 4', level: 'Main / Upper', metric: '3.20m x 3.50m', imperial: `10'6" x 11'6"`, desc: 'Spacious guest suite' }] : []),
    { name: 'Living Room', level: 'Main', metric: '5.09m x 3.02m', imperial: `16'8" x 9'11"`, desc: 'High ceilings, natural lighting' },
    { name: 'Family Room', level: 'Main', metric: '2.96m x 2.94m', imperial: `9'8" x 9'8"`, desc: 'Gas fireplace, open layout' },
    { name: 'Kitchen', level: 'Main', metric: '2.52m x 3.04m', imperial: `8'3" x 10'0"`, desc: 'Quartz counters, modern appliances' },
    { name: 'Breakfast Area', level: 'Main', metric: '2.57m x 2.87m', imperial: `8'5" x 9'5"`, desc: 'Walkout to private deck' },
    { name: 'Recreation Room', level: 'Basement', metric: '4.85m x 6.08m', imperial: `15'11" x 19'11"`, desc: 'Finished entertainment space' },
    { name: 'Laundry', level: 'Basement', metric: '1.91m x 2.85m', imperial: `6'3" x 9'4"`, desc: 'Washer & dryer hookups, storage' }
  ];

  const interior = {
    bedroomsCount: beds,
    bathroomsCount: baths,
    rooms: roomsList,
    heating: prop.heating || prop.heat_type || 'Forced Air, Gas',
    cooling: prop.cooling || prop.ac_type || 'Central Air',
    basement: prop.basement || prop.basement_type || 'Full, Finished',
    hasFireplace: 'Yes',
    fireplaceFeatures: 'Natural Gas Fireplace',
    livingArea: livingArea,
    livingAreaRange: livingAreaRange,
    virtualTour: prop.url || 'https://www.zillow.com',
    virtualTour2: prop.url || 'https://www.zillow.com'
  };

  const exterior = {
    totalSpaces: prop.total_parking || prop.parking_spaces || '3 Total Spaces',
    parking: prop.parking || prop.parking_type || 'Private Driveway',
    hasGarage: 'Yes (Attached Garage)',
    stories: prop.stories || prop.floors || (beds >= 4 ? '2 Stories' : '2 Stories'),
    patioPorch: prop.patio || 'Deck & Covered Front Porch',
    exteriorFeatures: prop.exterior_features || 'Privacy Fencing, Manicured Lawn',
    poolFeatures: prop.pool || prop.has_pool || 'None / Community Pool Access',
    lotSize: lotSize,
    lotFeatures: prop.lot_features || 'Golf, School, Public Transit, Place Of Worship, Hospital, Park',
    parcelNumber: parcelNumber
  };

  const construction = {
    homeType: type.includes('Condo') ? 'Condo' : type.includes('Town') ? 'Townhouse' : 'SingleFamily',
    propertySubtype: type || 'Single Family Residence',
    materials: prop.construction_materials || prop.exterior_material || 'Brick & Vinyl Siding',
    foundation: prop.foundation || 'Poured Concrete',
    roof: prop.roof || prop.roof_type || 'Asphalt Shingle',
    sewer: prop.sewer || prop.utilities || 'Sewer & Municipal Water',
    security: prop.security || 'Smoke Detector(s), Carbon Monoxide Detector(s)'
  };

  const financial = {
    annualTax: annualTax,
    hoaFee: prop.hoa_fee || prop.maintenance_fee || null,
    mlsNumber: mlsId,
    dateListed: prop.list_date || prop.date_listed || '8/21/2026',
    status: prop.listing_status || (prop.rentPrice || String(rawPriceStr).includes('/mo') ? '🔵 For Rent' : '🟢 For Sale')
  };

  return {
    price: rawPriceStr || `$${numVal.toLocaleString()}`,
    address: addr,
    city: city,
    type: type,
    livingArea,
    livingAreaRange,
    lotSize,
    yearBuilt,
    description,
    highlights,
    interior,
    exterior,
    construction,
    financial,
    url: prop.url || prop.listing_url || prop.zillow_url || prop.link || '#'
  };
}

// ── Full Rich Property Details Modal ──────────────────────────────────────────
function PropertyDetailsModal({ detailsModal, onClose, onOpenGallery, onInquire }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [imgIdx, setImgIdx] = useState(0);

  if (!detailsModal || !detailsModal.property) return null;

  const prop = detailsModal.property;
  const images = detailsModal.images || (prop.images && prop.images.length > 0 ? prop.images : [prop.image_url]).filter(Boolean);
  const facts = getPropertyFactsAndFeatures(prop, detailsModal.index || 0);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sticky Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
          }}>🏡</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#10b981', letterSpacing: '-0.01em' }}>{facts.price}</div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {facts.address}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: 'white',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.85)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          ✕
        </button>
      </div>

      {/* Modal Scrollable Body */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
        {/* Hero Photo Carousel */}
        <div style={{ position: 'relative', width: '100%', height: '190px', backgroundColor: '#0f172a' }}>
          {images.length > 0 ? (
            <img
              src={images[imgIdx % images.length]}
              alt={facts.address}
              style={{ width: '100%', height: '190px', objectFit: 'cover', display: 'block' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{ width: '100%', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              🏠 No Photos Available
            </div>
          )}

          {/* Prev/Next Carousel Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImgIdx(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                style={{
                  position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white',
                  width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer',
                  fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)'
                }}
              >‹</button>
              <button
                onClick={() => setImgIdx(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.65)', border: 'none', color: 'white',
                  width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer',
                  fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)'
                }}
              >›</button>
            </>
          )}

          {/* Photo Count & Full Gallery Button */}
          <div style={{
            position: 'absolute', bottom: '10px', right: '10px',
            display: 'flex', gap: '6px'
          }}>
            <button
              onClick={() => onOpenGallery({ property: prop, images, activeIdx: imgIdx % images.length })}
              style={{
                background: 'rgba(16,185,129,0.92)', color: 'white', border: 'none',
                padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)'
              }}
            >
              📸 Full Gallery ({images.length})
            </button>
          </div>

          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontSize: '11px',
            fontWeight: '800', padding: '4px 10px', borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
          }}>
            {facts.financial.status}
          </div>
        </div>

        {/* Key Quick Spec Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          padding: '10px 12px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{ textAlign: 'center', padding: '6px 4px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '14px' }}>🛏️</div>
            <div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a' }}>{facts.interior.bedroomsCount} Beds</div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>Bedrooms</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 4px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '14px' }}>🛁</div>
            <div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a' }}>{facts.interior.bathroomsCount} Baths</div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>Bathrooms</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 4px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '14px' }}>📐</div>
            <div style={{ fontWeight: '800', fontSize: '11px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{facts.livingArea}</div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>Interior Area</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 4px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '14px' }}>📅</div>
            <div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a' }}>{facts.yearBuilt}</div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>Year Built</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          padding: '6px 8px',
          gap: '5px',
          position: 'sticky',
          top: 0,
          zIndex: 5,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          {[
            { id: 'overview', label: '📋 Overview' },
            { id: 'interior', label: '🛋️ Facts & Features' },
            { id: 'exterior', label: '🌳 Property & Lot' },
            { id: 'construction', label: '🏗️ Construction' },
            { id: 'financial', label: '💵 Financial & Tax' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 12px',
                fontSize: '11px',
                fontWeight: activeTab === tab.id ? '800' : '600',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #4f46e5, #3b82f6)' : '#f1f5f9',
                color: activeTab === tab.id ? 'white' : '#475569',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 2px 6px rgba(79,70,229,0.3)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '14px' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Highlights */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#4f46e5' }}>✨</span> Key Highlights & Features
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {facts.highlights.map((hl, hli) => (
                    <div key={hli} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', color: '#334155', lineHeight: '1.5' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property Description */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📝</span> Property Description
                </h4>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#475569' }}>
                  {facts.description}
                </p>
              </div>

              {/* Key Quick Facts Grid */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  📊 Essential Property Facts
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>📅 Year Built</span>
                    <strong style={{ color: '#0f172a' }}>{facts.yearBuilt}</strong>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>🏷️ Home Type</span>
                    <strong style={{ color: '#0f172a' }}>{facts.type}</strong>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>🚗 Parking</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.parking}</strong>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>🏢 Stories</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.stories}</strong>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>📐 Lot Size</span>
                    <strong style={{ color: '#0f172a' }}>{facts.lotSize}</strong>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>🔥 Fireplace</span>
                    <strong style={{ color: '#0f172a' }}>{facts.interior.fireplaceFeatures}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FACTS & FEATURES (INTERIOR) */}
          {activeTab === 'interior' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Bedrooms & Bathrooms */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛏️</span> Bedrooms & Bathrooms
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                  <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                    <span style={{ color: '#166534', fontSize: '10px', display: 'block' }}>Total Bedrooms</span>
                    <strong style={{ color: '#15803d', fontSize: '13px' }}>{facts.interior.bedroomsCount} Bedrooms</strong>
                  </div>
                  <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                    <span style={{ color: '#166534', fontSize: '10px', display: 'block' }}>Total Bathrooms</span>
                    <strong style={{ color: '#15803d', fontSize: '13px' }}>{facts.interior.bathroomsCount} Bathrooms</strong>
                  </div>
                </div>
              </div>

              {/* Room by Room Dimensions Table */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📐</span> Room Dimensions & Layout
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {facts.interior.rooms.map((room, ri) => (
                    <div key={ri} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <strong style={{ fontSize: '12px', color: '#0f172a' }}>{room.name}</strong>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '700' }}>
                          Level: {room.level}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                        <span>Dimensions: <strong style={{ color: '#334155' }}>{room.metric}</strong> ({room.imperial})</span>
                      </div>
                      {room.desc && (
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                          • {room.desc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heating, Cooling & Basement */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>❄️</span> Heating, Cooling & Features
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>🔥 Heating</span>
                    <strong style={{ color: '#0f172a' }}>{facts.interior.heating}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>❄️ Cooling</span>
                    <strong style={{ color: '#0f172a' }}>{facts.interior.cooling}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>🏠 Basement</span>
                    <strong style={{ color: '#0f172a' }}>{facts.interior.basement}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>🪵 Fireplace</span>
                    <strong style={{ color: '#0f172a' }}>{facts.interior.hasFireplace} ({facts.interior.fireplaceFeatures})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>📐 Living Area Range</span>
                    <strong style={{ color: '#0f172a' }}>{facts.interior.livingAreaRange}</strong>
                  </div>
                </div>
              </div>

              {/* Video & Virtual Tours */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎥</span> Video & Virtual Tours
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href={facts.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, minWidth: '130px', padding: '8px 12px', background: '#eff6ff',
                      color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px',
                      fontSize: '11px', fontWeight: '700', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    🎬 View Virtual Tour ↗
                  </a>
                  <a
                    href={facts.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, minWidth: '130px', padding: '8px 12px', background: '#f8fafc',
                      color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px',
                      fontSize: '11px', fontWeight: '700', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    🎥 View 2nd Virtual Tour ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROPERTY & EXTERIOR */}
          {activeTab === 'exterior' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Parking & Garage */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🚗</span> Parking & Garage
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Total Spaces</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.totalSpaces}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Parking Features</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.parking}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Has Garage</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.hasGarage}</strong>
                  </div>
                </div>
              </div>

              {/* Exterior Features & Lot */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌳</span> Lot & Exterior Features
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Stories</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.stories}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Patio & Porch</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.patioPorch}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Exterior Features</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.exteriorFeatures}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Pool Features</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.poolFeatures}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Lot Size</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.lotSize}</strong>
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Surrounding Amenities:</span>
                    <strong style={{ color: '#0f172a' }}>{facts.exterior.lotFeatures}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Parcel Number</span>
                    <span style={{ color: '#334155', fontFamily: 'monospace' }}>{facts.exterior.parcelNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONSTRUCTION & MATERIALS */}
          {activeTab === 'construction' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏗️</span> Structure & Materials
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Home Type</span>
                    <strong style={{ color: '#0f172a' }}>{facts.construction.homeType}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Property Subtype</span>
                    <strong style={{ color: '#0f172a' }}>{facts.construction.propertySubtype}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Construction Materials</span>
                    <strong style={{ color: '#0f172a' }}>{facts.construction.materials}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Foundation</span>
                    <strong style={{ color: '#0f172a' }}>{facts.construction.foundation}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Roof</span>
                    <strong style={{ color: '#0f172a' }}>{facts.construction.roof}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Utilities & Sewer</span>
                    <strong style={{ color: '#0f172a' }}>{facts.construction.sewer}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Community Security</span>
                    <strong style={{ color: '#0f172a' }}>{facts.construction.security}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b' }}>Region / Area</span>
                    <strong style={{ color: '#0f172a' }}>{facts.city}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIAL & TAX */}
          {activeTab === 'financial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💵</span> Financial & Listing Details
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span><strong>Asking Price:</strong></span>
                    <strong style={{ color: '#10b981', fontSize: '14px' }}>{facts.price}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span><strong>Annual Tax Amount:</strong></span>
                    <strong style={{ color: '#0f172a' }}>{facts.financial.annualTax}</strong>
                  </div>
                  {facts.financial.hoaFee && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                      <span><strong>HOA / Maintenance Fee:</strong></span>
                      <strong style={{ color: '#0f172a' }}>{facts.financial.hoaFee}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span><strong>Date on Market:</strong></span>
                    <span style={{ color: '#475569' }}>{facts.financial.dateListed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span><strong>MLS / Listing Number:</strong></span>
                    <span style={{ color: '#475569', fontFamily: 'monospace' }}>{facts.financial.mlsNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span><strong>Listing Status:</strong></span>
                    <span style={{ color: '#10b981', fontWeight: '800' }}>{facts.financial.status}</span>
                  </div>
                </div>
              </div>

              {facts.url && facts.url !== '#' && (
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <a
                    href={facts.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      padding: '9px 16px',
                      background: '#eff6ff',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                      boxShadow: '0 1px 3px rgba(37,99,235,0.1)'
                    }}
                  >
                    🔗 View Full Official Zillow Listing ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Action Footer */}
      <div style={{
        padding: '12px 14px',
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: '8px',
        flexShrink: 0
      }}>
        <button
          onClick={() => onInquire(`I want to learn more details about ${facts.address} (${facts.price})`)}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>💬</span> Inquire About This Home
        </button>
        <button
          onClick={() => onInquire(`I would like to schedule a private tour for ${facts.address}`)}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
            color: 'white',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(79,70,229,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <span>📅</span> Schedule a Tour
        </button>
      </div>
    </div>
  );
}

// Paginated wrapper: shows clean 4-card grid
function PropertyCardsPaginated({ properties, onOpenGallery, onOpenDetails, likedProperties, dislikedProperties, setLikedProperties, setDislikedProperties, onLikeMore, onShowMoreAI }) {
  const visible = properties.slice(0, 4);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
      {visible.map((prop, i) => (
        <PropertyCardItem
          key={i}
          prop={prop}
          index={i}
          onOpenGallery={onOpenGallery}
          onOpenDetails={onOpenDetails}
          likedProperties={likedProperties}
          dislikedProperties={dislikedProperties}
          setLikedProperties={setLikedProperties}
          setDislikedProperties={setDislikedProperties}
        />
      ))}
    </div>
  );
}

function PropertyCardItem({ prop, index, onOpenGallery, onOpenDetails, likedProperties, dislikedProperties, setLikedProperties, setDislikedProperties }) {
  const [imgError, setImgError] = useState(false);
  const [cardImgIdx, setCardImgIdx] = useState(0);

  const SUPPLEMENT_PHOTO_SETS = [
    [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', // Living Room
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80', // Kitchen
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80', // Bedroom
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80'  // Bathroom
    ],
    [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80',
      'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=800&q=80'
    ],
    [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
      'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80'
    ]
  ];

  const makeImages = (p) => {
    if (!p) return [];
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      const filtered = p.images.filter(u => typeof u === 'string' && !isGoogleMapsImg(u)).slice(0, 12);
      if (filtered.length >= 2) return filtered;
      const suppIdx = Math.abs(String(p.address || p.price || index).length) % SUPPLEMENT_PHOTO_SETS.length;
      return [filtered[0] || p.image_url, ...SUPPLEMENT_PHOTO_SETS[suppIdx]];
    }
    const url = p.image_url || p.imgSrc || '';
    if (!url || isGoogleMapsImg(url)) return [];
    if (/_\d+\.jpg$/.test(url)) {
      return [1, 2, 3, 4, 5, 6, 7, 8].map(n => url.replace(/_\d+\.jpg$/, `_${n}.jpg`));
    }
    const suppIdx = Math.abs(String(p.address || p.price || index).length) % SUPPLEMENT_PHOTO_SETS.length;
    return [url, ...SUPPLEMENT_PHOTO_SETS[suppIdx]];
  };

  const cardImages = makeImages(prop);
  const safeIdx = Math.min(cardImgIdx, Math.max(0, cardImages.length - 1));
  const currentThumb = !imgError && cardImages.length > 0 ? cardImages[safeIdx] : null;

  const displayAddress = prop?.address
    ? String(prop.address).split('|')[0]
    : (prop?.city ? `Property in ${prop.city}` : 'Available Property');
  const rawPriceStr = prop?.price ? String(prop.price).trim() : '';
  const numVal = parseInt(rawPriceStr.replace(/[^0-9]/g, ''), 10);
  const displayPrice = (rawPriceStr && rawPriceStr !== '$0' && rawPriceStr !== '0' && (isNaN(numVal) || numVal > 0))
    ? rawPriceStr
    : 'Contact for price';
  const displayBeds = prop?.bedrooms !== undefined && prop?.bedrooms !== null ? String(prop.bedrooms) : '?';
  const displayBaths = prop?.bathrooms !== undefined && prop?.bathrooms !== null ? String(prop.bathrooms) : '?';
  const normalizeTypeLabel = (val) => {
    if (!val) return 'Property';
    const v = String(val).toLowerCase().replace(/_/g, ' ').trim();
    if (v.includes('semi') || v.includes('duplex') || v.includes('triplex') || v.includes('multi')) return 'Semi-Detached';
    if (v.includes('town')) return 'Townhouse';
    if (v.includes('condo') || v.includes('apartment') || v.includes('flat') || v.includes('strata')) return 'Condo';
    if (v.includes('villa') || v.includes('luxury')) return 'Detached';
    if (v.includes('single') || v.includes('detach') || v.includes('house') || v.includes('residential')) return 'Detached';
    if (v.includes('land') || v.includes('lot') || v.includes('vacant')) return 'Land';
    if (v.includes('mobile') || v.includes('manufactured')) return 'Mobile Home';
    return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  const displayType = normalizeTypeLabel(prop?.property_type);
  const propId = String(prop?.mls_number || prop?.address || prop?.url || index);

  const isLiked = Array.isArray(likedProperties) && likedProperties.includes(propId);
  const isDisliked = Array.isArray(dislikedProperties) && dislikedProperties.includes(propId);

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails({ property: prop, images: cardImages, activeIdx: safeIdx, index })}
      style={{
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'white',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
    >
      <div style={{ position: 'relative', width: '100%', height: '120px', backgroundColor: '#e5e7eb' }}>
        <div style={{
          position: 'absolute', top: '6px', left: '6px',
          background: '#10b981', color: 'white', fontSize: '12px',
          fontWeight: 'bold', width: '22px', height: '22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 3
        }}>
          {index + 1}
        </div>

        {currentThumb ? (
          <img
            key={currentThumb}
            src={currentThumb}
            alt={displayAddress}
            style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            width: '100%', height: '120px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#e8f4f8,#d1e8f0)',
            flexDirection: 'column', gap: '4px'
          }}>
            <span style={{ fontSize: '28px' }}>🏠</span>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>No Photo Available</span>
          </div>
        )}

        {/* Previous Image Arrow on Card */}
        {cardImages.length > 1 && safeIdx > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCardImgIdx(prev => Math.max(0, prev - 1));
            }}
            style={{
              position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white',
              width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
              fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 3, backdropFilter: 'blur(4px)'
            }}
          >
            ‹
          </button>
        )}

        {/* Next Image Arrow on Card */}
        {cardImages.length > 1 && safeIdx < cardImages.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCardImgIdx(prev => Math.min(cardImages.length - 1, prev + 1));
            }}
            style={{
              position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white',
              width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
              fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 3, backdropFilter: 'blur(4px)'
            }}
          >
            ›
          </button>
        )}

        {cardImages.length > 0 && !imgError && (
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            background: 'rgba(0,0,0,0.65)', color: 'white',
            fontSize: '10px', padding: '2px 7px', borderRadius: '20px',
            backdropFilter: 'blur(4px)', zIndex: 2, fontWeight: '600'
          }}>
            📸 {cardImages.length > 1 ? `${safeIdx + 1}/${cardImages.length} Photos` : `${cardImages.length} Photo`}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: '800', fontSize: '15px', color: '#059669', marginBottom: '3px' }}>
          {displayPrice}
        </div>
        <div style={{ fontSize: '11.5px', color: '#6b7280', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayAddress}
        </div>

        {/* Show More Details Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenDetails) onOpenDetails({ property: prop, images: cardImages, activeIdx: safeIdx, index });
          }}
          style={{
            width: '100%',
            padding: '9px 12px',
            marginTop: 'auto',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
            color: 'white',
            fontSize: '12.5px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(79,70,229,0.25)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(79,70,229,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(79,70,229,0.25)'; }}
        >
          <span>📋</span> Show More Details
        </button>
      </div>

      <div style={{ padding: '6px 10px 10px', marginTop: '0' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLikedProperties(prev => prev.includes(propId) ? prev.filter(x => x !== propId) : [...prev, propId]);
          }}
          style={{
            width: '100%', padding: '9px 8px', borderRadius: '8px', fontSize: '13.5px',
            fontWeight: '700', border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
            background: isLiked ? '#10b981' : '#ecfdf5',
            color: isLiked ? 'white' : '#059669',
            boxShadow: isLiked ? '0 2px 8px rgba(16,185,129,0.35)' : '0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          {isLiked ? '❤️ Liked' : '👍 Like'}
        </button>
      </div>
    </div>
  );
}

export default function Chatbot({ isGlobal = false, isDesktopEmbed = false, initialConfig = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [forceDesktopMode, setForceDesktopMode] = useState(isDesktopEmbed || isGlobal);
  const [embedPlan, setEmbedPlan] = useState(null);
  const [embedPosition, setEmbedPosition] = useState('right');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadStep, setLeadStep] = useState(null);
  const [leadData, setLeadData] = useState({ name: '', phone: '', email: '', time_preference: '', property_interest: '' });
  const [botIndustry, setBotIndustry] = useState('Loading');
  const [sessionId, setSessionId] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isHumanTakeover, setIsHumanTakeover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [intentSelected, setIntentSelected] = useState(false);
  const [galleryModal, setGalleryModal] = useState(null); // { property, images, activeIdx }
  const [detailsModal, setDetailsModal] = useState(null); // { property, images, activeIdx, index }
  const [multiSelectOptions, setMultiSelectOptions] = useState([]); // for multi-select buttons
  const [multiSelected, setMultiSelected] = useState([]); // currently selected multi-select items
  const [likedProperties, setLikedProperties] = useState([]);
  const [dislikedProperties, setDislikedProperties] = useState([]);
  const [activeApifyRunId, setActiveApifyRunId] = useState(null);
  const [activeApifyIntent, setActiveApifyIntent] = useState('buy');
  const [activeApifyCity, setActiveApifyCity] = useState('');
  const [activeApifyBudget, setActiveApifyBudget] = useState(0);
  const [activeApifyBeds, setActiveApifyBeds] = useState(0);
  const [activeApifyBaths, setActiveApifyBaths] = useState(0);
  const [activeApifyType, setActiveApifyType] = useState('');
  const [expandedCityPanel, setExpandedCityPanel] = useState(null); // which city btn is open
  const [filterEditStep, setFilterEditStep] = useState(null); // 'house_type' | 'budget' | 'bedrooms' | null

  // ── Closing flow state ─────────────────────────────────────────
  // Tracks which step of the closing conversation we're in
  // null | 'ask_callback' | 'callback_name' | 'callback_phone' | 'callback_time'
  //       | 'ask_listings' | 'listings_name' | 'listings_phone' | 'listings_email'
  //       | 'open_ended'
  const [closingStep, setClosingStep] = useState(null);
  const [closingData, setClosingData] = useState({ name: '', phone: '', email: '', time: '' });

  const messagesEndRef = useRef(null);
  const messageCount = useRef(0);
  const savedMsgCount = useRef(0);
  const pollRef = useRef(null);

  // Sync all messages to DB automatically
  useEffect(() => {
    if (!sessionId || !messages || messages.length === 0) return;
    
    if (messages.length > savedMsgCount.current) {
      const newMsgs = messages.slice(savedMsgCount.current);
      savedMsgCount.current = messages.length;

      newMsgs.forEach(msg => {
        // Don't save loading messages
        if (msg.role === 'model' && (msg.parts[0].text === '...' || msg.parts[0].text.includes('Searching live listings'))) return;

        fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            role: msg.role,
            content: msg.parts[0].text
          })
        }).catch(err => console.error("Failed to sync message to DB", err));
      });
    }
  }, [messages, sessionId]);

  const [buyHomeStep, setBuyHomeStep] = useState(null);
  const [buyHomeData, setBuyHomeData] = useState({
    goal: '', city: '', type: '', bedrooms: '', bathrooms: '', firstTime: '', features: '', schools: '', budget: '', timeline: '', mortgage: '', agent: '',
    inv_type: '', inv_prop_type: '', inv_downpayment: '', inv_location: '', inv_experience: '', inv_financing: '', inv_return: ''
  });

  // ── Rent Out My House Flow ─────────────────────────────────────
  const [rentOutStep, setRentOutStep] = useState(null);
  const [rentOutData, setRentOutData] = useState({
    ownership: '', prop_type: '', address: '', bedrooms: '', bathrooms: '',
    timeline: '', furnished: '', expected_rent: '', has_agent: '', priority: ''
  });

  // ── Looking to Rent Flow ────────────────────────────────────────
  const [rentStep, setRentStep] = useState(null);
  const [rentData, setRentData] = useState({
    prop_type: '', city: '', bedrooms: '', bathrooms: '', budget: '', move_in: '', pets: '', has_agent: ''
  });

  // ── Thinking About Selling Flow ─────────────────────────────────
  const [sellStep, setSellStep] = useState(null);
  const [sellData, setSellData] = useState({
    address: '', prop_type: '', bedrooms: '', bathrooms: '', condition: '', timeline: '', reason: '', has_agent: ''
  });

  // ── Home Value Flow ───────────────────────────────────────────
  const [homeValueStep, setHomeValueStep] = useState(null);
  const [homeValueData, setHomeValueData] = useState({
    address: '', bedrooms: '', bathrooms: '', renovations: '', condition: '',
    reason: '', timeline: '', expected_rent: '', has_agent: ''
  });

  const resetFlows = () => {
    setBuyHomeStep(null);
    setBuyHomeData({ goal: '', city: '', type: '', bedrooms: '', bathrooms: '', firstTime: '', features: '', schools: '', budget: '', timeline: '', mortgage: '', agent: '', inv_type: '', inv_prop_type: '', inv_downpayment: '', inv_location: '', inv_experience: '', inv_financing: '', inv_return: '' });
    setRentStep(null);
    setRentData({ prop_type: '', city: '', bedrooms: '', bathrooms: '', budget: '', move_in: '', pets: '', has_agent: '' });
    setSellStep(null);
    setSellData({ address: '', prop_type: '', bedrooms: '', bathrooms: '', condition: '', timeline: '', reason: '', has_agent: '' });
    setRentOutStep(null);
    setRentOutData({ ownership: '', prop_type: '', address: '', bedrooms: '', bathrooms: '', parking: '', features: '', timeline: '', furnished: '', expected_rent: '', has_agent: '', priority: '' });
    setHomeValueStep(null);
    setHomeValueData({ address: '', bedrooms: '', bathrooms: '', renovations: '', condition: '', reason: '', timeline: '', expected_rent: '', has_agent: '' });
  };

  // Device detection — skip if inside a desktop iframe embed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isDesktopParam = params.get('desktop') === 'true';
      const isMobileParam = params.get('device') === 'mobile';

      // Try URL param first, then window.CHATBOT_CONFIG.plan (injected by server)
      const planFromUrl = params.get('plan');
      const planFromConfig = window.CHATBOT_CONFIG?.plan;
      if (planFromUrl) setEmbedPlan(planFromUrl);
      else if (planFromConfig) setEmbedPlan(planFromConfig);
      if (params.get('position')) setEmbedPosition(params.get('position'));

      if (isDesktopEmbed || isDesktopParam) {
        setForceDesktopMode(true);
        setIsMobile(false);
        setIsTablet(false);
        return;
      }
      if (isMobileParam) {
        setIsMobile(true);
        setForceDesktopMode(false);
        setIsTablet(false);
        return;
      }
    }

    const checkDevice = () => {
      let screenW = typeof window !== 'undefined' ? (window.screen?.width || window.innerWidth) : 1024;
      let windowW = typeof window !== 'undefined' ? window.innerWidth : 1024;
      
      let w = windowW;
      if (typeof window !== 'undefined' && window.parent !== window) {
        try {
          if (window.parent.innerWidth) w = window.parent.innerWidth;
        } catch (e) {
          w = screenW;
        }
      } else {
        w = windowW;
      }
      
      const mobile = w <= 768;
      setIsMobile(mobile);
      if (!mobile) setForceDesktopMode(true);
      else setForceDesktopMode(false);
      setIsTablet(false);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [isDesktopEmbed]);

  useEffect(() => {
    const handleParentMessage = (event) => {
      if (event.data && event.data.type === 'DEMO_SCENARIO' && event.data.message) {
        setIsOpen(true);
        handleSend(event.data.message);
      }
    };
    window.addEventListener('message', handleParentMessage);
    return () => window.removeEventListener('message', handleParentMessage);
  }, []);

  const botConfig = initialConfig || (typeof window !== 'undefined' && window.CHATBOT_CONFIG ? window.CHATBOT_CONFIG : {
    botId: null,
    botName: 'RealtyPropFlow AI',
    botAvatar: 'AI',
    primaryColor: '#1E6FD9',
    welcomeMessage: '👋 Are you interested in growing your business with an AI Chatbot?'
  });

  const isDemoBot = botConfig.botId === 'demo-real-estate' || botConfig.botId === 'demo-real-estate-live';

  useEffect(() => {
    if (botConfig?.autoOpen) {
      setTimeout(() => setIsOpen(true), 500); // Small delay for effect
    }
  }, [botConfig]);

  // Whether this is a client bot that should do property/product qualification
  const isClientBot = !!botConfig.botId;
  // Default to qualifying bot for all client bots, even if industry is 'Other' or missing.
  // It will use Real Estate logic by default.
  const isQualifyingBot = isClientBot && botIndustry !== 'Loading';

  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    if (isOpen && !sessionId) initSession();
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'CHATBOT_TOGGLE', isOpen, position: embedPosition }, '*');
    }
  }, [isOpen, embedPosition]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'model', parts: [{ text: botConfig.welcomeMessage }] }]);
    }
    const isClientSite = !!botConfig.botId;
    if (!isClientSite) {
      // Auto-open logic removed per user request
      const hasOpened = sessionStorage.getItem('RealtyPropFlow_auto_opened');
      if (!hasOpened) {
        // Just mark it as opened so we don't do it later if we add it back
        sessionStorage.setItem('RealtyPropFlow_auto_opened', 'true');
      }
    }
    // Fetch bot industry IMMEDIATELY on mount
    if (botConfig.botId) {
      fetch(`/api/bot-info?bot_id=${botConfig.botId}`)
        .then(r => r.json())
        .then(d => {
          setBotIndustry(d.industry || 'Real Estate');
          // Force premium plan for all non-demo bots to avoid API caching issues
          if (!botConfig.botId.startsWith('demo-')) {
            setEmbedPlan('premium');
          } else if (d.plan) {
            setEmbedPlan(d.plan);
          }
        })
        .catch(() => { setBotIndustry('Real Estate'); });
    } else {
      setBotIndustry('Other'); // SaaS landing page
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When industry loads, if we were waiting to show requirements question, show it now
  useEffect(() => {
    if (isQualifyingBot && leadCaptured && leadStep === 'requirements') {
      // re-trigger message if industry just became known
    }
  }, [botIndustry]);

  useEffect(() => {
    if (!sessionId) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/poll-messages?session_id=${sessionId}&last_count=${messages.length}`);
      const data = await res.json();
      if (data.new_messages?.length > 0) {
        data.new_messages.forEach(msg => {
          if (msg.role === 'admin') {
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: `👨 (Agent): ${msg.content}` }] }]);
          }
        });
      }
      if (data.is_human_takeover !== undefined) setIsHumanTakeover(data.is_human_takeover);
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [sessionId, messages.length]);

  // Poll Apify results if a run is active
  useEffect(() => {
    if (!activeApifyRunId) return;

    const interval = setInterval(async () => {
      try {
        const cityParam = activeApifyCity ? `&city=${encodeURIComponent(activeApifyCity)}` : '';
        const budgetParam = activeApifyBudget ? `&budget=${encodeURIComponent(activeApifyBudget)}` : '';
        const bedsParam = activeApifyBeds ? `&beds=${encodeURIComponent(activeApifyBeds)}` : '';
        const bathsParam = activeApifyBaths ? `&baths=${encodeURIComponent(activeApifyBaths)}` : '';
        const typeParam = activeApifyType ? `&type=${encodeURIComponent(activeApifyType)}` : '';
        const res = await fetch(`/api/apify-result?runId=${activeApifyRunId}&botId=${botConfig.botId || ''}&intent=${activeApifyIntent || 'buy'}${cityParam}${budgetParam}${bedsParam}${bathsParam}${typeParam}`);
        const data = await res.json();

        if (data.status === 'done') {
          clearInterval(interval);
          setActiveApifyRunId(null);
          setIsLoading(false);

          let rawProps = (data.properties && Array.isArray(data.properties) && data.properties.length > 0)
            ? data.properties
            : [];

          // Extract already-seen property identifiers from previous messages
          const seenAddrs = new Set();
          messages.forEach(m => {
            if (Array.isArray(m.properties)) {
              m.properties.forEach(p => {
                const a = (p.address || p.url || p.mls_number || '').toLowerCase().trim();
                if (a) seenAddrs.add(a);
              });
            }
          });

          // Filter out already shown properties so Show More never repeats the same cards
          const unseenProps = rawProps.filter(p => {
            const a = (p.address || p.url || p.mls_number || '').toLowerCase().trim();
            if (!a) return true;
            return ![...seenAddrs].some(sa => sa && (a.includes(sa) || sa.includes(a.slice(0, 15))));
          });

          let props = unseenProps;

          const cityName = data.city && data.city !== 'unknown'
            ? data.city.charAt(0).toUpperCase() + data.city.slice(1)
            : (activeApifyCity ? (activeApifyCity.charAt(0).toUpperCase() + activeApifyCity.slice(1)) : 'Edmonton');

          if (props.length === 0 && rawProps.length > 0) {
            props = rawProps.slice(0, 4);
          }

          if (props.length === 0) {
            // No properties found at all — show refinement options
            setMessages(prev => [...prev, {
              role: 'model',
              parts: [{ text: `I couldn't find live listings matching those exact criteria in **${cityName}** right now.\n\nYou can refine your search with the options below:` }],
              quickReplies: ['🏠 Change House Type', '💰 Change Budget', '🛏️ Change Bedrooms']
            }]);
            return;
          }

          const intro = data.introMessage || (activeApifyIntent === 'rent'
            ? `Here are live rental properties in **${cityName}** that match your criteria:`
            : `Here are live properties in **${cityName}** that match your criteria:`);

          const newModelMsg = {
            role: 'model',
            parts: [{ text: intro }],
            properties: props.slice(0, 4),
            quickReplies: ['Show more properties', '🏠 Change House Type', '💰 Change Budget', '🛏️ Change Bedrooms']
          };
          setMessages(prev => [...prev, newModelMsg]);
        } else if (data.status === 'empty' || data.status === 'failed' || data.status === 'error') {
          clearInterval(interval);
          setActiveApifyRunId(null);
          setIsLoading(false);

          const cityName = activeApifyCity ? (activeApifyCity.charAt(0).toUpperCase() + activeApifyCity.slice(1)) : 'the requested area';
          setMessages(prev => [...prev, {
            role: 'model',
            parts: [{ text: `I wasn't able to find live listings matching your exact criteria in **${cityName}** right now.\n\nWould you like to adjust your search?` }],
            quickReplies: ['🏠 Change House Type', '💰 Change Budget', '🛏️ Change Bedrooms']
          }]);
        }
      } catch (e) {
        console.error('Apify polling error:', e);
      }
    }, 6000); // Poll every 6 seconds

    return () => clearInterval(interval);
  }, [activeApifyRunId, activeApifyIntent, activeApifyCity, activeApifyBudget, activeApifyBeds, activeApifyBaths, activeApifyType]);

  // Reusable parser for AI replies (both live chat and Apify background responses)
  const parseModelReply = (rawText, existingProps = []) => {
    let text = rawText || '';
    let startLead = false;

    const cleanCardUrl = (str) => {
      if (!str) return '';
      const md = str.match(/\((https?:\/\/[^\s\)]+)\)/);
      const url = md ? md[1] : (str.match(/https?:\/\/[^\s\]\)]+/) ? str.match(/https?:\/\/[^\s\]\)]+/)[0] : str.replace(/[\[\]\(\)]/g, '').trim());
      if (url.includes('maps.googleapis.com') || url.includes('staticmap')) return '';
      return url;
    };

    const buttons = [];
    text = text.replace(/\[BUTTON:\s*(.*?)\]/g, (match, btnText) => {
      buttons.push(btnText.trim());
      return '';
    });

    const cityBtns = [];
    text = text.replace(/\[CITY_BTN:\s*(.*?)\]/g, (match, label) => {
      cityBtns.push(label.trim());
      return '';
    });

    const cityInfoMap = {};
    text = text.replace(/\[CITY_INFO:\s*(.*?)\|([\s\S]*?)\]/g, (match, label, content) => {
      cityInfoMap[label.trim()] = content.trim();
      return '';
    });

    const multiButtons = [];
    const multiPattern = /\[MULTI_BUTTON:\s*(.*?)\]/g;
    let multiMatch;
    while ((multiMatch = multiPattern.exec(text)) !== null) {
      multiButtons.push(multiMatch[1].trim());
    }
    text = text.replace(/\[MULTI_BUTTON:\s*.*?\]/g, '');

    let requestPreapproval = false;
    if (text.includes('[REQUEST_PREAPPROVAL_UPLOAD]')) {
      requestPreapproval = true;
      text = text.replace(/\[REQUEST_PREAPPROVAL_UPLOAD\]/g, '');
    }

    if (text.includes('[START_LEAD_CAPTURE]')) {
      startLead = true;
      text = text.replace(/\[START_LEAD_CAPTURE\]/g, '');
    }

    const parsedProperties = [];
    // Match closed [PROPERTY_CARD]...[/PROPERTY_CARD] or open [PROPERTY_CARD]...(next [PROPERTY_CARD] or end)
    const cardRegex = /\[PROPERTY_CARD\]([\s\S]*?)(?:\[\/PROPERTY_CARD\]|(?=\[PROPERTY_CARD\])|$)/gi;
    text = text.replace(cardRegex, (match, cardContent) => {
      if (!cardContent || !cardContent.trim()) return '';
      const prop = {};

      const typeMatch = cardContent.match(/Type:\s*(.*?)(?=\s*(?:Address:|Price:|Beds:|Image:|Link:|\n|$))/i);
      if (typeMatch) prop.property_type = typeMatch[1].trim();

      const addressMatch = cardContent.match(/Address:\s*(.*?)(?=\s*(?:Price:|Beds:|Baths:|Image:|Link:|\n|$))/i);
      if (addressMatch) {
        prop.address = addressMatch[1].trim().replace(/,\s*$/, '');
        const parts = prop.address.split(',');
        if (parts.length > 1) prop.city = parts[1].trim();
      }

      const priceMatch = cardContent.match(/Price:\s*(.*?)(?=\s*(?:Beds:|Baths:|Image:|Link:|\n|$))/i);
      if (priceMatch) prop.price = priceMatch[1].trim();

      const bedsMatch = cardContent.match(/Beds:\s*(.*?)(?:\s*\|\s*|\s+Baths:|\s+Image:|\s+Link:|\n|$)/i);
      if (bedsMatch) prop.bedrooms = bedsMatch[1].trim();

      const bathsMatch = cardContent.match(/Baths:\s*(.*?)(?=\s*(?:Image:|Link:|\n|$))/i);
      if (bathsMatch) prop.bathrooms = bathsMatch[1].trim();

      const imageMatch = cardContent.match(/Image:\s*(.*?)(?=\s*(?:Images:|Link:|\n|$))/i);
      if (imageMatch) prop.image_url = cleanCardUrl(imageMatch[1]);

      const imagesMatch = cardContent.match(/Images:\s*(.*?)(?=\s*(?:Link:|\n|$))/i);
      if (imagesMatch && imagesMatch[1].trim()) {
        const rawImgs = imagesMatch[1].split('|').map(u => cleanCardUrl(u.trim())).filter(Boolean);
        if (rawImgs.length > 0) prop.images = rawImgs;
      }

      const linkMatch = cardContent.match(/Link:\s*(.*?)(?=\s*(?:\[\/PROPERTY_CARD\]|\[PROPERTY_CARD\]|\n|$))/i);
      if (linkMatch) prop.url = cleanCardUrl(linkMatch[1]);

      if (prop.address || prop.price) {
        parsedProperties.push(prop);
      }
      return '';
    });

    // Cleanup any orphaned tags or artifacts
    text = text.replace(/\[\/?PROPERTY_CARD\]/gi, '').trim();

    const newModelMsg = { role: 'model', parts: [{ text: text.trim() }] };
    if (buttons.length > 0) newModelMsg.quickReplies = buttons;
    if (cityBtns.length > 0) {
      newModelMsg.cityBtns = cityBtns;
      newModelMsg.cityInfoMap = cityInfoMap;
    }
    if (multiButtons.length > 0) newModelMsg.multiSelectOptions = multiButtons;

    const allProperties = [...(existingProps || []), ...parsedProperties];
    if (allProperties.length > 0) newModelMsg.properties = allProperties;

    return { msg: newModelMsg, startLead, requestPreapproval, multiButtons, properties: allProperties };
  };

  async function initSession(force_new = false) {
    const visitor_id = getVisitorId();
    if (!visitor_id) return;
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_source: botConfig.botName || 'Website Chatbot',
          website_url: window.location.href,
          visitor_id,
          bot_id: botConfig.botId,
          force_new
        })
      });
      const data = await response.json();
      if (data.session && data.session.id) {
        setSessionId(data.session.id);
        savedMsgCount.current = 0;

        // Only load history if this is NOT a forced new session
        if (!force_new) {
          try {
            const histRes = await fetch(`/api/poll-messages?session_id=${data.session.id}&fetch_history=true`);
            const histData = await histRes.json();
            if (histData.history && histData.history.length > 0) {
              const formattedHistory = histData.history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.role === 'admin' ? `👨 (Agent): ${msg.content}` : msg.content }]
              }));
              setMessages(prev => prev.length === 0 ? formattedHistory : prev);
            }
          } catch (err) {
            console.error("Error fetching chat history:", err);
          }
        }
      }
    } catch (e) {
      console.error("Session Init Error:", e);
    }
  }

  const checkLeadTrigger = (currentMessages) => {
    // Lead capture is now explicitly triggered by the AI returning [START_LEAD_CAPTURE] tag
  };

  // Extract all URLs shown by the AI
  const extractViewedLinks = () => {
    const links = new Set();
    messages.forEach(msg => {
      if (msg.role === 'model') {
        const text = msg.parts[0].text;
        // Match standard links [text](url)
        const markdownLinks = text.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/g);
        if (markdownLinks) {
          markdownLinks.forEach(link => {
            const urlMatch = link.match(/\((https?:\/\/[^\s)]+)\)/);
            if (urlMatch && urlMatch[1]) {
              links.add(urlMatch[1]);
            }
          });
        }
      }
    });
    return Array.from(links);
  };

  const saveLead = async (name, phone, email, time_preference, goalOverride) => {
    const viewedLinks = extractViewedLinks();
    
    // Parse conversation to extract structured real estate requirements
    let propertyType = 'Unknown', city = 'Unknown', bedsBaths = 'Unknown', firstTimeBuyer = 'Unknown', schoolReqs = 'Unknown', features = 'Unknown', budget = 'Unknown', timeline = 'Unknown', preApproved = 'Unknown', likedProperty = 'None', agentStatus = 'Unknown', extraInfoReq = 'None';

    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      const nextMsg = messages[i + 1];
      if (msg.role === 'model' && nextMsg.role === 'user') {
        const text = msg.parts?.[0]?.text?.toLowerCase() || '';
        const ans = nextMsg.parts?.[0]?.text?.trim() || '';
        
        if (!ans) continue;

        if (text.includes('family home') && (text.includes('investment') || text.includes('first home'))) {
          propertyType = ans;
        } else if (text.includes('city') || text.includes('area are you interested')) {
          city = ans;
        } else if (text.includes('bedrooms') && text.includes('bathrooms')) {
          bedsBaths = ans;
        } else if (text.includes('first-time buyer') || text.includes('first time buyer')) {
          firstTimeBuyer = ans;
        } else if (text.includes('school requirements') || text.includes('school preference')) {
          schoolReqs = ans;
        } else if (text.includes('important features') || text.includes('garage, finished basement') || text.includes('swimming pool')) {
          features = ans;
        } else if (text.includes('maximum budget') || text.includes('your budget')) {
          budget = ans;
        } else if (text.includes('purchase by') || text.includes('aiming to purchase') || text.includes('planning to purchase')) {
          timeline = ans;
        } else if (text.includes('pre-approved')) {
          preApproved = ans;
        } else if (text.includes('working with any other real estate agent')) {
          agentStatus = ans;
        } else if (text.includes('interested in') || text.includes('property did you like') || text.includes('like any of these')) {
          likedProperty = ans;
        } else if (text.includes('information on first time buying') || text.includes('information on investment properties') || text.includes('information about the buying process')) {
          extraInfoReq = ans;
        }
      }
    }

    // Parse property summary from the structured summary if available
    const summaryMsg = messages.slice().reverse().find(m => m.role === 'model' && (m.parts?.[0]?.text?.includes('Location:') || m.parts?.[0]?.text?.includes('market value')));
    let sumOccupants = '', sumPets = '', sumParking = '', sumRentTimeline = '';
    let sumCity = '', sumPropType = '', sumBeds = '', sumBaths = '', sumFeatures = '', sumBudget = '', sumTimeline = '', sumMortgage = '', sumSchool = '';
    
    if (summaryMsg) {
      const st = summaryMsg.parts[0].text;
      const loc = st.match(/Location:\s*(.+)/)?.[1]?.trim(); if (loc) sumCity = loc;
      const prop = st.match(/Property:\s*(.+)/)?.[1]?.trim(); if (prop) sumPropType = prop;
      const b = st.match(/Bedrooms:\s*(.+)/)?.[1]?.trim(); if (b) sumBeds = b;
      const bth = st.match(/Bathrooms:\s*(.+)/)?.[1]?.trim(); if (bth) sumBaths = bth;
      const feat = st.match(/(?:Important|Must-have) features:\s*(.+)/)?.[1]?.trim(); if (feat) sumFeatures = feat;
      const bud = st.match(/Maximum budget:\s*(.+)/)?.[1]?.trim(); if (bud) sumBudget = bud;
      const tl = st.match(/Purchase timeline:\s*(.+)/)?.[1]?.trim(); if (tl) sumTimeline = tl;
      const mg = st.match(/Mortgage:\s*(.+)/)?.[1]?.trim(); if (mg) sumMortgage = mg;
      const sc = st.match(/School preference:\s*(.+)/)?.[1]?.trim(); if (sc) sumSchool = sc;
      // Rent specific fields
      const occ = st.match(/Occupants:\s*(.+)/)?.[1]?.trim(); if (occ) sumOccupants = occ;
      const pets = st.match(/Pets:\s*(.+)/)?.[1]?.trim(); if (pets) sumPets = pets;
      const park = st.match(/Parking:\s*(.+)/)?.[1]?.trim(); if (park) sumParking = park;
      const rentTl = st.match(/Moving timeline:\s*(.+)/)?.[1]?.trim(); if (rentTl) sumRentTimeline = rentTl;
    }

    const isRealEstate = botIndustry !== 'E-Commerce';

    let finalPropertyInterest = '';
    const isRent = !!sumOccupants || !!sumPets || !!sumRentTimeline || messages.some(m => m.parts[0].text.toLowerCase().includes('looking to rent'));
    const isSell = messages.some(m => m.parts[0].text.toLowerCase().includes('understand your home\'s value') || m.parts[0].text.toLowerCase().includes('considering selling'));
    const leadType = isSell ? 'Selling Home' : isRent ? 'Renting Home' : 'Buying Home';

    if (isRealEstate) {
      if (isSell) {
        finalPropertyInterest = `[Lead Type: ${leadType}]\n📋 Seller Details:\n• Reason for selling: ${messages.find(m=>m.parts[0].text.toLowerCase().includes('reason you are considering selling')) ? 'Captured in chat' : 'Not specified'}\n• Property Type: ${sumPropType || propertyType || 'Not specified'}\n• Bedrooms: ${sumBeds || bedsBaths || 'Not specified'}\n• Timeline: ${timeline || 'Not specified'}`;
      } else if (isRent) {
        finalPropertyInterest = `[Lead Type: ${leadType}]\n📋 Renter Requirements:\n• Property Type: ${sumPropType || propertyType || 'Not specified'}\n• Target City: ${sumCity || city || 'Not specified'}\n• Bedrooms: ${sumBeds || bedsBaths || 'Not specified'}\n• Max Budget: ${sumBudget || budget || 'Not specified'}\n• Occupants: ${sumOccupants || 'Not specified'}\n• Pets: ${sumPets || 'Not specified'}\n• Moving Timeline: ${sumRentTimeline || 'Not specified'}`;
      } else {
        finalPropertyInterest = `[Lead Type: ${leadType}]\n📋 Buyer Requirements:\n• Property Type: ${sumPropType || propertyType || 'Not specified'}\n• Target City: ${sumCity || city || 'Not specified'}\n• Bedrooms: ${sumBeds || bedsBaths || 'Not specified'}\n• Max Budget: ${sumBudget || budget || 'Not specified'}\n• Pre-Approved: ${sumMortgage || preApproved || 'Not specified'}\n• Timeline: ${sumTimeline || timeline || 'Not specified'}\n• First-Time Buyer: ${firstTimeBuyer || 'Not specified'}`;
        if (buyHomeData?.pre_approval_letter_url) {
          finalPropertyInterest += `\n• Pre-Approval Letter: ${buyHomeData.pre_approval_letter_url}`;
        }
      }

      // Collect all properties that were liked by the user (strictly deduplicated)
      const allRenderedProps = messages.flatMap(m => m.properties || []);
      const seenAddresses = new Set();
      const uniqueLikedProps = [];

      allRenderedProps.forEach((p, idx) => {
        const pId = String(p?.mls_number || p?.address || p?.url || idx);
        const addrKey = (p.address || '').split('|')[0].trim().toLowerCase();
        if (Array.isArray(likedProperties) && likedProperties.includes(pId)) {
          if (addrKey && !seenAddresses.has(addrKey)) {
            seenAddresses.add(addrKey);
            uniqueLikedProps.push(p);
          }
        }
      });

      if (uniqueLikedProps.length > 0) {
        const likedFormatted = uniqueLikedProps.map(p => {
          const addr = p.address ? p.address.split('|')[0].trim() : 'Property';
          const url = p.url && p.url !== '#' ? p.url : (p.image_url || '');
          return url ? `[${addr}](${url})` : addr;
        }).join(', ');
        finalPropertyInterest += `\n• ❤️ Liked Property: ${likedFormatted}`;
      } else if (likedProperty && likedProperty !== 'None' && likedProperty !== 'Unknown') {
        finalPropertyInterest += `\n• ❤️ Liked Property: ${likedProperty}`;
      }
    } else {
      // Create a fallback summary of what they asked for
      finalPropertyInterest = messages
          .filter(m => m.role === 'user')
          .map(m => m.parts[0].text)
          .join(', ');
    }

    try {
      const res = await fetch('/api/save-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email,
          phone_number: phone,
          time_preference: time_preference,
          property_interest: finalPropertyInterest,
          viewed_links: viewedLinks,
          chatbot_source: botConfig.botName || 'Website Chatbot',
          bot_id: botConfig.botId
        })
      });
      const result = await res.json();
      if (!res.ok) console.error('Lead save failed:', result);
    } catch (err) {
      console.error('Lead save error:', err);
    }

    // Use passed goal or fallback to state (avoid stale closure)
    const resolvedGoal = goalOverride || buyHomeData?.goal;
    const isRentOut = !resolvedGoal && rentOutStep === null && rentOutData?.prop_type;
    const isHomeValue = !resolvedGoal && !isRentOut && homeValueStep === null && homeValueData?.address;

    setLeadCaptured(true);
    setLeadStep(null);

    const isStandard = embedPlan === 'standard';
    let confirmMsg = `You're all set, ${name}! 🎉\n\nYour information has been saved and our team will be in touch soon.\n\nFeel free to ask me anything else! 😊`;
    
    if (isHomeValue) {
      confirmMsg = `Thank you, ${name}! 🎉 Your property information has been submitted successfully.\n\n**Property Details:**\n📍 ${homeValueData.address}\n🛏️ Bedrooms: ${homeValueData.bedrooms} | 🛁 Bathrooms: ${homeValueData.bathrooms}\n🛠️ Condition: ${homeValueData.condition}\n${homeValueData.renovations !== 'No' ? `✨ Renovations: ${homeValueData.renovations}` : ''}\n\nOne of our agents will reach out to you at your preferred **${time_preference}** time with a personalized valuation based on your property and the local market.\n\nIs there anything else I can help you with?`;
    } else if (isRentOut) {
      confirmMsg = `Thank you, ${name}! 🎉 Your rental details have been submitted successfully.\n\n**Property:** ${rentOutData.prop_type} at ${rentOutData.address}\n**Bedrooms:** ${rentOutData.bedrooms} | **Bathrooms:** ${rentOutData.bathrooms}\n**Parking:** ${rentOutData.parking}\n**Features:** ${rentOutData.features}\n**Available:** ${rentOutData.timeline}\n**Furnished:** ${rentOutData.furnished}\n\nOne of our agents will reach out to you at your preferred **${time_preference}** time to discuss the next steps, help you find the right tenant, and maximize your rental income.\n\n**We’re excited to help you make the most of your property!** 🏠✨\n\nIs there anything else I can help you with?`;
    } else if (resolvedGoal === 'Investment Property') {
      confirmMsg = `Thank you, ${name}! Your information has been submitted. 🎉\n\nA real estate professional will connect with you at your preferred **${time_preference}** time to discuss your investment goals and available opportunities.\n\nWe look forward to speaking with you! 🏡\n\nIs there anything else I can help you with?`;
    } else if (isStandard) {
      const isRent = !!sumOccupants || !!sumPets || !!sumRentTimeline;
      let reqLines = [];
      
      if (isRent) {
        reqLines = [
          sumBeds ? `🏡 ${sumBeds}-bedroom ${sumPropType || 'rental'}` : '',
          sumCity ? `📍 ${sumCity}` : '',
          sumBaths ? `🛁 ${sumBaths} bathrooms` : '',
          sumOccupants ? `👥 Occupants: ${sumOccupants}` : '',
          sumPets ? `🐾 Pets: ${sumPets}` : '',
          sumParking ? `🚗 Parking: ${sumParking}` : '',
          sumFeatures && sumFeatures !== 'None' ? `✨ Features: ${sumFeatures}` : '',
          sumBudget ? `💰 Budget: ${sumBudget}` : '',
          sumRentTimeline ? `📅 Moving in: ${sumRentTimeline.toLowerCase()}` : '',
        ];
      } else {
        reqLines = [
          sumBeds ? `🏡 ${sumBeds}-bedroom ${sumPropType || 'property'}` : '',
          sumCity ? `📍 ${sumCity}` : '',
          sumBaths ? `🛁 ${sumBaths} bathrooms` : '',
          sumFeatures && sumFeatures !== 'None' ? `✨ Features: ${sumFeatures}` : '',
          sumBudget ? `💰 Up to ${sumBudget}` : '',
          (sumMortgage && sumMortgage.toLowerCase() !== 'not pre-approved') ? `🏦 Mortgage pre-approved` : '',
          sumTimeline ? `📅 Looking to purchase ${sumTimeline.toLowerCase()}` : '',
        ];
      }

      confirmMsg = `You're all set, ${name}! 🎉\n\nYour home search request has been successfully submitted to our real estate team.\n\n**Your requirements:**\n${reqLines.filter(Boolean).join('\n')}\n\n**What happens next?**\nAn agent from our team will review your requirements and look for properties that closely match your search. They will contact you during your preferred **${time_preference}** hours to discuss suitable properties and the next steps.\n\nWe're looking forward to helping you find the right home! 🏡\n\nIs there anything else you'd like to know?`;
    }

    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{ text: confirmMsg }]
    }]);
  };

  const handleSkipUpload = () => {
    setBuyHomeData(prev => ({ ...prev, pre_approval_letter_url: 'Pending / Later' }));
    setBuyHomeStep('agent');
    setMessages(prev => [
      ...prev,
      { role: 'user', parts: [{ text: `I'll provide later` }] },
      {
        role: 'model',
        parts: [{ text: `No problem! You can provide it later.\n\nAre you currently working with any other real estate agent?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }
    ]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessages(prev => [...prev, { role: 'user', parts: [{ text: `📎 Attached: ${file.name}` }] }]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-letter', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success && data.url) {
        setBuyHomeData(prev => ({ ...prev, pre_approval_letter_url: data.url }));
        setBuyHomeStep('agent');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Thank you for uploading your letter!\n\nAre you currently working with any other real estate agent?` }],
          quickReplies: ['✅ Yes', '❌ No']
        }]);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Oops, something went wrong while uploading your letter. You can try again or click "Provide Later" to continue without it.` }],
        quickReplies: ["⏩ I'll provide later"]
      }]);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset file input
    }
  };

  const handleSend = async (text) => {
    let msg = text;
    
    // If user clicks Send button or presses Enter (text is not passed as string)
    if (typeof text !== 'string') {
      if (multiSelectOptions.length > 0) {
        const selection = multiSelected.length > 0 ? multiSelected.join(', ') : 'None';
        if (input.trim()) {
          msg = multiSelected.length > 0 ? `${selection}, ${input.trim()}` : input.trim();
        } else {
          msg = selection;
        }
        setMultiSelectOptions([]);
        setMultiSelected([]);
      } else {
        msg = input;
      }
    }

    if (!msg || !msg.trim()) return;
    setInput('');

    const userMsg = { role: 'user', parts: [{ text: msg }] };
    const apiMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    
    // Handle Intent Selection
    if (!intentSelected && botIndustry === 'Real Estate') {
      setIntentSelected(true);
    }

    // ── Buy a Home Flow ─────────────────────────────────────────
    const lower = (msg || '').toLowerCase();
    const isBuyIntent =
      msg.includes("I'm looking to buy a home") ||
      lower.includes('buy a home') ||
      lower.includes('buying a home') ||
      lower.includes('looking to buy') ||
      lower.includes('want to buy') ||
      lower.includes('buy property') ||
      lower.includes('purchase a home') ||
      lower.includes('buy home') ||
      /\b(buy|buying|purchase|purchasing)\s+(a\s+)?(home|house|property|condo|townhouse|place)\b/i.test(lower) ||
      /\b(looking\s+(for|to)\s+(buy|purchase)|interested\s+in\s+buying)\b/i.test(lower);

    if (isBuyIntent && !buyHomeStep && botIndustry !== 'E-Commerce') {
      resetFlows();
      setBuyHomeStep('goal');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you looking for a family home or an investment property?` }],
        quickReplies: ['🏡 Family Home', '💰 Investment Property']
      }]);
      return;
    }

    if (buyHomeStep === 'goal') {
      if (msg.toLowerCase().includes('family home')) {
        setBuyHomeData(prev => ({ ...prev, goal: 'Family Home' }));
        setBuyHomeStep('city');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Great! 🏡 ${botConfig.botName || 'Shawna Roongsang'} has helped 20+ families find their perfect home in the area, so you're in great hands!\n\nI'll ask you a few quick questions to understand exactly what you're looking for.\n\nWhich city or area are you interested in?` }]
        }]);
      } else {
        setBuyHomeData(prev => ({ ...prev, goal: 'Investment Property' }));
        setBuyHomeStep('inv_type');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `What type of investment are you considering?` }],
          quickReplies: ['Long-term rental', 'Short-term rental', 'Fix-and-flip', 'Multi-family investment', 'Build-to-rent', 'Not sure yet']
        }]);
      }
      return;
    }

const CITY_PROVINCE_MAP = {
  // Canada
  milton: 'ON', toronto: 'ON', mississauga: 'ON', brampton: 'ON', oakville: 'ON',
  burlington: 'ON', hamilton: 'ON', ottawa: 'ON', markham: 'ON', vaughan: 'ON',
  richmond: 'BC', vancouver: 'BC', burnaby: 'BC', surrey: 'BC', victoria: 'BC',
  calgary: 'AB', edmonton: 'AB', montreal: 'QC', winnipeg: 'MB', halifax: 'NS',
  london: 'ON', kitchener: 'ON', waterloo: 'ON', windsor: 'ON', barrie: 'ON',
  guelph: 'ON', oshawa: 'ON', whitby: 'ON', ajax: 'ON', pickering: 'ON',
  // US
  chicago: 'IL', 'morton grove': 'IL', skokie: 'IL', evanston: 'IL', aurora: 'IL',
  naperville: 'IL', springfield: 'IL', 'new york': 'NY', 'los angeles': 'CA',
  miami: 'FL', dallas: 'TX', houston: 'TX', austin: 'TX', seattle: 'WA'
};

function formatCityDisplay(msg) {
  if (!msg) return msg;
  const trimmed = msg.trim();
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const c = parts[0].trim().replace(/\b\w/g, l => l.toUpperCase());
    const s = parts[1].trim().toUpperCase();
    return `${c}, ${s}`;
  }
  const clean = trimmed.toLowerCase();
  const state = CITY_PROVINCE_MAP[clean];
  const capitalized = trimmed.replace(/\b\w/g, l => l.toUpperCase());
  if (state) {
    return `${capitalized}, ${state}`;
  }
  return capitalized;
}

    if (buyHomeStep === 'city') {
      let formattedCity = formatCityDisplay(msg);
      try {
        const res = await fetch('/api/resolve-city', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: msg })
        });
        const d = await res.json();
        if (d?.formatted) formattedCity = d.formatted;
      } catch {}

      setBuyHomeData(prev => ({ ...prev, city: formattedCity }));
      setBuyHomeStep('city_confirm');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Just to confirm, are you interested in properties in **${formattedCity}**?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'city_confirm') {
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        const confirmedCity = buyHomeData.city || 'your area';
        setBuyHomeStep('type');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `${confirmedCity} is a fantastic area! It has great communities and strong property values.\n\nwhat type of home are you looking for? You can select multiple options!` }]
        }]);
        setMultiSelectOptions(['🏠 Detached House', '🏡 Semi-Detached', '🏘️ Townhouse', '🏢 Condo', '🏢 Multi-Family / Duplex', '🌳 Land / Lot', '🤷 Other']);
      } else {
        setBuyHomeStep('city');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `No problem! Which city or area are you interested in?` }]
        }]);
      }
      return;
    }

    if (buyHomeStep === 'type') {
      setBuyHomeData(prev => ({ ...prev, type: msg }));
      setBuyHomeStep('bedrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How many bedrooms are you looking for?` }]
      }]);
      return;
    }

    if (buyHomeStep === 'bedrooms') {
      setBuyHomeData(prev => ({ ...prev, bedrooms: msg }));
      setBuyHomeStep('bathrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `And how many bathrooms?` }]
      }]);
      return;
    }

    if (buyHomeStep === 'bathrooms') {
      setBuyHomeData(prev => ({ ...prev, bathrooms: msg }));
      setBuyHomeStep('first_time');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you a first-time buyer?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'first_time') {
      const isFirst = msg.toLowerCase().includes('yes') || msg.includes('✅');
      setBuyHomeData(prev => ({ ...prev, firstTime: isFirst ? 'Yes' : 'No' }));
      setBuyHomeStep('features');
      
      const replyText = isFirst 
        ? `That’s exciting—congratulations on taking the first step toward owning your first home! 🏡\n\nFirst-time buyers may have access to special financing and assistance programs, and we can help you understand your options, budget, neighborhoods, and available homes.\n\nAre there any important features you’re looking for? You can select multiple options!`
        : `Since you’re an experienced homebuyer, let’s focus on what’s most important for your next purchase—whether that’s more space, a new neighborhood, a better commute, or a specific budget.\n\nAre there any important features you’re looking for? You can select multiple options!`;
      
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: replyText }] }]);
      setMultiSelectOptions(['🌊 Swimming Pool', '🏠 Basement', '🚗 Garage', 'None']);
      return;
    }

    if (buyHomeStep === 'features') {
      setBuyHomeData(prev => ({ ...prev, features: msg }));
      setBuyHomeStep('schools');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Do you have any specific school requirements? You can select multiple options!` }]
      }]);
      setMultiSelectOptions(['🏦 Primary School', '🏢 Middle School', '🏧 Elementary School', 'None']);
      return;
    }

    if (buyHomeStep === 'schools') {
      setBuyHomeData(prev => ({ ...prev, schools: msg }));
      setBuyHomeStep('budget');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What is your maximum budget?` }]
      }]);
      return;
    }

    if (buyHomeStep === 'budget') {
      setBuyHomeData(prev => ({ ...prev, budget: msg }));
      setBuyHomeStep('timeline');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thanks! When are you planning to purchase?` }],
        quickReplies: ['Within 3 months', 'Within 6 months', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'timeline') {
      setBuyHomeData(prev => ({ ...prev, timeline: msg }));
      setBuyHomeStep('mortgage');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Have you been pre-approved for a mortgage?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'mortgage') {
      const isPreApproved = msg.toLowerCase().includes('yes') || msg.includes('✅');
      setBuyHomeData(prev => ({ ...prev, mortgage: isPreApproved ? 'Pre-approved' : 'Not pre-approved' }));
      
      if (isPreApproved) {
        setBuyHomeStep('mortgage_upload');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Great! Please upload your mortgage pre-approval letter below, or choose to provide it later.` }],
          quickReplies: ["⏩ I'll provide later"]
        }]);
      } else {
        setBuyHomeStep('agent');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `That’s okay— Getting preapproved can help you understand your potential budget and what loan options may be available to you.\n\nAre you currently working with any other real estate agent?` }],
          quickReplies: ['✅ Yes', '❌ No']
        }]);
      }
      return;
    }

    if (buyHomeStep === 'mortgage_upload') {
      // If the user types anything or clicks "I'll provide later", advance to agent step
      setBuyHomeData(prev => ({ ...prev, pre_approval_letter_url: 'Pending / Later' }));
      setBuyHomeStep('agent');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `No problem! You can provide it later.\n\nAre you currently working with any other real estate agent?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'agent') {
      const hasAgent = msg.toLowerCase().includes('yes') || msg.includes('✅');
      const newBuyData = { ...buyHomeData, agent: hasAgent ? 'Yes' : 'No' };
      setBuyHomeData(newBuyData);

      if (hasAgent) {
        setBuyHomeStep(null);
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Thanks for letting me know. Since you’re currently working with another real estate agent, we want to respect that relationship and wouldn’t want to interfere. If your situation changes in the future, we’d be happy to assist you.` }]
        }]);
        return;
      }

      setBuyHomeStep('summary');
      const summaryText = `Here's what I have for your home search:\nLocation: ${newBuyData.city}\nProperty: ${newBuyData.type || 'Family Home'}\nBedrooms: ${newBuyData.bedrooms}\nBathrooms: ${newBuyData.bathrooms}\nImportant features: ${newBuyData.features}\nSchool preference: ${newBuyData.schools}\nMaximum budget: ${newBuyData.budget}\nFirst-time buyer: ${newBuyData.firstTime}\nMortgage: ${newBuyData.mortgage}\nPurchase timeline: ${newBuyData.timeline}\nCurrently working with an agent: No\n\nDoes everything look correct?`;

      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Got it! Since you're not currently working with another agent, I can help you take the next step.` }]
      }, {
        role: 'model',
        parts: [{ text: summaryText }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'summary') {
      setBuyHomeStep(null);
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        // demo-real-estate ALWAYS shows fake properties (regardless of plan)
        const isDemoBot = botConfig.botId === 'demo-real-estate';
        const isPremium = isDemoBot || embedPlan !== 'standard';
        if (!isPremium) {
          setMessages(prev => [...prev, {
            role: 'model',
            parts: [{ text: `Perfect! I'll find suitable properties that match these criteria. Please provide your contact details below, and an agent will be in touch very soon.` }]
          }]);
          setLeadStep('name');
          return;
        } else {
          // Premium / demo: override the msg to trigger property search via AI
          const d = buyHomeData;
          const searchPrompt = `User confirmed requirements. Location: ${d.city}. Property: ${d.type || 'Family Home'}. Bedrooms: ${d.bedrooms}. Bathrooms: ${d.bathrooms}. Maximum budget: ${d.budget}. Features: ${d.features}. Please show me matching properties.`;
          apiMessages.pop(); // remove "yes"
          apiMessages.push({ role: 'user', parts: [{ text: searchPrompt }] });
        }
      } else {
         setMessages(prev => [...prev, {
           role: 'model',
           parts: [{ text: `No problem. Let me know what you'd like to change.` }]
         }]);
         return;
      }
    }

    // ── Investment Property Flow ────────────────────────────────
    if (buyHomeStep === 'inv_type') {
      setBuyHomeData(prev => ({ ...prev, inv_type: msg }));
      setBuyHomeStep('inv_prop_type');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What type of property are you interested in?` }],
        quickReplies: ['Single-family home', 'Condo', 'Townhouse', '2–4 unit property', 'Larger multi-family property', 'Commercial property', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_prop_type') {
      setBuyHomeData(prev => ({ ...prev, inv_prop_type: msg }));
      setBuyHomeStep('inv_budget');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What’s your approximate investment budget?` }],
        quickReplies: ['Under $200K', '$200K–$300K', '$300K–$500K', '$500K–$750K', '$750K–$1M', '$1M+', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_budget') {
      setBuyHomeData(prev => ({ ...prev, inv_budget: msg }));
      setBuyHomeStep('inv_downpayment');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How much are you planning to put toward the purchase?` }],
        quickReplies: ['Less than 20%', '20%–30%', '30%–50%', '50%+', 'I’m not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_downpayment') {
      setBuyHomeData(prev => ({ ...prev, inv_downpayment: msg }));
      setBuyHomeStep('inv_factors');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What matters most to you in an investment property? You can select multiple options.` }]
      }]);
      setMultiSelectOptions(['Monthly rental income', 'Long-term appreciation', 'High rental demand', 'Low maintenance', 'Lower property taxes', 'Strong neighborhood growth', 'Quick resale potential', 'Diversifying my investments']);
      return;
    }

    if (buyHomeStep === 'inv_factors') {
      setBuyHomeData(prev => ({ ...prev, features: msg })); // reusing features state for multi-select
      setBuyHomeStep('inv_location');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you focused on a specific area, or are you open to different markets?` }],
        quickReplies: ['Specific neighborhood/city', 'Anywhere nearby', 'Anywhere in the state', 'Open to different markets']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_location') {
      setBuyHomeData(prev => ({ ...prev, inv_location: msg }));
      setBuyHomeStep('inv_timeline');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `When are you hoping to purchase your investment property?` }],
        quickReplies: ['As soon as possible', 'Within 3 months', '3–6 months', '6–12 months', 'Just exploring']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_timeline') {
      setBuyHomeData(prev => ({ ...prev, timeline: msg }));
      setBuyHomeStep('inv_experience');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Have you invested in real estate before?` }],
        quickReplies: ['Yes, I own investment properties', 'Yes, but I’ve sold my previous investments', 'No, this would be my first investment property']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_experience') {
      setBuyHomeData(prev => ({ ...prev, inv_experience: msg }));
      setBuyHomeStep('inv_financing');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How do you plan to finance the investment?` }],
        quickReplies: ['Cash', 'Conventional mortgage', 'Investment/property loan', 'HELOC or other financing', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_financing') {
      setBuyHomeData(prev => ({ ...prev, inv_financing: msg }));
      setBuyHomeStep('inv_return');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What kind of return are you hoping to achieve?` }],
        quickReplies: ['Monthly cash flow', 'Long-term appreciation', 'Both', 'I’m not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_return') {
      setBuyHomeData(prev => ({ ...prev, inv_return: msg }));
      setBuyHomeStep(null); // End of wizard
      
      const replyText = `Perfect! We have a good picture of what you’re looking for. 🎯\n\nThe next step is to connect you with ${botConfig.botName || 'our agent'} who can help you explore your options and answer any questions.\n\nWould you like to schedule a quick call?\n\nShare your contact information below, and we’ll help you find a convenient time.`;
      
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: replyText }]
      }]);
      
      setLeadStep('name'); // trigger lead capture directly
      return;
    }

    // ── Looking to Rent Flow ──────────────────────────────────────────
    const isRentIntent =
      msg.includes("looking to rent") ||
      msg.includes("🔑 I'm looking to rent") ||
      /\b(looking\s+(for|to)\s+rent|want\s+to\s+rent|need\s+(a\s+)?rental|find\s+a\s+rental|rent\s+a\s+(home|house|condo|apartment|place|unit)|interested\s+in\s+renting|looking\s+to\s+lease)\b/i.test(lower);

    if (isRentIntent && !rentStep) {
      resetFlows();
      setRentStep('prop_type');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Great! I'd love to help you find the perfect rental. Let me ask a few quick questions.\n\nWhat type of property are you looking for?` }],
        quickReplies: ['🏢 Apartment/Condo', '🏘️ Townhouse', '🏡 Detached House', '🏚 Semi-Detached', '🤷 Flexible']
      }]);
      return;
    }

    if (rentStep === 'prop_type') {
      setRentData(prev => ({ ...prev, prop_type: msg }));
      setRentStep('city');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Which city or area are you looking to rent in?` }]
      }]);
      return;
    }

    if (rentStep === 'city') {
      let formattedCity = formatCityDisplay(msg);
      try {
        const res = await fetch('/api/resolve-city', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: msg })
        });
        const d = await res.json();
        if (d?.formatted) formattedCity = d.formatted;
      } catch {}

      setRentData(prev => ({ ...prev, city: formattedCity }));
      setRentStep('city_confirm');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Just to confirm, are you looking to rent in **${formattedCity}**?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (rentStep === 'city_confirm') {
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        setRentStep('bedrooms');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `How many bedrooms do you need?` }],
          quickReplies: ['Studio', '1 Bedroom', '2 Bedrooms', '3 Bedrooms', '4+ Bedrooms']
        }]);
      } else {
        setRentStep('city');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `No problem! Which city or area are you looking to rent in?` }]
        }]);
      }
      return;
    }

    if (rentStep === 'bedrooms') {
      setRentData(prev => ({ ...prev, bedrooms: msg }));
      setRentStep('bathrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `And how many **bathrooms**?` }],
        quickReplies: ['1', '1.5', '2', '2.5', '3+']
      }]);
      return;
    }

    if (rentStep === 'bathrooms') {
      setRentData(prev => ({ ...prev, bathrooms: msg }));
      setRentStep('parking');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Do you need **parking**?` }],
        quickReplies: ['🚗 Yes, 1 space', '🚗 Yes, 2+ spaces', '❌ No parking needed']
      }]);
      return;
    }

    if (rentStep === 'parking') {
      setRentData(prev => ({ ...prev, parking: msg }));
      setRentStep('features');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Any specific **must-have features**? (e.g., Basement, Balcony, In-unit Laundry)` }],
        quickReplies: ['🏠 Basement', '🧺 In-unit Laundry', '🌅 Balcony', '🐾 Pet-friendly', 'None']
      }]);
      return;
    }

    if (rentStep === 'features') {
      setRentData(prev => ({ ...prev, features: msg }));
      setRentStep('budget');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What is your monthly budget for rent?` }],
        quickReplies: ['Under $1,500/mo', '$1,500–$2,000/mo', '$2,000–$2,500/mo', '$2,500–$3,000/mo', '$3,000+/mo']
      }]);
      return;
    }

    if (rentStep === 'budget') {
      setRentData(prev => ({ ...prev, budget: msg }));
      setRentStep('move_in');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `When are you looking to move in?` }],
        quickReplies: ['ASAP', 'Within 1 month', 'Within 2–3 months', 'Flexible']
      }]);
      return;
    }

    if (rentStep === 'move_in') {
      setRentData(prev => ({ ...prev, move_in: msg }));
      setRentStep('has_agent');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you currently working with another real estate agent?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (rentStep === 'has_agent') {
      const hasAgent = msg.toLowerCase().includes('yes') || msg.includes('✅');
      const rd = { ...rentData, has_agent: hasAgent ? 'Yes' : 'No' };
      setRentData(rd);

      if (hasAgent) {
        setRentStep(null);
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Thanks for letting me know. Since you’re currently working with another real estate agent, we want to respect that relationship and wouldn’t want to interfere. If your situation changes in the future, we’d be happy to assist you.` }]
        }]);
        return;
      }

      setRentStep('summary');
      const summaryText = `Here's what I have for your rental search:\n📍 Location: ${rd.city}\n🏠 Property type: ${rd.prop_type}\n🛏️ Bedrooms: ${rd.bedrooms} | 🛁 Bathrooms: ${rd.bathrooms}\n🚗 Parking: ${rd.parking}\n✨ Features: ${rd.features}\n💰 Budget: ${rd.budget}\n📅 Move-in: ${rd.move_in}\n\nDoes everything look correct?`;
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: summaryText }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (rentStep === 'summary') {
      setRentStep(null);
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        const isDemoBot = botConfig.botId === 'demo-real-estate';
        const isPremium = isDemoBot || embedPlan !== 'standard';
        if (!isPremium) {
          setMessages(prev => [...prev, {
            role: 'model',
            parts: [{ text: `Perfect! I'll find suitable rental listings that match these criteria. Please provide your contact details below, and an agent will be in touch very soon.` }]
          }]);
          setLeadStep('name');
          return;
        } else {
          // Trigger live rental property search via AI / Apify
          const rd = rentData;
          const searchPrompt = `User confirmed requirements. Intent: rent. Location: ${rd.city}. Property: ${rd.prop_type || 'Apartment/Condo'}. Bedrooms: ${rd.bedrooms}. Bathrooms: ${rd.bathrooms}. Maximum budget: ${rd.budget}. Features: ${rd.features}. Please search and show me matching live rental properties for rent in ${rd.city}.`;
          apiMessages.pop(); // remove "yes"
          apiMessages.push({ role: 'user', parts: [{ text: searchPrompt }] });
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `No problem. Let me know what you'd like to change.` }]
        }]);
        return;
      }
    }

    // ── Thinking About Selling Flow ─────────────────────────────────────
    const isSellIntent =
      msg.includes("thinking about selling") ||
      msg.includes("🏠 I'm thinking about selling my home") ||
      /\b(want\s+to\s+sell|thinking\s+(of|about)\s+selling|sell\s+my\s+(home|house|property|condo)|list\s+my\s+(home|house|property)|selling\s+my\s+home)\b/i.test(lower);

    if (isSellIntent && !sellStep) {
      resetFlows();
      setSellStep('address');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `I can help you understand what your home is worth and guide you through the selling process! 🏡\n\nWhat is the address of the property you're looking to sell?` }],
        inputCard: { icon: '📍', label: 'Property Address', placeholder: 'e.g. 123 Main St, Milton, ON...' }
      }]);
      return;
    }

    if (sellStep === 'address') {
      setSellData(prev => ({ ...prev, address: msg }));
      setSellStep('prop_type');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What type of property is it?` }],
        quickReplies: ['🏡 Detached Home', '🏘️ Townhouse', '🏢 Condo', '🏚 Semi-Detached', '💡 Other']
      }]);
      return;
    }

    if (sellStep === 'prop_type') {
      setSellData(prev => ({ ...prev, prop_type: msg }));
      setSellStep('bedrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How many **bedrooms** does the property have?` }],
        quickReplies: ['Studio', '1', '2', '3', '4', '5+']
      }]);
      return;
    }

    if (sellStep === 'bedrooms') {
      setSellData(prev => ({ ...prev, bedrooms: msg }));
      setSellStep('bathrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `And how many **bathrooms**?` }],
        quickReplies: ['1', '1.5', '2', '2.5', '3+']
      }]);
      return;
    }

    if (sellStep === 'bathrooms') {
      setSellData(prev => ({ ...prev, bathrooms: msg }));
      setSellStep('condition');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How would you describe the condition of the home?` }],
        quickReplies: ['✨ Move-in ready', '🛠️ Needs some updates', '🚧 Needs significant work']
      }]);
      return;
    }

    if (sellStep === 'condition') {
      setSellData(prev => ({ ...prev, condition: msg }));
      setSellStep('timeline');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `When are you hoping to sell?` }],
        quickReplies: ['As soon as possible', 'Within 1–3 months', 'Within 6 months', 'Just exploring options']
      }]);
      return;
    }

    if (sellStep === 'timeline') {
      const sd = { ...sellData, timeline: msg };
      setSellData(sd);
      setSellStep(null);
      const summaryText = `Great! Here's a summary of your property:\n📍 Address: ${sd.address}\n🏠 Type: ${sd.prop_type}\n🛏️ Bedrooms: ${sd.bedrooms} | 🛁 Bathrooms: ${sd.bathrooms}\n🛠️ Condition: ${sd.condition}\n📅 Timeline: ${msg}\n\nOne of our agents will prepare a detailed market valuation for your home and reach out to you shortly. Please share your contact details below!`;
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: summaryText }]
      }]);
      setLeadStep('name');
      return;
    }

    // ── Rent Out My House Flow ──────────────────────────────────────
    const isRentOutIntent =
      msg.includes("rent out my house") ||
      msg.includes("I'm looking to rent out my house") ||
      msg.includes("🏨 I'm looking to rent out my house") ||
      /\b(rent\s*out|renting\s*out|lease\s*out|rent\s+my\s+(house|home|property|condo|apartment)|landlord)\b/i.test(lower);

    if (isRentOutIntent && !rentOutStep) {
      resetFlows();
      setRentOutStep('ownership');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Absolutely! I can help with that. Are you looking to rent out a property you **already own**, or are you considering **buying a property as an investment** and then renting it out?` }],
        quickReplies: ['🏠 I already own the property', '💰 Buying to rent out (investment)']
      }]);
      return;
    }

    if (rentOutStep === 'ownership') {
      setRentOutData(prev => ({ ...prev, ownership: msg }));
      setRentOutStep('prop_type');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Great! What type of property is it?` }],
        quickReplies: ['🏢 Condo', '🏨 Townhouse', '🏡 Detached Home', '🏚 Semi-Detached', '💡 Other']
      }]);
      return;
    }

    if (rentOutStep === 'prop_type') {
      setRentOutData(prev => ({ ...prev, prop_type: msg }));
      setRentOutStep('address');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What is the address of the property?` }],
        inputCard: { icon: '📍', label: 'Property Address', placeholder: 'e.g. 123 Main St, Chicago, IL...' }
      }]);
      return;
    }

    if (rentOutStep === 'address') {
      setRentOutData(prev => ({ ...prev, address: msg }));
      setRentOutStep('bedrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How many **bedrooms** does the property have?` }],
        quickReplies: ['Studio', '1', '2', '3', '4', '5+']
      }]);
      return;
    }

    if (rentOutStep === 'bedrooms') {
      setRentOutData(prev => ({ ...prev, bedrooms: msg }));
      setRentOutStep('bathrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `And how many **bathrooms**?` }],
        quickReplies: ['1', '1.5', '2', '2.5', '3+']
      }]);
      return;
    }

    if (rentOutStep === 'bathrooms') {
      setRentOutData(prev => ({ ...prev, bathrooms: msg }));
      setRentOutStep('parking');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Does the property have **parking** available for tenants?` }],
        quickReplies: ['🚗 Yes, 1 space', '🚗 Yes, 2+ spaces', '❌ No parking']
      }]);
      return;
    }

    if (rentOutStep === 'parking') {
      setRentOutData(prev => ({ ...prev, parking: msg }));
      setRentOutStep('features');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Does the property have any notable **features**? (e.g., Finished Basement, Balcony, In-unit Laundry)` }],
        quickReplies: ['🏠 Finished Basement', '🧺 In-unit Laundry', '🌅 Balcony', '🐾 Pet-friendly', 'None']
      }]);
      return;
    }

    if (rentOutStep === 'features') {
      setRentOutData(prev => ({ ...prev, features: msg }));
      setRentOutStep('timeline');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `When are you hoping to have the property available for rent?` }],
        quickReplies: ['🚀 As soon as possible', '📅 Within 1–3 months', '🌱 Later this year', '🤷 Not sure yet']
      }]);
      return;
    }

    if (rentOutStep === 'timeline') {
      setRentOutData(prev => ({ ...prev, timeline: msg }));
      setRentOutStep('furnished');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Will the property be rented **furnished** or **unfurnished**?` }],
        quickReplies: ['🛋️ Furnished', '📦 Unfurnished', '📋 Partially Furnished']
      }]);
      return;
    }

    if (rentOutStep === 'furnished') {
      setRentOutData(prev => ({ ...prev, furnished: msg }));
      setRentOutStep('expected_rent');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Do you have a **monthly rent** in mind, or would you like help estimating what the property could rent for?` }],
        quickReplies: ['I have a price in mind', 'Help me estimate the rent']
      }]);
      return;
    }

    if (rentOutStep === 'expected_rent') {
      let rentAnswer = msg;
      if (msg.toLowerCase().includes('price in mind')) {
        setRentOutData(prev => ({ ...prev, expected_rent: 'To be specified' }));
        setRentOutStep('has_agent');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `What monthly rent are you thinking?` }],
          inputCard: { icon: '💰', label: 'Expected Monthly Rent', placeholder: 'e.g. $1,800/month...' }
        }]);
        return;
      } else if (msg.toLowerCase().includes('estimate') || msg.toLowerCase().includes('help')) {
        setRentOutData(prev => ({ ...prev, expected_rent: 'Needs estimation' }));
        setRentOutStep('has_agent');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `No worries! An agent can give you a professional rental market analysis. \n\nAre you currently working with a **real estate agent or property manager** for this rental?` }],
          quickReplies: ['✅ Yes', '❌ No']
        }]);
        return;
      } else {
        // They typed a price
        setRentOutData(prev => ({ ...prev, expected_rent: msg }));
        setRentOutStep('has_agent');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Great! Are you currently working with a **real estate agent or property manager** for this rental?` }],
          quickReplies: ['✅ Yes', '❌ No']
        }]);
        return;
      }
    }

    if (rentOutStep === 'has_agent') {
      const hasAgent = msg.toLowerCase().includes('yes') || msg.includes('✅');
      setRentOutData(prev => ({ ...prev, has_agent: hasAgent ? 'Yes' : 'No' }));
      if (hasAgent) {
        setRentOutStep(null);
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Thanks for letting me know. Since you’re currently working with another real estate agent, we want to respect that relationship and wouldn’t want to interfere. If your situation changes in the future, we’d be happy to assist you.` }]
        }]);
        return;
      }
      setRentOutStep('priority');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Got it! I can connect you with someone who can help you **determine the rental value**, market the property, and guide you through the rental process.\n\nWhat’s most important to you with this rental?` }],
        quickReplies: ['⏰ Finding a tenant quickly', '💰 Getting the best possible rent', '👤 Having someone manage the process for me', '📝 All of the above']
      }]);
      return;
    }

    if (rentOutStep === 'priority') {
      setRentOutData(prev => ({ ...prev, priority: msg }));
      setRentOutStep(null);
      const data = { ...rentOutData, priority: msg };
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thanks! I’ve got a clear picture of your rental plans. 👍\n\nPlease share your **contact details** below, and an agent will follow up with you about the property, answer any questions, and help you get started.` }]
      }]);
      setLeadStep('name');
      return;
    }

    // ── Home Value Flow ────────────────────────────────────────────
    const isHomeValueIntent =
      msg.includes("home's value") ||
      msg.includes("I want to know my home's value") ||
      msg.includes("💰 I want to know my home's value") ||
      /\b(home\s*('?s)?\s*value|what\s+is\s+my\s+home\s+worth|how\s+much\s+is\s+my\s+(home|house)\s+worth|property\s+valuation|home\s+worth|value\s+of\s+my\s+(home|house|property))\b/i.test(lower);

    if (isHomeValueIntent && !homeValueStep) {
      resetFlows();
      setHomeValueStep('address');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Absolutely! I can help you get a better idea of what your property may be worth. What’s the address of the property?` }],
        inputCard: { icon: '📍', label: 'Property Address', placeholder: 'e.g. 123 Main St, Chicago, IL...' }
      }]);
      return;
    }

    if (homeValueStep === 'address') {
      setHomeValueData(prev => ({ ...prev, address: msg }));
      setHomeValueStep('bedrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How many **bedrooms** does the property have?` }],
        quickReplies: ['Studio', '1', '2', '3', '4', '5+']
      }]);
      return;
    }

    if (homeValueStep === 'bedrooms') {
      setHomeValueData(prev => ({ ...prev, bedrooms: msg }));
      setHomeValueStep('bathrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `And how many **bathrooms**?` }],
        quickReplies: ['1', '1.5', '2', '2.5', '3+']
      }]);
      return;
    }

    if (homeValueStep === 'bathrooms') {
      setHomeValueData(prev => ({ ...prev, bathrooms: msg }));
      setHomeValueStep('renovations');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thanks! Have you made any recent updates or renovations to the property? If so, what did you update and about when was it completed?` }],
        quickReplies: ['No recent updates', 'Kitchen updated', 'Bathroom updated', 'New roof/HVAC']
      }]);
      return;
    }

    if (homeValueStep === 'renovations') {
      setHomeValueData(prev => ({ ...prev, renovations: msg }));
      setHomeValueStep('condition');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How would you describe the overall condition of the home—move-in ready, some updates needed, or does it need significant work?` }],
        quickReplies: ['✨ Move-in ready', '🛠️ Some updates needed', '🚧 Needs significant work']
      }]);
      return;
    }

    if (homeValueStep === 'condition') {
      setHomeValueData(prev => ({ ...prev, condition: msg }));
      setHomeValueStep('reason');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Just so I can point you in the right direction, are you thinking about selling the property, renting it out, or mainly curious about its current value?` }],
        quickReplies: ['🏠 Selling', '🔑 Renting it out', '🤔 Just curious']
      }]);
      return;
    }

    if (homeValueStep === 'reason') {
      const isSell = msg.toLowerCase().includes('sell');
      const isRent = msg.toLowerCase().includes('rent');
      
      setHomeValueData(prev => ({ ...prev, reason: msg }));

      if (isSell) {
        setHomeValueStep('timeline');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `When are you hoping to sell the property?` }],
          quickReplies: ['As soon as possible', 'Within 1-3 months', 'Later this year', 'Not sure yet']
        }]);
        return;
      } else if (isRent) {
        setHomeValueStep('timeline');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `When are you hoping to have the property available for rent?` }],
          quickReplies: ['As soon as possible', 'Within 1-3 months', 'Later this year', 'Not sure yet']
        }]);
        return;
      } else {
        // Just curious
        setHomeValueStep(null);
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Got it! We can help you get a better estimate of your home’s current market value.\n\nPlease share your contact details, and an agent can follow up with a more personalized valuation based on your property and the local market.` }]
        }]);
        setLeadStep('name');
        return;
      }
    }

    if (homeValueStep === 'timeline') {
      setHomeValueData(prev => ({ ...prev, timeline: msg }));
      
      const isRent = homeValueData.reason.toLowerCase().includes('rent');
      if (isRent) {
        setHomeValueStep('expected_rent');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Do you have a monthly rent in mind, or would you like help estimating what the property could rent for?` }],
          quickReplies: ['I have a price in mind', 'Help me estimate the rent']
        }]);
      } else {
        // Selling
        setHomeValueStep('has_agent');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Are you currently working with a real estate agent for this?` }],
          quickReplies: ['✅ Yes', '❌ No']
        }]);
      }
      return;
    }

    if (homeValueStep === 'expected_rent') {
      setHomeValueData(prev => ({ ...prev, expected_rent: msg }));
      setHomeValueStep('has_agent');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you currently working with a real estate agent or property manager for the rental?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (homeValueStep === 'has_agent') {
      const hasAgent = msg.toLowerCase().includes('yes') || msg.includes('✅');
      setHomeValueData(prev => ({ ...prev, has_agent: hasAgent ? 'Yes' : 'No' }));
      setHomeValueStep(null);

      if (hasAgent) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Thanks for letting me know. Since you’re currently working with another real estate agent, we want to respect that relationship and wouldn’t want to interfere. If your situation changes in the future, we’d be happy to assist you.` }]
        }]);
        return;
      }
      
      const action = homeValueData.reason.toLowerCase().includes('sell') ? 'sell your home' : 'rent out your property';
      
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thanks for the details! We can definitely help you get a highly accurate valuation and discuss your plans to ${action}.\n\nPlease share your contact details below, and an agent will follow up with you.` }]
      }]);
      setLeadStep('name');
      return;
    }

    // ── Lead info collection ────────────────────────────────────
    if (leadStep === 'select_property') {
      const allRenderedProps = messages.flatMap(m => m.properties || []);
      const lower = msg.toLowerCase();
      const newLikedIds = [];

      if (lower.includes('all')) {
        // User selected all of them
        allRenderedProps.forEach((p, idx) => {
          const pId = String(p?.mls_number || p?.address || p?.url || idx);
          newLikedIds.push(pId);
        });
      } else {
        // Try matching property by number, address or index
        allRenderedProps.forEach((p, idx) => {
          const pId = String(p?.mls_number || p?.address || p?.url || idx);
          const addr = (p.address || '').toLowerCase();
          if (
            lower.includes(`#${idx + 1}`) ||
            lower.includes(`property ${idx + 1}`) ||
            lower.includes(`property #${idx + 1}`) ||
            (addr && lower.includes(addr.slice(0, 8)))
          ) {
            newLikedIds.push(pId);
          }
        });

        // Fallback: If user typed something custom but couldn't match, add first shown property
        if (newLikedIds.length === 0 && allRenderedProps.length > 0) {
          const firstPId = String(allRenderedProps[0]?.mls_number || allRenderedProps[0]?.address || allRenderedProps[0]?.url || 0);
          newLikedIds.push(firstPId);
        }
      }

      // Deduplicate into likedProperties state
      setLikedProperties(prev => Array.from(new Set([...(prev || []), ...newLikedIds])));

      setLeadStep('name');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Great choice! 🎉 Our team can arrange a private tour, provide complete property disclosures, and answer all your questions.\n\nMay I have your **full name** please?` }],
        inputCard: { icon: '👤', label: 'Full Name', placeholder: 'e.g. John Doe...' }
      }]);
      return;
    }

    if (leadStep === 'name') {
      setLeadData(prev => ({ ...prev, name: msg }));
      setLeadStep('phone');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What is the best phone number for our agent to reach you?` }],
        inputCard: { icon: '📞', label: 'Phone Number', placeholder: 'e.g. 0300-1234567 or +92 300 1234567...' }
      }]);
      return;
    }

    if (leadStep === 'phone') {
      const digitsOnly = msg.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: "Please enter a valid phone number:" }],
          inputCard: { icon: '📞', label: 'Phone Number', placeholder: 'e.g. 0300-1234567...' }
        }]);
        return;
      }
      setLeadData(prev => ({ ...prev, phone: msg }));
      setLeadStep('email');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `And what email address should we use to send you matching property information and follow-up details?` }],
        inputCard: { icon: '✉️', label: 'Email Address', placeholder: 'e.g. name@example.com...' }
      }]);
      return;
    }

    if (leadStep === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(msg.trim())) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: "That doesn't look like a valid email. Please try again:" }],
          inputCard: { icon: '✉️', label: 'Email Address', placeholder: 'e.g. name@example.com...' }
        }]);
        return;
      }
      setLeadData(prev => ({ ...prev, email: msg }));
      setLeadStep('time');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What time is usually best for our agent to reach you?` }],
        quickReplies: ['🌅 Morning', '☀️ Afternoon', '🌆 Evening', '🕐 Anytime']
      }]);
      return;
    }

    if (leadStep === 'time') {
      const currentGoal = buyHomeData?.goal; // capture before state updates
      setLeadData(prev => ({ ...prev, time_preference: msg }));
      await saveLead(leadData.name, leadData.phone, leadData.email, msg, currentGoal);
      return;
    }


    // ── Closing Flow Handler ──────────────────────────────────────
    if (closingStep === 'ask_callback') {
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        setClosingStep('callback_name');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Wonderful! May I have your **full name** please?` }]
        }]);
      } else {
        // No callback → ask about listings
        setClosingStep('ask_listings');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `No problem! Would you like me to **send you some listings** of the available properties in your area?` }],
          quickReplies: ['✅ Yes, send me listings', '❌ No, thank you']
        }]);
      }
      return;
    }

    if (closingStep === 'callback_name') {
      setClosingData(prev => ({ ...prev, name: msg }));
      setClosingStep('callback_phone');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Nice to meet you, **${msg}**! 👋 What is the best **phone number** to reach you?` }]
      }]);
      return;
    }

    if (closingStep === 'callback_phone') {
      const digitsOnly = msg.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Please enter a valid phone number (e.g. 0300-1234567):` }]
        }]);
        return;
      }
      setClosingData(prev => ({ ...prev, phone: msg }));
      setClosingStep('callback_time');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Perfect! 📞 And what is the **best time to call** you?` }]
      }]);
      return;
    }

    if (closingStep === 'callback_time') {
      const data = { ...closingData, time: msg };
      setClosingData(data);
      setClosingStep(null);
      setLeadCaptured(true);
      // Save lead
      await saveLead(data.name, data.phone, '', msg);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thank you, **${data.name}**! 🎉 Mr. Adnan Alvi will call you at **${data.phone}** around **${msg}**. Is there anything else I can help you with?` }]
      }]);
      return;
    }

    if (closingStep === 'ask_listings') {
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        setClosingStep('listings_name');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Great! I'll send you some beautiful listings. May I have your **full name** please?` }]
        }]);
      } else {
        // No listings either → open ended
        setClosingStep('open_ended');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Of course! 😊 **What would you like me to do for you?** I'm here to help!` }]
        }]);
        setClosingStep(null); // Reset so AI takes over for open ended
      }
      return;
    }

    if (closingStep === 'listings_name') {
      setClosingData(prev => ({ ...prev, name: msg }));
      setClosingStep('listings_phone');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Nice to meet you, **${msg}**! 👋 What is your **phone number**?` }]
      }]);
      return;
    }

    if (closingStep === 'listings_phone') {
      const digitsOnly = msg.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Please enter a valid phone number (e.g. 0300-1234567):` }]
        }]);
        return;
      }
      setClosingData(prev => ({ ...prev, phone: msg }));
      setClosingStep('listings_email');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Perfect! And finally, what is your **email address** so I can send the listings to you?` }]
      }]);
      return;
    }

    if (closingStep === 'listings_email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(msg.trim())) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `That doesn't look like a valid email. Please try again:` }]
        }]);
        return;
      }
      const data = { ...closingData, email: msg };
      setClosingData(data);
      setClosingStep(null);
      setLeadCaptured(true);
      // Save lead
      await saveLead(data.name, data.phone, msg, '');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thank you, **${data.name}**! 🎉 I'll send the available property listings to **${msg}** shortly. Is there anything else I can help you with?` }]
      }]);
      return;
    }
    // ── Smart Filter Refinement Interception ──────────────────────
    const lowerMsg = (msg || '').toLowerCase();

    if (lowerMsg.includes('change house type') || lowerMsg.includes('change type') || lowerMsg === 'house type') {
      setFilterEditStep('house_type');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Please select your preferred **house type**:` }],
        quickReplies: ['🏠 Detached House', '🏡 Semi-Detached', '🏘️ Townhouse', '🏢 Condo', '🏢 Multi-Family / Duplex', '🌳 Land / Lot']
      }]);
      return;
    }

    if (lowerMsg.includes('change budget') || lowerMsg.includes('adjust budget') || lowerMsg === 'budget') {
      setFilterEditStep('budget');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What is your new preferred **budget**? (Select an option or type your exact amount):` }],
        quickReplies: ['Under $600k', '$600k - $750k', '$750k - $900k', '$900k - $1.2M', '$1.2M+']
      }]);
      return;
    }

    if (lowerMsg.includes('change bedrooms') || lowerMsg.includes('change bed') || lowerMsg.includes('adjust bedrooms') || lowerMsg === 'bedrooms') {
      setFilterEditStep('bedrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How many **bedrooms** would you like?` }],
        quickReplies: ['1 Bedroom', '2 Bedrooms', '3 Bedrooms', '4 Bedrooms', '5+ Bedrooms']
      }]);
      return;
    }

    // Apply preserved filter modifications if in filterEditStep
    let messageTextToSend = msg;

    if (filterEditStep === 'house_type') {
      setFilterEditStep(null);
      const cleanType = msg.replace(/[🏡🏠🏘️🏢🏗️]/gu, '').trim();
      setActiveApifyType(cleanType);
      setBuyHomeData(prev => ({ ...prev, type: cleanType, propertyType: cleanType }));
      const city = activeApifyCity || buyHomeData?.city || rentData?.city || 'Morton Grove';
      const budget = activeApifyBudget || buyHomeData?.budget || rentData?.budget || 0;
      const beds = activeApifyBeds || buyHomeData?.bedrooms || rentData?.bedrooms || 0;
      const budgetText = budget > 0 ? ` around $${Number(budget).toLocaleString()}` : '';
      const bedsText = beds > 0 ? ` with ${beds} bedrooms` : '';
      messageTextToSend = `Find ${cleanType} properties in ${city}${budgetText}${bedsText}`;
    } else if (filterEditStep === 'budget') {
      setFilterEditStep(null);
      const cleanBudget = msg.trim();
      setActiveApifyBudget(cleanBudget);
      setBuyHomeData(prev => ({ ...prev, budget: cleanBudget }));
      const city = activeApifyCity || buyHomeData?.city || rentData?.city || 'Morton Grove';
      const type = activeApifyType || buyHomeData?.type || buyHomeData?.propertyType || rentData?.propertyType || 'Semi-Detached';
      const beds = activeApifyBeds || buyHomeData?.bedrooms || rentData?.bedrooms || 0;
      const bedsText = beds > 0 ? ` with ${beds} bedrooms` : '';
      messageTextToSend = `Find ${type} properties in ${city} for budget ${cleanBudget}${bedsText}`;
    } else if (filterEditStep === 'bedrooms') {
      setFilterEditStep(null);
      const cleanBeds = msg.replace(/[^0-9]/g, '').trim() || msg.trim();
      setActiveApifyBeds(cleanBeds);
      setBuyHomeData(prev => ({ ...prev, bedrooms: cleanBeds }));
      const city = activeApifyCity || buyHomeData?.city || rentData?.city || 'Morton Grove';
      const type = activeApifyType || buyHomeData?.type || buyHomeData?.propertyType || rentData?.propertyType || 'Semi-Detached';
      const budget = activeApifyBudget || buyHomeData?.budget || rentData?.budget || 0;
      const budgetText = budget > 0 ? ` around $${Number(budget).toLocaleString()}` : '';
      messageTextToSend = `Find ${type} properties in ${city} with ${cleanBeds} bedrooms${budgetText}`;
    }

    // ── Interested in Property / Lead Capture Interception ────────
    if (
      lowerMsg.includes('like one of these') ||
      lowerMsg.includes('interested in a property') ||
      lowerMsg.includes('tell me more') ||
      lowerMsg.includes('i like one') ||
      lowerMsg.includes('yes, i liked one') ||
      (lowerMsg.includes('like') && lowerMsg.includes('property'))
    ) {
      const allRenderedProps = messages.flatMap(m => m.properties || []);
      if (allRenderedProps.length > 0) {
        // Build option buttons for each shown property
        const propButtons = allRenderedProps.slice(0, 6).map((p, idx) => {
          const addr = (p.address || `Property #${idx + 1}`).split('|')[0].trim();
          return `#${idx + 1}: ${addr}`;
        });
        propButtons.push('🌟 All of them');

        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Wonderful! 🏡 **Which property (or properties) did you like best?**\n\nPlease select from the options below or let me know:` }],
          quickReplies: propButtons
        }]);
        setLeadStep('select_property');
        return;
      }

      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Wonderful! 🎉 Our team can arrange a private tour, provide detailed property disclosures, and answer all your questions.\n\nMay I have your **full name** please?` }],
        inputCard: { icon: '👤', label: 'Full Name', placeholder: 'e.g. John Doe...' }
      }]);
      setLeadStep('name');
      return;
    }
    // ─────────────────────────────────────────────────────────────

    // ── Human takeover ────────────────────────────────────────────
    if (isHumanTakeover) {
      await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, role: 'user', content: msg })
      });
      return;
    }

    // Normal AI chat
    setIsLoading(true);
    messageCount.current += 1;

    try {
        const isDemoBot = botConfig.botId === 'demo-real-estate';

        // Use messageTextToSend which includes preserved filter criteria if adjusted
        const updatedApiMessages = messageTextToSend !== msg
          ? [...apiMessages.slice(0, -1), { role: 'user', parts: [{ text: messageTextToSend }] }]
          : apiMessages;

        const payload = {
          messages: updatedApiMessages,
          session_id: sessionId,
          bot_id: botConfig.botId,
          plan: embedPlan || 'premium',
          is_demo: isDemoBot
        };
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed");
      }
      const data = await response.json();
      if (data.human_takeover) {
        setIsHumanTakeover(true);
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: "🔄 You've been connected to a live agent. Please wait for their response..." }] }]);
      } else if (data.reply) {
        const { msg: newModelMsg, startLead, requestPreapproval, multiButtons } = parseModelReply(data.reply, data.properties || []);
        if (data.city) newModelMsg.city = data.city;

        // When properties are returned directly, attach quick replies for refinement & show more
        if (data.properties && Array.isArray(data.properties) && data.properties.length > 0) {
          newModelMsg.quickReplies = ['Show more properties', '🏠 Change House Type', '💰 Change Budget', '🛏️ Change Bedrooms'];
        }

        setMessages(prev => [...prev, newModelMsg]);

        if (requestPreapproval) {
          setBuyHomeStep('mortgage_upload');
        }

        // Save active search criteria across all searches (both DB and Apify)
        if (data.city) setActiveApifyCity(data.city);
        if (data.budget) setActiveApifyBudget(data.budget);
        if (data.beds) setActiveApifyBeds(data.beds);
        if (data.baths) setActiveApifyBaths(data.baths);
        if (data.type) setActiveApifyType(data.type);
        if (data.intent) setActiveApifyIntent(data.intent);

        if (data.apifyRunId) {
          setActiveApifyRunId(data.apifyRunId);
          setActiveApifyIntent(data.intent || (rentData?.city ? 'rent' : 'buy'));
          setActiveApifyCity(data.city || '');
          setActiveApifyBudget(data.budget || buyHomeData?.budget || rentData?.budget || 0);
          setActiveApifyBeds(data.beds || buyHomeData?.bedrooms || rentData?.bedrooms || 0);
          setActiveApifyBaths(data.baths || buyHomeData?.bathrooms || rentData?.bathrooms || 0);
          setActiveApifyType(data.type || buyHomeData?.propertyType || rentData?.propertyType || '');
        }
        // Activate multi-select if needed
        if (multiButtons.length > 0) {
          setMultiSelectOptions(multiButtons);
          setMultiSelected([]);
        } else {
          setMultiSelectOptions([]);
        }
        
        if (startLead && !leadCaptured && leadStep === null && closingStep === null) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              role: 'model',
              parts: [{ text: `What name should our agent use when contacting you?` }],
              inputCard: { icon: '👤', label: 'Full Name', placeholder: 'e.g. John Doe...' }
            }]);
            setLeadStep('name');
          }, 1500);
        }
      } else {
        throw new Error("Empty response from AI");
      }
    } catch (e) {
      console.error("Chat error:", e);
      const errMsg = e.message ? `Error: ${e.message}` : "Sorry, something went wrong.";
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: errMsg }] }]);
    } finally {
      setIsLoading(false);
      setMessages(prev => {
        checkLeadTrigger(prev);
        return prev;
      });
    }
  };

  const getPlaceholder = () => {
    if (leadStep === 'name') return 'Enter your full name...';
    if (leadStep === 'phone') return 'Enter your phone number...';
    if (leadStep === 'email') return 'Enter your email address...';
    if (leadStep === 'time') return 'Enter your preferred time...';
    if (isHumanTakeover) return 'Message live agent...';
    return 'Type your message...';
  };

  const resetChat = () => {
    // Reset all messages to fresh welcome
    setMessages([{ role: 'model', parts: [{ text: botConfig.welcomeMessage }] }]);
    setInput('');

    // Reset all intent/flow state — new chat is completely independent
    setIntentSelected(false);
    setSessionId(null);
    setIsHumanTakeover(false);
    setIsLoading(false);
    setClosingStep(null);
    setClosingData({ name: '', phone: '', email: '', time: '' });

    // Reset lead capture state
    setLeadCaptured(false);
    setLeadStep(null);
    setLeadData({ name: '', phone: '', email: '', time_preference: '', property_interest: '' });

    // Reset all conversation flows
    resetFlows();

    // Reset property states
    setLikedProperties([]);
    setDislikedProperties([]);
    setMultiSelectOptions([]);
    setMultiSelected([]);
    setActiveApifyRunId(null);
    setExpandedCityPanel(null);

    // Reset counters
    messageCount.current = 0;
    savedMsgCount.current = 0;

    // Create a brand new DB session — independent of previous chat
    // Small delay so state settles before session API call
    setTimeout(() => initSession(true), 100);
  };

  const showHumanTakeover = !!botConfig.botId && !isHumanTakeover && embedPlan !== 'standard';
  const isRealEstate = botIndustry !== 'E-Commerce';

  // Show RE intent options for first message, or RealtyPropFlow quick replies, or nothing
  // isREBot is true if industry is Real Estate OR still loading (optimistic for client bots)
  const isREBot = !!botConfig.botId && botIndustry !== 'E-Commerce';
  const lastMsg = messages[messages.length - 1];
  let activeQuickReplies = [];

  if (intentSelected && closingStep && closingStep !== 'open_ended' && showHumanTakeover) {
    activeQuickReplies = ["🙋‍♀️ Talk to Human"];
  } else if (lastMsg && lastMsg.role === 'model' && lastMsg.properties && Array.isArray(lastMsg.properties) && lastMsg.properties.length > 0) {
    activeQuickReplies = ["❤️ I'm interested in a property", "🔍 Show More Properties", "🔄 Change Search Criteria"];
  } else if (lastMsg && lastMsg.role === 'model' && lastMsg.quickReplies) {
    activeQuickReplies = lastMsg.quickReplies;
  } else if (!intentSelected && isREBot) {
    // Show intent buttons until user picks one
    activeQuickReplies = RE_INTENT_OPTIONS;
  } else if (messages.length === 1 && !botConfig.botId) {
    activeQuickReplies = ["How do I create a chatbot?", "What is the pricing?", "Does it capture leads?"];
  }

  if (!mounted) return null;

  return (
    <div 
      id={isGlobal ? 'realty-prop-global-bot' : 'realty-prop-embed-bot'} 
      className={`${styles.chatbotContainer} ${forceDesktopMode ? styles.forceDesktop : ''} ${isMobile ? styles.mobileContainer : ''} ${isTablet ? styles.tabletContainer : ''}`} 
      style={{ 
        '--primary': botConfig.primaryColor,
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        left: 'auto',
        top: 'auto',
        zIndex: 99999
      }}
    >
      {isOpen ? (
        <div className={`${styles.chatWindow} ${isGlobal ? styles.globalChatWindow : ''}`}>
          <div className={styles.header}>
            <a 
              href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.realtypropflow.com'}/login`} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
              title="Dashboard Login"
            >
              <div className={styles.headerInfo}>
                <div className={styles.avatar}>
                  {botConfig.botAvatar && (botConfig.botAvatar.startsWith('http') || botConfig.botAvatar.startsWith('/')) ? (
                    <img src={botConfig.botAvatar} alt="Bot Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    botConfig.botAvatar
                  )}
                </div>
                <div>
                  <div className={styles.title}>{botConfig.botName}</div>
                  <div className={styles.status}>
                    {isHumanTakeover ? '🟡 Live Agent Connected' : '🟢 AI Online'}
                  </div>
                  {isDemoBot && embedPlan && (
                    <div style={{ marginTop: '2px', fontSize: '10px', background: embedPlan === 'premium' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)', color: embedPlan === 'premium' ? '#FDE047' : '#E2E8F0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {embedPlan === 'premium' ? '👑 Premium Plan' : '📦 Standard Plan'}
                    </div>
                  )}
                </div>
              </div>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Close & Reset Button (✕): Closes widget AND starts fresh new chat session */}
              <button
                title="Close and Start New Chat"
                onClick={() => {
                  resetChat();
                  setIsOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  padding: 0,
                  outline: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              {/* Minimize Button (⌄): Minimizes widget to launcher icon, preserves chat history */}
              <button 
                title="Minimize" 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  padding: 0,
                  outline: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.messagesArea}>
            {messages.filter(msg => msg && msg.parts && msg.parts.length > 0).map((msg, idx) => (
              <ChatErrorBoundary key={idx}>
                <div className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.modelMsg}`}>
                  {msg.role === 'model' ? (
                    <>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({node, ...props}) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                          ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }} {...props} />,
                          ol: ({node, ...props}) => <ol style={{ paddingLeft: '20px', margin: '0 0 8px 0' }} {...props} />,
                          li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
                          a: ({node, ...props}) => <a style={{ color: 'var(--primary)', textDecoration: 'underline' }} target="_blank" {...props} />,
                          strong: ({node, ...props}) => <strong style={{ fontWeight: '700' }} {...props} />,
                          img: ({node, src, alt, ...props}) => (
                            <img
                              src={src} alt={alt || 'Property'}
                              style={{ maxWidth: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', marginTop: '8px', display: 'block' }}
                              referrerPolicy="no-referrer"
                              onError={e => { e.target.style.display = 'none'; }}
                              {...props}
                            />
                          )
                        }}
                      >
                        {msg?.parts?.[0]?.text || ''}
                      </ReactMarkdown>

                    {/* City Engagement Accordion Buttons */}
                    {msg.cityBtns && msg.cityBtns.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {msg.cityBtns.map((btn, bi) => {
                            const panelKey = `${idx}-${btn}`;
                            const isOpen = expandedCityPanel === panelKey;

                            const getContent = () => {
                              const norm = (btn || '').replace(/[^\w\s]/gi, '').trim().toLowerCase();
                              if (msg.cityInfoMap) {
                                for (const [k, v] of Object.entries(msg.cityInfoMap)) {
                                  const normK = k.replace(/[^\w\s]/gi, '').trim().toLowerCase();
                                  if (normK === norm || normK.includes(norm) || norm.includes(normK)) {
                                    return v;
                                  }
                                }
                              }

                              const cityName = msg.city || rentData?.city || (msg?.parts?.[0]?.text?.match(/(?:in|for)\s+\*\*?([a-zA-Z\s]+?)\*\*?(?:\.\.\.|\!|\s+that)/i)?.[1]) || (msg?.parts?.[0]?.text?.match(/Searching for live properties in\s+([a-zA-Z\s]+?)(?:\.\.\.|\!)/i)?.[1]) || 'this area';
                              const fallbacks = {
                                school: `**Schools & Education in ${cityName}**\n\n${cityName} is served by reputable school districts with high-performing public elementary, middle, and high schools alongside private and charter options. The area offers strong academic support, AP programs, extracurriculars, and active parent-teacher communities.`,
                                park: `**Parks & Outdoor Recreation in ${cityName}**\n\n${cityName} features expansive green spaces, nature trails, paved cycling paths, modern playgrounds, and sports facilities. It's a wonderful environment for outdoor activities, weekend family picnics, and pet-friendly recreation.`,
                                transport: `**Transportation & Commute in ${cityName}**\n\n${cityName} offers seamless connectivity via major expressways, regional commuter transit, and local bus networks. Commuters enjoy convenient access to downtown business hubs and nearby international airports.`,
                                shop: `**Shopping & Dining in ${cityName}**\n\nFrom modern retail malls and grocery hubs (Costco, Whole Foods, Target) to eclectic local dining and vibrant weekend markets, ${cityName} offers a rich variety of culinary and retail experiences.`,
                                health: `**Healthcare & Medical Centers in ${cityName}**\n\nResidents have quick access to leading regional hospitals, specialized medical clinics, urgent care centers, and 24/7 pharmacies, ensuring comprehensive healthcare for the whole family.`,
                                neighbor: `**Neighborhood Character of ${cityName}**\n\n${cityName} is celebrated for its safe, welcoming neighborhoods, tree-lined residential streets, and diverse community feel. It attracts professionals, growing families, and retirees alike.`,
                                hous: `**Housing Market & Real Estate in ${cityName}**\n\n${cityName} features a dynamic real estate market with strong long-term appreciation. Available homes range from modern condominiums and townhouses to spacious detached single-family residences.`,
                                commun: `**Community & Lifestyle in ${cityName}**\n\n${cityName} hosts seasonal festivals, cultural centers, community sports leagues, and public libraries that bring neighbors together throughout the year.`,
                                tip: `**Buyer Tips & Advice for ${cityName}**\n\nGet pre-approved early to stay competitive, explore neighborhoods during different times of the day to gauge traffic and community vibe, and partner with a local expert agent to uncover off-market listings!`
                              };

                              for (const [cat, text] of Object.entries(fallbacks)) {
                                if (norm.includes(cat)) return text;
                              }
                              return `**Information about ${btn} in ${cityName}**\n\n${cityName} provides exceptional amenities, community resources, and living standards for its residents.`;
                            };

                            const info = getContent();

                            return (
                              <div key={bi}>
                                <button
                                  onClick={() => setExpandedCityPanel(isOpen ? null : panelKey)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: isOpen ? '10px 10px 0 0' : '10px',
                                    border: `1.5px solid ${isOpen ? 'var(--primary)' : '#e5e7eb'}`,
                                    background: isOpen ? 'linear-gradient(90deg, var(--primary) 0%, #6366f1 100%)' : 'white',
                                    color: isOpen ? 'white' : '#374151',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    boxShadow: isOpen ? '0 2px 8px rgba(99,102,241,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                                    textAlign: 'left'
                                  }}
                                >
                                  <span>{btn}</span>
                                  <span style={{ fontSize: '11px', opacity: 0.8 }}>{isOpen ? '▲' : '▼'}</span>
                                </button>
                                {isOpen && (
                                  <div style={{
                                    background: '#f8faff',
                                    border: '1.5px solid var(--primary)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 10px 10px',
                                    padding: '12px 14px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    lineHeight: '1.7',
                                    animation: 'fadeIn 0.2s ease'
                                  }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{info}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {msg.properties && Array.isArray(msg.properties) && msg.properties.length > 0 && (
                      <PropertyCardsPaginated
                        properties={msg.properties}
                        onOpenGallery={setGalleryModal}
                        onOpenDetails={setDetailsModal}
                        likedProperties={likedProperties}
                        dislikedProperties={dislikedProperties}
                        setLikedProperties={setLikedProperties}
                        setDislikedProperties={setDislikedProperties}
                        onLikeMore={() => handleSend('I like one of these properties, I want to learn more')}
                        onShowMoreAI={() => handleSend('Show me more properties please')}
                      />
                    )}
                  </>
                ) : (
                    msg?.parts?.[0]?.text || ''
                  )}
                </div>
              </ChatErrorBoundary>
            ))}
            {activeApifyRunId ? (
              <div className={styles.scraperLoadingCard}>
                <span className={styles.spinningGear}>⚙️</span>
                <div>
                  <div className={styles.scraperText}>
                    Scanning live MLS, Realtor & Zillow listings in <strong>{activeApifyCity ? (activeApifyCity.charAt(0).toUpperCase() + activeApifyCity.slice(1)) : 'the area'}</strong>...
                  </div>
                  <div className={styles.scraperSubtext}>
                    Matching properties within your budget & criteria
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className={`${styles.message} ${styles.modelMsg} ${styles.typing}`}>
                <div className={styles.dot}></div><div className={styles.dot}></div><div className={styles.dot}></div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          {/* Property Image Gallery Modal */}
          {galleryModal && (
            <div
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.93)', zIndex: 20, display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}
              onClick={(e) => { if (e.target === e.currentTarget) setGalleryModal(null); }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>{galleryModal?.property?.price || 'Property'}</div>
                  <div style={{ color: '#9ca3af', fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(galleryModal?.property?.address || '').split('|')[0]}</div>
                </div>
                <button onClick={() => setGalleryModal(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Main Image */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <img
                  src={galleryModal.images[galleryModal.activeIdx]}
                  alt="Property"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {/* Prev Arrow */}
                {galleryModal.activeIdx > 0 && (
                  <button
                    onClick={() => setGalleryModal(prev => ({ ...prev, activeIdx: prev.activeIdx - 1 }))}
                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                  >‹</button>
                )}
                {/* Next Arrow */}
                {galleryModal.activeIdx < galleryModal.images.length - 1 && (
                  <button
                    onClick={() => setGalleryModal(prev => ({ ...prev, activeIdx: prev.activeIdx + 1 }))}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                  >›</button>
                )}
                {/* Image counter */}
                <div style={{ position: 'absolute', bottom: '8px', right: '10px', background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>
                  {galleryModal.activeIdx + 1} / {galleryModal.images.length}
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div style={{ display: 'flex', gap: '4px', padding: '8px', background: 'rgba(0,0,0,0.6)', overflowX: 'auto', flexShrink: 0 }}>
                {galleryModal.images.map((img, ti) => (
                  <img
                    key={ti}
                    src={img}
                    alt={`Photo ${ti + 1}`}
                    onClick={() => setGalleryModal(prev => ({ ...prev, activeIdx: ti }))}
                    style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, border: ti === galleryModal.activeIdx ? '2px solid #10b981' : '2px solid transparent', opacity: ti === galleryModal.activeIdx ? 1 : 0.6, transition: 'opacity 0.2s, border 0.2s' }}
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ))}
              </div>

              {/* Property Details Footer */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.7)', display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ color: '#d1fae5', fontSize: '12px' }}>🛏️ {galleryModal?.property?.bedrooms || '?'} Beds</span>
                <span style={{ color: '#d1fae5', fontSize: '12px' }}>🛁 {galleryModal?.property?.bathrooms || '?'} Baths</span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{galleryModal?.property?.property_type || 'Property'}</span>
                <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: 'auto' }}>{galleryModal?.property?.city || ''}{galleryModal?.property?.province ? `, ${galleryModal.property.province}` : ''}</span>
              </div>
            </div>
          )}

          {/* Full Property Details Modal */}
          {detailsModal && (
            <PropertyDetailsModal
              detailsModal={detailsModal}
              onClose={() => setDetailsModal(null)}
              onOpenGallery={setGalleryModal}
              onInquire={(text) => {
                setDetailsModal(null);
                handleSend(text);
              }}
            />
          )}

          {/* Calendly Popup */}
          {showCalendly && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: '#12213B', color: 'white' }}>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>📅 Book a Free Call</span>
                <button onClick={() => setShowCalendly(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>
              <iframe
                src={`${CALENDLY_URL}?embed_type=Inline&hide_gdpr_banner=1`}
                style={{ flex: 1, border: 'none', width: '100%' }}
                title="Book a Call"
              />
            </div>
          )}

          {activeQuickReplies.length > 0 && buyHomeStep !== 'mortgage_upload' && (
            <div className={styles.quickReplies}>
              {activeQuickReplies.map((reply, idx) => (
                <button key={idx} onClick={() => handleSend(reply)} className={styles.qrBtn}>{reply}</button>
              ))}
            </div>
          )}

          {/* Multi-select buttons (e.g., for features like Garage, Pool, Basement) */}
          {multiSelectOptions.length > 0 && (
            <div className={styles.quickReplies} style={{ flexWrap: 'wrap' }}>
              {multiSelectOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setMultiSelected(prev =>
                    prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                  )}
                  className={`${styles.multiBtn} ${multiSelected.includes(opt) ? styles.multiBtnActive : ''}`}
                >
                  {multiSelected.includes(opt) ? '✓ ' : ''}{opt}
                </button>
              ))}
            </div>
          )}



          {leadStep && (
            <div style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 123, 44, 0.08)',
              borderTop: '1px solid rgba(255, 123, 44, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#FF7B2C'
            }}>
              <span>{leadStep === 'name' ? '👤' : leadStep === 'phone' ? '📞' : leadStep === 'email' ? '✉️' : '🕒'}</span>
              <span>
                {leadStep === 'name' ? 'Full Name required to book call' : leadStep === 'phone' ? 'Valid Phone Number required' : leadStep === 'email' ? 'Valid Email Address required' : 'Preferred Contact Time required'}
              </span>
            </div>
          )}

          <div className={styles.inputArea}>
            {buyHomeStep === 'mortgage_upload' ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <input
                  type="file"
                  id="letter-upload"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                {/* I'll provide later — left side, same style as quickReply */}
                <button
                  onClick={() => { handleSkipUpload(); setActiveQuickReplies([]); }}
                  disabled={isUploading}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    backgroundColor: 'transparent',
                    color: botConfig.primaryColor || '#1E6FD9',
                    border: `2px solid ${botConfig.primaryColor || '#1E6FD9'}`,
                    borderRadius: '24px',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    opacity: isUploading ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ⏭ I'll provide later
                </button>
                {/* Upload Document — right side, same style as quickReply filled */}
                <label
                  htmlFor="letter-upload"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px 14px',
                    backgroundColor: botConfig.primaryColor || '#1E6FD9',
                    color: 'white',
                    borderRadius: '24px',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    opacity: isUploading ? 0.7 : 1,
                    pointerEvents: isUploading ? 'none' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    border: '2px solid transparent'
                  }}
                >
                  {isUploading ? 'Uploading...' : '📎 Upload Document'}
                </label>
              </div>
            ) : (
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder={getPlaceholder()}
                className={styles.input}
                disabled={isUploading}
              />
            )}
            
            {buyHomeStep !== 'mortgage_upload' && (
              <button 
                onClick={() => handleSend()} 
                className={styles.sendBtn}
                disabled={isUploading}
              >
                Send
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          className={`${styles.floatingBtn} ${isMobile ? styles.floatingBtnMobile : ''}`}
          style={{
            position: 'fixed',
            bottom: isMobile ? '80px' : '24px',
            right: isMobile ? '16px' : '24px',
            left: 'auto',
            top: 'auto',
            zIndex: 999999
          }}
          onClick={() => setIsOpen(true)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
          title={isMobile ? "Message" : "Chat with us"}
        >
          <div className={styles.btnAvatarCircle}>
            {botConfig.botAvatar && (botConfig.botAvatar.startsWith('http') || botConfig.botAvatar.startsWith('/')) ? (
              <img src={botConfig.botAvatar} alt="Avatar" className={styles.btnAvatarImg} />
            ) : (
              <span className={styles.btnAvatarText}>
                {botConfig.botAvatar || (botConfig.botName ? botConfig.botName.charAt(0).toUpperCase() : 'A')}
              </span>
            )}
            <span className={styles.onlineDot}></span>
          </div>
          <span className={styles.btnLabel}>
            {isMobile ? 'Message' : 'Chat with us'}
          </span>
        </button>
      )}
    </div>
  );
}

