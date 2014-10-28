module.exports = jpath;
module.exports.setBaseClass = setBaseClass;
var JPathClass = JPath;
var session = {added: []};

function jpath() {
  if (typeof(arguments[0]) == 'string') return path.apply(this, Array.prototype.slice.call(arguments));
  if (arguments.length == 1) return new JPathClass(arguments[0]);
  if (arguments.length == 2) return new JPathClass(arguments[0]).get(arguments[1]);
  if (arguments.length == 3) return new JPathClass(arguments[0]).set(arguments[1], arguments[2]);
  if (arguments.length == 0) return new JPathClass({});
}

function path(pp) {
  var ret = getter(pp);
  ret.get = getter(pp);
  ret.getInfo = function (obj) { return new JPathClass(obj).getInfo(pp); };
  ret.set = arguments.length > 1 ? setter(pp, arguments[1]) : setter(pp);
  ret.ensure = ensurer(pp);
  ret.ensurex = ensurerx(pp);
  return ret;
}

function getter(path) { return function (obj) { return new JPathClass(obj).get(path); }; }
function setter(path, val) {
  if (arguments.length == 1) return function (obj, val) { return new JPathClass(obj).set(path, val); };
  if (arguments.length == 2) return function (obj) { return new JPathClass(obj).set(path, val); }
}
function ensurer(path, val) { 
  if (arguments.length == 1) return function (obj, val) { return new JPathClass(obj).ensure(path, val); };
  if (arguments.length == 2) return function (obj) { return new JPathClass(obj).ensure(path, val); }
}
function ensurerx(path) { return function (obj) { return new JPathClass(obj).ensurex(path); }; }

function JPath(obj) {
  if (!this || this === module || this === module.exports) return new JPath(obj);
  this.obj = obj;
}

function JPathGet(path) {
  var info = this.getInfo(path);
  if ('val' in info) return info.val;
}

function JPathGetInfo(path) {
  path = path.split('.');
  var obj = this.obj, idx = 0, parent = null;
  if (!obj) return {parent: parent, missing: path};
  while (idx < path.length && obj && typeof(obj) == 'object') { 
    parent = obj;
    obj = obj[path[idx++]];
  }

  if (idx < path.length) return {parent: parent, missing: path.slice(idx - 1)};
  if (typeof(obj) == 'undefined') return {parent: parent, missing: path.slice(-1)};
  return {parent: parent, missing: [], val: obj};
}

function JPathEnsurex(path) {
  // ensurex creates all the parents of the path needed and returns an obj
  //   {parent: parent_of_path, key: last_key_of_path, val: current_val}
  path = path.split('.');
  var obj = this.obj || {}, idx = 0, parent = null, key = null;
  while (idx < path.length) {
    parent = obj;
    if (typeof(obj) != 'object' || !obj) throw new Error('Invalid Path');
    if (typeof(obj[path[idx]]) == 'undefined') obj = createTempObject(obj, path[idx]);
    else obj = obj[path[idx]];
    idx ++;
  }
  // if the object to be replaced is a temp object, fetch parent
  // this is needed if the path was something like '3' which would
  // have ended up changing the parent object to array.
  key = path.slice(-1)[0];
  if (obj && typeof(obj) == 'object' && obj._____jpath) {
    parent = obj._____jpath.parent;
    delete parent[key];
  } 

  // now cleanup all temp objects
  cleanupTempObjects();
  
  return {parent: parent, key: key, val: obj};
}

function JPathSet(path, val) {
  var info = this.ensurex(path);
  info.parent[info.key] = val;
  return this;
}

function JPathEnsure(path, val) {
  var info = this.ensurex(path);
  return info.parent[info.key] = ('val' in info ? info.val : val);
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

function installMethods(obj) {
  obj.get = JPathGet;
  obj.set = JPathSet;
  obj.ensurex = JPathEnsurex;
  obj.ensure = JPathEnsure;
  obj.getInfo = JPathGetInfo;
}

function setBaseClass(cc) {
  JPathClass = cc;
  installMethods(cc.prototype);
}

setBaseClass(JPath);
