import net from 'net';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketHandler } from '@electric-sql/pglite-socket';

const dbPath = './db.pglite';
const port = 5432;
const host = '127.0.0.1';

process.on('uncaughtException', (err) => {
  if (err && (err.code === 'ECONNRESET' || err.message?.includes('ECONNRESET') || err.message?.includes('socket'))) {
    return;
  }
  console.error('PGLite uncaught error:', err);
});

process.on('unhandledRejection', (reason) => {
  if (reason && typeof reason === 'object' && ('code' in reason || 'message' in reason)) {
    const msg = String(reason.message || reason.code);
    if (msg.includes('ECONNRESET') || msg.includes('socket')) {
      return;
    }
  }
  console.error('PGLite unhandled rejection:', reason);
});

async function main() {
  console.log(`Starting PGlite instance on path: ${dbPath}...`);
  const db = new PGlite(dbPath);
  await db.waitReady;
  console.log('PGlite database engine is ready.');

  const server = net.createServer((socket) => {
    socket.on('error', () => {});
    
    const handler = new PGLiteSocketHandler({
      db,
      closeOnDetach: true,
    });

    handler.addEventListener('error', () => {});
    
    handler.attach(socket).catch(() => {});
  });

  server.on('error', (err) => {
    console.error('Socket server error:', err);
  });

  server.listen(port, host, () => {
    console.log(`TraceGuard PostgreSQL Server listening on ${host}:${port}`);
  });
}

main().catch((err) => {
  console.error('Fatal database startup error:', err);
  process.exit(1);
});
