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
ldf.getStream({predicate:"rdfs:type"}).on("data", function ( triple ) {
  console.log(triple);
});
```

#### count ####

#### putN3Stream ####

Pipe an n3 filestream in here

### Using the command line tool ###

When you got ldf in your $PATH, check out

```bash
ldf --help
ldf init
ldf import turtle.ttl
ldf bgp -p 'rdfs:type'
ldf count -p 'rdfs:type'
```

## Paper ##

This is used for a paper at WWW14 in Seoul.

## Future work ##

Implement distributed versioning of the data
