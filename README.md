# pontx-react-ts

本插件是根据 [pontx](https://github.com/pontjs/pontx/blob/main/README.md) 结合 react 请求库 `swr` 生成react API请求服务，方便大家使用。

## 使用方式

1. 执行 `npm install pontx-react-ts -D`

2. 在 `pontx-config.json`中新增`"generate":"pontx-react-ts"`

```json
{
  "outDir": "../src/pontx-services",
  "plugins": {
    // pontx built-in plugin or your custom plugin
    "generate":"pontx-react-ts"
  },
  "origins": [{
    // Pontx support mulitple origins in one project.
    // Pontx support OAS2、OAS3 origin by default. You can contribute Pontx Parse Plugin to support other type of origin.
    "name": "name1",
    "url": "myhost/v2/api-docs.json"
  }, {
    "name": "name2",
    "envs": {
      "daily": "my-daily-host/v2/api-docs.json",
      "pre": "my-pre-host/v2/api-docs.json",
      "prod": "myhost/v2/api-docs.json",
    },
    "env": "prod"
  }]
}
```

3. 在根目录 新增`utils/service.ts` 可参考当前插件目录中 `./template/service.ts`
