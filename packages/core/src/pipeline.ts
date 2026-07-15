import type { OptimizerMiddleware, OptimizerMiddlewareContext } from "./types.js";

export class MiddlewarePipeline {
  constructor(private readonly middlewares: OptimizerMiddleware[]) {}

  async execute(context: OptimizerMiddlewareContext): Promise<void> {
    let index = -1;
    const dispatch = async (current: number): Promise<void> => {
      if (current <= index) {
        throw new Error("next() called multiple times");
      }
      index = current;
      const middleware = this.middlewares[current];
      if (!middleware) {
        return;
      }
      await middleware(context, () => dispatch(current + 1));
    };

    await dispatch(0);
  }
}
