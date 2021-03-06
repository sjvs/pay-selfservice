'use strict'

// NPM Dependencies
const request = require('supertest')
const nock = require('nock')
const _ = require('lodash')
const querystring = require('querystring')
const assert = require('chai').assert
const expect = require('chai').expect

// Local dependencies
require('../test_helpers/serialize_mock')
const userCreator = require('../test_helpers/user_creator')
const getApp = require('../../server').getApp
const paths = require('../../app/paths')
const session = require('../test_helpers/mock_session')
const getQueryStringForParams = require('../../app/utils/get_query_string_for_params')
const userFixture = require('../../test/fixtures/user_fixtures')

// Constants and Setup
process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk'
const gatewayAccountId = '651342'
let app

const CHARGES_API_PATH = '/v2/api/accounts/' + gatewayAccountId + '/charges'
const connectorMock = nock(process.env.CONNECTOR_URL)
const adminusersMock = nock(process.env.ADMINUSERS_URL)

function connectorMockResponds (code, data, searchParameters) {
  searchParameters.pageSize = searchParameters.pageSize || 500
  const queryStr = '?' + getQueryStringForParams(searchParameters)

  return connectorMock.get(CHARGES_API_PATH + queryStr)
    .reply(code, data)
}

function downloadTransactionList (query) {
  return request(app)
    .get(paths.transactions.download + '?' + querystring.stringify(query))
    .set('Accept', 'application/json')
}

