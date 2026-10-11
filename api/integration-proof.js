const dispatch = require('./_nest.cjs');
module.exports = (req, res) => dispatch(req, res);
module.exports.createHandler = require('../.backend/operations/proof.handler.js').createProofHandler;
