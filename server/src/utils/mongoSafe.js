'use strict';

const mongoose = require('mongoose');
function trustedIn(values) {
  return mongoose.trusted({ $in: values });
}
function trustedNin(values) {
  return mongoose.trusted({ $nin: values });
}
function trustedOp(operators) {
  return mongoose.trusted(operators);
}

module.exports = { trustedIn, trustedNin, trustedOp };