const isFn = require("./isFunction");

module.exports = (val) => val && isFn(val.then);
