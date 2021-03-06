'use strict'

// NPM dependencies
const _ = require('lodash')
const proxyquire = require('proxyquire')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

// Local Dependencies
const gatewayAccountFixtures = require('../../fixtures/gateway_account_fixtures')

const expect = chai.expect

// Constants
const correlationId = 'correlationId'

const gatewayAccountId1 = '1'
const gatewayAccountId2 = '2'
const nonExistentId = '3'
const directDebitAccountId1 = 'DIRECT_DEBIT:adashdkjlq3434lk'
const directDebitAccountId2 = 'DIRECT_DEBIT:sadasdkasjdlkjlkeuo2'
const nonExistentDirectDebitId = 'DIRECT_DEBIT:XXXsadasdkasjdlkjlkeuo2'

let directDebitClientStub
let connectorClientStub
let adminusersClientStub
let productsClientStub
let serviceService

const getGatewayAccounts = function () {
  return {
    getAccounts: function (obj) {
      return new Promise(function (resolve) {
        resolve({
          accounts: obj.gatewayAccountIds.filter(fil => fil !== nonExistentId).map(iter => gatewayAccountFixtures.validGatewayAccountResponse({
            gateway_account_id: iter,
            service_name: `account ${iter}`,
            type: _.sample(['test', 'live'])
          }).getPlain())
        })
      })
    }
  }
}

const getDDGatewayAccounts = function (obj) {
  return new Promise(function (resolve) {
    resolve({
      accounts: obj.gatewayAccountIds.filter(fil => fil !== nonExistentDirectDebitId).map(iter => gatewayAccountFixtures.validDirectDebitGatewayAccountResponse({
        gateway_account_id: iter,
        gateway_account_external_id: iter,
        service_name: `account ${iter}`,
        type: _.sample(['test', 'live'])
      }).getPlain())
    })
  })
}

