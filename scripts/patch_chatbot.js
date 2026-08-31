const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'Chatbot.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Smart features based on property type
const oldFeatures = `      setMultiSelectOptions(['🌊 Swimming Pool', '🏠 Basement', '🚗 Garage', 'None']);`;
const newFeatures = `      // Smart features based on property type — Condo/Apartment don't have Basement
      const selectedType2 = (buyHomeData.type || '').toLowerCase();
      const isCondoApt = selectedType2.includes('condo') || selectedType2.includes('apartment') || selectedType2.includes('multi');
      const featureOptions = isCondoApt
        ? ['🌊 Swimming Pool', '🏋️ Gym / Fitness', '🚗 Parking', '🌅 Balcony', 'None']
        : ['🌊 Swimming Pool', '🏠 Basement', '🚗 Garage', 'None'];
      setMultiSelectOptions(featureOptions);`;

if (content.includes(oldFeatures)) {
  content = content.replace(oldFeatures, newFeatures);
  console.log('✅ Fix 1: Features logic updated!');
} else {
  console.log('❌ Fix 1: Features pattern not found!');
}

// Fix 2: "Show More Details" → "More Details"
const oldBtn = '<span>📋</span> Show More Details';
const newBtn = '<span>📋</span> More Details';

if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
  console.log('✅ Fix 2: Button text updated!');
} else {
  console.log('❌ Fix 2: Button text not found!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved!');
