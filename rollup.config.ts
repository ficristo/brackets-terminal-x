import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import sourceMaps from "rollup-plugin-sourcemaps";
import typescript from "rollup-plugin-typescript2";

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
            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            commonjs(),
            // Allow node_modules resolution, so you can use "external" to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve(),

            typescript({ useTsconfigDeclarationDir: true }),

            // Resolve source maps to the original source
            sourceMaps()
        ]
    }
];