describe('Transaction download endpoints', function () {
  afterEach(() => {
    nock.cleanAll()
    app = null
  })

  beforeEach(done => {
    const permissions = 'transactions-download:read'
    const user = session.getUser({
      gateway_account_ids: [gatewayAccountId],
      permissions: [{ name: permissions }]
    })
    app = session.getAppWithLoggedInUser(getApp(), user)

    userCreator.mockUserResponse(user.toJson(), done)
  })

  describe('The /transactions/download endpoint', () => {
    it('should download a csv file comprising a list of transactions for the gateway account', done => {
      const results = require('./json/transaction_download.json')

      const mockJson = {
        results: results,
        _links: {
          next_page: { href: 'http://localhost:8000/bar' }
        }
      }
      adminusersMock.get('/v1/api/users').reply(200, [])

      const secondPageMock = nock('http://localhost:8000')
      const secondResults = _.cloneDeep(results)
      secondResults[0].amount = 12000
      secondResults[0].corporate_card_surcharge = 250
      secondResults[0].total_amount = 12250
      secondResults[1].amount = 123

      secondPageMock.get('/bar')
        .reply(200, {
          results: secondResults
        })

      connectorMockResponds(200, mockJson, {})

      downloadTransactionList()
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('Content-disposition', /attachment; filename="GOVUK_Pay_\d\d\d\d-\d\d-\d\d_\d\d:\d\d:\d\d.csv"/)
        .expect(function (res) {
          const csvContent = res.text
          const arrayOfLines = csvContent.split('\n')
          assert(5, arrayOfLines.length)
          assert.equal('"red","desc-red","alice.111@mail.fake","123.45","Visa","TEST01","12/19","4242","Success",true,"","","transaction-1","charge1","","12 May 2016","17:37:29","0.00","123.45"', arrayOfLines[1])
          assert.equal('"blue","desc-blue","alice.222@mail.fake","9.99","Mastercard","TEST02","12/19","4241","Cancelled",true,"P01234","Something happened","transaction-2","charge2","","12 Apr 2015","19:55:29","0.00","9.99"', arrayOfLines[2])
        })
        .end(function (err, res) {
          if (err) return done(err)
          const csvContent = res.text
          const arrayOfLines = csvContent.split('\n')
          expect(arrayOfLines.length).to.equal(5)
          expect(arrayOfLines[0]).to.equal('"Reference","Description","Email","Amount","Card Brand","Cardholder Name","Card Expiry Date","Card Number","State","Finished","Error Code","Error Message","Provider ID","GOV.UK Payment ID","Issued By","Date Created","Time Created","Corporate Card Surcharge","Total Amount"')
          expect(arrayOfLines[1]).to.equal('"red","desc-red","alice.111@mail.fake","123.45","Visa","TEST01","12/19","4242","Success",true,"","","transaction-1","charge1","","12 May 2016","17:37:29","0.00","123.45"')
          expect(arrayOfLines[2]).to.equal('"blue","desc-blue","alice.222@mail.fake","9.99","Mastercard","TEST02","12/19","4241","Cancelled",true,"P01234","Something happened","transaction-2","charge2","","12 Apr 2015","19:55:29","0.00","9.99"')
          expect(arrayOfLines[3]).to.equal('"red","desc-red","alice.111@mail.fake","120.00","Visa","TEST01","12/19","4242","Success",true,"","","transaction-1","charge1","","12 May 2016","17:37:29","2.50","122.50"')
          expect(arrayOfLines[4]).to.equal('"blue","desc-blue","alice.222@mail.fake","1.23","Mastercard","TEST02","12/19","4241","Cancelled",true,"P01234","Something happened","transaction-2","charge2","","12 Apr 2015","19:55:29","0.00","1.23"')
          done()
        })
    })

    // @see https://payments-platform.atlassian.net/browse/PP-2254
    it('should download a csv file comprising a list of transactions and preventing Spreadsheet Formula Injection', done => {
      const results = require('./json/transaction_download_spreadsheet_formula_injection.json')

      const mockJson = {
        results: results,
        _links: {
          next_page: { href: 'http://localhost:8000/bar' }
        }
      }

      const secondPageMock = nock('http://localhost:8000')

      secondPageMock.get('/bar')
        .reply(200, {
          results: results
        })
      adminusersMock.get('/v1/api/users').reply(200, [])

      connectorMockResponds(200, mockJson, {})

      downloadTransactionList()
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('Content-disposition', /attachment; filename="GOVUK_Pay_\d\d\d\d-\d\d-\d\d_\d\d:\d\d:\d\d.csv"/)
        .end(function (err, res) {
          if (err) return done(err)
          const csvContent = res.text
          const arrayOfLines = csvContent.split('\n')
          expect(arrayOfLines[0]).to.equal('"Reference","Description","Email","Amount","Card Brand","Cardholder Name","Card Expiry Date","Card Number","State","Finished","Error Code","Error Message","Provider ID","GOV.UK Payment ID","Issued By","Date Created","Time Created","Corporate Card Surcharge","Total Amount"')
          expect(arrayOfLines[1]).to.equal('"\'+red","\'=calc+z!A0","\'-alice.111@mail.fake","123.45","\'@Visa","TEST01","12/19","4242","Success",false,"","","transaction-1","charge1","","12 May 2016","17:37:29","0.00","123.45"')
          done()
        })
    })

    it('should download a csv file with expected refund states filtering', done => {
      const results = require('./json/transaction_download_refunds.json')

      const mockJson = {
        results: results,
        _links: {
          next_page: { href: 'http://localhost:8000/bar' }
        }
      }
      const secondPageMock = nock('http://localhost:8000')

      secondPageMock.get('/bar')
        .reply(200, {
          results: results
        })
      const user = userFixture.validUser({
        external_id: '1stUserId',
        username: 'first_user_name'
      }).getPlain()

      const user2 = userFixture.validUser({
        external_id: '2ndUserId',
        username: 'second_user_name'
      }).getPlain()

      connectorMockResponds(200, mockJson, { refund_states: 'success' })
      adminusersMock.get('/v1/api/users')
        .query({ ids: '1stUserId,2ndUserId' })
        .reply(200, [user2, user])
      request(app)
        .get(paths.transactions.download + '?refund_states=success')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('Content-disposition', /attachment; filename="GOVUK_Pay_\d\d\d\d-\d\d-\d\d_\d\d:\d\d:\d\d.csv"/)
        .end(function (err, res) {
          if (err) return done(err)
          const csvContent = res.text
          const arrayOfLines = csvContent.split('\n')
          expect(arrayOfLines[0]).to.equal('"Reference","Description","Email","Amount","Card Brand","Cardholder Name","Card Expiry Date","Card Number","State","Finished","Error Code","Error Message","Provider ID","GOV.UK Payment ID","Issued By","Date Created","Time Created","Corporate Card Surcharge","Total Amount"')
          expect(arrayOfLines[1]).to.equal('"\'+red","\'=calc+z!A0","\'-alice.111@mail.fake","-123.45","\'@Visa","TEST01","12/19","4242","Refund success",false,"","","transaction-1","charge1","first_user_name","12 May 2016","17:37:29","0.00","-123.45"')
          expect(arrayOfLines[2]).to.equal('"\'+red","\'=calc+z!A0","\'-alice.111@mail.fake","-123.45","\'@Visa","TEST01","12/19","4242","Refund success",false,"","","transaction-1","charge2","","12 May 2016","17:37:29","0.00","-123.45"')
          expect(arrayOfLines[3]).to.equal('"\'+red","\'=calc+z!A0","\'-alice.111@mail.fake","-123.45","\'@Visa","TEST01","12/19","4242","Refund success",false,"","","transaction-1","charge3","second_user_name","12 May 2016","17:37:29","0.00","-123.45"')
          done()
        })
    })

    it('should download a csv file with expected payment states filtering', done => {
      const results = require('./json/transaction_download_spreadsheet_formula_injection.json')

      const mockJson = {
        results: results,
        _links: {
          next_page: { href: 'http://localhost:8000/bar' }
        }
      }

      const secondPageMock = nock('http://localhost:8000')

      secondPageMock.get('/bar')
        .reply(200, {
          results: results
        })
      connectorMockResponds(200, mockJson, { payment_states: 'success' })
      adminusersMock.get('/v1/api/users').reply(200, [])

      request(app)
        .get(paths.transactions.download + '?payment_states=success')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('Content-disposition', /attachment; filename="GOVUK_Pay_\d\d\d\d-\d\d-\d\d_\d\d:\d\d:\d\d.csv"/)
        .end(function (err, res) {
          if (err) return done(err)
          const csvContent = res.text
          const arrayOfLines = csvContent.split('\n')
          expect(arrayOfLines[0]).to.equal('"Reference","Description","Email","Amount","Card Brand","Cardholder Name","Card Expiry Date","Card Number","State","Finished","Error Code","Error Message","Provider ID","GOV.UK Payment ID","Issued By","Date Created","Time Created","Corporate Card Surcharge","Total Amount"')
          expect(arrayOfLines[1]).to.equal('"\'+red","\'=calc+z!A0","\'-alice.111@mail.fake","123.45","\'@Visa","TEST01","12/19","4242","Success",false,"","","transaction-1","charge1","","12 May 2016","17:37:29","0.00","123.45"')
          done()
        })
    })

    it('should show error message on a bad request', done => {
      const errorMessage = 'Unable to download list of transactions.'
      connectorMockResponds(400, { 'message': errorMessage }, {})

      downloadTransactionList()
        .expect(500, { 'message': 'Internal server error' })
        .end(done)
    })

    it('should show a generic error message on a connector service error.', done => {
      connectorMockResponds(500, { 'message': 'some error from connector' }, {})

      downloadTransactionList()
        .expect(500, { 'message': 'Internal server error' })
        .end(done)
    })

    it('should show internal error message if any error happens while retrieving the list from connector', done => {
      // No connectorMock defined on purpose to mock a network failure

      downloadTransactionList()
        .expect(500, { 'message': 'Internal server error' })
        .end(done)
    })
  })
})
