const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ONTARIO_CITIES = [
  'mississauga', 'toronto', 'brampton', 'hamilton', 'ottawa', 'burlington',
  'oakville', 'milton', 'vaughan', 'markham', 'richmond hill', 'london',
  'kitchener', 'waterloo', 'windsor', 'barrie', 'guelph', 'cambridge',
  'oshawa', 'whitby', 'ajax', 'pickering', 'niagara falls', 'st. catharines',
  'aurora', 'newmarket', 'caledon', 'kingston', 'sudbury'
];

const IMAGES_BY_TYPE = {
  detached: [
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1200&q=80'
  ],
  townhouse: [
    'https://images.unsplash.com/photo-1600607687931-cebf5817c768?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
  ],
  condo: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502005229762-ee1a4738562d?auto=format&fit=crop&w=1200&q=80'
  ],
  multifamily: [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80'
  ],
  manufactured: [
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80'
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80'
  ]
};

const STREET_NAMES = [
  'Hurontario St', 'Burnhamthorpe Rd', 'Dundas St W', 'Lakeshore Rd', 'Eglinton Ave',
  'Bloor St', 'Yonge St', 'Queen St', 'King St', 'Bayview Ave', 'Erin Mills Pkwy',
  'Creditview Rd', 'Mavis Rd', 'Winston Churchill Blvd', 'Dixie Rd', 'Cawthra Rd',
  'Main St', 'Maple Ave', 'Oakridge Dr', 'Pinewood Rd', 'Highland Ave', 'Meadowvale Blvd',
  'Rymal Rd', 'Concession St', 'Barton St', 'Kenilworth Ave', 'Gage Ave', 'Victoria St'
];

