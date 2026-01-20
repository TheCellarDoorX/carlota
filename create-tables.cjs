const { Client } = require('pg');

const userFormats = [
  'postgres.zrlzxfxhfrecwteqyogl',
  'zrlzxfxhfrecwteqyogl',
  'postgres'
];

const regions = ['aws-0-eu-west-1', 'aws-0-us-east-1'];

async function tryConnection(region, user) {
  const client = new Client({
    host: region + '.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: user,
    password: 'Coventry22!.vienna',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  });
  
  try {
    await client.connect();
    console.log('SUCCESS: ' + region + ' with user ' + user);
    await client.end();
    return true;
  } catch (err) {
    console.log('FAIL: ' + region + ' / ' + user + ': ' + err.message);
    try { await client.end(); } catch(e) {}
    return false;
  }
}

async function run() {
  for (const region of regions) {
    for (const user of userFormats) {
      if (await tryConnection(region, user)) {
        process.exit(0);
      }
    }
  }
}

run();
