//
// Most basic structure for a unit test with error handling
// and basic details logged to web application
//
LogResults = function(Input, ExpectedOutput, Output, test) {
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


GenerateBothColumns = function(SpacedClassList) {
	var BothCols = {} // Its easier to return an object
	BothCols.columns = [] // Note: should be an array
	BothCols.ExpectedOutput = [] // likewise, output is array
	_.each(SpacedClassList, function(ClassList) {
		BothCols.columns.push({
			class: ClassList,
			query: ClassList,
			orderable: true,
			options: {
				sortfield: 'url'
			}
		})
		var Classes = ClassList.split(' ')
		BothCols.ExpectedOutput = BothCols.ExpectedOutput.concat(
			_.map(Classes, function(Class) {
				return {
					class: ClassList,
					query: Class,
					orderable: true,
					options: {
						sortfield: 'url'
					}
				}
			})
		)
	})
	return BothCols;
}


createRegExpField = function(SpacedClassList, searchString, PassedOptions) {
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
