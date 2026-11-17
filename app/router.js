module.exports = app => {
  const {router, controller, io, middleware} = app
  const addressMiddleware = middleware.address()
  const blockFilterMiddleware = middleware.blockFilter()
  const contractMiddleware = middleware.contract()
  const paginationMiddleware = middleware.pagination()

  router.get('/info', controller.info.index)
  router.get('/supply', controller.info.supply)
  router.get('/total-max-supply', controller.info.totalMaxSupply)
  router.get('/circulating-supply', controller.info.circulatingSupply)
  router.get('/feerates', controller.info.feeRates)

  router.get('/blocks', controller.block.list)
  router.get(
    '/block/list',
    paginationMiddleware,
    controller.block.blockList
  )
  router.get('/block/:block', controller.block.block)
  router.get('/raw-block/:block', controller.block.rawBlock)
  router.get('/recent-blocks', controller.block.recent)

  router.get(
    '/tx/list',
    paginationMiddleware,
    controller.transaction.list
  )
  router.get('/tx/:id', controller.transaction.transaction)
  router.get('/txs/:ids', controller.transaction.transactions)
  router.get('/raw-tx/:id', controller.transaction.rawTransaction)
  router.get('/recent-txs', controller.transaction.recent)
  router.post('/tx/send', controller.transaction.send)

  router.get(
    '/address/:address',
    addressMiddleware,
    controller.address.summary
  )
  router.get(
    '/address/:address/balance',
    addressMiddleware,
    controller.address.balance
  )
  router.get(
    '/address/:address/balance/total-received',
    addressMiddleware,
    controller.address.totalReceived
  )
  router.get(
    '/address/:address/balance/total-sent',
    addressMiddleware,
    controller.address.totalSent
  )
  router.get(
    '/address/:address/balance/unconfirmed',
    addressMiddleware,
    controller.address.unconfirmedBalance
  )
  router.get(
    '/address/:address/balance/staking',
    addressMiddleware,
    controller.address.stakingBalance
  )
  router.get(
    '/address/:address/balance/mature',
    addressMiddleware,
    controller.address.matureBalance
  )
  router.get(
    '/address/:address/drc20-balance/:token',
    addressMiddleware, middleware.contract('token'),
    controller.address.qrc20TokenBalance
  )
  router.get(
    '/address/:address/txs',
    addressMiddleware, paginationMiddleware, blockFilterMiddleware,
    controller.address.transactions
  )
  router.get(
    '/address/:address/basic-txs',
    addressMiddleware, paginationMiddleware, blockFilterMiddleware,
    controller.address.basicTransactions
  )
  router.get(
    '/address/:address/contract-txs',
    addressMiddleware, paginationMiddleware, blockFilterMiddleware,
    controller.address.contractTransactions
  )
  router.get(
    '/address/:address/contract-txs/:contract',
    addressMiddleware, contractMiddleware, paginationMiddleware,
    controller.address.contractTransactions
  )
  router.get(
    '/address/:address/drc20-txs/:token',
    addressMiddleware, middleware.contract('token'), paginationMiddleware,
    controller.address.qrc20TokenTransactions
  )
  router.get(
    '/address/:address/drc20-mempool-txs/:token',
    addressMiddleware, middleware.contract('token'),
    controller.address.qrc20TokenMempoolTransactions
  )
  router.get(
    '/address/:address/utxo',
    addressMiddleware,
    controller.address.utxo
  )
  router.get(
    '/address/:address/balance-history',
    addressMiddleware, paginationMiddleware,
    controller.address.balanceHistory
  )
  router.get(
    '/address/:address/drc20-balance-history',
    addressMiddleware, paginationMiddleware,
    controller.address.qrc20BalanceHistory
  )
  router.get(
    '/address/:address/drc20-balance-history/:token',
    addressMiddleware, middleware.contract('token'), paginationMiddleware,
    controller.address.qrc20BalanceHistory
  )

  // Chain-wide feed of every contract call/create, across every contract.
  // A distinct top-level path ("contracts", plural) rather than nesting
  // under /contract/ -- /contract/:contract is a 2-segment wildcard route,
  // so a same-depth /contract/txs would collide with it (register order
  // would make "txs" get parsed as a contract address).
  router.get(
    '/contracts/txs',
    paginationMiddleware, blockFilterMiddleware,
    controller.contract.allTransactions
  )
  router.get(
    '/contract/:contract',
    contractMiddleware,
    controller.contract.summary
  )
  router.get(
    '/contract/:contract/txs',
    contractMiddleware, paginationMiddleware, blockFilterMiddleware,
    controller.contract.transactions
  )
  router.get(
    '/contract/:contract/basic-txs',
    contractMiddleware, paginationMiddleware, blockFilterMiddleware,
    controller.contract.basicTransactions
  )
  router.get(
    '/contract/:contract/balance-history',
    contractMiddleware, paginationMiddleware,
    controller.contract.balanceHistory
  )
  router.get(
    '/contract/:contract/drc20-balance-history',
    contractMiddleware, paginationMiddleware,
    controller.contract.qrc20BalanceHistory
  )
  router.get(
    '/contract/:contract/drc20-balance-history/:token',
    contractMiddleware, middleware.contract('token'), paginationMiddleware,
    controller.contract.qrc20BalanceHistory
  )
  router.get(
    '/contract/:contract/call',
    contractMiddleware,
    controller.contract.callContract
  )
  router.get(
    '/searchlogs',
    paginationMiddleware, blockFilterMiddleware,
    controller.contract.searchLogs
  )
  router.get(
    '/drc20',
    paginationMiddleware,
    controller.drc20.list
  )
  router.get(
    '/drc20/txs',
    paginationMiddleware,
    controller.drc20.allTransactions
  )
  router.get(
    '/drc20/:token/txs',
    middleware.contract('token'), paginationMiddleware, blockFilterMiddleware,
    controller.drc20.transactions
  )
  router.get(
    '/drc20/:token/rich-list',
    middleware.contract('token'), paginationMiddleware,
    controller.drc20.richList
  )
  router.get(
    '/drc721',
    paginationMiddleware,
    controller.drc721.list
  )

  router.get(`/search`, controller.misc.classify)
  router.get(
    '/misc/rich-list',
    paginationMiddleware,
    controller.misc.richList
  )
  router.get(
    '/misc/biggest-miners',
    paginationMiddleware,
    controller.misc.biggestMiners
  )
  router.get('/misc/prices', controller.misc.prices)

  router.get('/stats/daily-transactions', controller.statistics.dailyTransactions)
  router.get('/stats/block-interval', controller.statistics.blockInterval)
  router.get('/stats/address-growth', controller.statistics.addressGrowth)
  router.get(
    '/stats/:name(daily-blocks|daily-supply|daily-stakers|daily-contracts|daily-delegations|balance-distribution)',
    controller.statistics.chart
  )

  io.route('subscribe', io.controller.default.subscribe)
  io.route('unsubscribe', io.controller.default.unsubscribe)

  // Insight-API-compatible surface, for light wallets (e.g. qtumjs-wallet's
  // Insight client) that expect this exact path/response shape rather than
  // qtuminfo-api's own native routes above. See app/controller/insight.js.
  router.get(
    '/insight-api/addr/:address/utxo',
    addressMiddleware,
    controller.insight.utxo
  )
  router.get(
    '/insight-api/addr/:address',
    addressMiddleware,
    controller.insight.addressInfo
  )
  router.get('/insight-api/tx/:id', controller.insight.transactionInfo)
  router.get('/insight-api/txs/', controller.insight.transactions)
  router.post('/insight-api/tx/send', controller.transaction.send)
  router.get('/insight-api/utils/estimatefee', controller.insight.estimateFee)
  // qtumjs-wallet's Insight client calls this exact path (data as a path
  // segment, not a query param) for read-only contract calls -- see
  // node_modules/qtumjs-wallet/lib/Insight.js's contractCall(). Reuses the
  // same contract() middleware as /contract/:contract/call above, just
  // keyed off :address instead of :contract to match this path shape.
  router.get(
    '/insight-api/contracts/:address/hash/:data/call',
    middleware.contract('address'),
    controller.insight.contractCall
  )
}
