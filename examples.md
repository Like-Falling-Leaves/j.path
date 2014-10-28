# TOC
   - [j.path](#jpath)
     - [Using JPath to get/set fields in an object](#jpath-using-jpath-to-getset-fields-in-an-object)
     - [Using JPath with underscore](#jpath-using-jpath-with-underscore)
     - [Advanced operations](#jpath-advanced-operations)
<a name=""></a>
 
<a name="jpath"></a>
# j.path
<a name="jpath-using-jpath-to-getset-fields-in-an-object"></a>
## Using JPath to get/set fields in an object
- Fetch a deep field using dot notation.

```js
// deep fields: use standard JS dot notation

var example = {
  hello: {
    world: {
      count: 5
    },
    world2: 10
  }
};
var count = jpath(example, 'hello.world.count');
assert.equal(count, 5);
```

- Set a deep field.

```js
// deep fields: use standard JS dot notation

var example = {
  hello: {
    world: {
      count: 5
    },
    world2: 10
  }
};
jpath(example, 'hello.world.count', 10);
assert.equal(example.hello.world.count, 10);
```

- Set a deep field whose path does not exist.

```js
// if path does not exist an empty object is created

var example = {};
jpath(example, 'hello.world.count', 10);
assert.equal(example.hello.world.count, 10);
```

- Get a deep field whose path does not exist.

```js
// if path does not exist, just returns undefined

var example = {};
assert.ok(!jpath(example, 'hello.world.count'));
assert.ok(!example.hello);
```

- Get a deep field with arrays in the middle.

```js
// access arrays by using indices with dot notation

var example = {hello: [{world: {count: 5}}, {world2: 10}]};
var count = jpath(example, 'hello.0.world.count');
assert.equal(count, 5);
```

- Get a deep field with non existent path and arrays in the middle.

```js
// if dot notation is used with indices and the object
// does not exist, it is correctly created as an array
var example = {};
var count = jpath(example, 'hello.0.world.count', 10);
var expected = {
  hello: [{world: {count: 10}}]
};
assert.equal(JSON.stringify(example), JSON.stringify(expected));
```

- Get a deep field with non existent path and arrays in the middle #2.

```js
// if dot notation is used with indices and the object
// exists but is not an array, it is left alone
var example = {hello: {}};
var count = jpath(example, 'hello.0.world.count', 10);
var expected = {
  hello: {"0": {world: {count: 10}}}
};
assert.equal(JSON.stringify(example), JSON.stringify(expected));
```

<a name="jpath-using-jpath-with-underscore"></a>
## Using JPath with underscore
- Use getters for deep fields.

```js
// You can create a getter for a deep field

var books = [{
  name: 'As you like it',
  author: {id: 5, name: 'Shakespeare'}
}, {
  name: "The Razor's Edge",
  author: {id: 12, name: 'Somerset Maugham'}
}];
  
var _ = require('underscore');
var names = _.map(books, jpath('author.name'));
assert.equal(JSON.stringify(names), JSON.stringify([
  'Shakespeare', 'Somerset Maugham'
]));
```

<a name="jpath-advanced-operations"></a>
## Advanced operations
- Using setters for deep fields.

```js
// You can use deep setters just like deep getters.
var setAuthorId = jpath('author.id').set;
var book = {name: 'As you like it'};
setAuthorId(book, 10);
assert.equal(book.author.id, 10);

// You can also bind setters with a prefilled value.
setAuthorId = jpath('author.id', 20).set;
setAuthorId(book);
assert.equal(book.author.id, 20);
```

- Using getInfo to see how far a path exists.

```js
// You can use getInfo to figure out if a path exists
// or how far it goes.  In the following example, the
// missing path includes 'world' because hello.world is 
// not an object as required by the path

var example = {hello: [{world: 1}]};
var info = jpath(example).getInfo('hello.0.world.its.all.good');
assert.ok(info);
assert.deepEqual(info.missing, ['world', 'its', 'all', 'good']);
assert.deepEqual(info.parent, example.hello[0]);
assert.ok(!('val' in info));

// this is useful for debugging purposes as if you tried to
// set the path hello.world.its.all.good it will just throw
// without giving any info on why it failed.
assert.throws(function () {
  jpath(example).set('hello.0.world.its.all.good', 55);
  console.log(JSON.stringify(example));
});
```

- Using ensure to default a value.

```js
// You can use ensure to default a value for a path.
// This is like get except if a path doesn't exist it
// gets created.

var example = {hello: [{world: 1}]};
var info = jpath(example).ensure('hello.1.world.its.all.good', []);
assert.ok(info);
assert.deepEqual(info, []);
assert.deepEqual(example, {
  hello: [{world: 1}, {world: {its: {all: {good: []}}}}]
});
```

- Using ensurex to implement other operations.

```js
// You can use ensurex to default extra info on a path.
// This creates the path except for the last leg.  This is
// useful if you want to implement operations like incr
// for example

var example = {hello: [{world: 1}]};
var info = jpath(example).ensurex('hello.0.world');
assert.ok(info);
assert.deepEqual(info.parent, example.hello[0]);
assert.equal(info.val, 1);

// if you wanted to implement incr on any path, you would
// do something like this:

function incr(obj, path) {
  var info = jpath(obj).ensurex(path);
  if (info.missing.length) throw new Error('Invalid path: ' + path);
  if (typeof(info.val) == 'undefined') return info.parent[info.key] = 1;
  var old = parseInt(info.val);
  if (isNaN(old)) throw new Error('Path is non-numeric' + path);
  return info.parent[info.key] = old + 1;
}
```

