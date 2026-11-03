/**
 * DataReady AI — WebdriverIO Configuration for Appium Android
 */

const { capabilities } = require('./config/capabilities')

exports.config = {
  runner: 'local',
  port: 4723,
  specs: ['./tests/**/*.test.js'],
  exclude: [],
  maxInstances: 1,
  capabilities: [capabilities],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
}
