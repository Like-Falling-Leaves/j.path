module.exports = jpath;
module.exports.JPath = JPath;

var session = {added: []};

function jpath() {
  if (typeof(arguments[0]) == 'string') return path.apply(this, Array.prototype.slice.call(arguments));
  if (arguments.length == 1) return new module.exports.JPath(arguments[0]);
  if (arguments.length == 2) return new module.exports.JPath(arguments[0]).get(arguments[1]);
  if (arguments.length == 3) return new module.exports.JPath(arguments[0]).set(arguments[1], arguments[2]);
  if (arguments.length == 0) return new module.exports.JPath({});
}

function path(pp) {
  var ret = getter(pp);
  ret.get = getter(pp);
  ret.set = arguments.length > 1 ? setter(pp, arguments[1]) : setter(pp);
  return ret;
}

function getter(path) { return function (obj) { return new module.exports.JPath(obj).get(path); }; }
function setter(path, val) {
  if (arguments.length == 1) return function (obj, val) { return new module.exports.JPath(obj).set(path, val); };
  if (arguments.length == 2) return function (obj) { return new module.exports.JPath(obj).set(path, val); }
}

function JPath(obj) {
  if (!this || this === module || this === module.exports) return new JPath(obj);
  this.obj = obj;
}

function JPathGet(path) {
  path = path.split('.');
  var obj = this.obj, idx = 0;
  while (obj && ((idx + 1) < path.length)) obj = obj[path[idx++]];
  return obj && obj[path[idx]];
}

function JPathSet(path, val) {
  path = path.split('.');
  var obj = this.obj || {}, idx = 0, parent = null;
  while (idx < path.length) {
    parent = obj;
    if (!obj[path[idx]]) obj = createTempObject(obj, path[idx]);
    else obj = obj[path[idx]];
    idx ++;
  }
  // if the object to be replaced is a temp object, fetch parent
  // this is needed if the path was something like '3' which would
  // have ended up changing the parent object to array.
  if (obj && typeof(obj) == 'object' && obj._____jpath) {
    parent = obj._____jpath.parent;
  }
  parent[path.slice(-1)[0]] = val;

  // now cleanup all temp objects
  cleanupTempObjects();
  return this;
}

function createTempObject(parent, key) {
  // if key is numeric and parent is itself a temp object, convert parent to array
  var idx = parseInt(key);
  if (!isNaN(idx) && idx >= 0) parent = convertTempObjectToArray(parent);

  // create an empty object and inherit from info so if a sub-object with numeric
  // key is created, we can convert this one to an array on the fly.
  var info = {'_____jpath': {parent: parent, key: key}}
  parent[key] = Object.create(info);

  // remember all objects created this way so we can cleanup references later on
  session.added.push(info);
  return parent[key];
}

function cleanupTempObjects() { 
  // cleanup just removes ___jpath so that GC happens nice and easy
  while(session.added.length) delete session.added.pop()._____jpath; 
}

function convertTempObjectToArray(obj) {
  // leave array-like objects alone
  if ('length' in obj) return obj;

  // dont mess with objects that are not actually temp objects
  if (!obj._____jpath) return obj;

  // dont mess with objects that have some properties already
  var isFilled = false;
  for (var key in obj) if (obj.hasOwnProperty(key)) { isFilled = true; break; }
  if (isFilled) return obj;

  // get parent of object from the stored info and convert to array
  var parent = obj._____jpath.parent, key = obj._____jpath.key;
  parent[key] = [];
  return parent[key];
}

JPath.prototype.get = JPathGet;
JPath.prototype.set = JPathSet;
