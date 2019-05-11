type Platform = "linux" | "mac" | "win";

interface Brackets {
    platform: Platform;

    // eslint-disable-next-line no-undef
    getModule(path: "thirdparty/mustache/mustache"): typeof Mustache;
    getModule(path: string): any;
}

declare const brackets: Brackets;
