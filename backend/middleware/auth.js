// ============================================================
// middleware/auth.js - Clerk JWT Authentication Middleware
// ============================================================
// This middleware verifies every incoming request has a valid
// Clerk JWT token. It extracts the userId so each user only
// sees and touches their own data in Pinecone.
//
// HOW IT WORKS:
//   1. Angular sends Authorization: Bearer <token> with every request
//   2. This middleware verifies the token with Clerk's JWKS endpoint
//   3. If valid → req.userId is set and request continues
//   4. If invalid/missing → 401 Unauthorized is returned
// ============================================================

// ============================================================
// middleware/auth.js
// ============================================================

const { verifyToken } = require('@clerk/backend');

async function requireAuth(req, res, next) {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    console.log("TOKEN:", token);

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: [
        process.env.FRONTEND_URL || 'http://localhost:4200'
      ],
    });

    console.log("PAYLOAD:", payload);

    if (!payload || !payload.sub) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid token.'
      });
    }

    req.userId = payload.sub;

    console.log(`[Auth] ✅ User authenticated: ${req.userId}`);

    next();

  } catch (error) {

    console.error('[Auth] ❌ FULL ERROR:', error);

    return res.status(401).json({
      error: 'Unauthorized: Token verification failed.'
    });
  }
}

module.exports = { requireAuth };