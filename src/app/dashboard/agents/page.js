'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Users, Mail, Phone, MapPin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [botId, setBotId] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    assigned_zip_codes: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
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
        const res = await fetch(`/api/crm/agents?bot_id=${userProfile.bot_id}`);
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
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
    if (!botId) {
      alert('❌ Error: Chatbot ID not found. Please complete your chatbot setup first.');
      return;
    }
    try {
      const zips = formData.assigned_zip_codes.split(',').map(z => z.trim()).filter(z => z);
      
      const res = await fetch('/api/crm/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, assigned_zip_codes: zips, bot_id: botId })
      });
      
      if (res.ok) {
        setShowModal(false);
        setFormData({ first_name: '', last_name: '', email: '', phone: '', assigned_zip_codes: '', status: 'Active' });
        fetchAgents();
      }
    } catch (err) {
      console.error('Error adding agent:', err);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to remove this agent?')) {
      await supabase.from('agents').delete().eq('agent_id', id);
      fetchAgents();
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Team / Agents</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your team and lead routing rules.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
        >
          <Plus size={20} /> Add Agent
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading team...</div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          <Users size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No team members found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Add agents to start routing leads automatically based on ZIP codes.</p>
          <button onClick={() => setShowModal(true)} style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            Add Agent
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {agents.map(agent => (
            <motion.div key={agent.agent_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {agent.first_name[0]}{agent.last_name[0]}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{agent.first_name} {agent.last_name}</h3>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: agent.status === 'Active' ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)', color: agent.status === 'Active' ? '#2ed573' : '#ff4757', fontWeight: '600', display: 'inline-block', marginTop: '4px' }}>
                      {agent.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDelete(agent.agent_id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <Mail size={16} /> {agent.email || 'No email provided'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <Phone size={16} /> {agent.phone || 'No phone provided'}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <MapPin size={16} style={{ marginTop: '2px', flexShrink: 0 }} /> 
                  <div>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Assigned ZIPs:</span><br/>
                    {agent.assigned_zip_codes?.length > 0 ? agent.assigned_zip_codes.join(', ') : 'All ZIPs'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Agent Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Add Team Member</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>First Name *</label>
                  <input required type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Last Name *</label>
                  <input required type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Phone Number</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Assigned ZIP Codes (Comma separated)</label>
                <input type="text" name="assigned_zip_codes" value={formData.assigned_zip_codes} onChange={handleInputChange} placeholder="e.g. 90210, 90211" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Leave blank to assign all leads to this agent.</span>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }}>
                  <option value="Active">Active</option>
                  <option value="Away">Away</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button type="submit" style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Add Agent</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'transparent', color: 'white', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
