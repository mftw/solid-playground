import React, { useState, lazy, Suspense } from "react";
import { Solid } from "@merged/react-solid";
import {
  App,
  // count as solidCount,
  setCount as setSolidCount,
} from "./solid/App"; // this is a Solid component
import wait from "./wait";

const BigLazy = lazy(async () => {
  await wait(3000);
  return import("./ReactBig");
});

export const ReactComponent = () => {
  const [count, setCount] = useState(0);
  console.log("React app rendered");
  const handleClick = () => {
    // console.log("clicked!");
    setCount((c) => c + 1);
  };

  return (
    <div>
      Hello from react!
      <button
        onClick={() => {
          console.log("setting solid state");
          setSolidCount(count);
        }}
      >
        Set state from react
      </button>
      <Solid component={App} onClick={handleClick}>
        <span>
          I'm a react child with count of: {count}
          <Suspense fallback={<div>Loading...</div>}>
            <BigLazy />
          </Suspense>
        </span>
      </Solid>
    </div>
  );
};
