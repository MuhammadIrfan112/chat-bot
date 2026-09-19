'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  Calendar as CalendarIcon,
  X,
  Trash2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const APPOINTMENT_TYPES = [
  { label: 'Property Viewing', icon: '🏡', color: '#EC4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)' },
  { label: 'Follow-up Call', icon: '📞', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)' },
  { label: 'Offer Discussion', icon: '📝', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  { label: 'Open House', icon: '🚪', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  { label: 'Closing Meeting', icon: '🏆', color: '#C9A227', bg: 'rgba(201,162,39,0.15)', border: 'rgba(201,162,39,0.3)' },
];

const STATUS_CONFIG = {
  Confirmed: { label: 'Confirmed', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  Scheduled: { label: 'Scheduled', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)' },
  Completed: { label: 'Completed', color: '#C9A227', bg: 'rgba(201,162,39,0.15)', border: 'rgba(201,162,39,0.3)' },
  Cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'agenda'
  const [appointments, setAppointments] = useState([]);
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    type: 'Property Viewing',
    property_title: '',
    property_address: '',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    duration: '45 mins',
    status: 'Confirmed',
    notes: '',
    lead_id: ''
  });

  // Load appointments, leads, and properties
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch appointments from API
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments || []);
      }

      // 2. Fetch leads for dropdown & quick linking
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
        const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId);
        const botIds = bots ? bots.map(b => b.id) : [];

        let leadsQuery = supabase.from('leads').select('id, name, phone_number, email, status, property_interest');
        if (botIds.length > 0) leadsQuery = leadsQuery.in('bot_id', botIds);
        const { data: leadsData } = await leadsQuery.order('created_at', { ascending: false }).limit(50);
        setLeads(leadsData || []);

        // 3. Fetch properties
        let propsQuery = supabase.from('properties').select('id, title, address, price').limit(50);
        const { data: propsData } = await propsQuery;
        setProperties(propsData || []);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calendar Calculation Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days = [];

    // Prev month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    // Next month days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = {};
    appointments.forEach(apt => {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    });
    return map;
  }, [appointments]);

  // Selected date appointments
  const selectedDayAppointments = useMemo(() => {
    const list = appointmentsByDate[selectedDate] || [];
    if (filterType === 'All') return list;
    return list.filter(a => a.type === filterType);
  }, [appointmentsByDate, selectedDate, filterType]);

  // Stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthApts = appointments.filter(a => a.date && a.date.startsWith(thisMonthStr));
    const todayApts = appointments.filter(a => a.date === todayStr);
    const viewings = monthApts.filter(a => a.type === 'Property Viewing');
    const completed = monthApts.filter(a => a.status === 'Completed');

    return {
      monthTotal: monthApts.length,
      todayTotal: todayApts.length,
      viewingsTotal: viewings.length,
      completedTotal: completed.length
    };
  }, [appointments, year, month]);

  // Handle lead selection in modal
  const handleSelectLead = (leadId) => {
    if (!leadId) {
      setFormData(prev => ({ ...prev, lead_id: '', client_name: '', client_phone: '', client_email: '' }));
      return;
    }
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setFormData(prev => ({
        ...prev,
        lead_id: lead.id,
        client_name: lead.name || '',
        client_phone: lead.phone_number || '',
        client_email: lead.email || '',
        property_title: lead.property_interest || prev.property_title
      }));
    }
  };

  // Handle property selection in modal
  const handleSelectProperty = (propId) => {
    if (!propId) return;
    const prop = properties.find(p => p.id === propId);
    if (prop) {
      setFormData(prev => ({
        ...prev,
        property_title: prop.title || '',
        property_address: prop.address || ''
      }));
    }
  };

  // Save new appointment
  const handleSaveAppointment = async (e) => {
    e.preventDefault();
    if (!formData.client_name || !formData.date) return;

    try {
      setSaving(true);
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => [...prev, data.appointment]);
        setShowModal(false);
        setSelectedDate(formData.date);
        // Reset form
        setFormData({
          client_name: '',
          client_phone: '',
          client_email: '',
          type: 'Property Viewing',
          property_title: '',
          property_address: '',
          date: new Date().toISOString().split('T')[0],
          time: '14:00',
          duration: '45 mins',
          status: 'Confirmed',
          notes: '',
          lead_id: ''
        });
      }
    } catch (err) {
      console.error('Save appointment error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch('/api/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
        if (activeAppointment && activeAppointment.id === id) {
          setActiveAppointment(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (id) => {
    if (!confirm('Are you sure you want to cancel and remove this appointment?')) return;
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => prev.filter(a => a.id !== id));
        if (activeAppointment && activeAppointment.id === id) setActiveAppointment(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // WhatsApp Link generator
  const getWhatsAppLink = (apt) => {
    const phone = (apt.client_phone || '').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${apt.client_name}, this is confirming your scheduled ${apt.type} for ${apt.property_title || 'the property'} on ${apt.date} at ${apt.time}. Please let me know if you need to reschedule!`
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ padding: '32px 28px', maxWidth: '1480px', margin: '0 auto', color: '#F8FAFC' }}>
      
      {/* 1. Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '12px', 
              background: 'linear-gradient(135deg, #C9A227, #E5C058)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(201,162,39,0.3)'
            }}>
              <CalendarDays size={24} color="#0F172A" />
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, color: '#FFFFFF' }}>
                Calendar & Appointments
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8' }}>
                Schedule property viewings, follow-up calls, and client consultations
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Mode Toggle */}
          <div style={{ 
            display: 'flex', backgroundColor: '#1E293B', borderRadius: '10px', 
            padding: '3px', border: '1px solid rgba(255,255,255,0.08)' 
          }}>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: viewMode === 'month' ? '#C9A227' : 'transparent',
                color: viewMode === 'month' ? '#0F172A' : '#94A3B8'
              }}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: viewMode === 'agenda' ? '#C9A227' : 'transparent',
                color: viewMode === 'agenda' ? '#0F172A' : '#94A3B8'
              }}
            >
              Agenda List
            </button>
          </div>

          {/* New Appointment Button */}
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, date: selectedDate }));
              setShowModal(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #C9A227, #E5C058)',
              color: '#0F172A', fontWeight: '700', fontSize: '14px',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(201,162,39,0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={18} />
            Schedule Viewing
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Scheduled This Month', value: stats.monthTotal, icon: <CalendarIcon size={20} color="#38BDF8" />, bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)' },
          { label: "Today's Appointments", value: stats.todayTotal, icon: <Clock size={20} color="#10B981" />, bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Property Viewings 🏡', value: stats.viewingsTotal, icon: <Building size={20} color="#EC4899" />, bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.2)' },
          { label: 'Completed Visits', value: stats.completedTotal, icon: <CheckCircle2 size={20} color="#C9A227" />, bg: 'rgba(201,162,39,0.1)', border: 'rgba(201,162,39,0.2)' },
        ].map((card, idx) => (
          <div key={idx} style={{
            backgroundColor: '#1E293B', borderRadius: '14px', padding: '18px 20px',
            border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', marginTop: '4px' }}>
                {card.value}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Calendar Body (2 Column Layout) */}
      <div className="calendar-body-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Calendar Navigation & Month Grid */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '24px', overflow: 'hidden' }}>
          
          {/* Month Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#FFFFFF' }}>
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={goToToday}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                  backgroundColor: 'rgba(201,162,39,0.15)', color: '#C9A227', border: '1px solid rgba(201,162,39,0.3)',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={prevMonth}
                aria-label="Previous Month"
                style={{
                  width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextMonth}
                aria-label="Next Month"
                style={{
                  width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Month View Grid */}
          {viewMode === 'month' ? (
            <div>
              {/* Day of Week Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div key={i} style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', padding: '6px 0', textTransform: 'uppercase' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {calendarDays.map((cell, idx) => {
                  const dayApts = appointmentsByDate[cell.dateStr] || [];
                  const isSelected = selectedDate === cell.dateStr;
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(cell.dateStr)}
                      style={{
                        minHeight: '85px', borderRadius: '10px', padding: '8px',
                        backgroundColor: isSelected ? 'rgba(201,162,39,0.08)' : cell.isCurrentMonth ? '#0F172A' : 'rgba(15,23,42,0.4)',
                        border: isSelected 
                          ? '2px solid #C9A227' 
                          : isToday 
                            ? '1.5px solid #38BDF8' 
                            : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        opacity: cell.isCurrentMonth ? 1 : 0.45,
                        display: 'flex', flexDirection: 'column'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = cell.isCurrentMonth ? '#0F172A' : 'rgba(15,23,42,0.4)';
                      }}
                    >
                      {/* Day Number Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '13px', fontWeight: isToday || isSelected ? '800' : '600',
                          color: isToday ? '#38BDF8' : isSelected ? '#C9A227' : '#F1F5F9'
                        }}>
                          {cell.day}
                        </span>
                        {isToday && (
                          <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(56,189,248,0.2)', color: '#38BDF8', padding: '1px 4px', borderRadius: '4px' }}>
                            TODAY
                          </span>
                        )}
                        {dayApts.length > 0 && !isToday && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8' }}>
                            {dayApts.length}
                          </span>
                        )}
                      </div>

                      {/* Event Badges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                        {dayApts.slice(0, 2).map((apt, aIdx) => {
                          const typeCfg = APPOINTMENT_TYPES.find(t => t.label === apt.type) || APPOINTMENT_TYPES[0];
                          return (
                            <div
                              key={aIdx}
                              title={`${apt.time} - ${apt.client_name} (${apt.type})`}
                              style={{
                                fontSize: '10px', fontWeight: '600', padding: '2px 5px', borderRadius: '4px',
                                backgroundColor: typeCfg.bg, color: typeCfg.color, border: `1px solid ${typeCfg.border}`,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <span>{typeCfg.icon}</span>
                              <span style={{ fontWeight: '700' }}>{apt.time}</span>
                              <span>{apt.client_name}</span>
                            </div>
                          );
                        })}
                        {dayApts.length > 2 && (
                          <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: '600', paddingLeft: '4px' }}>
                            +{dayApts.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                  No appointments scheduled.
                </div>
              ) : (
                appointments.map(apt => {
                  const typeCfg = APPOINTMENT_TYPES.find(t => t.label === apt.type) || APPOINTMENT_TYPES[0];
                  const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.Scheduled;
                  return (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedDate(apt.date);
                        setActiveAppointment(apt);
                      }}
                      style={{
                        padding: '16px', borderRadius: '12px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '10px',
                          backgroundColor: typeCfg.bg, border: `1px solid ${typeCfg.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                        }}>
                          {typeCfg.icon}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '15px', color: '#FFFFFF' }}>{apt.client_name}</span>
                            <span style={{
                              fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                              backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`
                            }}>
                              {apt.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '3px' }}>
                            {apt.property_title} • 📅 {apt.date} at {apt.time} ({apt.duration || '45 mins'})
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {apt.client_phone && (
                          <a
                            href={getWhatsAppLink(apt)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                              backgroundColor: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)',
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <MessageSquare size={14} /> WhatsApp
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAppointment(apt.id);
                          }}
                          style={{
                            background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '6px'
                          }}
                          title="Delete appointment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Day Schedule Panel */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '22px', position: 'sticky', top: '24px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#C9A227', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Day Schedule
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '3px 0 0', color: '#FFFFFF' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
            </div>
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, date: selectedDate }));
                setShowModal(true);
              }}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                backgroundColor: 'rgba(201,162,39,0.15)', color: '#C9A227', border: '1px solid rgba(201,162,39,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              title="Add appointment for this day"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* List of appointments for selected day */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '580px', overflowY: 'auto' }}>
            {selectedDayAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748B' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗓️</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#94A3B8' }}>No appointments on this date</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ Schedule Viewing" to book a client visit.</div>
              </div>
            ) : (
              selectedDayAppointments.map(apt => {
                const typeCfg = APPOINTMENT_TYPES.find(t => t.label === apt.type) || APPOINTMENT_TYPES[0];
                const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.Scheduled;

                return (
                  <div
                    key={apt.id}
                    style={{
                      backgroundColor: '#0F172A', borderRadius: '12px', padding: '16px',
                      border: '1px solid rgba(255,255,255,0.06)', position: 'relative'
                    }}
                  >
                    {/* Top Row: Type & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                        backgroundColor: typeCfg.bg, color: typeCfg.color, border: `1px solid ${typeCfg.border}`,
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        {typeCfg.icon} {apt.type}
                      </span>
                      
                      {/* Status Dropdown */}
                      <select
                        value={apt.status}
                        onChange={e => handleUpdateStatus(apt.id, e.target.value)}
                        style={{
                          backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`,
                          fontSize: '11px', fontWeight: '700', borderRadius: '6px', padding: '2px 6px',
                          cursor: 'pointer', outline: 'none'
                        }}
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Client & Time Info */}
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                      {apt.client_name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38BDF8', marginBottom: '8px' }}>
                      <Clock size={13} />
                      <span>{apt.time} ({apt.duration || '45 mins'})</span>
                    </div>

                    {/* Property Details */}
                    {apt.property_title && (
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Building size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#94A3B8' }} />
                        <span>{apt.property_title}</span>
                      </div>
                    )}

                    {apt.property_address && (
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: '1px', color: '#64748B' }} />
                        <span>{apt.property_address}</span>
                      </div>
                    )}

                    {apt.notes && (
                      <div style={{ fontSize: '11px', color: '#94A3B8', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <strong style={{ color: '#CBD5E1' }}>Notes:</strong> {apt.notes}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {apt.client_phone && (
                          <>
                            <a
                              href={`tel:${apt.client_phone}`}
                              style={{
                                width: '28px', height: '28px', borderRadius: '6px',
                                backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'
                              }}
                              title="Call Client"
                            >
                              <Phone size={13} />
                            </a>
                            <a
                              href={getWhatsAppLink(apt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                                backgroundColor: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <MessageSquare size={12} /> WhatsApp Confirm
                            </a>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteAppointment(apt.id)}
                        style={{
                          background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px',
                          display: 'flex', alignItems: 'center'
                        }}
                        title="Cancel/Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Schedule New Appointment Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#1E293B', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)',
                width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                color: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(201,162,39,0.15)', color: '#C9A227', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Schedule Appointment</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>Book property viewing or consultation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Select From Existing Leads */}
                {leads.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                      Select Existing Lead (Optional)
                    </label>
                    <select
                      value={formData.lead_id}
                      onChange={e => handleSelectLead(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none'
                      }}
                    >
                      <option value="">-- Enter Client Manually --</option>
                      {leads.map(lead => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name} {lead.phone_number ? `(${lead.phone_number})` : ''} — {lead.status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Client Name & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                      Client Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. John Doe"
                      value={formData.client_name}
                      onChange={e => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                      Phone (WhatsApp)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +1 416 555 0192"
                      value={formData.client_phone}
                      onChange={e => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Appointment Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                    Appointment Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {APPOINTMENT_TYPES.map(type => {
                      const isSelected = formData.type === type.label;
                      return (
                        <button
                          type="button"
                          key={type.label}
                          onClick={() => setFormData(prev => ({ ...prev, type: type.label }))}
                          style={{
                            padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                            border: isSelected ? `1.5px solid ${type.color}` : '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: isSelected ? type.bg : '#0F172A', color: isSelected ? type.color : '#94A3B8',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Property Selection / Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                    Property Listing
                  </label>
                  {properties.length > 0 ? (
                    <select
                      onChange={e => handleSelectProperty(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none',
                        marginBottom: '8px'
                      }}
                    >
                      <option value="">-- Choose from Available Properties --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.address})</option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    type="text"
                    placeholder="Property title or address..."
                    value={formData.property_title}
                    onChange={e => setFormData(prev => ({ ...prev, property_title: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Date & Time Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                      Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 10px', borderRadius: '8px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                      Time
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 10px', borderRadius: '8px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                      Duration
                    </label>
                    <select
                      value={formData.duration}
                      onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 8px', borderRadius: '8px', backgroundColor: '#0F172A',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none'
                      }}
                    >
                      <option value="30 mins">30 mins</option>
                      <option value="45 mins">45 mins</option>
                      <option value="60 mins">1 hour</option>
                      <option value="90 mins">1.5 hours</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                    Notes & Client Preferences
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specific questions, unit preferences, gate codes, etc."
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0F172A',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', outline: 'none',
                      resize: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '10px 16px', borderRadius: '8px', backgroundColor: 'transparent',
                      color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px',
                      fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: '10px 20px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #C9A227, #E5C058)',
                      color: '#0F172A', fontWeight: '700', fontSize: '13px', border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? 'Scheduling...' : 'Save Appointment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
