import { Request, Response, NextFunction } from 'express';
import { execute } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export function auditLog(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      // Only log mutating actions or significant GET endpoints
      if (['POST', 'PUT', 'DELETE'].includes(req.method) || resource.includes('report') || resource.includes('proctoring')) {
        try {
          const userId = req.user?.id || null;
          const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
          const details = JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            body: req.body ? Object.keys(req.body).filter(k => !k.toLowerCase().includes('password')) : []
          });

          execute(
            `INSERT INTO audit_logs (id, user_id, action, resource, details_json, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), userId, action, resource, details, ip]
          );
        } catch (e) {
          console.error('[AuditLog] Failed to record audit entry:', e);
        }
      }
    });
    next();
  };
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[ServerError]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR'
  });
}
