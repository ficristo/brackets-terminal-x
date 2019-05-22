import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import sourceMaps from "rollup-plugin-sourcemaps";
import typescript from "rollup-plugin-typescript2";
import copy from "rollup-plugin-copy";
import multiInput from "rollup-plugin-multi-input";

export function reguireJS() {
    return {
        name: "reguireJS",
        resolveId(source) {
            if (source === "module" || source.startsWith("text!") || source.startsWith("i18n!")) {
                return {id: source, external: true};
            }
            return null;
        }
    };
}

export default [
    {
        input: "src/main.ts",
        output: [
            {
                file: "dist/main.js",
                format: "amd",
                sourcemap: true
            }
        ],
        plugins: [
            reguireJS(),

            copy({
                targets: {
                    "./src/styles": "./dist/styles",
                    "./src/views": "./dist/views"
                },
                warnOnNonExist: true
            }),

            // Allow node_modules resolution, so you can use "external" to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve(),

            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            commonjs(),

            typescript({
                clean: true,
                objectHashIgnoreUnknownHack: true,

                useTsconfigDeclarationDir: true
            }),

            // Resolve source maps to the original source
            sourceMaps()
        ]
    },
    {
        input: ["src/nls/**/*.ts"],
        output: {
            dir: "dist",
            format: "amd",
            sourcemap: true
        },
        plugins: [
            multiInput({ relative: "src/" }),

            // Allow node_modules resolution, so you can use "external" to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve(),

            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            commonjs(),

            typescript({
                clean: true,
                objectHashIgnoreUnknownHack: true,

                useTsconfigDeclarationDir: true
            }),

            // Resolve source maps to the original source
            sourceMaps()
        ]
    },
    {
        input: "src/node/TerminalsDomain.ts",
        output: [
            {
                file: "dist/node/TerminalsDomain.js",
                format: "commonjs",
                sourcemap: true
            }
        ],
        external: ["node-pty-prebuilt"],
        plugins: [
            // Allow node_modules resolution, so you can use "external" to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve(),

            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            commonjs(),

            typescript({
                clean: true,
                objectHashIgnoreUnknownHack: true,

                useTsconfigDeclarationDir: true
            }),

            // Resolve source maps to the original source
            sourceMaps()
        ]
    }
];
