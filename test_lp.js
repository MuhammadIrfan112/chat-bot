async function testLpApi() {
  const companyId = "c76ecc6e-7fc0-4f1f-a9cb-694a339a3ed1";
  const websiteId = "486a797b-7728-42de-ad34-dda93bd5b0be";

  // Let's test GraphQL or REST endpoints on wgw.luxurypresence.com
  const endpoints = [
    `https://wgw.luxurypresence.com/company/${companyId}/properties`,
    `https://wgw.luxurypresence.com/website/${websiteId}/properties`,
    `https://wgw.luxurypresence.com/properties?companyId=${companyId}`,
    `https://wgw.luxurypresence.com/api/properties?companyId=${companyId}`,
    `https://wgw.luxurypresence.com/graphql`
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: {
          'Origin': 'https://century21sgr.com',
          'Referer': 'https://century21sgr.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      console.log(`GET ${ep} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Response sample:', JSON.stringify(data).slice(0, 300));
      }
    } catch (e) {
      console.error('Error on GET:', e.message);
    }
  }

  // Test GraphQL POST
  try {
    const gqlRes = await fetch('https://wgw.luxurypresence.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://century21sgr.com',
        'Referer': 'https://century21sgr.com/',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        query: `query GetProperties($companyId: String!) { properties(companyId: $companyId) { id name price fullAddress media { url } } }`,
        variables: { companyId }
      })
    });
    console.log('GraphQL status:', gqlRes.status);
    const gqlData = await gqlRes.json();
    console.log('GraphQL response:', JSON.stringify(gqlData).slice(0, 500));
  } catch (e) {
    console.error('GraphQL error:', e.message);
  }
}

testLpApi();
