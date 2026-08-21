async function getGqlSchema() {
  const res = await fetch('https://wgw.luxurypresence.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://century21sgr.com',
      'Referer': 'https://century21sgr.com/',
      'User-Agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      query: `query {
        __schema {
          queryType {
            fields {
              name
              description
              args {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }`
    })
  });
  const data = await res.json();
  const fields = data?.data?.__schema?.queryType?.fields || [];
  console.log(`Found ${fields.length} GraphQL Query fields:`);
  fields.forEach(f => {
    console.log(`- ${f.name}(${f.args.map(a => `${a.name}: ${a.type.name || a.type.kind}`).join(', ')})`);
  });
}

getGqlSchema();
