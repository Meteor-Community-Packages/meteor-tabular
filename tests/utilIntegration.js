//
// Most Important Integration Testing (
// parseMultiFieldColumns, createMongoDBQuery, and createRegExp):
//
Tinytest.add('Util Integration - getPubSelector', function (test) {
	var SpacedClassList = ["one"]
	var searchString = 'TestSearch'
	var BothCols = GenerateBothColumns(SpacedClassList)
	var Output = Util.getPubSelector({}, searchString, {}, true,
		true, BothCols.ExpectedOutput)
	var ExpectedOutput = {"$and":[{},{"$or":[{"one":{"$regex":"TestSearch","$options":"i"}}]}]}
	LogResults(BothCols.ExpectedOutput, ExpectedOutput, Output, test)
})