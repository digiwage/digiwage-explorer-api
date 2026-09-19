# DigiWage Explorer API Documentation

* [Pagination Parameters](#pagination-parameters)
* [Block / Timestamp Filter Parameters](#block--timestamp-filter-parameters)
* [Blockchain](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/blockchain.md)
  * [Blockchain Information](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/blockchain.md#Blockchain-Information)
  * [Supply](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/blockchain.md#Supply)
  * [Total Max Supply](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/blockchain.md#Total-Max-Supply)
* [Block](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/block.md)
  * [Block Information](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/block.md#Block-Information)
  * [Blocks of Date](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/block.md#Blocks-of-Date)
  * [Recent Blocks](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/block.md#Recent-Blocks)
* [Transaction](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/transaction.md)
  * [Transaction Information](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/transaction.md#Transaction-Information)
  * [Raw Transaction](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/transaction.md#Raw-Transaction)
  * [Send Raw Transaction](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/transaction.md#Send-Raw-Transaction)
* [Address](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md)
  * [Address Information](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-Information)
  * [Address Balance](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-Balance)
  * [Address Transactions](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-Transactions)
  * [Address Basic Transactions](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-Basic-Transactions)
  * [Address Contract Transactions](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-Contract-Transactions)
  * [Address DRC20 Token Transactions](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-DRC20-Token-Transactions)
  * [Address UTXO List](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-UTXO-List)
  * [Address Balance History](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-Balance-History)
  * [Address DRC20 Balance History](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/address.md#Address-DRC20-Balance-History)
* [Contract](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md)
  * [Contract Information](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md#Contract-Information)
  * [Contract Transactions](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md#Contract-Transactions)
  * [Contract Basic Transactions](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md#Contract-Basic-Transactions)
  * [Call Contract](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md#Call-Contract)
  * [Search Logs](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md#Search-Logs)
* [DRC20](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md)
  * [DRC20 list](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md#DRC20-list)
  * [DRC20 Transaction list](https://github.com/digiwage/digiwage-explorer-api/blob/main/doc/contract.md#DRC20-Transaction-list)


## API Endpoint
* `https://api.digiwage.org/api/` for mainnet
* `http://194.163.172.250:7001/api/` for testnet


## Pagination Parameters

You may use one of 3 forms below, all indices count from 0, maximum 100 records per page:
* `limit=20&offset=40`
* `from=40&to=59`
* `pageSize=20&page=2`


## Block / Timestamp Filter Parameters

These params are available in some transaction list queries,
records are picked only when `fromBlock <= blockHeight <= toBlock`, `fromTime <= blockTimestamp <= toTime`.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>fromBlock</code></td>
            <td>Number (optional)</td>
            <td>Search blocks from height</td>
        </tr>
        <tr>
            <td><code>toBlock</code></td>
            <td>Number (optional)</td>
            <td>Search blocks until height</td>
        </tr>
        <tr>
            <td><code>fromTime</code></td>
            <td>ISO 8601 Date String (optional)</td>
            <td>Search blocks from timestamp</td>
        </tr>
        <tr>
            <td><code>toTime</code></td>
            <td>ISO 8601 Date String (optional)</td>
            <td>Search blocks until timestamp</td>
        </tr>
    </tbody>
</table>
