'use strict'

const gocardlessClient = require('../../services/clients/gocardless_connect_client')
const directDebitConnectorClient = require('../../services/clients/direct_debit_connector_client')
const REDIRECT_URI = process.env.SELFSERVICE_URL + '/oauth/complete'

const logger = require('winston')

exports.index = (req, res) => {
  const gatewayAccountId = req.account.externalId
  if (directDebitConnectorClient.isADirectDebitAccount(gatewayAccountId)) {
    return directDebitConnectorClient.partnerApp.createState({gatewayAccountId, redirectUri: REDIRECT_URI})
      .then(response => {
        redirectToGoCardlessConnect(req, res, {state: response.state, redirectUri: REDIRECT_URI})
      })
      .catch(err => {
        logger.info(`'There was an error getting a state token from Direct Debit Connector' ${JSON.stringify(err)}`)
        res.status(500)
        res.end()
      })
  } else {
    res.status(400)
    res.end()
  }
}

function redirectToGoCardlessConnect (req, res, params) {
  gocardlessClient.startOAuth(
    req,
    res,
    {
      goCardlessOauthUrl: getGoCardlessOAuthUrl(req.account),
      clientId: getGoCardlessOAuthClientId(req.account),
      state: params.state,
      redirectUri: params.redirectUri
    })
}

function getGoCardlessOAuthUrl (gatewayAccount) {
  return (gatewayAccount.type === 'test') ? process.env.GOCARDLESS_TEST_OAUTH_BASE_URL : process.env.GOCARDLESS_LIVE_OAUTH_BASE_URL
}

function getGoCardlessOAuthClientId (gatewayAccount) {
  return (gatewayAccount.type === 'test') ? process.env.GOCARDLESS_TEST_CLIENT_ID : process.env.GOCARDLESS_LIVE_CLIENT_ID
}
