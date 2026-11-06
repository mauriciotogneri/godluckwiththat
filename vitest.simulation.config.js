import {defineConfig, mergeConfig} from 'vitest/config'
import viteConfig from './vite.config.js'

// Headless balance simulation (npm run simulate): bots play full games against the real engine
export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ['scripts/simulation/**/*.sim.js'],
    setupFiles: ['tests/helpers/setup.js'],
    testTimeout: 6 * 60 * 60 * 1000,
    disableConsoleIntercept: true,
  },
}))
