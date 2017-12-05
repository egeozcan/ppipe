//Mostly taken from https://stackoverflow.com/a/6491621/300011

module.exports = function getPropertyByPath(o, s) {
	s = s.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
	s = s.replace(/^\./, ""); // strip a leading dot
	var a = s.split(".");
	for (var i = 0, n = a.length; i < n; ++i) {
		var prop = a[i];
		var call = false;
		if (prop.endsWith("()")) {
			call = true;
			prop = prop.substr(0, prop.length - 2);
		}
		if (prop in o) {
			o = call ? o[prop]() : o[prop];
		} else {
			return;
		}
	}
	return o;
};
