# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

SvgPlotter绘制数据中的点、线、多边形，每个图形元素的id是数据中的实体名字，标注过程中可以通过id找到对应的实体。现在的版本假设实体与图形元素是一一对应的，而且没有考虑实体的层次关系。

DSLManager负责处理和维护用户的输入，将输入解析为一组DSL语句，生成对应的标注元素。后续为了支持更多的标注功能，可以考虑将DSLManager拆分成多个模块。目前给出了四种DSL语句的例子，之后还可以继续扩充。
* {"type":"State","paras":{"target":"东南门"}}
* {"type":"Geography","paras":{"target_1":"东南门","target_2":"邱德拔体育馆","direction":"南","distance":"150米"}}
* {"type":"Trend","paras":{"target_1":"东南门","target_2":"邱德拔体育馆","info":"50人"}}
* {"type":"TextBox","paras":{"target":"东南门", "text":"每小时人流量约为100人"}}

尝试使用GPT的Structured Outputs，将用户输入的自然语言转换为DSL语句，schema：
```javascript
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const stateSchema = z.object({
  highlight: z.string().describe('constantly "State"'),
  paras: z.object({
    target: z.string().describe('Name of entity in the input')
  })
});
const geographySchema = z.object({
  geography: z.string().describe('constantly "Geography"'),
  paras: z.object({
    target_1: z.string().describe('Name of referred entity'),
    target_2: z.string().describe('Name of current entity'),
    direction: z.enum(['东', '南', '西', '北', '']),
    distance: z.string().describe('Distance between entity 1 and entity 2, can be empty string')
  })
});
const trendSchema = z.object({
  trend: z.string().describe('constantly "Trend"'),
  paras: z.object({
    target_1: z.string().describe('Name of entity 1'),
    target_2: z.string().describe('Name of entity 2'),
    info: z.string().describe('Information about the trend')
  })
});
const textBoxSchema = z.object({
  textbox: z.string().describe('constantly "TextBox"'),
  paras: z.object({
    target: z.string().describe('Name of entity to be annotated'),
    text: z.string().describe('Text to be displayed')
  })
});
const outputSchema = z.object({final: z.array(z.union([stateSchema, geographySchema, trendSchema, textBoxSchema]))});
```
四种schema的第一个键不是type是因为GPT structured output schema定义中，union中各类型的第一个key不能一样，后处理中会转换为type。GPT structured output的最外层不能是列表，在输出schema中给DSL列表套了一层final。目前代码可以跑通，但是还需要在prompt中加入对DSL的解释，而且解析效果还需要测试。后续也考虑在prompt中提供实体名称列表，让GPT同时做实体识别。