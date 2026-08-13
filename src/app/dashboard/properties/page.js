'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Building, MoreVertical, Trash2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [botId, setBotId] = useState('');
  
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
        
      if (userProfile?.bot_id) {
        setBotId(userProfile.bot_id);
        const res = await fetch(`/api/crm/properties?bot_id=${userProfile.bot_id}`);
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

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Properties</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active listings and private inventory.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
        >
          <Plus size={20} /> Add Property
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading properties...</div>
      ) : properties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          <Building size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No properties found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Add your first property to start showcasing it via your chatbot.</p>
          <button onClick={() => setShowModal(true)} style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            Add Property
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {properties.map(property => (
            <motion.div key={property.property_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '160px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Building size={48} color="var(--text-muted)" opacity={0.5} />
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '12px', fontWeight: '600' }}>
                  {property.status}
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    ${property.price ? property.price.toLocaleString() : 'N/A'}
                  </h3>
                  <button onClick={() => handleDelete(property.property_id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{property.address}</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {property.city}, {property.state} {property.zip_code}
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{property.bedrooms || '-'}</strong> Beds</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{property.bathrooms || '-'}</strong> Baths</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{property.square_feet ? property.square_feet.toLocaleString() : '-'}</strong> Sq.Ft.</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Add New Property</h2>
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
