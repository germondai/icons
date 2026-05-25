import { Value } from "@sinclair/typebox/value"
import { t } from "elysia"

const schema = t.Object({
  NODE_ENV: t.Union(
    [t.Literal("development"), t.Literal("production"), t.Literal("test"), t.Literal("staging"), t.Literal("local")],
    { default: "development" },
  ),
  PORT: t.Number({ default: 3000 }),
})

export const env = Value.Parse(schema, {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
})

export type Env = typeof env
