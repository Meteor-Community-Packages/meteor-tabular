import { expect } from 'chai';
import {
  cleanFieldNameForSearch,
  cleanFieldName,
  sortsAreEqual,
  objectsAreEqual,
  getMongoSort,

} from '../common/util.js';
import { LogResults, GenerateBothColumns, createRegExpField } from './reusedFuncions.js';

describe('common/util', () => {
  it(cleanFieldName.name, () => {
    const Input = "Parents.Child[0]"
    const ExpectedOutput = "Parents"
    const Output = cleanFieldName(Input)
    expect(Output).to.equal(ExpectedOutput)
  })

  it(cleanFieldNameForSearch.name, () => {
    const Input = 'Parents.Child[0]'
    const ExpectedOutput = "Parents.Child"
    const Output = cleanFieldNameForSearch(Input)
    expect(Output).to.equal(ExpectedOutput)
  })

  it(sortsAreEqual.name, () => {
    const Input = ["Parents", "Child"]
    const ExpectedOutput = false
    const Output = sortsAreEqual(Input[0], Input[1])
    expect(Output).to.equal(ExpectedOutput)
  })
  it(objectsAreEqual.name, () =>{
    const Input = [{Child: 0}, {Child: 1}]
    const ExpectedOutput = false
    const Output = objectsAreEqual(Input[0], Input[1])
    expect(Output).to.equal(ExpectedOutput)
  })

	//
	// More complex Util Functions
	//
	it(getMongoSort.name, () =>{
		// Note sort does not work on columns run through the parseMultiField
		// function because the order of the columns in the array changes,
		// instead, the first class in a spaced-separated list is used
		const SpacedClassList = ["ClassOne", "ClassTwo ClassThree"]
		const BothCols = GenerateBothColumns(SpacedClassList)
		const order = [{
			column: 1,
			dir: 'asc'
		}]
		// const ExpectedOutput =  [["ClassTwo","asc"]]
		const ExpectedOutput =  [["url","asc"]]
		const Output = getMongoSort(order, BothCols.columns)
		expect(Output).to.deep.equal(ExpectedOutput)
	})
})
