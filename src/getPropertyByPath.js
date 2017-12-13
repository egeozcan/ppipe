//Mostly taken from https://stackoverflow.com/a/6491621/300011
const isPromise = require("./lib/isPromise");

module.exports = function getPropertyByPath(object, accessString) {
	// convert indexes to properties
	accessString = accessString.replace(/\[(\w+)\]/g, ".$1");
	// strip a leading dot
	accessString = accessString.replace(/^\./, "");
	const properties = accessString.split(".");
	for (let i = 0, n = properties.length; i < n; ++i) {
		const property = properties[i];
		object = isPromise(object)
			? object.then(x => getProperty(property, x))
			: getProperty(property, object);
	}
	return object;
};

function getProperty(property, object) {
	if (object === undefined) {
		return;
	}
	let call = false;
	if (property.endsWith("()")) {
		call = true;
		property = property.substr(0, property.length - 2);
	}
	if (property in object) {
		return call ? object[property]() : object[property];
	} else {
		return;
	}
}
