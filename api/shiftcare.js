const dispatch = require('./_nest.cjs');
module.exports = (req, res) => dispatch(req, res);
module.exports.createHandler =
  require('../.backend/shiftcare/shiftcare.handler.js').createShiftCareHandler;
