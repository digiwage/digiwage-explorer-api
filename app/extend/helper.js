function transformSQLArg(arg) {
  if (typeof arg === 'string') {
    // Escape single quotes and backslashes rather than interpolating raw --
    // every call site today only ever passes numbers/Buffers, but this
    // looks exactly like a safe parameterized helper, so a future caller
    // passing a plain string (an on-chain token name/symbol, say -- fully
    // attacker-controlled) would otherwise get silent SQL injection.
    return `'${arg.replace(/[\\']/g, '\\$&')}'`
  } else if (['number', 'bigint'].includes(typeof arg)) {
    return arg.toString()
  } else if (Buffer.isBuffer(arg)) {
    return `X'${arg.toString('hex')}'`
  } else if (Array.isArray(arg)) {
    return arg.length === 0 ? '(NULL)' : `(${arg.map(transformSQLArg).join(', ')})`
  } else if (arg && 'raw' in arg) {
    return arg.raw
  }
  return arg.toString()
}

exports.sql = function(strings, ...args) {
  let buffer = []
  for (let i = 0; i < args.length; ++i) {
    buffer.push(strings[i].replace(/\s+/g, ' '), transformSQLArg(args[i]))
  }
  buffer.push(strings[args.length].replace(/\s+/g, ' '))
  return buffer.join('')
}
