'use strict'

// NPM dependencies
const _ = require('lodash')

// local dependencies
const {response} = require('../../utils/response')
const serviceService = require('../../services/service_service')
const getHeldPermissions = require('../../utils/get_held_permissions')

module.exports = (req, res) => {
  const servicesRoles = _.get(req, 'user.serviceRoles', [])
  const newServiceId = _.get(req, 'query.s')

  const displayMyServices = servicesData => {
    const data = {
      services: servicesData,
      services_singular: servicesData.length === 1
    }
    if (newServiceId) {
      servicesData.filter(serviceData => {
        return serviceData.external_id === newServiceId
      }).forEach(service => {
        data.new_service_name = service.name
      })
    }

    return response(req, res, 'services/index', data)
  }

  const aggregatedGatewayAccountIds = servicesRoles
    .map(servicesRole => servicesRole.service.gatewayAccountIds)
    .reduce((accumulator, currentValue) => { return accumulator.concat(currentValue) }, [])

  serviceService.getGatewayAccounts(aggregatedGatewayAccountIds, req.correlationId)
    .then(aggregatedGatewayAccounts => {
      return servicesRoles.map(serviceRole => {
        const gatewayAccounts = aggregatedGatewayAccounts.filter(gatewayAccount => serviceRole.service.gatewayAccountIds.includes(gatewayAccount.id.toString()))
        return {
          name: serviceRole.service.name === 'System Generated' ? 'Temporary Service Name' : serviceRole.service.name,
          external_id: serviceRole.service.externalId,
          gateway_accounts: {
            cardAccounts: gatewayAccounts.filter(gatewayAccount => gatewayAccount.payment_method !== 'direct debit'),
            directdebitAccounts: gatewayAccounts.filter(gatewayAccount => gatewayAccount.payment_method === 'direct debit')
          },
          permissions: getHeldPermissions(serviceRole.role.permissions.map(permission => permission.name))
        }
      })
    })
    .then(displayMyServices)
}
