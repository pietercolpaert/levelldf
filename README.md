# LevelLDF #

## Linked Data Fragments ##

A Linked Data Fragment (LDF) is a subset of elements in a Linked Data source that match a specific selector.

An LDF server serves Linked Data Fragments for specific selector classes through hypermedia.

## LevelLDF ##

LevelLDF resolves Basic Graph Patterns (BGP) in `O(n)`, with n the number of triples that match the BGP, and returns the number (count) of triples that match a certain BGP in `O(1)`.

LevelLDF uses LevelDB (a key value store) to store all triples using LevelGraph. It adds a second database which contains a hashed version of every possible BGP as a key and the count as a value. You can use LevelLDF to create your own LDF server, or to interface with a local LevelLDF database.

### Use the nodejs library###

#### getStream ####

```javascript
var ldf = require("levelldf");
ldf.getStream({predicate:"rdf:type"}).on("data", function ( triple ) {
  console.log(triple);
});
```

#### count ####

##### Performance

There's a script to test the performance of counts by comparing it to the wc bash command.

```bash
time -p ./test/performance.sh count
time -p ./test/performance.sh wc
```

#### putN3Stream ####

Pipe an n3 filestream in here

### Using the command line tool ###

When you got ldf in your $PATH, check out

```bash
ldf --help
ldf init
ldf import turtle.ttl
ldf bgp -p 'rdf:type'
ldf count -p 'rdf:type'
```

