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

// type Row2 = {
//   cells: DataPoint[];
//   subRows?: Row2[];
// };

type DataPoint = {
  id: string;
  value: number;
};

type Row = {
  id: string;
  name: string;
  cells: DataPoint[];
  subRows?: Row[];
};

type Grid = {
  rows: Row[];
};
// type Row = {
//   name: string;
//   cells: DataPoint[];
// };

// type Group = {
//   name: string;
//   rows: Row[];
// };

// type Grid = {
//   groups: Group[];
// };

// pipe(
//   client.subscription(
//     `
//   subscription GridSub {
//     grid {
//       id
//       value
//     }
//   }
// `,
//     {}
//   ),
//   subscribe(result => {
//     const { id, value } = result.data.grid as DataPoint;
//     setCellValue(id, value);
//   })
// );

// const findPointInGrid = (grid: Grid, cellId: string) => {
//   const recurse = (rows: Row[]): DataPoint | undefined => {
//     for (const row of rows) {
//       const dataPoint = row.cells.find(cell => cell.id === cellId);
//       if (dataPoint) {
//         return dataPoint;
//       }
//       if (row.subRows) {
//         return recurse(row.subRows);
//       }
//     }
//   };
//   const dataPoint = recurse(grid.rows);
//   if (dataPoint) {
//     return dataPoint;
//   }
//   throw new Error("No data point");
// };

// const getCellData = (cellId: string) => {
//   type Result = {
//     cell: DataPoint;
//     rowFamilyTree: Row[];
//     cellIndex: number;
//   };
//   const recurse = (rows: Row[], parents: Row[] = []): Result | undefined => {
//     for (const row of rows) {
//       // const dataPoint = row.cells.find(cell => cell.id === cellId);
//       const cellIndex = row.cells.findIndex(cell => cell.id === cellId);
//       if (cellIndex !== -1) {
//         const cell = row.cells[cellIndex];
//         return { cell, cellIndex, rowFamilyTree: [...parents, row] };
//       }
//       if (row.subRows) {
//         return recurse(row.subRows, [...parents, row]);
//       }
//     }
//   };
//   const dataPoint = recurse(store.rows);
//   if (dataPoint) {
//     return dataPoint;
//   }
//   throw new Error("No data point");
// };

pipe(
  client.query(
    `
      query {
        getGrid {
          rows {
            id
            name
            cells {
              id
              value
            }
            subRows {
              id
              name
              cells {
                id
                value
              }
              subRows {
                id
                name
                cells {
                  id
                  value
                }
                subRows {
                  id
                  name
                  cells {
                    id
                    value
                  }
                }
              }
            }
          }
        }
      }
    `,
    {}
  ),
  subscribe(result => {
    if (!store.rows.length) {
      setStore(result.data.getGrid as Grid);
    }
  })
);

const [store, setStore] = createStore<Grid>({ rows: [] });

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

const setCellValue = (id: string, val: number) =>
  setStore(
    produce(store => {
      // console.log("🚀 ~ file: App.tsx:232 ~ id:", id);
      const { cell, rows, cellIndex } = findPointInGrid(store as Grid, id);
      const currentValue = cell.value;
      cell.value = val;
      const diff = currentValue - val;
      console.log(rows);
      rows.forEach(row => {
        const cell = row.cells[cellIndex];
        cell.value -= diff
      })
    })
  );

function findPointInGrid(grid: Grid, targetId: string) {
  for (const row of grid.rows) {
    const result = findDataPointInRow(row, targetId);
    if (result) {
      return result;
    }
  }

  throw new Error("No data point");
}

function findDataPointInRow(row: Row, targetId: string, parentRows: Row[] = []): { cell: DataPoint; rows: Row[], cellIndex: number } | undefined {
  for (let i = 0; i < row.cells.length; i++) {
    const cell = row.cells[i];
    if (cell.id === targetId) {
      return { cell, rows: [...parentRows, row], cellIndex: i };
    }
  }

  if (row.subRows) {
    for (const subRow of row.subRows) {
      const result = findDataPointInRow(subRow, targetId, [...parentRows, row]);
      if (result) {
        return result;
      }
    }
  }

  return undefined;
}

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
  return (
    <div>
      {/* <RenderOtherUsers /> */}
      <Show when={store.rows.length}>
        <For each={store.rows}>{row => <RenderRow row={row} />}</For>
      </Show>
    </div>
  );
};

const isBadNumber = (num: number) => {
  return Number.isNaN(num) || num === Infinity || num === -Infinity || num < 0;
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

const RenderCell = (props: { cell: DataPoint; parentRows: Row[]; cellIndex: number }) => {
  return (
    <input
      type="text"
      value={props.cell.value}
      onFocus={e => e.target.select()}
      style={{ "min-width": cellWidth + "px", display: "block" }}
      onInput={e => {
        const newValue = Number(e.target.value);
        const currentValue = props.cell.value;

        if (isBadNumber(newValue)) {
          console.log(newValue);
          e.target.value = String(currentValue);
          return;
        }
        const diff = currentValue - newValue;
        const cellIndex = props.cellIndex;
        setStore(
          produce(store => {
            const lastRow = props.parentRows.length - 1;
            props.parentRows.reduce((prevRowSubRows: Row[], { id }, i) => {
              const storeRow = prevRowSubRows.find(row => row.id === id);
              if (i === lastRow) {
                storeRow.cells[cellIndex].value = newValue;
              } else {
                storeRow.cells[cellIndex].value -= diff;
              }
              return storeRow.subRows;
            }, store.rows);
          })
        );
        client
          .mutation(
            `
          mutation($id: ID!, $value: Float!) {
            setDataPoint(id: $id, value: $value) {
              id
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

const RenderRow = (props: { row: Row; depth?: number; parentRows?: Row[] }) => {
  const total = createMemo(() => {
    return props.row.cells.reduce((acc, cell) => acc + cell.value, 0);
  });
  return (
    <>
      <div style={{ display: "flex", "flex-direction": "row" }}>
        <p style={{ "min-width": rowHeaderWidth + "px", "padding-left": `${props.depth * 20}px` }}>
          {props.row.name} depth is {props.depth ?? 0}
        </p>
        <For each={props.row.cells}>{(cell, i) => <RenderCell cell={cell} parentRows={[...(props.parentRows || []), props.row]} cellIndex={i()} />}</For>
        <TotalCell value={total()} />
      </div>
      <Show when={props.row.subRows?.length}>
        <For each={props.row.subRows!}>
          {row => <RenderRow row={row} depth={(props.depth ?? 0) + 1} parentRows={[...(props.parentRows || []), props.row]} />}
        </For>
      </Show>
    </>
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
