import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

async function fix() {
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    return;
  }
  
  const pool = new pg.Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await pool.query('SELECT 1');
    console.log('Connected successfully!');
    
    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        platform_id TEXT NOT NULL,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      );
      
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER REFERENCES ads(id),
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        spend INTEGER NOT NULL DEFAULT 0,
        revenue INTEGER NOT NULL DEFAULT 0,
        impressions INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fix();
