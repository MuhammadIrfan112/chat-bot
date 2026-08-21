'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Building, MoreVertical, Trash2, Edit, ChevronLeft, ChevronRight, Image as ImageIcon, MapPin, DollarSign, Bed, Bath, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [botId, setBotId] = useState('');
  
  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    property_type: 'Single Family',
    status: 'Active',
    description: ''
  });
  
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
      
      const { data: userProfile } = await supabase
        .from('users_subscription')
        .select('bot_id')
        .eq('user_id', userId)
        .single();
        
      let effectiveBotId = userProfile?.bot_id;
      if (!effectiveBotId) {
        const { data: bots } = await supabase
          .from('bots')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        if (bots && bots.length > 0) {
          effectiveBotId = bots[0].id;
        }
      }
        
      if (effectiveBotId) {
        setBotId(effectiveBotId);
        const res = await fetch(`/api/crm/properties?bot_id=${effectiveBotId}`);
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, bot_id: botId })
      });
      
      if (res.ok) {
        setShowModal(false);
        setFormData({ address: '', city: '', state: '', zip_code: '', price: '', bedrooms: '', bathrooms: '', square_feet: '', property_type: 'Single Family', status: 'Active', description: '' });
        fetchProperties();
      }
    } catch (err) {
      console.error('Error adding property:', err);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this property?')) {
      await supabase.from('properties').delete().eq('property_id', id);
      fetchProperties();
    }
  };

  const handleScrape = async () => {
    if (!botId) {
      setScrapeMessage('❌ Error: Chatbot ID not found. Please complete your chatbot setup first. Go to My Profile and make sure your website URL is saved.');
      return;
    }

    setScraping(true);
    setScrapeMessage('Syncing all properties from your website... This crawls multiple pages and extracts photos.');
    try {
      const res = await fetch('/api/crm/properties/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botId })
      });
      const data = await res.json();
      
      if (res.ok) {
        setScrapeMessage(`✅ ${data.message} (Added: ${data.added || 0}, Updated: ${data.updated || 0}, Removed: ${data.removed || 0})`);
        fetchProperties();
        setTimeout(() => {
          setScrapeMessage('');
        }, 6000);
      } else {
        setScrapeMessage(`❌ Error: ${data.error || 'Failed to sync'}`);
      }
    } catch (err) {
      setScrapeMessage(`❌ Failed to connect to scraper.`);
    } finally {
      setScraping(false);
    }
  };

  // Filter properties by search query
  const filteredProperties = properties.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const addr = String(p.address || '').toLowerCase();
    const city = String(p.city || '').toLowerCase();
    const type = String(p.property_type || '').toLowerCase();
    const price = String(p.price || '').toLowerCase();
    return addr.includes(q) || city.includes(q) || type.includes(q) || price.includes(q);
  });

  // Pagination calculation (10 items per page)
  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const currentProperties = filteredProperties.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>Properties</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active listings, inventory, and synced website properties ({properties.length} total).</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleScrape()}
            disabled={scraping}
            style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              cursor: scraping ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: '600', 
              opacity: scraping ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
            }}
          >
            <Search size={18} /> {scraping ? 'Syncing Website...' : 'Sync / Update Properties'}
          </button>
        </div>
      </div>

      {/* Status Message Toast */}
      {scrapeMessage && (
        <div style={{ 
          padding: '16px 20px', 
          borderRadius: '12px', 
          marginBottom: '24px', 
          background: scrapeMessage.startsWith('✅') ? 'rgba(46,213,115,0.12)' : scrapeMessage.startsWith('❌') ? 'rgba(255,77,79,0.12)' : 'rgba(79,70,229,0.12)',
          border: `1px solid ${scrapeMessage.startsWith('✅') ? '#2ed573' : scrapeMessage.startsWith('❌') ? '#ff4d4f' : 'var(--primary)'}`,
          color: scrapeMessage.startsWith('✅') ? '#2ed573' : scrapeMessage.startsWith('❌') ? '#ff4d4f' : 'var(--text-primary)',
          fontWeight: '500',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {scrapeMessage}
        </div>
      )}

      {/* Search Bar & Controls */}
      {properties.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by address, city, type..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
            Showing {filteredProperties.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredProperties.length)} of {filteredProperties.length} properties
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Loading properties...</div>
          <p style={{ fontSize: '14px' }}>Fetching your active listings inventory</p>
        </div>
      ) : properties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          <Building size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>No properties found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Click "Sync / Update Properties" to automatically fetch listings and photos from your website.</p>
          <button 
            onClick={() => handleScrape()} 
            disabled={scraping} 
            style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              cursor: scraping ? 'not-allowed' : 'pointer', 
              fontWeight: '600' 
            }}
          >
            {scraping ? 'Syncing...' : 'Sync Properties Now'}
          </button>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>No properties matching "{searchQuery}".</p>
        </div>
      ) : (
        <>
          {/* Properties Grid (10 per page) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '36px' }}>
            {currentProperties.map(property => {
              const photosArr = Array.isArray(property.photos) && property.photos.length > 0 
                ? property.photos 
                : (property.image_url ? [property.image_url] : []);
              const mainPhoto = photosArr[0];

              return (
                <motion.div 
                  key={property.property_id} 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  style={{ 
                    background: 'var(--bg-card)', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)', 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Photo Container */}
                  <div style={{ height: '190px', background: 'var(--bg-hover)', position: 'relative', overflow: 'hidden' }}>
                    {mainPhoto ? (
                      <img 
                        src={mainPhoto} 
                        alt={property.address}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    {/* Fallback Icon when no photo or photo fails to load */}
                    <div style={{ 
                      display: mainPhoto ? 'none' : 'flex', 
                      width: '100%', 
                      height: '100%', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(16,185,129,0.05))'
                    }}>
                      <Building size={48} color="var(--text-muted)" opacity={0.6} />
                    </div>

                    {/* Status Badge */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      right: '12px', 
                      background: 'rgba(0,0,0,0.7)', 
                      backdropFilter: 'blur(4px)',
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      color: 'white', 
                      fontSize: '12px', 
                      fontWeight: '600' 
                    }}>
                      {property.status || 'Active'}
                    </div>

                    {/* Photo Count Badge */}
                    {photosArr.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <ImageIcon size={12} /> {photosArr.length} photos
                      </div>
                    )}

                    {/* Property Type Badge */}
                    {property.property_type && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '12px',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {property.property_type}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--primary)' }}>
                          {property.price ? `$${Number(property.price).toLocaleString()}` : 'Contact for Price'}
                        </h3>
                        <button 
                          onClick={() => handleDelete(property.property_id)} 
                          title="Delete property"
                          style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {property.address}
                      </h4>

                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                        {property.city ? `${property.city}${property.state ? ', ' + property.state : ''} ${property.zip_code || ''}` : 'Location available upon request'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: 'auto' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{property.bedrooms ?? '-'}</strong> Beds
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{property.bathrooms ?? '-'}</strong> Baths
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{property.square_feet ? Number(property.square_feet).toLocaleString() : '-'}</strong> Sq.Ft.
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination Controls (10 properties per page) */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px', 
              paddingTop: '20px', 
              borderTop: '1px solid var(--border)' 
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safePage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: safePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <ChevronLeft size={16} /> Prev
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: page === safePage ? 'none' : '1px solid var(--border)',
                    background: page === safePage ? 'var(--primary)' : 'var(--bg-card)',
                    color: page === safePage ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: page === safePage ? '700' : '500'
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: safePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Property Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)' }}>Add New Property</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Address *</label>
                <input required type="text" name="address" value={formData.address} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>ZIP Code</label>
                  <input type="text" name="zip_code" value={formData.zip_code} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Price ($)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Sold">Sold</option>
                    <option value="Off-Market">Off-Market</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Beds</label>
                  <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Baths</label>
                  <input type="number" step="0.5" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Sq Ft</label>
                  <input type="number" name="square_feet" value={formData.square_feet} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button type="submit" style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Save Property</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'transparent', color: 'white', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
