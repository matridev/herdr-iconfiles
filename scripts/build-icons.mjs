#!/usr/bin/env node
// Regenerates mods/file-icons/icon-map.js and mods/file-icons/icons/ from the
// npm package `material-icon-theme` (MIT, https://github.com/material-extensions/vscode-material-icon-theme).
//
//   node scripts/build-icons.mjs            # latest version
//   node scripts/build-icons.mjs 5.40.0     # a specific version
//
// Only maintainers run this. The generated files are committed, so installing
// the plugin needs nothing but `sh` (or PowerShell on Windows).
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mod = join(root, "mods", "file-icons");
const version = process.argv[2] ?? "latest";

const tmp = mkdtempSync(join(tmpdir(), "herdr-iconfiles-"));
try {
  const tgz = execFileSync("npm", ["pack", `material-icon-theme@${version}`, "--silent"], { cwd: tmp, encoding: "utf8" }).trim().split("\n").pop();
  execFileSync("tar", ["xzf", tgz], { cwd: tmp });
  const pkg = join(tmp, "package");
  const theme = JSON.parse(readFileSync(join(pkg, "dist", "material-icons.json"), "utf8"));
  const pkgVersion = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;

  // VS Code resolves plain extensions such as `.ts` through the language the
  // editor assigns to the file; the theme only lists the language id. This is
  // the subset of VS Code's extension -> language table the theme has icons for.
  const LANGUAGES = {
    typescript: ["ts", "mts", "cts"], typescriptreact: ["tsx"],
    javascript: ["js", "mjs", "cjs", "es6"], javascriptreact: ["jsx"],
    json: ["json", "webmanifest", "har"], jsonc: ["jsonc"], json5: ["json5"], jsonl: ["jsonl"],
    python: ["py", "pyw", "pyi", "rpy", "gyp"], java: ["java", "jav"], go: ["go"], rust: ["rs"],
    c: ["c", "i"], cpp: ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx", "h++", "ino", "inl", "ipp", "tpp"],
    csharp: ["cs", "csx", "cake"], fsharp: ["fs", "fsi", "fsx", "fsscript"], vb: ["vb", "brs", "vbs", "bas"],
    "objective-c": ["m"], "objective-cpp": ["mm"], swift: ["swift"], dart: ["dart"], lua: ["lua"],
    ruby: ["rb", "rbx", "rjs", "gemspec", "rake", "ru", "erb", "podspec", "rbi"], php: ["php", "php4", "php5", "phtml", "ctp"],
    perl: ["pl", "pm", "pod", "t", "psgi"], perl6: ["p6", "pl6", "pm6", "nqp"], r: ["r", "rhistory", "rprofile", "rt"],
    shellscript: ["sh", "bash", "bashrc", "bash_aliases", "bash_profile", "bash_login", "ebuild", "profile", "bash_logout", "xprofile", "zsh", "zshrc", "zprofile", "zlogin", "zlogout", "zshenv", "zsh-theme", "ksh", "csh", "cshrc", "tcshrc", "yashrc", "yash_profile", "fish"],
    powershell: ["ps1", "psm1", "psd1", "pssc", "psrc"], bat: ["bat", "cmd"],
    html: ["html", "htm", "shtml", "xhtml", "xht", "mdoc", "jsp", "asp", "aspx", "jshtm"], css: ["css"], scss: ["scss"], sass: ["sass"], less: ["less"], stylus: ["styl"],
    markdown: ["md", "mkd", "mdwn", "mdown", "markdown", "markdn", "mdtxt", "mdtext", "workbook"], plaintext: ["txt"],
    xml: ["xml", "xsd", "ascx", "atom", "axml", "bpmn", "cpt", "csl", "csproj", "dita", "ditamap", "dtd", "dtml", "fsproj", "fxml", "iml", "isml", "jmx", "launch", "menu", "mxml", "nuspec", "opml", "owl", "proj", "props", "pt", "publishsettings", "pubxml", "rdf", "rng", "rss", "shproj", "storyboard", "targets", "tld", "tmx", "vbproj", "vcxproj", "wsdl", "wxi", "wxl", "wxs", "xaml", "xbl", "xib", "xlf", "xliff", "xpdl", "xul", "xoml"],
    xsl: ["xsl", "xslt"], yaml: ["yml", "yaml", "eyaml", "eyml", "cff"], toml: ["toml"], ini: ["ini", "conf", "cfg"], properties: ["properties", "gitconfig", "editorconfig"],
    sql: ["sql", "dsql"], graphql: ["graphql", "gql", "graphqls"], dockerfile: ["dockerfile", "containerfile"], makefile: ["mak", "mk"],
    diff: ["diff", "patch", "rej"], log: ["log"], csv: ["csv"], tsv: ["tsv"], groovy: ["groovy", "gvy", "gradle", "jenkinsfile", "nf"],
    clojure: ["clj", "cljs", "cljc", "cljx", "clojure", "edn"], coffeescript: ["coffee", "cson", "iced"], handlebars: ["handlebars", "hbs", "hjs"],
    pug: ["pug", "jade"], jade: ["jade"], razor: ["cshtml", "razor"], latex: ["tex", "ltx", "ctx"], bibtex: ["bib"], tex: ["sty", "cls", "bbx", "cbx"],
    julia: ["jl"], haskell: ["hs"], elixir: ["ex", "exs"], erlang: ["erl", "hrl"], scala: ["scala", "sc"], elm: ["elm"], nim: ["nim"],
    vue: ["vue"], svelte: ["svelte"], terraform: ["tf", "tfvars"], hcl: ["hcl"], proto: ["proto"], solidity: ["sol"], svg: ["svg"],
    pdf: ["pdf"], jupyter: ["ipynb"], "pip-requirements": ["pip"], twig: ["twig"], nunjucks: ["njk", "nunjucks"], postcss: ["pcss", "postcss"],
    hlsl: ["hlsl", "hlsli", "fx", "fxh", "vsh", "psh", "cginc", "compute"], glsl: ["glsl", "vert", "frag", "geom", "comp", "tesc", "tese"], wgsl: ["wgsl"],
    gdscript: ["gd"], nix: ["nix"], slint: ["slint"], luau: ["luau"], prolog: ["pro", "prolog"], sas: ["sas"], v: ["v"], dhall: ["dhall"], purescript: ["purs"],
  };

  const lower = obj => {
    const out = {};
    for (const [k, v] of Object.entries(obj ?? {})) { const l = k.toLowerCase(); if (!(l in out) || k === l) out[l] = v; }
    return out;
  };
  const withLanguages = (exts, languageIds) => {
    const out = lower(exts);
    for (const [lang, list] of Object.entries(LANGUAGES)) {
      const icon = languageIds?.[lang];
      if (icon) for (const ext of list) if (!(ext in out)) out[ext] = icon;
    }
    return out;
  };
  const section = s => ({
    names: lower(s.fileNames),
    exts: withLanguages(s.fileExtensions, s.languageIds),
    folders: lower(s.folderNames),
    roots: lower(s.rootFolderNames),
  });

  const map = {
    version: pkgVersion,
    file: theme.file, folder: theme.folder, folderOpen: theme.folderExpanded,
    root: theme.rootFolder, rootOpen: theme.rootFolderExpanded,
    ...section(theme),
    light: section(theme.light ?? {}),
  };

  // Icons: each definition is copied as icons/<id>.svg, so the mod derives the path from the id.
  rmSync(join(mod, "icons"), { recursive: true, force: true });
  mkdirSync(join(mod, "icons"), { recursive: true });
  for (const [id, def] of Object.entries(theme.iconDefinitions)) {
    copyFileSync(join(pkg, "dist", def.iconPath), join(mod, "icons", `${id}.svg`));
  }
  copyFileSync(join(pkg, "LICENSE"), join(mod, "icons", "LICENSE"));

  writeFileSync(join(mod, "icon-map.js"),
    `// Generated by scripts/build-icons.mjs from material-icon-theme ${pkgVersion} (MIT). Do not edit.\n` +
    `export default ${JSON.stringify(map)};\n`);

  const count = readdirSync(join(mod, "icons")).filter(f => f.endsWith(".svg")).length;
  console.log(`material-icon-theme ${pkgVersion}: ${count} icons, ${Object.keys(map.exts).length} extensions, ${Object.keys(map.names).length} file names, ${Object.keys(map.folders).length} folder names`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
