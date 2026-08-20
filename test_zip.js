async function test() {
  try {
    const res = await fetch('http://api.zippopotam.us/us/ny/new york');
    const json = await res.json();
    console.log(json.places[0]['post code']);
  } catch(e) {
    console.log(e.message);
  }
}
test();
