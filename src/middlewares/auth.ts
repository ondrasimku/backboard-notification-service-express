import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import config from '../config/config';

export interface AuthContext {
  userId: string;
  orgId: string | null;
  roles: string[];
  permissions: string[];
  email?: string;
  name?: string;
}

interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

// Create JWKS client
const jwksClientInstance = jwksClient({
  jwksUri: config.auth.jwksUrl,
  cache: true,
  cacheMaxAge: config.auth.jwksCacheTtl,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('Token missing kid in header'));
    return;
  }

  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: config.auth.issuer,
        audience: config.auth.audience,
      },
      (err, decoded) => {
        if (err) {
          res.status(401).json({ error: 'Invalid token', details: err.message });
          return;
        }

        const payload = decoded as {
          sub: string;
          org_id?: string | null;
          roles?: string[];
          permissions?: string[];
          email?: string;
          name?: string;
        };

        if (!payload.sub) {
          res.status(401).json({ error: 'Token missing sub claim' });
          return;
        }

        const authContext: AuthContext = {
          userId: payload.sub,
          orgId: payload.org_id || null,
          roles: payload.roles || [],
          permissions: payload.permissions || [],
          email: payload.email,
          name: payload.name,
        };

        req.auth = authContext;
        next();
      },
    );
  } catch (error) {
    next(error);
  }
};

export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userPermissions = req.auth.permissions || [];
    const hasAllPermissions = requiredPermissions.every(perm =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredPermissions,
        has: userPermissions,
      });
      return;
    }

    next();
  };
};

export type { AuthenticatedRequest };

