import {
  getFilesBySpecs,
  indentation,
  snippetsProvider,
  createPontxGeneratePlugin,
  TypeScriptGenerator,
} from "pontx-generate";
import type { SnippetsProvider, GetFilesBySpecs } from "pontx-generate";
import * as ejs from "ejs";
import * as path from "path";
import * as fs from "fs-extra";
import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { InnerOriginConfig } from "pontx-manager";

const mySnippetsProvider: SnippetsProvider = (info) => {
  const defaultSnippets = snippetsProvider(info, info.options);
  return defaultSnippets;
};
// 获取ejs模板
function getEjsTemplate(
  pathName: string,
  data: { [key: string]: any },
  opts: ejs.Options & {
    async: true;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ejsTemplate = fs.readFileSync(
      path.resolve(__dirname, pathName),
      "utf-8"
    );
    ejs
      .render(ejsTemplate, data, opts)
      .then((text: string) => resolve(text))
      .catch(reject);
  });
}
// 获取每个api的结构
function getApiTemplate(
  api: PontSpec.PontAPI,
  name: string,
  originName: string
) {
  const normalParams = api?.parameters?.filter(
    (param) => param.in === "path" || param.in === "query"
  );
  const paramTypes = TypeScriptGenerator.generateParametersTsCode(
    api,
    name,
    true
  );
  const bodyParam = api.parameters?.find((param) => param.in === "body");
  return {
    namespace: name.replace(/\//g, ""),
    params: normalParams?.length ? paramTypes : "",
    body: `${
      bodyParam
        ? "export type Body = " +
          TypeScriptGenerator.generateSchemaCode(
            bodyParam.schema,
            originName
          ).replace(/\//g, "")
        : ""
    }`,
    response: `${
      api?.responses?.["200"]?.schema
        ? "export type Response = " +
          TypeScriptGenerator.generateSchemaCode(
            api.responses["200"]?.schema,
            originName
          ).replace(/\//g, "")
        : "export type Response = any;"
    }`,
    title: api.title || api.deprecated || api.deprecated || api.summary,
    method: api.method,
    path: api.path.replace(/\{/g, "${params."),
  };
}
// 获取每个origin的内容
async function getOriginContent(origin: {
  spec: PontSpec.PontSpec;
  name: string;
  conf?: InnerOriginConfig;
}) {
  const apiResult = await getEjsTemplate(
    path.join(__dirname, "../template/api.ejs"),
    {
      name: origin.name,
      content: _.map(origin.spec.apis, (api, name) =>
        getApiTemplate(api, name, origin.name)
      ),
    },
    { async: true }
  );
  const defsResult = await getEjsTemplate(
    path.join(__dirname, "../template/defs.ejs"),
    {
      name: origin.name,
      content: `${_.map(origin.spec.definitions, (schema, name) => {
        return indentation(2)(
          `export class ${name} ` +
            TypeScriptGenerator.generateSchemaCode(schema, origin.name)
        );
      }).join("\n\n")}`,
    },
    { async: true }
  );
  return {
    [`${origin.name}`]: {
      [`api.ts`]: apiResult,
      [`defs.d.ts`]: defsResult,
    },
  };
}

const myFilesGenerator: GetFilesBySpecs = async (origins) => {
  const originContent = await Promise.all(origins.map(origin=>getOriginContent(origin)));
  const indexResult = await getEjsTemplate(
    path.join(__dirname, "../template/index.ejs"),
    { names: origins.map((item) => item.name) },
    { async: true }
  );
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

export const reactHooksGeneratePlugin: any = createPontxGeneratePlugin({
  snippetsProvider: mySnippetsProvider,
  getFilesBySpecs: myFilesGenerator,
});

export default reactHooksGeneratePlugin;
export { getFilesBySpecs, snippetsProvider };
