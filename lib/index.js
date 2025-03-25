"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snippetsProvider = exports.getFilesBySpecs = exports.reactHooksGeneratePlugin = void 0;
const pontx_generate_1 = require("pontx-generate");
Object.defineProperty(exports, "getFilesBySpecs", { enumerable: true, get: function () { return pontx_generate_1.getFilesBySpecs; } });
Object.defineProperty(exports, "snippetsProvider", { enumerable: true, get: function () { return pontx_generate_1.snippetsProvider; } });
const ejs = require("ejs");
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
const mySnippetsProvider = (info) => {
    const defaultSnippets = (0, pontx_generate_1.snippetsProvider)(info, info.options);
    return defaultSnippets;
};
// 获取ejs模板
function getEjsTemplate(pathName, data, opts) {
    return new Promise((resolve, reject) => {
        const ejsTemplate = fs.readFileSync(path.resolve(__dirname, pathName), "utf-8");
        ejs
            .render(ejsTemplate, data, opts)
            .then((text) => resolve(text))
            .catch(reject);
    });
}
// 获取每个api的结构
function getApiTemplate(api, name, originName) {
    const normalParams = api?.parameters?.filter((param) => param.in === "path" || param.in === "query");
    const paramTypes = pontx_generate_1.TypeScriptGenerator.generateParametersTsCode(api, name, true);
    const bodyParam = api.parameters?.find((param) => param.in === "body");
    return {
        namespace: name.replace(/\//g, ""),
        params: normalParams?.length ? paramTypes : "",
        body: `${bodyParam
            ? "export type Body = " +
                pontx_generate_1.TypeScriptGenerator.generateSchemaCode(bodyParam.schema, originName).replace(/\//g, "")
            : ""}`,
        response: `${api?.responses?.["200"]?.schema
            ? "export type Response = " +
                pontx_generate_1.TypeScriptGenerator.generateSchemaCode(api.responses["200"]?.schema, originName).replace(/\//g, "")
            : "export type Response = any;"}`,
        title: api.title || api.deprecated || api.deprecated || api.summary,
        method: api.method,
        path: api.path.replace(/\{/g, "${params."),
    };
}
// 获取每个origin的内容
async function getOriginContent(origin) {
    const apiResult = await getEjsTemplate(path.join(__dirname, "../template/api.ejs"), {
        name: origin.name,
        content: _.map(origin.spec.apis, (api, name) => getApiTemplate(api, name, origin.name)),
    }, { async: true });
    const defsResult = await getEjsTemplate(path.join(__dirname, "../template/defs.ejs"), {
        name: origin.name,
        content: `${_.map(origin.spec.definitions, (schema, name) => {
            return (0, pontx_generate_1.indentation)(2)(`export class ${name} ` +
                pontx_generate_1.TypeScriptGenerator.generateSchemaCode(schema, origin.name));
        }).join("\n\n")}`,
    }, { async: true });
    return {
        [`${origin.name}`]: {
            [`api.ts`]: apiResult,
            [`defs.d.ts`]: defsResult,
        },
    };
}
const myFilesGenerator = async (origins) => {
    const originContent = await Promise.all(origins.map(origin => getOriginContent(origin)));
    const indexResult = await getEjsTemplate(path.join(__dirname, "../template/index.ejs"), { names: origins.map((item) => item.name) }, { async: true });
    let result = {
        [`index.ts`]: indexResult,
    };
    originContent.forEach((item) => {
        result = {
            ...result,
            ...item,
        };
    });
    return result;
};
exports.reactHooksGeneratePlugin = (0, pontx_generate_1.createPontxGeneratePlugin)({
    snippetsProvider: mySnippetsProvider,
    getFilesBySpecs: myFilesGenerator,
});
exports.default = exports.reactHooksGeneratePlugin;