describe('service service', function () {
  describe('when getting gateway accounts', function () {
    it('should return gateway accounts for the valid ids', function (done) {
      directDebitClientStub = {
        gatewayAccounts: {
          get: getDDGatewayAccounts
        }
      }

      connectorClientStub = {
        ConnectorClient: getGatewayAccounts
      }

      serviceService = proxyquire('../../../app/services/service_service',
        {
          '../services/clients/connector_client': connectorClientStub,
          '../services/clients/direct_debit_connector_client': directDebitClientStub
        })

      serviceService.getGatewayAccounts([gatewayAccountId1, gatewayAccountId2, nonExistentId, directDebitAccountId1, nonExistentDirectDebitId], correlationId).then(gatewayAccounts => {
        expect(gatewayAccounts).to.have.lengthOf(3)
        expect(gatewayAccounts.map(accountObj => accountObj.id || accountObj.gateway_account_external_id))
          .to.have.all.members(['1', '2', 'DIRECT_DEBIT:adashdkjlq3434lk'])
        done()
      })
    })

    it('should not call connector for retrieving direct debit accounts', function (done) {
      directDebitClientStub = {
        gatewayAccounts: {
          get: getDDGatewayAccounts
        },
        isADirectDebitAccount: () => true
      }

      connectorClientStub = {
        ConnectorClient: function () {
          return {
            getAccounts: () => {
              return new Promise(() => {
                console.log('connector should not be called')
                done('should not be called')
              })
            }
          }
        }
      }

      serviceService = proxyquire('../../../app/services/service_service',
        {
          '../services/clients/connector_client': connectorClientStub,
          '../services/clients/direct_debit_connector_client': directDebitClientStub
        })

      serviceService.getGatewayAccounts([directDebitAccountId1, directDebitAccountId2], correlationId).then(gatewayAccounts => {
        expect(gatewayAccounts).to.have.lengthOf(2)
        expect(gatewayAccounts.map(accountObj => accountObj.external_id)).to.have.all.members(['DIRECT_DEBIT:sadasdkasjdlkjlkeuo2', 'DIRECT_DEBIT:adashdkjlq3434lk'])
        done()
      })
    })

    it('should not call direct debit connector for card accounts', function (done) {
      directDebitClientStub = {
        gatewayAccounts: {
          get: function () {
            return new Promise(function () {
              console.log('dd connector should not be called')
              done('should not be called')
            })
          }
        },
        isADirectDebitAccount: () => false
      }

      connectorClientStub = {
        ConnectorClient: getGatewayAccounts
      }

      serviceService = proxyquire('../../../app/services/service_service',
        {
          '../services/clients/connector_client': connectorClientStub,
          '../services/clients/direct_debit_connector_client': directDebitClientStub
        })

      serviceService.getGatewayAccounts([gatewayAccountId1, gatewayAccountId2], correlationId).should.be.fulfilled.then(gatewayAccounts => {
        expect(gatewayAccounts).to.have.lengthOf(2)
        expect(gatewayAccounts.map(accountObj => accountObj.id)).to.have.all.members(['1', '2'])
      }).should.notify(done)
    })
  })

  describe('when editing service name', function () {
    it('should not call direct debit connector for card accounts', function (done) {
      const externalServiceId = 'sdfjksdnfkjn'
      const newServiceName = 'blabla'

      connectorClientStub = {
        ConnectorClient: function () {
          return {
            patchServiceName: () => {
              return new Promise(resolve => {
                resolve()
              })
            }
          }
        }
      }
      adminusersClientStub = () => {
        return {
          updateServiceName: () => {
            return new Promise(resolve => {
              resolve({gateway_account_ids: [1]})
            })
          }
        }
      }
      productsClientStub = {
        product: {
          updateServiceNameOfProductsByGatewayAccountId: () => {
            return new Promise(resolve => {
              resolve()
            })
          }
        }
      }
      directDebitClientStub = {
        gatewayAccount: {
          create: () => {
            return new Promise(() => {
              console.log('dd connector should not be called')
              done('should not be called')
            })
          },
          get: () => {
            return new Promise(() => {
              console.log('dd connector should not be called')
              done('should not be called')
            })
          }
        },
        isADirectDebitAccount: () => false
      }

      serviceService = proxyquire('../../../app/services/service_service',
        {
          '../services/clients/products_client': productsClientStub,
          '../services/clients/connector_client': connectorClientStub,
          '../services/clients/direct_debit_connector_client': directDebitClientStub,
          './clients/adminusers_client': adminusersClientStub
        })

      serviceService.updateServiceName(externalServiceId, newServiceName, correlationId).should.be.fulfilled.then((service) => {
        expect(JSON.stringify(service)).to.deep.equal('{"gatewayAccountIds":[1]}')
      }).should.notify(done)
    })
    it('should not call products nor connector for direct debit accounts', function (done) {
      const externalServiceId = 'sdfjksdnfkjn'
      const newServiceName = 'blabla'
      connectorClientStub = {
        ConnectorClient: function () {
          return {
            patchServiceName: () => {
              return new Promise(() => {
                console.log('connector should not be called')
                done('should not be called')
              })
            }
          }
        }
      }
      adminusersClientStub = () => {
        return {
          updateServiceName: () => {
            return new Promise(resolve => {
              resolve({gateway_account_ids: [10]})
            })
          }
        }
      }
      productsClientStub = {
        product: {
          updateServiceNameOfProductsByGatewayAccountId: () => {
            return new Promise(() => {
              console.log('products should not be called')
              done('should not be called')
            })
          }
        }
      }
      directDebitClientStub = {
        gatewayAccount: {
          create: () => {
            return new Promise(() => {
              console.log('dd connector should not be called')
              done('should not be called')
            })
          },
          get: () => {
            return new Promise(() => {
              console.log('dd connector should not be called')
              done('should not be called')
            })
          }
        },
        isADirectDebitAccount: () => true
      }

      serviceService = proxyquire('../../../app/services/service_service',
        {
          '../services/clients/products_client': productsClientStub,
          '../services/clients/connector_client': connectorClientStub,
          '../services/clients/direct_debit_connector_client': directDebitClientStub,
          './clients/adminusers_client': adminusersClientStub
        })

      serviceService.updateServiceName(externalServiceId, newServiceName, correlationId).should.be.fulfilled.then((service) => {
        expect(JSON.stringify(service)).to.deep.equal('{"gatewayAccountIds":[10]}')
      }).should.notify(done)
    })
  })
})
