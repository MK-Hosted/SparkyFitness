const { Pool, types } = require('pg');
const { log } = require('../config/logging');

// Parse numeric types
types.setTypeParser(types.builtins.NUMERIC, value => parseFloat(value));

let poolInstance = null;

function createPoolInstance() {
  const newPool = new Pool({
    user: process.env.SPARKY_FITNESS_DB_USER,
    host: process.env.SPARKY_FITNESS_DB_HOST,
    database: process.env.SPARKY_FITNESS_DB_NAME,
    password: process.env.SPARKY_FITNESS_DB_PASSWORD,
    port: process.env.SPARKY_FITNESS_DB_PORT,
  });

  newPool.on('error', (err, client) => {
    log('error', 'Unexpected error on idle client', err);
    // In a production environment, you might want more sophisticated error handling
    // such as attempting to reconnect or gracefully shutting down the application.
    // For now, we'll keep the process.exit(-1) as per original behavior.
    process.exit(-1);
  });

  return newPool;
}

function getPool() {
  if (!poolInstance) {
    poolInstance = createPoolInstance();
  }
  return poolInstance;
}

async function endPool() {
  if (poolInstance) {
    log('info', 'Ending existing database connection pool...');
    await poolInstance.end();
    log('info', 'Existing database connection pool ended.');
    poolInstance = null; // Clear the instance after ending
  }
}

async function resetPool() {
  await endPool(); // Ensure the old pool is ended
  poolInstance = createPoolInstance(); // Create a new one
  log('info', 'New database connection pool initialized.');
  return poolInstance;
}

// Initialize the pool when the module is first loaded
poolInstance = createPoolInstance();

module.exports = {
  getPool,
  endPool,
  resetPool,
};