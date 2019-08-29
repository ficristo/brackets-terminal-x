const fs = require("fs");
const archiver = require("archiver");
const pkg = require("../package.json");

const output = fs.createWriteStream(pkg.name + ".zip");
const archive = archiver("zip", {
    zlib: { level: 9 }
});

output.on("close", function () {
    console.log(archive.pointer() + " total bytes");
    console.log("archiver has been finalized and the output file descriptor has closed.");
});
output.on("end", function () {
    console.log("Data has been drained");
});

archive.on("warning", function (err) {
    if (err.code === "ENOENT") {
        // log warning
    } else {
        // throw error
        throw err;
    }
});

archive.on("error", function (err) {
    throw err;
});

archive.pipe(output);

const fileNames = [
    "CHANGELOG.md",
    "LICENSE",
    "main.js",
    "npm-shrinkwrap.json",
    "package.json",
    "README.md"
];
fileNames.forEach((fileName) => {
    archive.file(fileName);
});
archive.directory("dist/");

archive.finalize();
