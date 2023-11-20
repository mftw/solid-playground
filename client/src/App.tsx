import type { Component, JSX } from "solid-js";
import {
  // createResource,
  For,
  createSignal,
  Show,
  createEffect,
  onCleanup,
  createMemo,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import {
  cacheExchange,
  createClient,
  fetchExchange,
  subscriptionExchange,
  // defaultExchanges,
} from "@urql/core";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { pipe, subscribe } from "wonka";
// import { createClient as createWSClient } from "graphql-ws";

const subscriptionClient = new SubscriptionClient("ws://localhost:4000", {
  reconnect: true,
});
// const subscriptionClientGQL = createWSClient({
//   url: "ws://localhost:4000",
//   // reconnect: true,
// });

const client = createClient({
  url: "http://localhost:4000",
  exchanges: [
    // ...defaultExchanges,
    cacheExchange,
    fetchExchange,
    subscriptionExchange({
      forwardSubscription: operation => subscriptionClient.request(operation) as any,
    }),
    // subscriptionExchange({
    //   forwardSubscription(request) {
    //     console.log(request)
    //     const input = { ...request, query: request.query || '' };
    //     return {
    //       subscribe(sink) {
    //         const unsubscribe = subscriptionClientGQL.subscribe(input, sink);
    //         return { unsubscribe };
    //       },
    //     };
    //   },
    // })
  ],
});

type Row2 = {
  cells: DataPoint[];
  subRows?: Row2[]
}

type DataPoint = {
  id: string;
  value: number;
};

type Row = {
  name: string;
  cells: DataPoint[];
};

type Group = {
  name: string;
  // totalRow: DataPoint[]
  rows: Row[];
};

type Grid = {
  groups: Group[];
};

pipe(
  client.subscription(
    `
  subscription GridSub {
    grid {
      id
      value
    }
  }
`,
    {}
  ),
  subscribe(result => {
    const { id, value } = result.data.grid as DataPoint;
    setCellValue(id, value);
  })
);

const findPointInGrid = (grid: Grid, id: string) => {
  for (const group of grid.groups) {
    for (const row of group.rows) {
      const dataPoint = row.cells.find(cell => cell.id === id);
      if (dataPoint) {
        return dataPoint;
      }
    }
  }
  throw new Error("No data point");
};

pipe(
  client.query(
    `
      query {
        getGrid {
          groups {
            name
            rows {
              name
              cells {
                id
                value
              }
            }
          }
        }
      }
    `,
    {}
  ),
  subscribe(result => {
    if (!store.groups.length) {
      setStore(result.data.getGrid as Grid);
    }
  })
);

const [store, setStore] = createStore<Grid>({ groups: [] });

const setCellValue = (id: string, val: number) =>
  setStore(
    produce(store => {
      const cell = findPointInGrid(store as Grid, id);
      cell.value = val;
    })
  );

// pipe(
//   client.query(
//     `
//     query {
//       getMousePos {
//         x
//         y
//       }
//     }
//   `,
//     {}
//   ),
//   subscribe((result) => {
//     // if (!store.rows.length) {
//     // }
//     setMouseState(result.data.getMousePos);
//   })
// );

pipe(
  client.subscription(
    `
    subscription MouseSub {
      mouse {
        x
        y
      }
    }
  `,
    {}
  ),
  subscribe(result => {
    setMouseState(result.data.mouse as MousePos);
  })
);
type MousePos = {
  x: number;
  y: number;
};
const [mouseState, setMouseState] = createSignal<MousePos | null>(null);

const MousePosIndicator = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: `${mouseState().y + 10}px`,
        left: `${mouseState().x + 10}px`,
        width: "50px",
        height: "50px",
        "background-color": "#f0f",
        transform: "rotate(-45deg)",
      }}
    />
  );
};

