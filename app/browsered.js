'use strict'

require('@babel/polyfill')

// Local dependencies
const multiSelects = require('./browsered/multi-select')
const fieldValidation = require('./browsered/field-validation')
const dashboardActivity = require('./browsered/dashboard-activity')
const targetToShow = require('./browsered/target-to-show')
const analytics = require('gaap-analytics')
const inputConfirm = require('./browsered/input-confirm')
const niceURL = require('./browsered/nice-url')
const copyText = require('./browsered/copy-text')
const accessibleAutocomplete = require('./browsered/autocomplete')
const checkboxRowSelection = require('./browsered/checkbox-row-selection')

// GOV.UK Frontend js bundle
const GOVUKFrontend = require('govuk-frontend')

GOVUKFrontend.initAll() // Needs to be first

multiSelects.enableMultiSelects()
fieldValidation.enableFieldValidation()
dashboardActivity.init()
targetToShow.init()
analytics.eventTracking.init()
analytics.virtualPageview.init()
inputConfirm()
niceURL()
copyText()
accessibleAutocomplete()
checkboxRowSelection()
