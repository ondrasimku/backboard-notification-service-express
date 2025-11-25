import * as fs from 'fs';
import * as path from 'path';

const CONTAINER_STATE_FILE = path.join(__dirname, '.testcontainer-state.json');

export default async () => {
  console.log('Stopping PostgreSQL test container...');

  const container = (global as any).__TESTCONTAINER__;
  if (container) {
    await container.stop();
    console.log('PostgreSQL test container stopped.');
  }

  if (fs.existsSync(CONTAINER_STATE_FILE)) {
    fs.unlinkSync(CONTAINER_STATE_FILE);
  }
};

