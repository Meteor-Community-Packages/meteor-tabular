import { Tinytest } from 'meteor/tinytest';
import { createMongoDBQuery } from '../common/util.js';
import { LogResults, GenerateBothColumns, createRegExpField } from './reusedFunctions.js';

//
// Integration Testing (should be basic case of createRegExp):
//
// Most Basic Test
Tinytest.add('Util createMongoDBQuery - Single Column', function (test) {
	var SpacedClassList = ["one"]
	var searchString = 'TestSearch'
	var BothCols = GenerateBothColumns(SpacedClassList)
	// var Output = createMongoDBQuery(BothCols.ExpectedOutput)
	var Output = createMongoDBQuery({}, searchString, {}, true, true, BothCols.ExpectedOutput)
	var ExpectedOutput = {
	  "$and":[
	    { },
	    {
	      "$or":[
	        {
	          "one":{
	            "$regex":"TestSearch",
	            "$options":"i"
	          }
	        }
	      ]
	    }
	  ]
	}
	LogResults(BothCols.columns, ExpectedOutput, Output, test)
})
// Multiple Query - More Complicated
Tinytest.add('Util createMongoDBQuery - Multiple Query', function (test) {
	var SpacedClassList = ["one two"]
	var searchString = 'TestSearch'
	var BothCols = GenerateBothColumns(SpacedClassList)
	var Output = createMongoDBQuery({}, searchString, {},
		true, true, BothCols.ExpectedOutput)

	var ExpectedOutput = {
	  "$and":[
	    { },
	    {
	      "$or":[
	        {
	          "one":{
	            "$regex":"TestSearch",
	            "$options":"i"
	          }
	        },
	        {
	          "two":{
	            "$regex":"TestSearch",
	            "$options":"i"
	          }
	        }
	      ]
	    }
	  ]
	}
	LogResults(BothCols.ExpectedOutput, ExpectedOutput, Output, test)
})
// With Existing Selector - Much More Complicated
Tinytest.add('Util createMongoDBQuery - Existing Selector', function (test) {
	var SpacedClassList = ["one"]
	var searchString = 'TestSearch'
	var BothCols = GenerateBothColumns(SpacedClassList)
	var selector = {
	  "$and":[
	    { },
	    {
	      "$or":[
	        {
	          "two":{
	            "$regex":"TestSearch",
	            "$options":"i"
	          }
	        }
	      ]
	    }
	  ]
	}
	var Output = createMongoDBQuery(selector, searchString, {},
		true, true, BothCols.ExpectedOutput)

	var ExpectedOutput = {
	  "$and":[
	    {
	      "$and":[
	      	{  },
	        {
	          "$or":[
	            {
	              "two":{
	                "$regex":"TestSearch",
	                "$options":"i"
	              }
	            }
	          ]
	        }
	      ]
	    },
	    {
	      "$or":[
	        {
	          "one":{
	            "$regex":"TestSearch",
	            "$options":"i"
	          }
	        }
	      ]
	    }
	  ]
	}
	LogResults(BothCols.ExpectedOutput, ExpectedOutput, Output, test)
})
// With Specified Columns - Much Much More Useful to User
Tinytest.add('Util createMongoDBQuery - Specified Columns', function (test) {
	var SpacedClassList = ["three", "four"]
	var searchString = 'TestSearch'
	// This must be an object and not an array:
	var Input = createRegExpField(SpacedClassList, searchString, {})
	var Output = createMongoDBQuery({}, searchString,
		Input, true, true, {})
	var ExpectedOutput = {
	  "$and":[
	    {

	    },
	    {
	      "$or":[
	        {
	          "three":{
	            "$regex":"TestSearch",
	            "$options":"i"
	          }
	        },
	        {
	          "four":{
	            "$regex":"TestSearch",
	            "$options":"i"
	          }
	        }
	      ]
	    }
	  ]
	}
	LogResults(Input, ExpectedOutput, Output, test)
})
