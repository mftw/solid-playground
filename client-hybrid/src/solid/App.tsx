import {
  createSignal,
  type Component,
  type JSX,
  createMemo,
  createEffect,
  createRoot,
  lazy,
  Suspense,
} from "solid-js";
import type { JSX as ReactJSX } from "react";
import wait from "../wait";

const LazyBig = lazy(async () => {
  await wait(4000);
  return import("./Big");
});

interface AppProps {
  onClick: () => void;
  children: JSX.Element | ReactJSX.Element;
}

export const [count, setCount] = createSignal(0);

createRoot(() => {
  createEffect((prevCount) => {
    console.log(`[EFFECT] Count changed from ${prevCount} to ${count()}`);
    return count();
  }, 0);
});

const Counter: Component = (): JSX.Element => {
  return (
    <button onClick={() => setCount((c) => c + 1)}>Count is: {count()}</button>
  );
};

export const App: Component<AppProps> = (props): JSX.Element => {
  console.log("Solid app rendered");

  const double = createMemo(() => count() * 2);
  return (
    <div>
      <button type="button" onClick={() => props.onClick()}>
        Click me solidly!
      </button>
      <p>{props.children as JSX.Element}</p>
      <Counter />
      <Counter />
      <button onClick={() => setCount((c) => c + 2)}>Double inc</button>
      <button onClick={() => setCount((c) => c - 2)}>Double dec</button>
      <div>Double: {double()}</div>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyBig />
      </Suspense>
    </div>
  );
};
