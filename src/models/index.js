const { User, ROLES } = require('./User.model');
const { School, SCHOOL_STATUS } = require('./School.model');
const { Classroom } = require('./Classroom.model');
const { Student, STUDENT_STATUS } = require('./Student.model');

module.exports = {
  User,
  ROLES,
  School,
  SCHOOL_STATUS,
  Classroom,
  Student,
  STUDENT_STATUS,
};
