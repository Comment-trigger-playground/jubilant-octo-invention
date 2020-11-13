const util = require('util');
const { resolve, join } = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const exec = util.promisify(require('child_process').exec);

const readDir = (folder) => util.promisify(fs.readdir)(folder);
const readFile = (fileName) => util.promisify(fs.readFile)(fileName, 'utf8');
const writeFile = (fileName, data) => util.promisify(fs.writeFile)(fileName, data, 'utf8');
const readJson = (fileName) => readFile(fileName).then(JSON.parse);
const writeJson = (fileName, data) => writeFile(fileName, JSON.stringify(data, null, 4) + '\n');

dotenv.config();
const releaseType = process.env.RELEASE_TYPE;

const monorepoFolder = 'packages';

const releaseMapper = (type) => {
    const mapper = {
        major: (major) => `${parseInt(major, 10) + 1}.0.0`,
        minor: (major, minor) => `${major}.${parseInt(minor, 10) + 1}.0`,
        bugfix: (major, minor, bugfix) => `${major}.${minor}.${parseInt(bugfix, 10) + 1}`
    };
    return mapper[type] || mapper.bugfix;
};

const calculatePackages = async () => {
    return join(__dirname, `../`);
};

(async () => {
    if (!releaseType) {
        console.log(`Missing releaseType ${releaseType}.`);
        return ;
    }

    const { stdout: releaser } = await exec('npm whoami');
    console.log(`Releasing packages as ${(releaser)}`);

    const packageFolder = await calculatePackages();
    console.log(`Running release for packages ${packageFolder}`);
    const packagePath = resolve(packageFolder, `package.json`);
    const pckg = await readJson(packagePath);
    let newVersion;
    try {
        const { stdout: version } = await exec(`npm view ${pckg.name} version`);
        const [ major, minor, bugfix ] = version.trim().split('.');
        newVersion = releaseMapper(releaseType)(major, minor, bugfix);
    } catch {
        newVersion = '0.0.0';
    }
    console.log(`Will trigger new version ${newVersion} for ${pckg.name}`);
    await writeJson(packagePath, { ...pckg, version: newVersion });
    const { stderr } = await exec(`cd ${resolve(packageFolder, ``)} && npm publish && cd -`);
    console.log(stderr);
    return {
        path: `${monorepoFolder}/${packageFolder}/package.json`,
        meta: {
            name: pckg.name,
            version: newVersion
        }
    };
})();
