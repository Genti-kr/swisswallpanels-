import { Request, Response, NextFunction } from 'express';

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export function adminIpGate(req: Request, res: Response, next: NextFunction) {
  const whitelist = process.env.ADMIN_IP_WHITELIST?.trim();
  if (!whitelist) {
    return next();
  }

  const allowed = whitelist.split(',').map((entry) => entry.trim()).filter(Boolean);
  const ip = clientIp(req);

  if (!allowed.includes(ip)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
