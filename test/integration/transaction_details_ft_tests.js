'use strict'

const request = require('supertest')
const nock = require('nock')

require('../test_helpers/serialize_mock.js')
const userCreator = require('../test_helpers/user_creator.js')
const getApp = require('../../server.js').getApp
const paths = require('../../app/paths.js')
const session = require('../test_helpers/mock_session.js')
const {expect} = require('chai')
const gatewayAccountId = '15486734'

let app

const CONNECTOR_CHARGE_PATH = '/v1/api/accounts/' + gatewayAccountId + '/charges/{chargeId}'
const connectorMock = nock(process.env.CONNECTOR_URL)

function connectorMockResponds (path, data) {
  return connectorMock.get(path)
    .reply(200, data)
}

function whenGetTransactionHistory (chargeId, baseApp) {
  return request(baseApp)
    .get(paths.generateRoute(paths.transactions.detail, {chargeId: chargeId}))
    .set('Accept', 'application/json')
}

function connectorChargePathFor (chargeId) {
  return CONNECTOR_CHARGE_PATH.replace('{chargeId}', chargeId)
}

describe('The transaction view scenarios', function () {
  afterEach(function () {
    nock.cleanAll()
    app = null
  })

  beforeEach(function (done) {
    let permissions = 'transactions-details:read'
    let user = session.getUser({
      gateway_account_ids: [gatewayAccountId],
      permissions: [{name: permissions}]
    })
    app = session.getAppWithLoggedInUser(getApp(), user)

    userCreator.mockUserResponse(user.toJson(), done)
  })

  describe('The transaction history endpoint', function () {
    it('should return a list of transaction history for a given charge id', function (done) {
      let chargeId = 452345
      let mockEventsResponse = {
        'charge_id': chargeId,
        'events': [
          {
            'type': 'payment',
            'state': {
              'status': 'created',
              'finished': false
            },
            'amount': '20000',
            'updated': '2015-12-24 13:21:05'
          },
          {
            'type': 'payment',
            'state': {
              'status': 'started',
              'finished': false
            },
            'amount': '20000',
            'updated': '2015-12-24 13:23:12'
          },
          {
            'type': 'payment',
            'state': {
              'status': 'success',
              'finished': true
            },
            'amount': '20000',
            'updated': '2015-12-24 12:05:43'
          },
          {
            'type': 'payment',
            'state': {
              'status': 'cancelled',
              'finished': true,
              'message': 'Payment was cancelled by the service',
              'code': 'P0040'
            },
            'amount': '20000',
            'updated': '2015-12-24 12:05:43'
          },
          {
            'type': 'payment',
            'state': {
              'status': 'failed',
              'finished': true,
              'message': 'Payment was cancelled by the user',
              'code': 'P0030'
            },
            'amount': '20000',
            'updated': '2015-12-24 12:05:43'
          }
        ]
      }

      let mockChargeResponse = {
        'charge_id': chargeId,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'amount': 5000,
        'gateway_account_id': gatewayAccountId,
        'payment_provider': 'sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'state': {
          'status': 'success',
          'finished': true
        },
        'card_details': {
          'billing_address': {
            'city': 'TEST',
            'country': 'GB',
            'line1': 'TEST',
            'line2': 'TEST - DO NOT PROCESS',
            'postcode': 'SE1 3UZ'
          },
          'card_brand': 'Mastercard',
          'cardholder_name': 'TEST',
          'expiry_date': '12/19',
          'last_digits_card_number': '4242',
          'first_digits_card_number': '424242'
        },
        'refund_summary': {
          'status': 'available',
          'amount_available': 5000,
          'amount_submitted': 0
        },
        'return_url': 'http://example.service/return_from_payments',
        'links': [
          {
            'rel': 'self',
            'method': 'GET',
            'href': 'http://connector.service/v1/api/charges/1'
          },
          {
            'rel': 'next_url',
            'method': 'GET',
            'href': 'http://frontend/charges/1?chargeTokenId=82347'
          }
        ]
      }

      let expectedEventsView = {
        'charge_id': chargeId,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'refundable': true,
        'net_amount': '50.00',
        'net_amount_display': '£50.00',
        'refunded_amount': '£0.00',
        'refunded': false,
        'amount': '£50.00',
        'gateway_account_id': gatewayAccountId,
        'updated': '24 Dec 2015 — 13:21:05',
        'state': {
          'status': 'success',
          'finished': true
        },
        'card_details': {
          'billing_address': {
            'city': 'TEST',
            'country': 'GB',
            'line1': 'TEST',
            'line2': 'TEST - DO NOT PROCESS',
            'postcode': 'SE1 3UZ'
          },
          'card_brand': 'Mastercard',
          'cardholder_name': 'TEST',
          'expiry_date': '12/19',
          'last_digits_card_number': '4242',
          'first_digits_card_number': '4242 42'
        },
        'state_friendly': 'Success',
        'refund_summary': {
          'status': 'available',
          'amount_available': 5000,
          'amount_submitted': 0
        },
        'payment_provider': 'Sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'events': [
          {
            'state': {
              'status': 'failed',
              'finished': true,
              'message': 'Payment was cancelled by the user',
              'code': 'P0030'
            },
            'type': 'payment',
            'amount': '20000',
            'state_friendly': 'Cancelled',
            'updated': '2015-12-24 12:05:43',
            'amount_friendly': '£200.00',
            'updated_friendly': '24 Dec 2015 — 12:05:43'
          },
          {
            'state': {
              'status': 'cancelled',
              'finished': true,
              'message': 'Payment was cancelled by the service',
              'code': 'P0040'
            },
            'type': 'payment',
            'amount': '20000',
            'state_friendly': 'Cancelled',
            'amount_friendly': '£200.00',
            'updated': '2015-12-24 12:05:43',
            'updated_friendly': '24 Dec 2015 — 12:05:43'
          },
          {
            'state': {
              'status': 'success',
              'finished': true
            },
            'type': 'payment',
            'amount': '20000',
            'state_friendly': 'Success',
            'amount_friendly': '£200.00',
            'updated': '2015-12-24 12:05:43',
            'updated_friendly': '24 Dec 2015 — 12:05:43'
          },
          {
            'state': {
              'status': 'started',
              'finished': false
            },
            'type': 'payment',
            'amount': '20000',
            'state_friendly': 'Started',
            'amount_friendly': '£200.00',
            'updated': '2015-12-24 13:23:12',
            'updated_friendly': '24 Dec 2015 — 13:23:12'
          },
          {
            'state': {
              'status': 'created',
              'finished': false
            },
            'type': 'payment',
            'amount': '20000',
            'state_friendly': 'Created',
            'amount_friendly': '£200.00',
            'updated': '2015-12-24 13:21:05',
            'updated_friendly': '24 Dec 2015 — 13:21:05'
          }
        ],
        'permissions': {
          'transactions_details_read': true
        }
      }

      connectorMockResponds(connectorChargePathFor(chargeId), mockChargeResponse)
      connectorMockResponds('/v1/api/accounts/' + gatewayAccountId + '/charges/' + chargeId + '/events', mockEventsResponse)

      whenGetTransactionHistory(chargeId, app)
        .expect(200)
        .expect(response => {
          expect(response.body).to.deep.contain(expectedEventsView)
        })
        .end(done)
    })

    it('should show a transaction when no card details are present', function (done) {
      let chargeId = 452345
      let mockEventsResponse = {
        'charge_id': chargeId,
        'events': [
          {
            'type': 'payment',
            'amount': 5000,
            'state': {
              'status': 'created',
              'finished': false
            },
            'updated': '2015-12-24 13:21:05'
          },
          {
            'type': 'payment',
            'amount': 5000,
            'state': {
              'status': 'started',
              'finished': false
            },
            'updated': '2015-12-24 13:23:12'
          }
        ]
      }

      let mockChargeResponse = {
        'charge_id': chargeId,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'amount': 5000,
        'gateway_account_id': gatewayAccountId,
        'payment_provider': 'sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'state': {
          'status': 'started',
          'finished': false
        },
        'refund_summary': {
          'status': 'available',
          'amount_available': 5000,
          'amount_submitted': 0
        },
        'return_url': 'http://example.service/return_from_payments',
        'links': [
          {
            'rel': 'self',
            'method': 'GET',
            'href': 'http://connector.service/v1/api/charges/1'
          },
          {
            'rel': 'next_url',
            'method': 'GET',
            'href': 'http://frontend/charges/1?chargeTokenId=82347'
          }
        ]
      }

      let expectedEventsView = {
        'charge_id': chargeId,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'refundable': true,
        'net_amount': '50.00',
        'net_amount_display': '£50.00',
        'refunded_amount': '£0.00',
        'refunded': false,
        'amount': '£50.00',
        'gateway_account_id': gatewayAccountId,
        'updated': '24 Dec 2015 — 13:21:05',
        'state': {
          'status': 'started',
          'finished': false
        },
        'card_details': {
          'card_brand': 'Data unavailable',
          'cardholder_name': 'Data unavailable',
          'expiry_date': 'Data unavailable',
          'last_digits_card_number': '****',
          'first_digits_card_number': '**** **'
        },
        'state_friendly': 'In progress',
        'refund_summary': {
          'status': 'available',
          'amount_available': 5000,
          'amount_submitted': 0
        },
        'payment_provider': 'Sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'events': [
          {
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state': {
              'status': 'started',
              'finished': false
            },
            'state_friendly': 'Started',
            'updated': '2015-12-24 13:23:12',
            'updated_friendly': '24 Dec 2015 — 13:23:12'
          },
          {
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state': {
              'status': 'created',
              'finished': false
            },
            'state_friendly': 'Created',
            'updated': '2015-12-24 13:21:05',
            'updated_friendly': '24 Dec 2015 — 13:21:05'
          }
        ],
        'permissions': {
          'transactions_details_read': true
        }
      }

      connectorMockResponds(connectorChargePathFor(chargeId), mockChargeResponse)
      connectorMockResponds('/v1/api/accounts/' + gatewayAccountId + '/charges/' + chargeId + '/events', mockEventsResponse)

      whenGetTransactionHistory(chargeId, app)
        .expect(200)
        .expect(response => {
          expect(response.body).to.deep.contain(expectedEventsView)
        })
        .end(done)
    })

    it('should show a transaction when legacy cards details are present', function (done) {
      let chargeId = 452345
      let mockEventsResponse = {
        'charge_id': chargeId,
        'events': [
          {
            'type': 'payment',
            'amount': 5000,
            'state': {
              'status': 'created',
              'finished': false
            },
            'updated': '2015-12-24 13:21:05'
          },
          {
            'type': 'payment',
            'amount': 5000,
            'state': {
              'status': 'started',
              'finished': false
            },
            'updated': '2015-12-24 13:23:12'
          }
        ]
      }

      let mockChargeResponse = {
        'charge_id': chargeId,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'amount': 5000,
        'gateway_account_id': gatewayAccountId,
        'payment_provider': 'sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'state': {
          'status': 'started',
          'finished': false
        },
        'card_details': {
          'billing_address': null,
          'card_brand': 'Mastercard',
          'cardholder_name': null,
          'expiry_date': null,
          'last_digits_card_number': null,
          'first_digits_card_number': null
        },
        'refund_summary': {
          'status': 'available',
          'amount_available': 5000,
          'amount_submitted': 0
        },
        'return_url': 'http://example.service/return_from_payments',
        'links': [
          {
            'rel': 'self',
            'method': 'GET',
            'href': 'http://connector.service/v1/api/charges/1'
          },
          {
            'rel': 'next_url',
            'method': 'GET',
            'href': 'http://frontend/charges/1?chargeTokenId=82347'
          }
        ]
      }

      let expectedEventsView = {
        'charge_id': chargeId,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'refundable': true,
        'net_amount': '50.00',
        'net_amount_display': '£50.00',
        'refunded_amount': '£0.00',
        'refunded': false,
        'amount': '£50.00',
        'gateway_account_id': gatewayAccountId,
        'updated': '24 Dec 2015 — 13:21:05',
        'state': {
          'status': 'started',
          'finished': false
        },
        'card_details': {
          'billing_address': null,
          'card_brand': 'Mastercard',
          'cardholder_name': 'Data unavailable',
          'expiry_date': 'Data unavailable',
          'last_digits_card_number': '****',
          'first_digits_card_number': '**** **'
        },
        'state_friendly': 'In progress',
        'refund_summary': {
          'status': 'available',
          'amount_available': 5000,
          'amount_submitted': 0
        },
        'payment_provider': 'Sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'events': [
          {
            'state': {
              'status': 'started',
              'finished': false
            },
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state_friendly': 'Started',
            'updated': '2015-12-24 13:23:12',
            'updated_friendly': '24 Dec 2015 — 13:23:12'
          },
          {
            'state': {
              'status': 'created',
              'finished': false
            },
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state_friendly': 'Created',
            'updated': '2015-12-24 13:21:05',
            'updated_friendly': '24 Dec 2015 — 13:21:05'
          }
        ],
        'permissions': {
          'transactions_details_read': true
        }
      }

      connectorMockResponds(connectorChargePathFor(chargeId), mockChargeResponse)
      connectorMockResponds('/v1/api/accounts/' + gatewayAccountId + '/charges/' + chargeId + '/events', mockEventsResponse)

      whenGetTransactionHistory(chargeId, app)
        .expect(200)
        .expect(response => {
          expect(response.body).to.deep.contain(expectedEventsView)
        })
        .end(done)
    })

    it('should return a list of transaction history for a given charge id and show refunded', function (done) {
      let chargeWithRefund = 12345
      let mockEventsResponse = {
        'charge_id': chargeWithRefund,
        'events': [
          {
            'state': {
              'status': 'created',
              'finished': false
            },
            'type': 'payment',
            'amount': 5000,
            'updated': '2015-12-24 13:21:05'
          },
          {
            'state': {
              'status': 'started',
              'finished': false
            },
            'type': 'payment',
            'amount': 5000,
            'updated': '2015-12-24 13:23:12'
          },
          {
            'state': {
              'status': 'success',
              'finished': true
            },
            'type': 'payment',
            'amount': 5000,
            'updated': '2015-12-24 12:05:43'
          },
          {
            'state': {
              'status': 'cancelled',
              'finished': true,
              'message': 'Payment was cancelled by the service',
              'code': 'P0040'
            },
            'type': 'payment',
            'amount': 5000,
            'updated': '2015-12-24 12:05:43'
          },
          {
            'state': {
              'status': 'failed',
              'finished': true,
              'message': 'Payment was cancelled by the user',
              'code': 'P0030'
            },
            'type': 'payment',
            'amount': 5000,
            'updated': '2015-12-24 12:05:43'
          }
        ]
      }

      let mockChargeResponse = {
        'charge_id': chargeWithRefund,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'amount': 5000,
        'gateway_account_id': gatewayAccountId,
        'payment_provider': 'sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'state': {
          'status': 'success',
          'finished': true
        },
        'card_details': {
          'billing_address': {
            'city': 'TEST',
            'country': 'GB',
            'line1': 'TEST',
            'line2': 'TEST - DO NOT PROCESS',
            'postcode': 'SE1 3UZ'
          },
          'card_brand': 'Mastercard',
          'cardholder_name': 'TEST',
          'expiry_date': '12/19',
          'last_digits_card_number': '4242',
          'first_digits_card_number': '424242'
        },
        'refund_summary': {
          'status': 'full',
          'amount_available': 0,
          'amount_submitted': 5000
        },
        'return_url': 'http://example.service/return_from_payments',
        'links': [
          {
            'rel': 'self',
            'method': 'GET',
            'href': 'http://connector.service/v1/api/charges/1'
          },
          {
            'rel': 'next_url',
            'method': 'GET',
            'href': 'http://frontend/charges/1?chargeTokenId=82347'
          }
        ]
      }

      let expectedEventsView = {
        'charge_id': chargeWithRefund,
        'description': 'Breathing licence',
        'reference': 'Ref-1234',
        'email': 'alice.111@mail.fake',
        'amount': '£50.00',
        'gateway_account_id': gatewayAccountId,
        'updated': '24 Dec 2015 — 13:21:05',
        'state': {
          'status': 'success',
          'finished': true
        },
        'card_details': {
          'billing_address': {
            'city': 'TEST',
            'country': 'GB',
            'line1': 'TEST',
            'line2': 'TEST - DO NOT PROCESS',
            'postcode': 'SE1 3UZ'
          },
          'card_brand': 'Mastercard',
          'cardholder_name': 'TEST',
          'expiry_date': '12/19',
          'last_digits_card_number': '4242',
          'first_digits_card_number': '4242 42'
        },
        'refund_summary': {
          'status': 'full',
          'amount_available': 0,
          'amount_submitted': 5000
        },
        'net_amount_display': '£0.00',
        'net_amount': '0.00',
        'refundable': false,
        'refunded_amount': '£50.00',
        'refunded': true,
        'state_friendly': 'Success',
        'payment_provider': 'Sandbox',
        'gateway_transaction_id': 'dsfh-34578fb-4und-8dhry',
        'events': [
          {
            'state': {
              'status': 'failed',
              'finished': true,
              'message': 'Payment was cancelled by the user',
              'code': 'P0030'
            },
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state_friendly': 'Cancelled',
            'updated': '2015-12-24 12:05:43',
            'updated_friendly': '24 Dec 2015 — 12:05:43'
          },
          {
            'state': {
              'status': 'cancelled',
              'finished': true,
              'message': 'Payment was cancelled by the service',
              'code': 'P0040'
            },
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state_friendly': 'Cancelled',
            'updated': '2015-12-24 12:05:43',
            'updated_friendly': '24 Dec 2015 — 12:05:43'
          },
          {
            'state': {
              'status': 'success',
              'finished': true
            },
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state_friendly': 'Success',
            'updated': '2015-12-24 12:05:43',
            'updated_friendly': '24 Dec 2015 — 12:05:43'
          },
          {
            'state': {
              'status': 'started',
              'finished': false
            },
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state_friendly': 'Started',
            'updated': '2015-12-24 13:23:12',
            'updated_friendly': '24 Dec 2015 — 13:23:12'
          },
          {
            'state': {
              'status': 'created',
              'finished': false
            },
            'type': 'payment',
            'amount': 5000,
            'amount_friendly': '£50.00',
            'state_friendly': 'Created',
            'updated': '2015-12-24 13:21:05',
            'updated_friendly': '24 Dec 2015 — 13:21:05'
          }
        ],
        'permissions': {
          'transactions_details_read': true
        }
      }

      let events = '/v1/api/accounts/' + gatewayAccountId + '/charges/' + chargeWithRefund + '/events'
      connectorMockResponds(connectorChargePathFor(chargeWithRefund), mockChargeResponse)
      connectorMockResponds(events, mockEventsResponse)

      whenGetTransactionHistory(chargeWithRefund, app)
        .expect(200)
        .expect(response => {
          expect(response.body).to.deep.contain(expectedEventsView)
        })
        .end(done)
    })

    it('should return charge not found if a non existing charge id requested', function (done) {
      let nonExistentChargeId = 888
      let connectorError = {'message': 'Charge not found'}
      connectorMock.get(connectorChargePathFor(nonExistentChargeId))
        .reply(404, connectorError)

      whenGetTransactionHistory(nonExistentChargeId, app)
        .expect(500, connectorError)
        .end(done)
    })

    it('should return a generic if connector responds with an error', function (done) {
      let nonExistentChargeId = 888
      let connectorError = {'message': 'Internal server error'}
      connectorMock.get(connectorChargePathFor(nonExistentChargeId))
        .reply(500, connectorError)

      whenGetTransactionHistory(nonExistentChargeId, app)
        .expect(500, {'message': 'Error processing transaction view'})
        .end(done)
    })

    it('should return a generic if unable to communicate with connector', function (done) {
      let chargeId = 452345
      whenGetTransactionHistory(chargeId, app)
        .expect(500, {'message': 'Error processing transaction view'})
        .end(done)
    })
  })
})
