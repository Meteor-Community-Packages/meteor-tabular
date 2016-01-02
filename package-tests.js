//
// Most basic structure for a unit test with error handling
// and basic details logged to web application
//
function LogResults(Input, ExpectedOutput, Output, test) {
	// Actual Test:
	test.equal(Output, ExpectedOutput)

	// Make sure to open a dev tools console to view output
	// Should only appear for errors and solves 90% of typo issues:
	if (test.current_fail_count > 0) {
		console.log('#'+test.test_case.name+' (Failed)');
		console.log('> Input:')
		console.log(Input);
		console.log('> ExpectedOutput:')
		console.log(ExpectedOutput)
		console.log('> Actual Output:')
		console.log(Output)
		console.log('');
	}
}

// Test really reliable Util functions
Tinytest.add('Util - cleanFieldName', function (test) {
	var Input = "Parents.Child[0]"
	var ExpectedOutput = "Parents"
	var Output = Util.cleanFieldName(Input)
	LogResults(Input, ExpectedOutput, Output, test)
})
Tinytest.add('Util - cleanFieldNameForSearch', function (test) {
	var Input = 'Parents.Child[0]'
	var ExpectedOutput = "Parents.Child"
	var Output = Util.cleanFieldNameForSearch(Input)
	LogResults(Input, ExpectedOutput, Output, test)
})
Tinytest.add('Util - sortsAreEqual', function (test) {
	var Input = ["Parents", "Child"]
	var ExpectedOutput = false
	var Output = Util.sortsAreEqual(Input[0], Input[1])
	LogResults(Input, ExpectedOutput, Output, test)
})
Tinytest.add('Util - objectsAreEqual', function (test) {
	var Input = [{Child: 0}, {Child: 1}]
	var ExpectedOutput = false
	var Output = Util.objectsAreEqual(Input[0], Input[1])
	LogResults(Input, ExpectedOutput, Output, test)
})

//
// More complex Util Functions
//
function GenerateBothColumns(SpacedClassList) {
	var BothCols = {} // Its easier to return an object
	BothCols.columns = [] // Note: should be an array
	BothCols.ExpectedOutput = [] // likewise, output is array
	_.each(SpacedClassList, function(ClassList) {
		BothCols.columns.push({
			class: ClassList,
			query: ClassList,
			orderable: true
		})
		var Classes = ClassList.split(' ')
		BothCols.ExpectedOutput = BothCols.ExpectedOutput.concat(
			_.map(Classes, function(Class) {
				return {
					class: ClassList,
					query: Class,
					orderable: true
				}
			})
		)
	})
	return BothCols;
}

Tinytest.add('Util - getMongoSort', function (test) {
	// Note sort does not work on columns run through the parseMultiField
	// function because the order of the columns in the array changes,
	// instead, the first class in a spaced-separated list is used
	var SpacedClassList = ["ClassOne", "ClassTwo ClassThree"]
	var BothCols = GenerateBothColumns(SpacedClassList)
	var order = [{
		column: 1,
		dir: 'asc'
	}]
	var ExpectedOutput =  [["ClassTwo","asc"]]
	var Output = Util.getMongoSort(order, BothCols.columns)
	LogResults(BothCols.columns, ExpectedOutput, Output, test)
})
Tinytest.add('Util - parseMultiFieldColumns', function (test) {
	var SpacedClassList = ["one two", Fake.sentence([4]), Fake.sentence([5])]
	var BothCols = GenerateBothColumns(SpacedClassList)
	var Output = Util.parseMultiFieldColumns(BothCols.columns)
	LogResults(BothCols.columns, BothCols.ExpectedOutput, Output, test)
})


