const dispatch = require('./_hono.cjs');
module.exports = (req, res) => dispatch(req, res);
module.exports.createHandler =
  require('../.backend/shiftcare/shiftcare.handler.js').createShiftCareHandler;
