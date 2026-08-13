'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Handshake, DollarSign, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

const STAGES = ['Lead', 'Offer Submitted', 'Under Contract', 'Inspection', 'Closing', 'Closed'];

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [botId, setBotId] = useState('');
  
  // For the form dropdowns
  const [availableLeads, setAvailableLeads] = useState([]);
  const [availableProperties, setAvailableProperties] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);

  const [formData, setFormData] = useState({
    lead_id: '',
    property_id: '',
    agent_id: '',
    stage: 'Lead',
    contract_price: '',
    estimated_closing_date: ''
  });

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
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
        const res = await fetch(`/api/crm/deals?bot_id=${userProfile.bot_id}`);
        const data = await res.json();
        setDeals(data.deals || []);
        
        // Also fetch data for dropdowns
        fetchDropdownData(userProfile.bot_id);
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDropdownData = async (bId) => {
    try {
      const [leadsRes, propsRes, agentsRes] = await Promise.all([
        supabase.from('leads').select('id, name, email').eq('bot_id', bId),
        fetch(`/api/crm/properties?bot_id=${bId}`).then(r => r.json()),
        fetch(`/api/crm/agents?bot_id=${bId}`).then(r => r.json())
      ]);
      
      if (leadsRes.data) setAvailableLeads(leadsRes.data);
      if (propsRes.properties) setAvailableProperties(propsRes.properties);
      if (agentsRes.agents) setAvailableAgents(agentsRes.agents);
      
    } catch (err) {
      console.error("Error fetching dropdown data", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, bot_id: botId };
      if (!payload.property_id) delete payload.property_id;
      if (!payload.agent_id) delete payload.agent_id;
      if (!payload.contract_price) delete payload.contract_price;
      if (!payload.estimated_closing_date) delete payload.estimated_closing_date;

      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowModal(false);
        setFormData({ lead_id: '', property_id: '', agent_id: '', stage: 'Lead', contract_price: '', estimated_closing_date: '' });
        fetchDeals();
      }
    } catch (err) {
      console.error('Error adding deal:', err);
    }
  };
  
  const updateDealStage = async (dealId, newStage) => {
    try {
      await supabase.from('deals').update({ stage: newStage }).eq('deal_id', dealId);
      fetchDeals();
    } catch(err) {
      console.error(err);
    }
  }

  // Group deals by stage
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage);
    return acc;
  }, {});

  return (
    <div style={{ padding: '40px', maxWidth: '100%', margin: '0 auto', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Deals Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track transactions from lead to closed deal.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
        >
          <Plus size={20} /> Create Deal
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading pipeline...</div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', paddingBottom: '20px', minWidth: 'min-content' }}>
          {STAGES.map(stage => (
            <div key={stage} style={{ width: '320px', flexShrink: 0, background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: 'fit-content', maxHeight: '70vh' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-card)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', zIndex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>{stage}</h3>
                <span style={{ background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  {dealsByStage[stage].length}
                </span>
              </div>
              
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                {dealsByStage[stage].length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '14px' }}>No deals in this stage</div>
                ) : (
                  dealsByStage[stage].map(deal => (
                    <motion.div key={deal.deal_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'var(--bg-page)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)' }}>
                          {deal.leads?.name || 'Unknown Client'}
                        </span>
                      </div>
                      
                      {deal.properties && (
                        <div style={{ fontSize: '13px', marginBottom: '12px', lineHeight: '1.4' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Property:</span><br/>
                          {deal.properties.address}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {deal.contract_price && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={14}/> ${(deal.contract_price).toLocaleString()}</div>
                        )}
                        {deal.estimated_closing_date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> Close: {new Date(deal.estimated_closing_date).toLocaleDateString()}</div>
                        )}
                        {deal.agents && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14}/> Agent: {deal.agents.first_name}</div>
                        )}
                      </div>
                      
                      <select 
                        value={deal.stage} 
                        onChange={(e) => updateDealStage(deal.deal_id, e.target.value)}
                        style={{ marginTop: '16px', width: '100%', padding: '6px', fontSize: '12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        {STAGES.map(s => (
                          <option key={s} value={s}>Move to {s}</option>
                        ))}
                      </select>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Deal Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Create New Deal</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Client (Lead) *</label>
                <select required name="lead_id" value={formData.lead_id} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }}>
                  <option value="">Select a Lead...</option>
                  {availableLeads.map(lead => <option key={lead.id} value={lead.id}>{lead.name} ({lead.email})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Property</label>
                <select name="property_id" value={formData.property_id} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }}>
                  <option value="">None / Not Selected Yet</option>
                  {availableProperties.map(prop => <option key={prop.property_id} value={prop.property_id}>{prop.address}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Assigned Agent</label>
                <select name="agent_id" value={formData.agent_id} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }}>
                  <option value="">Unassigned</option>
                  {availableAgents.map(agent => <option key={agent.agent_id} value={agent.agent_id}>{agent.first_name} {agent.last_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Contract Price ($)</label>
                  <input type="number" name="contract_price" value={formData.contract_price} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Closing Date</label>
                  <input type="date" name="estimated_closing_date" value={formData.estimated_closing_date} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white', colorScheme: 'dark' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Current Stage</label>
                <select name="stage" value={formData.stage} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'white' }}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button type="submit" style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Create Deal</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: 'transparent', color: 'white', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
