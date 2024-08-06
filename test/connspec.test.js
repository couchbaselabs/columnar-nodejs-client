'use strict'

const assert = require('chai').assert
var { ConnSpec } = require('../lib/connspec')

const harness = require('./harness')

const H = harness

describe('#ConnSpec', function () {
  describe('stringify', function () {
    it('should stringify a connstr spec', function () {
      var x = new ConnSpec({
        scheme: 'couchbases',
        hosts: [
          ['1.1.1.1', 8094],
          ['2.2.2.2', 8099],
        ],
        bucket: 'frank',
        options: {
          joe: 'bob',
          jane: 'drew',
        },
      }).toString()

      assert.equal(
        x,
        'couchbases://1.1.1.1:8094,2.2.2.2:8099/frank?joe=bob&jane=drew'
      )
    })

    it('should stringify a connstr spec without a scheme', function () {
      var x = new ConnSpec({
        hosts: [['1.1.1.1', 8094]],
        bucket: 'frank',
        options: {
          x: 'y',
        },
      }).toString()
      assert.equal(x, 'couchbases://1.1.1.1:8094/frank?x=y')
    })

    it('should stringify a connstr spec without options', function () {
      var x = new ConnSpec({
        scheme: 'couchbases',
        hosts: [['1.1.1.1', 8094]],
        bucket: 'joe',
      }).toString()
      assert.equal(x, 'couchbases://1.1.1.1:8094/joe')
    })

    it('should stringify a connstr spec with ipv6 addresses', function () {
      var x = new ConnSpec({
        scheme: 'couchbases',
        hosts: [['[2001:4860:4860::8888]', 8094]],
        bucket: 'joe',
      }).toString()
      assert.equal(x, 'couchbases://[2001:4860:4860::8888]:8094/joe')
    })
  })

  describe('parse', function () {
    it('should generate a blank spec for a blank string', function () {
      var x = ConnSpec.parse('')
      assert.deepEqual(x, {
        scheme: 'couchbases',
        hosts: [['localhost', 0]],
        bucket: '',
        options: {},
      })
    })

    it('should not parse a string with a non couchbases scheme', function () {
      assert.throws(() => {
        ConnSpec.parse('couchbase://123')
      })

      assert.throws(() => {
        ConnSpec.parse('http://123')
      })

      assert.throws(() => {
        ConnSpec.parse('https://123')
      })
    })

    it('should not parse a string with no host', function () {
      assert.throws(() => {
        ConnSpec.parse('couchbases:///shirley')
      })
    })

    it('should parse a string with options', function () {
      var x = ConnSpec.parse('couchbases://a/b?c=d&e=f')
      assert.deepEqual(x, {
        scheme: 'couchbases',
        hosts: [['a', 0]],
        bucket: 'b',
        options: {
          c: 'd',
          e: 'f',
        },
      })
    })

    it('should parse a string with ipv6', function () {
      var x = ConnSpec.parse('couchbases://[2001:4860:4860::8888]:9011/b')
      assert.deepEqual(x, {
        scheme: 'couchbases',
        hosts: [['[2001:4860:4860::8888]', 9011]],
        bucket: 'b',
        options: {},
      })
    })
  })
})
