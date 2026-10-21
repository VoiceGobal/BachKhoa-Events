import app from '../server';

// Route every /api/* request through the existing Express API.
export default function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
  return app(req, res);
}
