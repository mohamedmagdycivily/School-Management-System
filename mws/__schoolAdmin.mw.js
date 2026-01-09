/**
 * School Admin or Higher Middleware
 * Allows SUPERADMIN or SCHOOL_ADMIN roles
 * Must be used after __auth middleware
 */
module.exports = ({ meta, config, managers }) => {
    return ({ req, res, next, results }) => {
        const auth = results.__auth;
        
        if (!auth) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                errors: 'Authentication required'
            });
        }

        const allowedRoles = ['SUPERADMIN', 'SCHOOL_ADMIN'];
        if (!allowedRoles.includes(auth.role)) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 403,
                errors: 'Access denied. School Admin or higher privileges required.'
            });
        }

        next({ __schoolAdmin: true });
    };
};
