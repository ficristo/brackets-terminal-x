module.exports = {
    "extends": "moody-tsx",
    "rules": {
    },
    "overrides": [
        {
            "files": [
                "src/**",
                "!src/node/**"
            ],
            "globals": {
                "$": false,
                "brackets": false,
                "define": false,
                "require": false,
                "module": false
            }
        },
        {
            "files": [
                "src/node/**"
            ],
            "env": {
                "node": true
            }
        },
        {
            "files": [
                "rollup.config.js"
            ],
            "parserOptions": {
                "ecmaVersion": 6,
                "sourceType": "module"
            }
        }
    ]
}
