const Pact = require('pact')
const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const getAdminUsersClient = require('../../../../../app/services/clients/adminusers_client')
const PactInteractionBuilder = require('../../../../fixtures/pact_interaction_builder').PactInteractionBuilder
const SERVICES_PATH = '/v1/api/services'
const port = Math.floor(Math.random() * 48127) + 1024
const adminusersClient = getAdminUsersClient({baseUrl: `http://localhost:${port}`})
const expect = chai.expect

chai.use(chaiAsPromised)

describe('adminusers client - delete user', function () {
  let provider = Pact({
    consumer: 'selfservice-to-be',
    provider: 'adminusers',
    port: port,
    log: path.resolve(process.cwd(), 'logs', 'mockserver-integration.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    spec: 2,
    pactfileWriteMode: 'merge'
  })

  before(() => provider.setup())
  after((done) => provider.finalize().then(done()))

  const serviceId = 'pact-delete-service-id'
  const removerId = 'pact-delete-remover-id'
  const userId = 'pact-delete-user-id'

  describe('delete user API - success', () => {
    before((done) => {
      provider.addInteraction(
        new PactInteractionBuilder(`${SERVICES_PATH}/${serviceId}/users/${userId}`)
          .withState('a user and user admin exists in service with the given ids before a delete operation')
          .withUponReceiving('a valid delete user from service request')
          .withMethod('DELETE')
          .withRequestHeaders({
            'Accept': 'application/json',
            'GovUkPay-User-Context': removerId
          })
          .withResponseHeaders({})
          .withStatusCode(204)
          .build())
        .then(() => done())
        .catch(done)
    })

    afterEach(() => provider.verify())

    it('should delete a user successfully', function (done) {
      adminusersClient.deleteUser(serviceId, removerId, userId).should.be.fulfilled
        .then(() => {
        })
        .should.notify(done)
    })
  })

  describe('delete user API - remove user itself - conflict', () => {
    before((done) => {
      provider.addInteraction(
        new PactInteractionBuilder(`${SERVICES_PATH}/${serviceId}/users/${removerId}`)
          .withUponReceiving('a valid delete user from service request but remover is equal to user to be removed')
          .withMethod('DELETE')
          .withRequestHeaders({
            'Accept': 'application/json',
            'GovUkPay-User-Context': removerId
          })
          .withResponseHeaders({})
          .withStatusCode(409)
          .build())
        .then(() => done())
        .catch(done)
    })

    afterEach(() => provider.verify())

    it('should conflict when remover and user to delete coincide', function (done) {
      adminusersClient.deleteUser(serviceId, removerId, removerId).should.be.rejected
        .then((response) => {
          expect(response.errorCode).to.equal(409)
        })
        .should.notify(done)
    })
  })

  describe('delete user API - user does not exist - not found', () => {
    const otherUserId = 'user-does-not-exist'

    before((done) => {
      provider.addInteraction(
        new PactInteractionBuilder(`${SERVICES_PATH}/${serviceId}/users/${otherUserId}`)
          .withUponReceiving('an invalid delete user from service request as user does not exist')
          .withMethod('DELETE')
          .withRequestHeaders({
            'Accept': 'application/json',
            'GovUkPay-User-Context': removerId
          })
          .withResponseHeaders({})
          .withStatusCode(404)
          .build())
        .then(() => done())
        .catch(done)
    })

    afterEach(() => provider.verify())

    it('should return not found when resource is not found (user or service)', function (done) {
      adminusersClient.deleteUser(serviceId, removerId, otherUserId).should.be.rejected
        .then((response) => {
          expect(response.errorCode).to.equal(404)
        })
        .should.notify(done)
    })
  })

  describe('delete user API - user context (remover) does not exist - forbidden', () => {
    const nonExistentRemoverId = 'user-does-not-exist'
    const serviceId = 'pact-service-no-remover-test'
    const userId = 'pact-user-no-remover-test'

    before((done) => {
      provider.addInteraction(
        new PactInteractionBuilder(`${SERVICES_PATH}/${serviceId}/users/${userId}`)
          .withState('a user exists but not the remover before a delete operation')
          .withUponReceiving('a non existent user context')
          .withMethod('DELETE')
          .withRequestHeaders({
            'Accept': 'application/json',
            'GovUkPay-User-Context': nonExistentRemoverId
          })
          .withResponseHeaders({})
          .withStatusCode(403)
          .build())
        .then(() => done())
        .catch(done)
    })

    afterEach(() => provider.verify())

    it('should return forbidden when remover dos not ex', function (done) {
      adminusersClient.deleteUser(serviceId, nonExistentRemoverId, userId).should.be.rejected
        .then((response) => {
          expect(response.errorCode).to.equal(403)
        })
        .should.notify(done)
    })
  })
})
