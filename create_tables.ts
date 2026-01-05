import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

async function run() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await pool.query('SELECT 1');
    console.log('Connected!');

    console.log('Creating tables...');
    await pool.query(`
      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        fb_app_id TEXT,
        fb_app_secret TEXT,
        fb_access_token TEXT
      );

      -- Create sales table
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        order_id TEXT NOT NULL UNIQUE,
        product_name TEXT,
        order_date DATE NOT NULL,
        source TEXT NOT NULL,
        revenue INTEGER NOT NULL,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tables created successfully in Supabase!');
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