const App: Component = () => {
  const totalsOfTotals = createMemo<number[]>(() => {
    if (!store.groups?.length) {
      return [];
    }
    const length = store.groups[0].rows[0].cells.length;
    const totals = Array.from({ length }, (_, i) => {
      const colTotal = store.groups.reduce((acc, group) => {
        const gTotal = group.rows.reduce((acc, row) => {
          return acc + row.cells[i].value;
        }, 0);
        return acc + gTotal;
      }, 0);
      return colTotal;
    });
    return [...totals, totals.reduce((acc, total) => acc + total, 0)];
  });
  return (
    <div>
      {/* <RenderOtherUsers /> */}
      <Show when={store.groups.length}>
        <div style={{ display: "flex", "flex-direction": "row" }}>
          <p style={{ "min-width": rowHeaderWidth + "px" }}>Grand totals</p>
          <For each={totalsOfTotals()}>{total => <TotalCell value={total} />}</For>
        </div>
        <For each={store.groups}>{group => <RenderGroup group={group} />}</For>
      </Show>
    </div>
  );
};

const isBadNumber = (num: number) => {
  return Number.isNaN(num) || num === Infinity || num === -Infinity;
};

const RenderGroup = (props: { group: Group }) => {
  const totals = createMemo(() => {
    const length = props.group.rows[0].cells.length;
    const totals = Array.from({ length }, (_, i) => {
      return props.group.rows.reduce((acc, row) => acc + row.cells[i].value, 0);
    });
    return [...totals, totals.reduce((acc, total) => acc + total, 0)];
  });
  return (
    <div>
      <div style={{ display: "flex", "flex-direction": "row" }}>
        <p style={{ "min-width": rowHeaderWidth + "px" }}>{props.group.name}</p>
        <For each={totals()}>{value => <TotalCell value={value} />}</For>
      </div>
      <div>
        <For each={props.group.rows}>{row => <RenderRow row={row} />}</For>
      </div>
    </div>
  );
};

const TotalCell = (props: { value: number }) => {
  return (
    <div
      style={{
        "min-width": cellWidth + "px",
        display: "flex",
        "align-items": "center",
      }}
    >
      {props.value.toFixed(3)}
    </div>
  );
};

const cellWidth = 200;

const RenderCell = (props: { cell: DataPoint }) => {
  return (
    <input
      type="text"
      value={props.cell.value}
      onFocus={e => e.target.select()}
      style={{ "min-width": cellWidth + "px", display: "block" }}
      onInput={async e => {
        const newValue = Number(e.target.value);

        if (isBadNumber(newValue)) {
          console.log(newValue);
          return (e.target.value = String(props.cell.value));
        }
        // setStore(
        //   "rows",
        //   props.rowIndex,
        //   "cells",
        //   props.cellIndex,
        //   "value",
        //   newValue
        // );
        setCellValue(props.cell.id, newValue);
        await client
          .mutation(
            `
            mutation($id: ID!, $value: Float!) {
              setDataPoint(id: $id, value: $value) {
                id
                value
              }
            }`,
            {
              id: props.cell.id,
              value: newValue,
            }
          )
          .toPromise();
      }}
    />
  );
};

const rowHeaderWidth = 280;

const RenderRow = (props: { row: Row }) => {
  const total = createMemo(() => {
    return props.row.cells.reduce((acc, cell) => acc + cell.value, 0);
  });
  return (
    <div style={{ display: "flex", "flex-direction": "row" }}>
      <p style={{ "min-width": rowHeaderWidth + "px", "padding-left": "30px" }}>{props.row.name}</p>
      <For each={props.row.cells}>{cell => <RenderCell cell={cell} />}</For>
      <TotalCell value={total()} />
    </div>
  );
};

const RenderOtherUsers = () => {
  createEffect(() => {
    const handler = async (e: MouseEvent) => {
      const nextMousePos = { x: e.clientX, y: e.clientY };
      setMouseState(nextMousePos);
      await client
        .mutation(
          `
          mutation($x: Float! $y:Float!) {
            setMousePos(x:$x, y:$y) {
              x
              y
            }
          }`,
          nextMousePos
        )
        .toPromise();
    };
    window.addEventListener("mousemove", handler);
    onCleanup(() => {
      window.removeEventListener("mousemove", handler);
    });
  });
  return <>{mouseState() && <MousePosIndicator />}</>;
};

export default App;