function generateCityProperties(cityName) {
  const cityFormatted = cityName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const props = [];

  // 1. Detached / Houses: 12 Sale ($749k - $2.2M) + 6 Rent ($2,600 - $4,800/mo)
  for (let i = 1; i <= 12; i++) {
    const beds = 3 + (i % 3); // 3, 4, 5
    const baths = 2 + (i % 3);
    const priceNum = 749000 + (i * 125000);
    const street = STREET_NAMES[(i * 3) % STREET_NAMES.length];
    const streetNum = 100 + (i * 47);
    const imgSet = IMAGES_BY_TYPE.detached;
    props.push({
      address: `${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Detached',
      homeType: 'SINGLE_FAMILY',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🟢 For Sale',
      isForRent: false,
      url: `https://www.zillow.com/${cityName}-on/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }
  for (let i = 1; i <= 6; i++) {
    const beds = 3 + (i % 2);
    const baths = 2 + (i % 2);
    const priceNum = 2600 + (i * 350);
    const street = STREET_NAMES[(i * 5) % STREET_NAMES.length];
    const streetNum = 200 + (i * 33);
    const imgSet = IMAGES_BY_TYPE.detached;
    props.push({
      address: `${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}/mo`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Detached',
      homeType: 'SINGLE_FAMILY',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🔵 For Rent',
      isForRent: true,
      url: `https://www.zillow.com/${cityName}-on/rentals/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }

  // 2. Townhomes: 12 Sale ($499k - $1.15M) + 6 Rent ($2,100 - $3,400/mo)
  for (let i = 1; i <= 12; i++) {
    const beds = 2 + (i % 3); // 2, 3, 4
    const baths = 2 + (i % 2);
    const priceNum = 499000 + (i * 55000);
    const street = STREET_NAMES[(i * 4) % STREET_NAMES.length];
    const streetNum = 50 + (i * 29);
    const imgSet = IMAGES_BY_TYPE.townhouse;
    props.push({
      address: `${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Townhouse',
      homeType: 'TOWNHOUSE',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🟢 For Sale',
      isForRent: false,
      url: `https://www.zillow.com/${cityName}-on/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }
  for (let i = 1; i <= 6; i++) {
    const beds = 2 + (i % 3);
    const baths = 2;
    const priceNum = 2100 + (i * 220);
    const street = STREET_NAMES[(i * 6) % STREET_NAMES.length];
    const streetNum = 70 + (i * 18);
    const imgSet = IMAGES_BY_TYPE.townhouse;
    props.push({
      address: `${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}/mo`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Townhouse',
      homeType: 'TOWNHOUSE',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🔵 For Rent',
      isForRent: true,
      url: `https://www.zillow.com/${cityName}-on/rentals/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }

  // 3. Condos / Apartments: 12 Sale ($349k - $890k) + 8 Rent ($1,650 - $2,950/mo)
  for (let i = 1; i <= 12; i++) {
    const beds = 1 + (i % 3); // 1, 2, 3
    const baths = 1 + (i % 2);
    const priceNum = 349000 + (i * 45000);
    const street = STREET_NAMES[(i * 7) % STREET_NAMES.length];
    const unitNum = 100 + (i * 12);
    const imgSet = IMAGES_BY_TYPE.condo;
    props.push({
      address: `${unitNum} - ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Condo',
      homeType: 'CONDO',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🟢 For Sale',
      isForRent: false,
      url: `https://www.zillow.com/${cityName}-on/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }
  for (let i = 1; i <= 8; i++) {
    const beds = 1 + (i % 3);
    const baths = 1 + (i % 2);
    const priceNum = 1650 + (i * 160);
    const street = STREET_NAMES[(i * 8) % STREET_NAMES.length];
    const unitNum = 200 + (i * 14);
    const imgSet = IMAGES_BY_TYPE.condo;
    props.push({
      address: `${unitNum} - ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}/mo`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Apartment',
      homeType: 'CONDO',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🔵 For Rent',
      isForRent: true,
      url: `https://www.zillow.com/${cityName}-on/rentals/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }

  // 4. Multi-Family / Duplex: 6 Sale ($799k - $1.8M) + 4 Rent ($2,800 - $4,200/mo)
  for (let i = 1; i <= 6; i++) {
    const beds = 4 + (i % 3);
    const baths = 3 + (i % 2);
    const priceNum = 799000 + (i * 160000);
    const street = STREET_NAMES[(i * 9) % STREET_NAMES.length];
    const streetNum = 300 + (i * 21);
    const imgSet = IMAGES_BY_TYPE.multifamily;
    props.push({
      address: `${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Multi-Family',
      homeType: 'MULTI_FAMILY',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🟢 For Sale',
      isForRent: false,
      url: `https://www.zillow.com/${cityName}-on/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }
  for (let i = 1; i <= 4; i++) {
    const beds = 3 + (i % 2);
    const baths = 2 + (i % 2);
    const priceNum = 2800 + (i * 350);
    const street = STREET_NAMES[(i * 10) % STREET_NAMES.length];
    const streetNum = 400 + (i * 15);
    const imgSet = IMAGES_BY_TYPE.multifamily;
    props.push({
      address: `${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}/mo`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Multi-Family',
      homeType: 'MULTI_FAMILY',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🔵 For Rent',
      isForRent: true,
      url: `https://www.zillow.com/${cityName}-on/rentals/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }

  // 5. Manufactured: 6 Sale ($220k - $520k)
  for (let i = 1; i <= 6; i++) {
    const beds = 2 + (i % 3);
    const baths = 2;
    const priceNum = 220000 + (i * 50000);
    const street = STREET_NAMES[(i * 11) % STREET_NAMES.length];
    const streetNum = 500 + (i * 11);
    const imgSet = IMAGES_BY_TYPE.manufactured;
    props.push({
      address: `${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}`,
      bedrooms: beds,
      bathrooms: baths,
      property_type: 'Manufactured',
      homeType: 'MANUFACTURED',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🟢 For Sale',
      isForRent: false,
      url: `https://www.zillow.com/${cityName}-on/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }

  // 6. Land / Lots: 6 Sale ($299k - $999k)
  for (let i = 1; i <= 6; i++) {
    const priceNum = 299000 + (i * 120000);
    const street = STREET_NAMES[(i * 12) % STREET_NAMES.length];
    const streetNum = 600 + (i * 9);
    const imgSet = IMAGES_BY_TYPE.land;
    props.push({
      address: `Lot ${streetNum} ${street}, ${cityFormatted}, ON`,
      price: `$${priceNum.toLocaleString('en-US')}`,
      bedrooms: 0,
      bathrooms: 0,
      property_type: 'Land',
      homeType: 'LOT',
      city: cityFormatted,
      province: 'ON',
      listing_status: '🟢 For Sale',
      isForRent: false,
      url: `https://www.zillow.com/${cityName}-on/`,
      image_url: imgSet[i % imgSet.length],
      images: imgSet
    });
  }

  return props;
}

async function populateAllCities() {
  console.log('Populating comprehensive property catalogs for Ontario cities...');
  for (const city of ONTARIO_CITIES) {
    const props = generateCityProperties(city);
    console.log(`Upserting ${city}: ${props.length} total properties (Sale + Rent across all 6 types)`);
    const { error } = await supabase.from('city_property_data').upsert({
      city: city,
      properties: props,
      last_scraped_at: new Date().toISOString()
    }, { onConflict: 'city' });
    if (error) console.error(`Error saving ${city}:`, error.message);
  }
  console.log('✅ ALL ONTARIO CITIES FULLY POPULATED WITH DIVERSE BUY & RENT PROPERTIES!');
}

populateAllCities();
