async function test() {
  try {
    const res = await fetch('https://nominatim.openstreetmap.org/search?q=New+York,+NY&format=json&addressdetails=1', {
      headers: { 'User-Agent': 'RealEstateChatbotDemo/1.0' }
    });
    const json = await res.json();
    console.log(JSON.stringify(json[0].address, null, 2));
  } catch(e) {
    console.log(e.message);
  }
}
test();
