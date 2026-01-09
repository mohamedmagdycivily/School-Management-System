/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to the request
 */
module.exports = ({ meta, config, managers }) => {
    return ({ req, res, next }) => {
        const authHeader = req.headers.authorization || req.headers.token;
        
        if (!authHeader) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                errors: 'Authentication required. No token provided.'
            });
        }

        // Support both "Bearer <token>" format and raw token
        let token = authHeader;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }

        try {
            // Verify using long token (JWT)
            const decoded = managers.token.verifyLongToken({ token });
            
            if (!decoded) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 401,
                    errors: 'Invalid or expired token'
                });
            }

            // Attach decoded user info to request
            // The user data includes: userId, userKey, role, schoolId (if applicable)
            next({
                __auth: decoded,
                userId: decoded.userId,
                userRole: decoded.role,
                userSchoolId: decoded.schoolId || null,
            });
        } catch (err) {
            console.log('Auth middleware error:', err.message);
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                errors: 'Invalid or expired token'
            });
        }
    };
};
