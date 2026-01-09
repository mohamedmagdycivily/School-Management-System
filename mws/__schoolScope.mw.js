/**
 * School Scope Middleware
 * Handles school-based data scoping for RBAC
 * - SUPERADMIN: Can access any school (optional schoolId in body/query)
 * - SCHOOL_ADMIN: Restricted to their assigned school
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

        let scopedSchoolId = null;

        if (auth.role === 'SUPERADMIN') {
            // Superadmin can specify any schoolId or access all
            scopedSchoolId = req.body.schoolId || req.query.schoolId || null;
        } else if (auth.role === 'SCHOOL_ADMIN') {
            // School Admin is restricted to their assigned school
            scopedSchoolId = auth.schoolId;
            
            if (!scopedSchoolId) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 403,
                    errors: 'School Admin has no assigned school'
                });
            }

            // Validate that requested schoolId matches assigned school
            const requestedSchoolId = req.body.schoolId || req.query.schoolId;
            if (requestedSchoolId && requestedSchoolId !== scopedSchoolId.toString()) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 403,
                    errors: 'Access denied. You can only access your assigned school.'
                });
            }
        }

        // Pass the scoped school ID to the next middleware/handler
        next({
            __schoolScope: {
                schoolId: scopedSchoolId,
                isSuperadmin: auth.role === 'SUPERADMIN',
            }
        });
    };
};
