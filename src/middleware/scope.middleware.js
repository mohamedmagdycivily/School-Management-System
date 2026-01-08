const mongoose = require('mongoose');
const { ROLES, School, Classroom, Student } = require('../models');

/**
 * Scope Middleware
 * Injects or validates schoolId based on user role
 * 
 * - SUPERADMIN: Can access any school, must provide schoolId in body/query for creation
 * - SCHOOL_ADMIN: Automatically scoped to their assigned school
 */

/**
 * Inject or validate schoolId for request body (for POST/PUT operations)
 */
const injectSchoolId = async (req, res, next) => {
  try {
    const { role, schoolId: userSchoolId } = req.user;

    if (role === ROLES.SUPERADMIN) {
      // Superadmin must provide schoolId in body for creation/update
      const bodySchoolId = req.body.schoolId;
      
      if (!bodySchoolId) {
        return res.status(400).json({
          success: false,
          error: 'schoolId is required in request body for superadmin operations.',
          code: 'SCOPE_SCHOOL_ID_REQUIRED',
        });
      }

      // Validate that schoolId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(bodySchoolId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid schoolId format.',
          code: 'SCOPE_INVALID_SCHOOL_ID',
        });
      }

      // Verify school exists
      const school = await School.findById(bodySchoolId);
      if (!school) {
        return res.status(404).json({
          success: false,
          error: 'School not found.',
          code: 'SCOPE_SCHOOL_NOT_FOUND',
        });
      }

      req.scopedSchoolId = bodySchoolId;
    } else if (role === ROLES.SCHOOL_ADMIN) {
      // School admin - force their schoolId, ignore any provided in body
      if (!userSchoolId) {
        return res.status(403).json({
          success: false,
          error: 'School admin must have an assigned school.',
          code: 'SCOPE_NO_ASSIGNED_SCHOOL',
        });
      }

      // Override any schoolId in body with user's assigned schoolId
      req.body.schoolId = userSchoolId.toString();
      req.scopedSchoolId = userSchoolId;
    }

    next();
  } catch (error) {
    console.error('Scope middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during scope validation.',
      code: 'SCOPE_INTERNAL_ERROR',
    });
  }
};

/**
 * Filter query by schoolId for GET operations (list/read)
 * Automatically adds schoolId filter for school admins
 */
const filterBySchool = async (req, res, next) => {
  try {
    const { role, schoolId: userSchoolId } = req.user;

    if (role === ROLES.SUPERADMIN) {
      // Superadmin can optionally filter by schoolId
      const querySchoolId = req.query.schoolId;
      
      if (querySchoolId) {
        if (!mongoose.Types.ObjectId.isValid(querySchoolId)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid schoolId format in query.',
            code: 'SCOPE_INVALID_SCHOOL_ID',
          });
        }
        req.schoolFilter = { schoolId: querySchoolId };
      } else {
        req.schoolFilter = {}; // No filter - can see all
      }
    } else if (role === ROLES.SCHOOL_ADMIN) {
      // School admin - hard filter by their school
      if (!userSchoolId) {
        return res.status(403).json({
          success: false,
          error: 'School admin must have an assigned school.',
          code: 'SCOPE_NO_ASSIGNED_SCHOOL',
        });
      }

      req.schoolFilter = { schoolId: userSchoolId };
    }

    next();
  } catch (error) {
    console.error('Filter by school error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during school filtering.',
      code: 'SCOPE_INTERNAL_ERROR',
    });
  }
};

/**
 * Validate that a resource belongs to user's school (for PUT/DELETE on specific resource)
 * @param {string} modelName - The model name to check ('Classroom' or 'Student')
 */
const validateResourceOwnership = (modelName) => {
  return async (req, res, next) => {
    try {
      const { role, schoolId: userSchoolId } = req.user;
      const resourceId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid resource ID format.',
          code: 'SCOPE_INVALID_RESOURCE_ID',
        });
      }

      // Get the appropriate model
      let Model;
      switch (modelName) {
        case 'Classroom':
          Model = Classroom;
          break;
        case 'Student':
          Model = Student;
          break;
        default:
          return res.status(500).json({
            success: false,
            error: 'Invalid model specified.',
            code: 'SCOPE_INVALID_MODEL',
          });
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: `${modelName} not found.`,
          code: 'SCOPE_RESOURCE_NOT_FOUND',
        });
      }

      // Superadmin can access any resource
      if (role === ROLES.SUPERADMIN) {
        req.resource = resource;
        return next();
      }

      // School admin - verify ownership
      if (role === ROLES.SCHOOL_ADMIN) {
        if (!userSchoolId) {
          return res.status(403).json({
            success: false,
            error: 'School admin must have an assigned school.',
            code: 'SCOPE_NO_ASSIGNED_SCHOOL',
          });
        }

        if (resource.schoolId.toString() !== userSchoolId.toString()) {
          return res.status(403).json({
            success: false,
            error: `Access denied. This ${modelName.toLowerCase()} belongs to a different school.`,
            code: 'SCOPE_ACCESS_DENIED',
          });
        }

        req.resource = resource;
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'Access denied.',
        code: 'SCOPE_ACCESS_DENIED',
      });
    } catch (error) {
      console.error('Resource ownership validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during ownership validation.',
        code: 'SCOPE_INTERNAL_ERROR',
      });
    }
  };
};

module.exports = {
  injectSchoolId,
  filterBySchool,
  validateResourceOwnership,
};
