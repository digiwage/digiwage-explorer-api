const {Service} = require('egg')

class InfoService extends Service {
  async getInfo() {
    let height = this.app.blockchainInfo.tip.height
    let stakeWeight = JSON.parse(await this.app.redis.hget(this.app.name, 'stakeweight')) || 0
    let feeRate = JSON.parse(await this.app.redis.hget(this.app.name, 'feerate')).find(item => item.blocks === 10).feeRate || 0.004
    let dgpInfo = JSON.parse(await this.app.redis.hget(this.app.name, 'dgpinfo')) || {}
    return {
      height,
      supply: await this.getTotalSupply(),
      ...this.app.chain.name === 'mainnet' ? {circulatingSupply: await this.getCirculatingSupply()} : {},
      netStakeWeight: Math.round(stakeWeight),
      feeRate,
      dgpInfo
    }
  }

  async getTotalSupply() {
    // DigiWage chains keep the legacy reward schedule; the node tracks the
    // exact money supply.
    if (this.app.chain.wireFormat === 'digiwage') {
      let client = new this.app.qtuminfo.rpc(this.app.config.qtuminfo.rpc)
      return (await client.getblockchaininfo()).moneysupply
    }
    let height = this.app.blockchainInfo.tip.height
    if (height <= this.app.chain.lastPoWBlockHeight) {
      return height * 20000
    } else {
      let supply = 1e8
      let reward = 4
      let interval = 985500
      let stakeHeight = height - this.app.chain.lastPoWBlockHeight
      let halvings = 0
      while (halvings < 7 && stakeHeight > interval) {
        supply += interval * reward / (1 << halvings++)
        stakeHeight -= interval
      }
      supply += stakeHeight * reward / (1 << halvings)
      return supply
    }
  }

  getTotalMaxSupply() {
    // Legacy nMaxMoneyOut (MAX_MONEY in the DigiWage core).
    if (this.app.chain.wireFormat === 'digiwage') return 120000000
    return 1e8 + 985500 * 4 * (1 - 1 / 2 ** 7) / (1 - 1 / 2)
  }

  async getCirculatingSupply() {
    let totalSupply = await this.getTotalSupply()
    if (this.app.chain.name === 'mainnet') {
      return totalSupply - 575e4
    } else {
      return totalSupply
    }
  }

  async getStakeWeight() {
    const {Header} = this.ctx.model
    const {gte: $gte} = this.app.Sequelize.Op
    let height = await Header.aggregate('height', 'max', {transaction: this.ctx.state.transaction})
    let list = await Header.findAll({
      where: {height: {[$gte]: height - 500}},
      attributes: ['timestamp', 'bits'],
      order: [['height', 'ASC']],
      transaction: this.ctx.state.transaction
    })
    let interval = list[list.length - 1].timestamp - list[0].timestamp
    let sum = list.slice(1)
      .map(x => x.difficulty)
      .reduce((x, y) => x + y)
    // The DigiWage kernel checks hash < target * (value / 100): the same
    // difficulty means 100x the stake weight of Qtum's target * value.
    let kernelScale = this.app.chain.wireFormat === 'digiwage' ? 100 : 1
    return sum * 2 ** 32 * this.app.chain.stakeTimeStep * kernelScale / interval
  }

  async getFeeRates() {
    let client = new this.app.qtuminfo.rpc(this.app.config.qtuminfo.rpc)
    let results = await Promise.all([2, 4, 6, 10, 12, 24].map(blocks => client.estimatesmartfee(blocks)))
    return [
      {blocks: 2, feeRate: results[0].feerate || 0.004},
      {blocks: 4, feeRate: results[1].feerate || 0.004},
      {blocks: 6, feeRate: results[2].feerate || 0.004},
      {blocks: 10, feeRate: results[3].feerate || 0.004},
      {blocks: 12, feeRate: results[4].feerate || 0.004},
      {blocks: 24, feeRate: results[5].feerate || 0.004}
    ]
  }

  async getDGPInfo() {
    let client = new this.app.qtuminfo.rpc(this.app.config.qtuminfo.rpc)
    let info = await client.getdgpinfo()
    return {
      maxBlockSize: info.maxblocksize,
      minGasPrice: info.mingasprice,
      blockGasLimit: info.blockgaslimit
    }
  }
}

module.exports = InfoService
