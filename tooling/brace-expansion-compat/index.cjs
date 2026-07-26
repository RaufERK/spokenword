'use strict'

const upstream = require('./vendor/dist/commonjs/index.js')

function expandTop(str, options) {
  return upstream.expand(str, options)
}

module.exports = expandTop
module.exports.expand = upstream.expand
module.exports.EXPANSION_MAX = upstream.EXPANSION_MAX
module.exports.EXPANSION_MAX_LENGTH = upstream.EXPANSION_MAX_LENGTH