function createRegExpField(SpacedClassList, searchString, PassedOptions) {
	var columns = [] // Note: this is usually an array
	_.each(SpacedClassList, function(ClassList) {
		var Classes = ClassList.split(' ')
		columns = columns.concat(
			_.map(Classes, function(Class) {
				return {
	      data: Class,
	      search: {
	        value: searchString
	      },
	      class: ClassList,
	      options: PassedOptions
	    	}
	    })
	   )
	})
	return columns;
}
Tinytest.add('Util - createRegExp', function (test) {
	//
	// Basic Use Case
	//
	var SpacedClassList = ["ClassOne"]
	var searchString = 'TestSearch'
	// This must be an object and not an array:
	var Input = createRegExpField(SpacedClassList, searchString, {})[0]

	var ExpectedOutput =  searchString
	var Output = Util.createRegExp(Input, searchString)
	LogResults(Input, ExpectedOutput, Output, test)

	//
	// Now with a RegExp
	//
	var PassedOptions = {
		regex: ['^\\D', '\\D?', '*']
		// regex: '^\\D'
	}
	var Input = createRegExpField(
		SpacedClassList,
		searchString,
		PassedOptions
	)[0]
	var ElasticSearchString = searchString.replace(/(.)/g, '$1'+
		PassedOptions.regex[1]);
	var ExpectedOutput =  PassedOptions.regex[0]+
		ElasticSearchString+PassedOptions.regex[2]
	// var ExpectedOutput =  PassedOptions.regex+searchString
	// This must be an object and not an array:
	var Output = Util.createRegExp(Input, searchString)
	LogResults(Input, ExpectedOutput, Output, test)

	//
	// With the proposed "limit" term
	// Where only the first two letters are searched
	//
	var PassedOptions = {
		regex: ['^\\D', '\\D?', '*', 2]
	}
	var Input = createRegExpField(
		SpacedClassList,
		searchString.match(/\D{2}/),
		PassedOptions
	)[0]
	// Take only first two letters
	searchString = searchString[0]+searchString[1]
	var ElasticSearchString = searchString.replace(
		/(.)/g, '$1'+ PassedOptions.regex[1]);
	var ExpectedOutput =  PassedOptions.regex[0]+
		ElasticSearchString+PassedOptions.regex[2]
	// This must be an object and not an array:
	var Output = Util.createRegExp(Input, searchString)
	LogResults(Input, ExpectedOutput, Output, test)

	//
	// Where a third letter is searched (i.e. not searched):
	//
	searchString = searchString+'3'
	var ExpectedOutput = '^@&&@&&@&&@&&@&&@&&@'
	var Output = Util.createRegExp(Input, searchString)
	LogResults(Input, ExpectedOutput, Output, test)
})

//
// Integration Testing (should be basic case of createRegExp):
//
// Most Basic Test
Tinytest.add('Util createMongoDBQuery - Single Column', function (test) {
	var SpacedClassList = ["one"]
	var searchString = 'TestSearch'
	var BothCols = GenerateBothColumns(SpacedClassList)
	// var Output = Util.createMongoDBQuery(BothCols.ExpectedOutput)
	var Output = Util.createMongoDBQuery({}, searchString, {}, true, BothCols.ExpectedOutput)
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
	var Output = Util.createMongoDBQuery({}, searchString, {},
		true, BothCols.ExpectedOutput)

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
	var Output = Util.createMongoDBQuery(selector, searchString, {},
		true, BothCols.ExpectedOutput)

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
	var Output = Util.createMongoDBQuery({}, searchString,
		Input, true, {})
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

//
// Most Important Integration Testing (
// parseMultiFieldColumns, createMongoDBQuery, and createRegExp):
//
Tinytest.add('Util Integration - getPubSelector', function (test) {
	var SpacedClassList = ["one"]
	var searchString = 'TestSearch'
	var BothCols = GenerateBothColumns(SpacedClassList)
	var Output = Util.getPubSelector({}, searchString, {}, true,
		BothCols.ExpectedOutput)
	var ExpectedOutput = {"$and":[{},{"$or":[{"one":{"$regex":"TestSearch","$options":"i"}}]}]}
	LogResults(BothCols.ExpectedOutput, ExpectedOutput, Output, test)
})