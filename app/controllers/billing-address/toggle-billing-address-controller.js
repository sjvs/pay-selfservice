'use strict'

// NPM dependencies
const lodash = require('lodash')
const logger = require('winston')

// Local dependencies
const response = require('../../utils/response.js').response
const router = require('../../routes.js')
const renderErrorView = require('../../utils/response.js').renderErrorView
const serviceService = require('../../services/service_service')
const CORRELATION_HEADER = require('../../utils/correlation_header.js').CORRELATION_HEADER

const index = (req, res) => {
  const model = {
    collectBillingAddress: req.service.collectBillingAddress
  }
  show(req, res, 'index', model)
}

const toggleOn = (req, res) => {
  toggle(req, res, true)
}

const toggleOff = (req, res) => {
  toggle(req, res, false)
}

const confirmOff = (req, res) => {
  show(req, res, 'confirm-off', {})
}

const show = (req, res, resource, data) => {
  const template = 'billing-address/' + resource
  response(req, res, template, data)
}

const toggle = (req, res, enabled) => {
  const correlationId = lodash.get(req, 'headers.' + CORRELATION_HEADER, '')
  const serviceExternalId = lodash.get(req, 'service.externalId')

  serviceService.toggleCollectBillingAddress(serviceExternalId, enabled, correlationId)
    .then(() => {
      if (enabled) {
        req.flash('generic', 'Billing address is turned on for this service')
      } else {
        req.flash('generic', 'Billing address is turned off for this service')
      }
      logger.info(`[${correlationId}] - Updated collect billing address enabled(${enabled}). user=${req.session.passport.user}`)
      res.redirect(router.paths.toggleBillingAddress.index)
    })
    .catch(err => {
      renderErrorView(req, res, err.message)
    })
}

module.exports = {
  index,
  toggleOn,
  toggleOff,
  confirmOff
}
