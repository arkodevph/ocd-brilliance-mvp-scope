const dispatch = require('./_hono.cjs');
module.exports = (req, res) => dispatch(req, res);
module.exports.createHandler =
  require('../.backend/operations/proof.handler.js').createProofHandler;
