import type { NextConfig } from 'next'
const { version } = require('./package.json')

const nextConfig: NextConfig = {
    /* config options here */
}

module.exports = {
    env: {
        version,
    },
}

export default nextConfig
