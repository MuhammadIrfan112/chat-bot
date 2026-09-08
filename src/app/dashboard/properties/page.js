'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Building, MoreVertical, Trash2, Edit, ChevronLeft, ChevronRight, Image as ImageIcon, MapPin, DollarSign, Bed, Bath, Maximize, Calendar, Clock, CheckCircle, X, Home } from 'lucide-react';
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

  // Open House State
  const [selectedOpenHouseProp, setSelectedOpenHouseProp] = useState(null);
  const [savingOpenHouse, setSavingOpenHouse] = useState(false);
  const [openHouseForm, setOpenHouseForm] = useState({
    date: '',
    start_time: '1:00 PM',
    end_time: '3:00 PM',
    time_zone: 'Eastern Time (ET)',
    hosted_by: '',
    agent_brokerage: '',
    agent_phone: '',
    agent_email: '',
    property_highlights: '',
    open_house_notes: 'Visitors are welcome during the scheduled open-house hours. No appointment is required.',
    private_showing: 'Private showings are available by appointment.',
    open_house_status: 'Scheduled',
    additional_instructions: 'For questions about the property or to arrange a private showing, contact the listing agent.'
  });

  const getOpenHouseDataFromProp = (prop) => {
    if (!prop || !Array.isArray(prop.features)) return null;
    const jsonStr = prop.features.find(f => typeof f === 'string' && f.startsWith('OPEN_HOUSE_JSON:'));
    if (jsonStr) {
      try {
        return JSON.parse(jsonStr.replace('OPEN_HOUSE_JSON:', ''));
      } catch (e) {}
    }
    return null;
  };

  const handleOpenHouseClick = (property) => {
    setSelectedOpenHouseProp(property);
    const existing = getOpenHouseDataFromProp(property);

    const defaultHighlights = [
      property.bedrooms ? `• ${property.bedrooms}-bedroom ${property.property_type || 'home'}` : '',
      property.bathrooms ? `• ${property.bathrooms} bathrooms` : '',
      property.square_feet ? `• ${Number(property.square_feet).toLocaleString()} sq.ft living space` : '',
      property.description ? `• ${property.description.slice(0, 150)}` : ''
    ].filter(Boolean).join('\n');

    if (existing) {
      setOpenHouseForm({
        date: existing.date || '',
        start_time: existing.start_time || '1:00 PM',
        end_time: existing.end_time || '3:00 PM',
        time_zone: existing.time_zone || 'Eastern Time (ET)',
        hosted_by: existing.hosted_by || '',
        agent_brokerage: existing.agent_brokerage || '',
        agent_phone: existing.agent_phone || '',
        agent_email: existing.agent_email || '',
        property_highlights: existing.property_highlights || defaultHighlights,
        open_house_notes: existing.open_house_notes || 'Visitors are welcome during the scheduled open-house hours. No appointment is required.',
        private_showing: existing.private_showing || 'Private showings are available by appointment.',
        open_house_status: existing.open_house_status || 'Scheduled',
        additional_instructions: existing.additional_instructions || 'For questions about the property or to arrange a private showing, contact the listing agent.'
      });
    } else {
      setOpenHouseForm({
        date: '',
        start_time: '1:00 PM',
        end_time: '3:00 PM',
        time_zone: 'Eastern Time (ET)',
        hosted_by: '',
        agent_brokerage: '',
        agent_phone: '',
        agent_email: '',
        property_highlights: defaultHighlights,
        open_house_notes: 'Visitors are welcome during the scheduled open-house hours. No appointment is required.',
        private_showing: 'Private showings are available by appointment.',
        open_house_status: 'Scheduled',
        additional_instructions: 'For questions about the property or to arrange a private showing, contact the listing agent.'
      });
    }
  };

  const handleOpenHouseChange = (e) => {
    const { name, value } = e.target;
    setOpenHouseForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveOpenHouse = async (e) => {
    e.preventDefault();
    if (!selectedOpenHouseProp) return;
    setSavingOpenHouse(true);
    try {
      const res = await fetch('/api/crm/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: selectedOpenHouseProp.property_id,
          open_house_data: {
            ...openHouseForm,
            last_updated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          }
        })
      });
      if (res.ok) {
        setSelectedOpenHouseProp(null);
        await fetchProperties();
      } else {
        alert('Failed to save Open House details');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving Open House: ' + err.message);
    } finally {
      setSavingOpenHouse(false);
    }
  };

  const handleRemoveOpenHouse = async () => {
    if (!selectedOpenHouseProp) return;
    if (!confirm('Are you sure you want to remove the Open House status from this property?')) return;
    setSavingOpenHouse(true);
    try {
      const res = await fetch('/api/crm/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: selectedOpenHouseProp.property_id,
          remove_open_house: true
        })
      });
      if (res.ok) {
        setSelectedOpenHouseProp(null);
        await fetchProperties();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingOpenHouse(false);
    }
  };

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
            {currentProperties.map((property, index) => {
              const photosArr = Array.isArray(property.photos) ? property.photos : (property.image_url ? [property.image_url] : []);
              const mainPhoto = photosArr[0] || null;
              const ohData = getOpenHouseDataFromProp(property);
              const isOH = (property.status || '').toLowerCase() === 'open house' || !!ohData;

              return (
                <motion.div 
                  key={property.property_id || index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: isOH ? '1.5px solid #10b981' : '1px solid var(--border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isOH ? '0 4px 20px rgba(16, 185, 129, 0.15)' : '0 4px 20px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = isOH ? '0 10px 25px rgba(16, 185, 129, 0.25)' : '0 10px 25px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isOH ? '0 4px 20px rgba(16, 185, 129, 0.15)' : '0 4px 20px rgba(0,0,0,0.04)'; }}
                >
                  {/* Photo Area */}
                  <div style={{ position: 'relative', width: '100%', height: '180px', background: '#1e293b' }}>
                    {mainPhoto ? (
                      <img 
                        src={mainPhoto} 
                        alt={property.address} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Building size={40} />
                      </div>
                    )}

                    {/* Open House Badge on Photo */}
                    {isOH && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 2
                      }}>
                        <span>🏡</span> OPEN HOUSE {ohData?.date ? `• ${ohData.date}` : ''}
                      </div>
                    )}

                    {/* Photo Count Badge */}
                    {photosArr.length > 0 && (
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
                        <ImageIcon size={12} /> {photosArr.length}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button 
                            onClick={() => handleOpenHouseClick(property)} 
                            title={isOH ? "Manage Open House" : "Set as Open House"}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '5px', 
                              padding: '5px 10px', 
                              borderRadius: '6px', 
                              border: isOH ? '1px solid #10b981' : '1px solid var(--border)', 
                              background: isOH ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)', 
                              color: isOH ? '#10b981' : 'var(--text-primary)', 
                              fontSize: '12px', 
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <span>🏡</span> {isOH ? 'Open House' : 'Open House'}
                          </button>
                          <button 
                            onClick={() => handleDelete(property.property_id)} 
                            title="Delete property"
                            style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
                    <option value="Open House">🏡 Open House</option>
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

      {/* ── Open House Management Modal ─────────────────────────────── */}
      {selectedOpenHouseProp && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.75)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1100, 
          padding: '20px' 
        }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            borderRadius: '20px', 
            width: '100%', 
            maxWidth: '720px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            border: '1px solid var(--border)', 
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '22px' }}>🏡</span>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    Manage Open House
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  {selectedOpenHouseProp.address}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOpenHouseProp(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOpenHouse} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 1: Pre-filled Property Info */}
              <div style={{ background: 'var(--bg-page)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  📋 Property Overview (Auto-filled)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Type:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedOpenHouseProp.property_type || 'Single Family'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Price:</span>
                    <strong style={{ color: '#10b981' }}>{selectedOpenHouseProp.price ? `$${Number(selectedOpenHouseProp.price).toLocaleString()}` : 'Contact'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Beds / Baths:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedOpenHouseProp.bedrooms ?? '-'} Beds / {selectedOpenHouseProp.bathrooms ?? '-'} Baths</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>MLS Number:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedOpenHouseProp.mls_number || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Date & Timing */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} style={{ color: 'var(--primary)' }} /> Open House Schedule
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Open House Date *
                    </label>
                    <input 
                      type="text" 
                      required 
                      name="date" 
                      value={openHouseForm.date} 
                      onChange={handleOpenHouseChange} 
                      placeholder="e.g. Saturday, September 12, 2026" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Start Time *
                    </label>
                    <input 
                      type="text" 
                      required 
                      name="start_time" 
                      value={openHouseForm.start_time} 
                      onChange={handleOpenHouseChange} 
                      placeholder="e.g. 1:00 PM" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      End Time *
                    </label>
                    <input 
                      type="text" 
                      required 
                      name="end_time" 
                      value={openHouseForm.end_time} 
                      onChange={handleOpenHouseChange} 
                      placeholder="e.g. 3:00 PM" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Time Zone
                  </label>
                  <input 
                    type="text" 
                    name="time_zone" 
                    value={openHouseForm.time_zone} 
                    onChange={handleOpenHouseChange} 
                    placeholder="e.g. Eastern Time (ET)" 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                  />
                </div>
              </div>

              {/* SECTION 3: Host & Agent Information */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} style={{ color: 'var(--primary)' }} /> Host & Agent Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Hosted By (Agent Name)
                    </label>
                    <input 
                      type="text" 
                      name="hosted_by" 
                      value={openHouseForm.hosted_by} 
                      onChange={handleOpenHouseChange} 
                      placeholder="e.g. John Smith" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Agent Brokerage
                    </label>
                    <input 
                      type="text" 
                      name="agent_brokerage" 
                      value={openHouseForm.agent_brokerage} 
                      onChange={handleOpenHouseChange} 
                      placeholder="e.g. ABC Realty" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Agent Phone
                    </label>
                    <input 
                      type="text" 
                      name="agent_phone" 
                      value={openHouseForm.agent_phone} 
                      onChange={handleOpenHouseChange} 
                      placeholder="e.g. 416-555-1234" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Agent Email
                    </label>
                    <input 
                      type="email" 
                      name="agent_email" 
                      value={openHouseForm.agent_email} 
                      onChange={handleOpenHouseChange} 
                      placeholder="e.g. john@example.com" 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Highlights, Notes & Status */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} style={{ color: 'var(--primary)' }} /> Open House Details & Notes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Property Highlights
                    </label>
                    <textarea 
                      rows={3} 
                      name="property_highlights" 
                      value={openHouseForm.property_highlights} 
                      onChange={handleOpenHouseChange} 
                      placeholder="- 4-bedroom detached home&#10;- Finished basement&#10;- Double garage..." 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Open House Notes
                    </label>
                    <textarea 
                      rows={2} 
                      name="open_house_notes" 
                      value={openHouseForm.open_house_notes} 
                      onChange={handleOpenHouseChange} 
                      placeholder="Visitors are welcome during the scheduled open-house hours. No appointment is required." 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Private Showing Notice
                      </label>
                      <input 
                        type="text" 
                        name="private_showing" 
                        value={openHouseForm.private_showing} 
                        onChange={handleOpenHouseChange} 
                        placeholder="Private showings are available by appointment." 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Open House Status
                      </label>
                      <select 
                        name="open_house_status" 
                        value={openHouseForm.open_house_status} 
                        onChange={handleOpenHouseChange} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Active">Active</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Additional Instructions
                    </label>
                    <textarea 
                      rows={2} 
                      name="additional_instructions" 
                      value={openHouseForm.additional_instructions} 
                      onChange={handleOpenHouseChange} 
                      placeholder="For questions about the property or to arrange a private showing, contact the listing agent." 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '13px' }} 
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button 
                  type="submit" 
                  disabled={savingOpenHouse}
                  style={{ 
                    flex: 2, 
                    background: 'linear-gradient(135deg, #10b981, #059669)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '12px 18px', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: '700',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                  }}
                >
                  <span>💾</span> {savingOpenHouse ? 'Saving...' : 'Save Open House Listing'}
                </button>

                {/* Remove Open House Button (if already an open house) */}
                {getOpenHouseDataFromProp(selectedOpenHouseProp) && (
                  <button 
                    type="button" 
                    onClick={handleRemoveOpenHouse}
                    disabled={savingOpenHouse}
                    style={{ 
                      flex: 1, 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      color: '#ef4444', 
                      border: '1px solid rgba(239, 68, 68, 0.3)', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontWeight: '600',
                      fontSize: '13px' 
                    }}
                  >
                    Remove Open House
                  </button>
                )}

                <button 
                  type="button" 
                  onClick={() => setSelectedOpenHouseProp(null)} 
                  style={{ 
                    background: 'transparent', 
                    color: 'var(--text-secondary)', 
                    border: '1px solid var(--border)', 
                    padding: '12px 18px', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: '600',
                    fontSize: '13px' 
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
