/**
 * Superadmin Only Middleware
 * Restricts access to SUPERADMIN role only
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

        if (auth.role !== 'SUPERADMIN') {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 403,
                errors: 'Access denied. Superadmin privileges required.'
            });
        }

        next({ __superadmin: true });
    };
};
