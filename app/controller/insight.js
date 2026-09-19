const {Controller} = require('egg')

// Insight-API-compatible surface for light wallets built against
// qtumjs-wallet-style clients (e.g. Insight.ts). Wraps the existing
// qtuminfo services/models instead of duplicating their logic, and
// reshapes the responses into the field names those clients expect.
// Mounted under /insight-api so it never collides with this API's
// own native routes, which keep their original shapes for qtuminfo-ui.
class InsightController extends Controller {
  async utxo() {
    const {ctx} = this
    let utxos = await ctx.service.address.getUTXO(ctx.state.address.addressIds)
    ctx.body = utxos.map(utxo => ({
      address: utxo.address,
      txid: utxo.transactionId.toString('hex'),
      vout: utxo.outputIndex,
      scriptPubKey: utxo.scriptPubKey.toString('hex'),
      amount: Number(utxo.value) / 1e8,
      satoshis: Number(utxo.value),
      isStake: utxo.isStake,
      height: utxo.blockHeight,
      confirmations: utxo.confirmations
    }))
  }

  async addressInfo() {
    const {ctx} = this
    let {address} = ctx.state
    let [summary, {transactions}] = await Promise.all([
      ctx.service.address.getAddressSummary(address.addressIds, address.p2pkhAddressIds, address.rawAddresses),
      this.getAddressTransactionIds(address.addressIds, address.rawAddresses, {limit: 1000, offset: 0})
    ])
    ctx.body = {
      addrStr: ctx.params.address,
      balance: Number(summary.balance) / 1e8,
      balanceSat: Number(summary.balance),
      totalReceived: Number(summary.totalReceived) / 1e8,
      totalReceivedSat: Number(summary.totalReceived),
      totalSent: Number(summary.totalSent) / 1e8,
      totalSentSat: Number(summary.totalSent),
      unconfirmedBalance: Number(summary.unconfirmed) / 1e8,
      unconfirmedBalanceSat: Number(summary.unconfirmed),
      unconfirmedTxApperances: 0,
      txApperances: summary.transactionCount,
      transactions: transactions.map(id => id.toString('hex'))
    }
  }

  async transactionInfo() {
    const {ctx} = this
    ctx.assert(/^[0-9a-f]{64}$/i.test(ctx.params.id), 404)
    let id = Buffer.from(ctx.params.id, 'hex')
    let transaction = await ctx.service.transaction.getTransaction(id)
    ctx.assert(transaction, 404)
    let tx = await ctx.service.transaction.transformTransaction(transaction, {brief: false})
    ctx.body = this.toInsightTx(tx)
  }

  async transactions() {
    const {ctx} = this
    let {address, pageNum = 0} = ctx.query
    ctx.assert(address, 400)
    const {Address: RawAddress} = ctx.app.qtuminfo.lib
    const chain = ctx.app.chain
    const {Address} = ctx.model
    const {in: $in} = ctx.app.Sequelize.Op
    let addressStrings = address.split(',')
    let rawAddresses = addressStrings.map(a => RawAddress.fromString(a, chain))
    let result = await Address.findAll({
      where: {string: {[$in]: addressStrings}},
      attributes: ['_id', 'type', 'data'],
      transaction: ctx.state.transaction
    })
    let addressIds = result.map(a => a._id)
    const pageSize = 10
    let {totalCount, transactions: ids} = await this.getAddressTransactionIds(
      addressIds, rawAddresses, {limit: pageSize, offset: Number(pageNum) * pageSize}
    )
    let transactions = await Promise.all(ids.map(id => ctx.service.transaction.getTransaction(id)))
    let txs = await Promise.all(transactions.map(tx => ctx.service.transaction.transformTransaction(tx, {brief: false})))
    ctx.body = {
      pagesTotal: Math.ceil(totalCount / pageSize) || 1,
      txs: txs.map(tx => this.toInsightTx(tx))
    }
  }

  async contractCall() {
    const {ctx} = this
    ctx.assert(ctx.state.address.vm === 'evm', 400)
    ctx.assert(/^([0-9a-f]{2})+$/i.test(ctx.params.data), 400)
    ctx.body = await ctx.service.contract.callContract(ctx.state.address.contractAddress, ctx.params.data)
  }

  async estimateFee() {
    const {ctx} = this
    let nbBlocks = Number(ctx.query.nbBlocks || 6)
    let client = new ctx.app.qtuminfo.rpc(ctx.app.config.qtuminfo.rpc)
    let result = await client.estimatesmartfee(nbBlocks)
    ctx.body = result.feerate || 0.004
  }

  async getAddressTransactionIds(addressIds, rawAddresses, {limit, offset}) {
    const {ctx} = this
    let savedPagination = ctx.state.pagination
    ctx.state.pagination = {limit, offset, reversed: true}
    try {
      return await ctx.service.address.getAddressTransactions(addressIds, rawAddresses)
    } finally {
      ctx.state.pagination = savedPagination
    }
  }

  toInsightTx(tx) {
    return {
      txid: tx.id,
      version: tx.version,
      locktime: tx.lockTime,
      vin: tx.inputs.map(input => ({
        txid: input.prevTxId,
        addr: input.address
      })),
      vout: tx.outputs.map(output => ({
        value: (Number(output.value) / 1e8).toString(),
        scriptPubKey: {addresses: output.address ? [output.address] : []}
      })),
      confirmations: tx.confirmations,
      time: tx.timestamp,
      valueOut: Number(tx.outputValue) / 1e8,
      valueIn: Number(tx.inputValue) / 1e8,
      fees: Number(tx.fees) / 1e8,
      blockhash: tx.blockHash,
      blockheight: tx.blockHeight,
      isqrc20Transfer: Boolean(tx.drc20TokenTransfers && tx.drc20TokenTransfers.length)
    }
  }
}

module.exports = InsightController
