import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge-super-secret-jwt-key-2026';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'college' | 'recruiter' | 'mentor' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.query.token as string);

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    const userInDb = queryOne('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!userInDb) {
      res.status(401).json({ error: 'Invalid token: User no longer exists.' });
      return;
    }

    req.user = userInDb as AuthUser;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired authentication token.' });
    return;
  }
}

export function requireRole(allowedRoles: Array<'student' | 'college' | 'recruiter' | 'mentor' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: `Access denied. Role '${req.user.role}' is not authorized for this resource.` 
      });
      return;
    }

    next();
  };
}
