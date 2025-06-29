const { check } = require('express-validator');

exports.registerValidator = [
  check('username', 'Username is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
];

exports.loginValidator = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
];

exports.changePasswordValidator = [
  check('currentPassword', 'Current password is required').exists(),
  check('newPassword', 'New password must be 6 or more characters').isLength({ min: 6 })
];
