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
	// var ExpectedOutput =  [["ClassTwo","asc"]]
	var ExpectedOutput =  [["url","asc"]]
	var Output = Util.getMongoSort(order, BothCols.columns)
	LogResults(BothCols.columns, ExpectedOutput, Output, test)
})

Tinytest.add('Util - parseMultiFieldColumns', function (test) {
	var SpacedClassList = ["one two", Fake.sentence([4]), Fake.sentence([5])]
	var BothCols = GenerateBothColumns(SpacedClassList)
	var Output = Util.parseMultiFieldColumns(BothCols.columns)
	LogResults(BothCols.columns, BothCols.ExpectedOutput, Output, test)
})

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