import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bot_id = searchParams.get('bot_id');

    if (!bot_id) {
      return Response.json({ success: true, has_open_house: false, open_houses: [] });
    }

    // Fetch client's properties for this specific bot from properties table
    const { data: botProps, error } = await supabase
      .from('properties')
      .select('*')
      .eq('bot_id', bot_id);

    if (error) {
      console.error('Error fetching client properties for open house:', error);
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    const allProps = botProps || [];

    // Check which of the client's properties are marked as Open House (status, description, or features)
    const openHouses = allProps.filter(p => {
      const st = String(p.status || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const feats = Array.isArray(p.features)
        ? p.features.join(' ').toLowerCase()
        : String(p.features || '').toLowerCase();

      return st.includes('open house') || desc.includes('open house') || feats.includes('open house');
    });

    if (openHouses.length > 0) {
      return Response.json({
        success: true,
        has_open_house: true,
        open_houses: normalizeProps(openHouses)
      });
    }

    // No open house listed by client currently
    return Response.json({
      success: true,
      has_open_house: false,
      open_houses: []
    });

  } catch (err) {
    console.error('Open house API error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

function normalizeProps(props) {
  if (!Array.isArray(props)) return [];
  return props.map((p, idx) => {
    let rawImages = [];
    if (Array.isArray(p.photos) && p.photos.length > 0) {
      rawImages = p.photos;
    } else if (p.image_url) {
      rawImages = [p.image_url];
    }

    let openHouseData = null;
    if (Array.isArray(p.features)) {
      const jsonFeature = p.features.find(f => typeof f === 'string' && f.startsWith('OPEN_HOUSE_JSON:'));
      if (jsonFeature) {
        try {
          openHouseData = JSON.parse(jsonFeature.replace('OPEN_HOUSE_JSON:', ''));
        } catch (e) {}
      }
    }

    const priceNum = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
    const priceDisplay = priceNum > 0 ? `$${priceNum.toLocaleString()}` : (p.price || 'Contact for Price');

    return {
      property_id: p.property_id || `prop_${idx}`,
      mls_number: p.mls_number || `OH-${idx + 1}`,
      address: p.address || 'Featured Listing',
      city: p.city || '',
      state: p.state || '',
      zip_code: p.zip_code || '',
      price: priceDisplay,
      bedrooms: p.bedrooms || 'N/A',
      bathrooms: p.bathrooms || 'N/A',
      square_feet: p.square_feet || null,
      property_type: p.property_type || 'Single Family Residence',
      status: p.status || 'Open House',
      description: p.description || 'Open House event scheduled. Contact us to reserve a tour or receive gate instructions.',
      images: rawImages,
      image_url: rawImages[0] || '',
      url: p.source_url || p.url || '#',
      open_house_data: openHouseData
    };
  });
}
