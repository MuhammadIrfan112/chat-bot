const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'Chatbot.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldRentFeatures = `    if (rentStep === 'parking') {
      setRentData(prev => ({ ...prev, parking: msg }));
      setRentStep('features');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: \`Any specific **must-have features**? (e.g., Basement, Balcony, In-unit Laundry)\` }],
        quickReplies: ['🏠 Basement', '🧺 In-unit Laundry', '🌅 Balcony', '🐾 Pet-friendly', 'None']
      }]);
      return;
    }`;

const newRentFeatures = `    if (rentStep === 'parking') {
      setRentData(prev => ({ ...prev, parking: msg }));
      setRentStep('features');
      const rType = (rentData.prop_type || '').toLowerCase();
      const isCondo = rType.includes('condo') || rType.includes('apartment') || rType.includes('multi');
      const rentFeatureReplies = isCondo
        ? ['🧺 In-unit Laundry', '🌅 Balcony', '🐾 Pet-friendly', '🏋️ Gym / Fitness', 'None']
        : ['🏠 Basement', '🧺 In-unit Laundry', '🌅 Balcony', '🐾 Pet-friendly', 'None'];
      const exampleText = isCondo ? 'In-unit Laundry, Balcony, Gym' : 'Basement, Balcony, In-unit Laundry';
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: \`Any specific **must-have features**? (e.g., \${exampleText})\` }],
        quickReplies: rentFeatureReplies
      }]);
      return;
    }`;

if (content.includes(oldRentFeatures)) {
  content = content.replace(oldRentFeatures, newRentFeatures);
  console.log('✅ Rent features updated!');
} else {
  console.log('❌ Rent features pattern not found!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Chatbot.js updated successfully!');
