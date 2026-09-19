const fs = require('fs')
const path = require('path')

const modules = path.resolve(__dirname, '..', 'node_modules')
for (const dependency of fs.readdirSync(modules)) {
  if (dependency === 'egg' || dependency.startsWith('egg-')) {
    const app = path.resolve(modules, dependency, 'app')
    for (const directory of [
      'controller', 'extend', 'middleware', 'model', 'schedule', 'service',
      'io/middleware', 'io/controller'
    ]) {
      fs.mkdirSync(path.resolve(app, directory), {recursive: true})
    }
  }
}
