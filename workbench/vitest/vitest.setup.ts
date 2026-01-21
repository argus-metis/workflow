import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

let nitroServer: ChildProcess | null = null;

export async function setup() {
  console.log('Starting Nitro server for workflow execution...');

  // Set base URL for local world to use
  process.env.WORKFLOW_LOCAL_BASE_URL = 'http://localhost:3000';

  nitroServer = spawn('npx', ['nitro', 'dev', '--port', '3000'], {
    stdio: 'pipe',
    detached: false,
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '3000',
    },
  });

  let serverReady = false;

  nitroServer.stdout?.on('data', (data) => {
    const output = data.toString();
    if (
      output.includes('listening') ||
      output.includes('ready') ||
      output.includes('Nitro')
    ) {
      serverReady = true;
    }
  });

  nitroServer.stderr?.on('data', (data) => {
    console.error('[nitro]', data.toString());
  });

  nitroServer.on('error', (error) => {
    console.error('Failed to start Nitro server:', error);
  });

  // Wait for server to be ready (timeout after 15 seconds)
  const startTime = Date.now();
  while (!serverReady && Date.now() - startTime < 15000) {
    await setTimeout(500);
  }

  // Give it an extra moment to fully initialize
  await setTimeout(2000);

  console.log('Nitro server ready on port 3000');
}

export async function teardown() {
  if (nitroServer) {
    console.log('Stopping Nitro server...');
    nitroServer.kill('SIGTERM');
    await setTimeout(1000);
    if (!nitroServer.killed) {
      nitroServer.kill('SIGKILL');
    }
    nitroServer = null;
  }
}
