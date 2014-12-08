robertredl:tabular
=========================

This is a minor fork of aldeed:tabular implementing  

Atmosphere package (fork)
https://atmospherejs.com/robertredl/tabular

Github repository (fork)
https://github.com/robertredl/meteor-tabular

## caseInsensitive search by default

adding the regex i option if caseInsenstitive is set to true  
(this should now reflect the default behavior of datatables  
  https://datatables.net/reference/option/search.caseInsensitive

```javascript
TabularTables.Books = new Tabular.Table({
  . . . . .
  "search": {

    "regex": false, //don't use together with smart
    "search": "", //initial filter on pagerender
    "smart": false, //don't use together with regex
    "caseInsensitive": true // default=true. Set to false for case sensitive search
  }
  });
```

## Installation

```bash
$ meteor add robertredl:tabular
```

## Example

for examples, more details and future updates  
please refer to the original package

https://atmospherejs.com/aldeed/tabular

and the datatables documentation

http://datatables.net/reference/option/
