import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
    {
        ignores: ['*.config.mjs'],
    },
    ...nextVitals,
    {
        settings: {
            react: {
                version: '19.2.7',
            },
        },
        rules: {
            'react/no-unescaped-entities': 'off',
            '@next/next/no-page-custom-font': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/set-state-in-effect': 'off',
        },
    },
]

export default eslintConfig
