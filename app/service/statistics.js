const {Service} = require('egg')

class StatisticsService extends Service {
  async getDailyTransactions() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT
        FLOOR(header.timestamp / 86400) AS date,
        SUM(block.transactions_count) AS transactionsCount,
        SUM(block.contract_transactions_count) AS contractTransactionsCount
      FROM header, block
      WHERE header.height = block.height
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return result.map(({date, transactionsCount, contractTransactionsCount}) => ({
      timestamp: date * 86400,
      transactionsCount,
      contractTransactionsCount
    }))
  }

  async getBlockIntervalStatistics() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT header.timestamp - prev_header.timestamp AS blockInterval, COUNT(*) AS count FROM header
      INNER JOIN header prev_header ON prev_header.height = header.height - 1
      WHERE header.height > 5001
      GROUP BY blockInterval
      ORDER BY blockInterval ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let total = this.app.blockchainInfo.tip.height - 5001
    return result.map(({blockInterval, count}) => ({interval: blockInterval, count, percentage: count / total}))
  }

  async getAddressGrowth() {
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT FLOOR(header.timestamp / 86400) AS date, COUNT(*) AS count FROM address, header
      WHERE address.create_height = header.height AND address.type < ${Address.parseType('contract')}
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let sum = 0
    return result.map(({date, count}) => {
      sum += count
      return {
        timestamp: date * 86400,
        count: sum
      }
    })
  }

  // Blocks per day, average block time and average difficulty (Bitcoin-style
  // GetDifficulty from nBits, the same number the node reports).
  async getDailyBlocks() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT
        FLOOR(header.timestamp / 86400) AS date,
        COUNT(*) AS blocks,
        SUM(GREATEST(CAST(header.timestamp AS SIGNED) - CAST(prev_header.timestamp AS SIGNED), 0)) AS intervalSum,
        AVG((65535 / (header.bits & 0xffffff)) * POW(256, 29 - (header.bits >> 24))) AS difficulty,
        SUM(block.size) AS size
      FROM header
      INNER JOIN header prev_header ON prev_header.height = header.height - 1
      INNER JOIN block ON block.height = header.height
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return result.map(({date, blocks, intervalSum, difficulty, size}) => ({
      timestamp: date * 86400,
      blocks,
      averageBlockTime: blocks ? Number(intervalSum) / blocks : 0,
      difficulty: Number(difficulty),
      size: Number(size)
    }))
  }

  // Coins created per day (the sum of all balance changes: rewards add coins,
  // fees only move between addresses or are destroyed) and the total supply.
  async getDailySupply() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT FLOOR(header.timestamp / 86400) AS date, SUM(balance_change.value) AS minted
      FROM balance_change
      INNER JOIN header ON header.height = balance_change.block_height
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let supply = 0n
    return result.map(({date, minted}) => {
      supply += BigInt(minted)
      return {timestamp: date * 86400, minted: BigInt(minted).toString(), supply: supply.toString()}
    })
  }

  // Distinct addresses that produced a proof-of-stake block each day.
  async getDailyStakers() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let lastPoW = this.app.chain.lastPoWBlockHeight
    if (!Number.isFinite(lastPoW)) return []
    let result = await db.query(sql`
      SELECT FLOOR(header.timestamp / 86400) AS date, COUNT(DISTINCT block.miner_id) AS stakers, COUNT(*) AS blocks
      FROM block
      INNER JOIN header ON header.height = block.height
      WHERE block.height > ${lastPoW}
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return result.map(({date, stakers, blocks}) => ({timestamp: date * 86400, stakers, blocks}))
  }

  // Contract executions, failures and gas per day, plus contracts created.
  async getDailyContracts() {
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let calls = await db.query(sql`
      SELECT
        FLOOR(header.timestamp / 86400) AS date,
        COUNT(*) AS calls,
        SUM(evm_receipt.excepted != 'None') AS failed,
        SUM(evm_receipt.gas_used) AS gasUsed
      FROM evm_receipt
      INNER JOIN header ON header.height = evm_receipt.block_height
      GROUP BY date
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let created = await db.query(sql`
      SELECT FLOOR(header.timestamp / 86400) AS date, COUNT(*) AS created
      FROM address
      INNER JOIN header ON header.height = address.create_height
      WHERE address.type >= ${Address.parseType('contract')}
      GROUP BY date
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let days = new Map()
    let day = date => {
      if (!days.has(date)) days.set(date, {timestamp: date * 86400, calls: 0, failed: 0, gasUsed: 0, created: 0})
      return days.get(date)
    }
    for (let {date, calls: count, failed, gasUsed} of calls) {
      Object.assign(day(date), {calls: count, failed: Number(failed), gasUsed: Number(gasUsed)})
    }
    for (let {date, created: count} of created) day(date).created = count
    return [...days.values()].sort((a, b) => a.timestamp - b.timestamp)
  }

  // Delegations added/removed per day on the offline staking (cold staking)
  // contract, with the running count of active delegations.
  async getDailyDelegations() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    const delegations = Buffer.from('0000000000000000000000000000000000000086', 'hex')
    const added = Buffer.from('a23803f3b2b56e71f2921c22b23c32ef596a439dbe03f7250e6b58a30eb910b5', 'hex')
    const removed = Buffer.from('7fe28d2d0b16cf95b5ea93f4305f89133b3892543e616381a1336fc1e7a01fa0', 'hex')
    let result = await db.query(sql`
      SELECT
        FLOOR(header.timestamp / 86400) AS date,
        SUM(evm_receipt_log.topic1 = ${added}) AS added,
        SUM(evm_receipt_log.topic1 = ${removed}) AS removed
      FROM evm_receipt_log
      INNER JOIN header ON header.height = evm_receipt_log.block_height
      WHERE evm_receipt_log.address = ${delegations}
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let active = 0
    return result.map(({date, added, removed}) => {
      active += Number(added) - Number(removed)
      return {timestamp: date * 86400, added: Number(added), removed: Number(removed), active}
    })
  }

  // How balances are spread: addresses and coins per balance bracket (in coins).
  async getBalanceDistribution() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    const brackets = [0, 1, 10, 100, 1000, 10000, 100000, 1000000]
    let result = await db.query(sql`
      SELECT
        CASE
          WHEN balance < 100000000 THEN 0
          WHEN balance < 1000000000 THEN 1
          WHEN balance < 10000000000 THEN 2
          WHEN balance < 100000000000 THEN 3
          WHEN balance < 1000000000000 THEN 4
          WHEN balance < 10000000000000 THEN 5
          WHEN balance < 100000000000000 THEN 6
          ELSE 7
        END AS bracket,
        COUNT(*) AS addresses,
        SUM(balance) AS balance
      FROM rich_list
      WHERE balance > 0
      GROUP BY bracket
      ORDER BY bracket ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let byBracket = new Map(result.map(row => [Number(row.bracket), row]))
    return brackets.map((from, index) => {
      let row = byBracket.get(index)
      return {
        from,
        to: brackets[index + 1] ?? null,
        addresses: row ? row.addresses : 0,
        balance: row ? BigInt(row.balance).toString() : '0'
      }
    })
  }
}

module.exports = StatisticsService
