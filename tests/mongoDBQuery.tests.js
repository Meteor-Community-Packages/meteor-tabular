import { createMongoDBQuery } from '../common/util.js';
import { LogResults, GenerateBothColumns, createRegExpField } from './reusedFunctions.js';
import { expect } from 'chai'

describe('mongoDBQuery', () => {
  //
  // Integration Testing (should be basic case of createRegExp):
  //
  // Most Basic Test
  it('Util createMongoDBQuery - Single Column', () => {
    let SpacedClassList = ["one"]
    let searchString = 'TestSearch'
    let BothCols = GenerateBothColumns(SpacedClassList)
    // let Output = createMongoDBQuery(BothCols.ExpectedOutput)
    let Output = createMongoDBQuery({}, searchString, {}, true, true, BothCols.ExpectedOutput)
    let ExpectedOutput = {
      "$and": [
        {},
        {
          "$or": [
            {
              "one": {
                "$regex": "TestSearch",
                "$options": "i"
              }
            }
          ]
        }
      ]
    }
    expect(output).to.equal(ExpectedOutput)
  })

  // Multiple Query - More Complicated
  it('Util createMongoDBQuery - Multiple Query', () => {
    let SpacedClassList = ["one two"]
    let searchString = 'TestSearch'
    let BothCols = GenerateBothColumns(SpacedClassList)
    let Output = createMongoDBQuery({}, searchString, {},
      true, true, BothCols.ExpectedOutput)

    let ExpectedOutput = {
      "$and": [
        {},
        {
          "$or": [
            {
              "one": {
                "$regex": "TestSearch",
                "$options": "i"
              }
            },
            {
              "two": {
                "$regex": "TestSearch",
                "$options": "i"
              }
            }
          ]
        }
      ]
    }
    expect(output).to.equal(ExpectedOutput)
  })

  // With Existing Selector - Much More Complicated
  it('Util createMongoDBQuery - Existing Selector', () => {
    let SpacedClassList = ["one"]
    let searchString = 'TestSearch'
    let BothCols = GenerateBothColumns(SpacedClassList)
    let selector = {
      "$and": [
        {},
        {
          "$or": [
            {
              "two": {
                "$regex": "TestSearch",
                "$options": "i"
              }
            }
          ]
        }
      ]
    }
    let Output = createMongoDBQuery(selector, searchString, {},
      true, true, BothCols.ExpectedOutput)

    let ExpectedOutput = {
      "$and": [
        {
          "$and": [
            {},
            {
              "$or": [
                {
                  "two": {
                    "$regex": "TestSearch",
                    "$options": "i"
                  }
                }
              ]
            }
          ]
        },
        {
          "$or": [
            {
              "one": {
                "$regex": "TestSearch",
                "$options": "i"
              }
            }
          ]
        }
      ]
    }
    expect(output).to.equal(ExpectedOutput)
  })

  // With Specified Columns - Much Much More Useful to User
  it('Util createMongoDBQuery - Specified Columns', () => {
    let SpacedClassList = ["three", "four"]
    let searchString = 'TestSearch'
    // This must be an object and not an array:
    let Input = createRegExpField(SpacedClassList, searchString, {})
    let Output = createMongoDBQuery({}, searchString,
      Input, true, true, {})
    let ExpectedOutput = {
      "$and": [
        {},
        {
          "$or": [
            {
              "three": {
                "$regex": "TestSearch",
                "$options": "i"
              }
            },
            {
              "four": {
                "$regex": "TestSearch",
                "$options": "i"
              }
            }
          ]
        }
      ]
    }
    expect(output).to.equal(ExpectedOutput)
  })
})