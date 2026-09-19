import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabaseClient';

const appointmentsFilePath = path.join(process.cwd(), 'src', 'data', 'appointments.json');

function getStoredAppointments() {
  try {
    if (!fs.existsSync(appointmentsFilePath)) {
      fs.writeFileSync(appointmentsFilePath, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(appointmentsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading appointments file:', err);
    return [];
  }
}

function saveStoredAppointments(appointments) {
  try {
    fs.writeFileSync(appointmentsFilePath, JSON.stringify(appointments, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing appointments file:', err);
    return false;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('bot_id');

    let appointments = getStoredAppointments();

    // Also pull any leads from Supabase that are in 'Viewing' status to ensure complete sync
    try {
      let query = supabase
        .from('leads')
        .select('id, name, phone_number, email, status, data, created_at, bot_id')
        .eq('status', 'Viewing');

      if (botId) {
        query = query.eq('bot_id', botId);
      }

      const { data: viewingLeads } = await query;

      if (viewingLeads && viewingLeads.length > 0) {
        viewingLeads.forEach(lead => {
          // Check if already in appointments
          const exists = appointments.some(a => a.lead_id === lead.id || a.client_phone === lead.phone_number);
          if (!exists) {
            // Auto schedule a viewing slot based on lead created_at + 1 day
            const leadDate = new Date(lead.created_at || Date.now());
            leadDate.setDate(leadDate.getDate() + 1);
            const dateStr = leadDate.toISOString().split('T')[0];

            appointments.push({
              id: `lead-apt-${lead.id}`,
              lead_id: lead.id,
              client_name: lead.name || 'Site Visit Lead',
              client_phone: lead.phone_number || '',
              client_email: lead.email || '',
              type: 'Property Viewing',
              property_title: 'Downtown Property Viewing',
              property_address: 'Contact lead for location details',
              date: dateStr,
              time: '15:00',
              duration: '45 mins',
              status: 'Confirmed',
              notes: 'Auto-synced from CRM Lead (Viewing Stage)',
              created_at: lead.created_at
            });
          }
        });
      }
    } catch (e) {
      console.warn('Could not sync viewing leads:', e.message);
    }

    // Sort by date ascending, then time ascending
    appointments.sort((a, b) => {
      const dA = new Date(`${a.date || '2026-01-01'}T${a.time || '00:00'}`);
      const dB = new Date(`${b.date || '2026-01-01'}T${b.time || '00:00'}`);
      return dA - dB;
    });

    return NextResponse.json({ success: true, appointments });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      client_name,
      client_phone,
      client_email,
      type = 'Property Viewing',
      property_title = '',
      property_address = '',
      date,
      time = '12:00',
      duration = '45 mins',
      status = 'Confirmed',
      notes = '',
      lead_id = null
    } = body;

    if (!client_name || !date) {
      return NextResponse.json({ success: false, error: 'Client name and date are required' }, { status: 400 });
    }

    const appointments = getStoredAppointments();
    const newAppointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      lead_id,
      client_name,
      client_phone: client_phone || '',
      client_email: client_email || '',
      type,
      property_title: property_title || 'General Real Estate Consultation',
      property_address: property_address || '',
      date,
      time,
      duration,
      status,
      notes,
      created_at: new Date().toISOString()
    };

    appointments.push(newAppointment);
    saveStoredAppointments(appointments);

    // If lead_id is provided, update lead status to 'Viewing' in Supabase
    if (lead_id) {
      try {
        await supabase
          .from('leads')
          .update({ status: 'Viewing' })
          .eq('id', lead_id);
      } catch (err) {
        console.warn('Could not update lead status in Supabase:', err.message);
      }
    }

    return NextResponse.json({ success: true, appointment: newAppointment });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, date, time, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Appointment ID is required' }, { status: 400 });
    }

    const appointments = getStoredAppointments();
    const idx = appointments.findIndex(a => a.id === id);

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    if (status !== undefined) appointments[idx].status = status;
    if (date !== undefined) appointments[idx].date = date;
    if (time !== undefined) appointments[idx].time = time;
    if (notes !== undefined) appointments[idx].notes = notes;
    appointments[idx].updated_at = new Date().toISOString();

    saveStoredAppointments(appointments);

    return NextResponse.json({ success: true, appointment: appointments[idx] });
  } catch (error) {
    console.error('Calendar PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID parameter is required' }, { status: 400 });
    }

    let appointments = getStoredAppointments();
    const initialLen = appointments.length;
    appointments = appointments.filter(a => a.id !== id);

    if (appointments.length === initialLen) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    saveStoredAppointments(appointments);

    return NextResponse.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
