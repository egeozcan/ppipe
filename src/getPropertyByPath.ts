// Mostly taken from https://stackoverflow.com/a/6491621/300011
import isPromise from './lib/isPromise';

function getProperty<T>(property: string, object: T): any {
  if (object === null || typeof object !== 'object') {
    return undefined;
  }

  let call = false;

  if (property.endsWith('()')) {
    call = true;
    property = property.substr(0, property.length - 2);
  }

  if (property in object) {
    const prop = (object as any)[property];
    if (call) {
      if (typeof prop === 'function') {
        return prop.call(object);
      }
    }
    return prop;
  }
}

export default function getPropertyByPath<T>(object: T, accessString: string): any {
  // convert indexes to properties
  accessString = accessString.replace(/\[(\w+)\]/g, '.$1');
  // strip a leading dot
  accessString = accessString.replace(/^\./, '');

  const properties = accessString.split('.');
  let current: any = object;

  for (let i = 0, n = properties.length; i < n; ++i) {
    const property = properties[i];

    if (current === undefined) {
        return undefined;
    }

    current = isPromise(current)
      ? current.then((x) => getProperty(property, x))
      : getProperty(property, current);
  }

  return current;
}
