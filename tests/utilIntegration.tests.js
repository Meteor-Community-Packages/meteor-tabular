import getPubSelector from '../client/getPubSelector.js';
import { LogResults, GenerateBothColumns } from './reusedFunctions.js';
import { expect } from 'chai'

describe('util integration', () => {
	//
	// Most Important Integration Testing (
	// parseMultiFieldColumns, createMongoDBQuery, and createRegExp):
	//
	it('Util Integration - getPubSelector', () => {
		let SpacedClassList = ["one"]
		let searchString = 'TestSearch'
		let BothCols = GenerateBothColumns(SpacedClassList)
		let Output = getPubSelector({}, searchString, {}, true,
			true, BothCols.ExpectedOutput)
		let ExpectedOutput = {"$and":[{},{"$or":[{"one":{"$regex":"TestSearch","$options":"i"}}]}]}
		expect(Output).to.equal(ExpectedOutput)
	})
});
