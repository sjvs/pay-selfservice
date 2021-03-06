describe('Transactions', () => {
  const transactionsUrl = `/transactions`

  const selfServiceUsers = require('../../../fixtures/config/self_service_user.json')

  const selfServiceDefaultUser = selfServiceUsers.config.users.filter(fil => fil.isPrimary === 'true')[0]

  const aCorporateCardSurchargeCharge = selfServiceDefaultUser.sections.transactions.data.filter(fil => fil.corporate_card_surcharge !== undefined)[0]

  const convertAmounts = val => '£' + (val / 100).toFixed(2)

  beforeEach(() => {
    cy.setCookie('session', Cypress.env('encryptedSessionCookie'))
    cy.setCookie('gateway_account', Cypress.env('encryptedGatewayAccountCookie'))
    cy.visit(transactionsUrl)
  })

  describe('Transactions List', () => {
    const selfServiceDefaultUser = selfServiceUsers.config.users.filter(fil => fil.isPrimary === 'true')[0]

    it('should have the page title \'Transactions - System Generated test - GOV.UK Pay\'', () => {
      cy.title().should('eq', 'Transactions - System Generated test - GOV.UK Pay')
    })

    it('should have the right number of transactions in an unfiltered state', () => {
      // Ensure the transactions list has the right number of items
      const unfilteredTransactions = selfServiceDefaultUser.sections.transactions.data
      cy.get('#transactions-list tbody').find('tr').should('have.length', unfilteredTransactions.length)

      // Ensure the values are displayed correctly
      cy.get('#transactions-list tbody').first().find('td').eq(1).should('have.text', convertAmounts(unfilteredTransactions[0].amount))
      cy.get('#transactions-list tbody').find('tr').eq(1).find('td').eq(1).should('have.text', convertAmounts(unfilteredTransactions[1].amount))
      cy.get('#transactions-list tbody').find('tr').eq(2).find('td').eq(1).should('have.text', convertAmounts(unfilteredTransactions[2].amount))
      cy.get('#transactions-list tbody').find('tr').eq(3).find('td').eq(1).should('have.text', convertAmounts(unfilteredTransactions[3].amount))
    })

    it('should have the right number of transactions in a filtered state', () => {
      const filteredFrom = selfServiceDefaultUser.sections.filteredTransactions.data.filter(fil => fil.filtering.kind === 'fromdate')[0]
      const filteredTo = selfServiceDefaultUser.sections.filteredTransactions.data.filter(fil => fil.filtering.kind === 'todate')[0]

      // 1. Filtering FROM
      // Ensure both the date/time pickers aren't showing
      cy.get('.datepicker').should('not.be.visible')
      cy.get('.ui-timepicker-wrapper').should('not.be.visible')

      // Fill in a from date
      cy.get('#fromDate').type(filteredFrom.filtering.from_date_raw)

      // Ensure only the datepicker is showing
      cy.get('.datepicker').should('be.visible')
      cy.get('.ui-timepicker-wrapper').should('not.be.visible')

      // Fill in a from time
      cy.get('#fromTime').type(filteredFrom.filtering.from_time_raw)

      // Ensure only the timepicker is showing
      cy.get('.datepicker').should('not.be.visible')
      cy.get('.ui-timepicker-wrapper').should('be.visible')

      // Click the filter button
      cy.get('#filter').click()

      // Ensure the right number of transactions is displayed
      cy.get('#transactions-list tbody').find('tr').should('have.length', filteredFrom.data.length)

      // Ensure the values are displayed correctly
      cy.get('#transactions-list tbody').find('tr').first().find('td').eq(1).should('have.text', convertAmounts(filteredFrom.data[0].amount))
      cy.get('#transactions-list tbody').find('tr').eq(1).find('td').eq(1).should('have.text', convertAmounts(filteredFrom.data[1].amount))

      // Clear filters
      cy.get('#fromDate').clear()
      cy.get('#fromTime').clear()

      // 2. Filtering TO

      // Fill in a to date
      cy.get('#toDate').type(filteredTo.filtering.to_date_raw)

      // Ensure only the datepicker is showing
      cy.get('.datepicker').should('be.visible')
      cy.get('.ui-timepicker-wrapper').should('not.be.visible')

      // Fill in a to time
      cy.get('#toTime').type(filteredTo.filtering.to_time_raw)

      // Ensure only the timepicker is showing
      cy.get('.datepicker').should('not.be.visible')
      cy.get('.ui-timepicker-wrapper').should('be.visible')

      // Click the filter button
      cy.get('#filter').click()

      // Ensure the right number of transactions is displayed
      cy.get('#transactions-list tbody').find('tr').should('have.length', filteredTo.data.length)

      // Ensure the values are displayed correctly
      cy.get('#transactions-list tbody').find('tr').first().find('td').eq(1).should('have.text', convertAmounts(filteredTo.data[0].amount))
      cy.get('#transactions-list tbody').find('tr').eq(1).find('td').eq(1).should('have.text', convertAmounts(filteredTo.data[1].amount))
    })

    // https://payments-platform.atlassian.net/browse/PP-4215
    it('should have the right number of transactions when filtering by state = success, multiple card brands and a partial email', () => {
      const filteredPartialEmail = selfServiceDefaultUser.sections.filteredTransactions.data.filter(fil => fil.filtering.kind === 'partialemail')[0]

      cy.get('#card-brand').click()
      filteredPartialEmail.filtering.card_brand.forEach(brand => {
        cy.get(`#card-brand .govuk-checkboxes__input[value=${brand}]`).click()
      })
      cy.get('#email').type(filteredPartialEmail.filtering.email)
      cy.get('#filter').click()

      // Ensure the right number of transactions is displayed
      cy.get('#transactions-list tbody').find('tr').should('have.length', filteredPartialEmail.data.length)

      // Ensure the values are displayed correctly
      cy.get('#transactions-list tbody').find('tr').first().find('td').eq(1).should('have.text', convertAmounts(filteredPartialEmail.data[0].amount))
    })

    // https://payments-platform.atlassian.net/browse/PP-4215
    it('should have the right number of transactions when filtering by multiple payment states, a start and end date and a partial reference', () => {
      const filteredMultipleStates = selfServiceDefaultUser.sections.filteredTransactions.data.filter(fil => fil.filtering.kind === 'multiplestates-partialref-startenddate')[0]

      cy.get('#state').click()
      filteredMultipleStates.filtering.payment_states.forEach(state => {
        cy.get(`#state .govuk-checkboxes__input[value='${state}']`).click()
      })
      cy.get('#reference').type(filteredMultipleStates.filtering.reference)
      cy.get('#fromDate').type(filteredMultipleStates.filtering.from_date_raw)
      cy.get('#fromTime').type(filteredMultipleStates.filtering.from_time_raw)
      cy.get('#toDate').type(filteredMultipleStates.filtering.to_date_raw)
      cy.get('#toTime').type(filteredMultipleStates.filtering.to_time_raw)
      cy.get('#filter').click()
      // Ensure the right number of transactions is displayed
      cy.get('#transactions-list tbody').find('tr').should('have.length', filteredMultipleStates.data.length)
      // Ensure the values are displayed correctly
      cy.get('#transactions-list tbody').find('tr').first().find('td').eq(1).should('have.text', convertAmounts(filteredMultipleStates.data[0].amount))
    })

    it('should display card fee with corporate card surcharge transaction', () => {
      // Ensure the transactions list has the right number of items
      const unfilteredTransactions = selfServiceDefaultUser.sections.transactions.data
      cy.get('#transactions-list tbody').find('tr').should('have.length', unfilteredTransactions.length)

      // Ensure the card fee is displayed correctly
      cy.get('#transactions-list tbody').find('tr').eq(4).find('td').eq(1).should('contain', convertAmounts(aCorporateCardSurchargeCharge.total_amount)).and('contain', '(with card fee)')
    })
  })
})
