import { expect } from 'chai';
import Tabular from '../server/main'

describe('Tabular', () => {
  describe('Tabular - tablesByName', () => {
    it('should be an object', () => {
      expect(Tabular.tablesByName).to.be.an('object');
    })
  })

  describe('publications - tabular_genericPub', () => {
    it('is not implemented')
  })
  describe('publications - tabular_getInfo', () => {
    it('is not implemented')
  })
})

