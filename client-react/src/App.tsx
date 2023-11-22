// import {
//   // createResource,
//   For,
//   createSignal,
//   Show,
//   createEffect,
//   onCleanup,
//   createMemo,
//   createRenderEffect,
// } from "solid-js";
// import { createStore, produce } from "solid-js/store";
import {
  cacheExchange,
  createClient,
  fetchExchange,
  subscriptionExchange,
  // defaultExchanges,
} from "@urql/core";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { pipe, subscribe } from "wonka";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
      forwardSubscription: (operation) =>
        subscriptionClient.request(operation) as any,
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

type GridContext = {
  grid: Grid;
  setGrid: React.Dispatch<React.SetStateAction<Grid>>;
};
const defaultGridContext: GridContext = {
  grid: { rows: [] },
  setGrid: () => {},
};
const GridContext = createContext<GridContext>(defaultGridContext);

export const GridContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [grid, setGrid] = useState<Grid>(defaultGridContext.grid);
  //   console.log("🚀 ~ file: App.tsx:254 ~ GridContextProvider ~ grid:", grid);
  const fetched = useRef(false);
  useEffect(() => {
    // if (!grid.rows.length)
    if (!fetched.current) {
      const { unsubscribe } = pipe(
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
        subscribe((result) => {
          //   console.log("🚀 ~ file: App.tsx:301 ~ subscribe ~ result:", result)
          //   if (!store.rows.length) {
          // }
          setGrid(result.data.getGrid as Grid);
        })
      );

      fetched.current = true;
      return () => {
        unsubscribe();
      };
    }
  }, []);
  return (
    <GridContext.Provider value={{ grid, setGrid }}>
      {children}
    </GridContext.Provider>
  );
};

const isBadNumber = (num: number) => {
  return Number.isNaN(num) || num === Infinity || num === -Infinity || num < 0;
};

const TotalCell = (props: { value: number }) => {
  return (
    <div
      style={{
        minWidth: cellWidth + "px",
        display: "flex",
        alignItems: "center",
      }}
    >
      {props.value.toFixed(3)}
    </div>
  );
};

const cellWidth = 200;

const RenderCell = (props: {
  cell: DataPoint;
  parentRows: Row[];
  cellIndex: number;
}) => {
  const { setGrid } = useContext(GridContext);
  return (
    <input
      type="text"
      value={props.cell.value}
      onFocus={(e) => e.target.select()}
      style={{ minWidth: cellWidth + "px", display: "block" }}
      onChange={(e) => {
        const newValue = Number(e.target.value);
        const currentValue = props.cell.value;

        if (isBadNumber(newValue)) {
          console.log(newValue);
          //   e.target.value = String(currentValue);
          return;
        }
        const diff = currentValue - newValue;
        const cellIndex = props.cellIndex;
        const lastRow = props.parentRows.length - 1;
        const self = props.parentRows[lastRow];
        const rest = props.parentRows.slice(0, lastRow);
        const restMap = new Map(rest.map((row) => [row.id, row]));
        setGrid((grid) => {
          return {
            ...grid,
            rows: grid.rows
              .map(function mapper(row): Row {
                if (restMap.has(row.id)) {
                  restMap.delete(row.id);
                  return {
                    ...row,
                    cells: row.cells.map((cell, i) => {
                      if (i === cellIndex) {
                        return {    
                          ...cell,
                          value: cell.value - diff,
                        };
                      }
                      return cell;
                    }),
                    ...(row.subRows && { subRows: row.subRows.map(mapper) }),
                  };
                }
                return row;
              })
              .map(function mapper(row): Row {
                if (row.id === self.id) {
                  return {
                    ...row,
                    cells: row.cells.map((cell) => {
                      if (cell.id === props.cell.id) {
                        return {
                          ...cell,
                          value: newValue,
                        };
                      }
                      return cell;
                    }),
                  };
                }
                if (row.subRows) {
                  return {
                    ...row,
                    subRows: row.subRows.map(mapper),
                  };
                }
                return row;
              }),
          };
        });
      }}
    />
  );
};

const rowHeaderWidth = 280;

const RenderRow = ({
  row,
  depth,
  parentRows,
}: {
  row: Row;
  depth?: number;
  parentRows?: Row[];
}) => {
  //   console.log("🚀 ~ file: App.tsx:271 ~ setGrid ~ parentRows:", parentRows)
  const total = useMemo(() => {
    return row.cells.reduce((acc, cell) => acc + cell.value, 0);
  }, [row.cells]);
  return (
    <>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <p
          style={{
            minWidth: rowHeaderWidth + "px",
            paddingLeft: `${(depth || 0) * 20}px`,
          }}
        >
          {row.name} depth is {depth ?? 0}
        </p>
        {row.cells.map((cell, i) => {
          //   console.log("🚀 ~ file: App.tsx:300 ~ {row.cells.map ~ cell:", cell);
          return (
            <RenderCell
              key={cell.id}
              cell={cell}
              parentRows={[...(parentRows || []), row]}
              cellIndex={i}
            />
          );
        })}
        <TotalCell value={total} />
      </div>
      {row.subRows?.map((subRow, i) => (
        <RenderRow
          key={i}
          row={subRow}
          depth={(depth ?? 0) + 1}
          parentRows={[...(parentRows || []), row]}
        />
      ))}
      {/* <Show when={props.row.subRows?.length}>
        <For each={props.row.subRows!}>
          {(row) => (
            <RenderRow
              row={row}
              depth={(props.depth ?? 0) + 1}
              parentRows={[...(props.parentRows || []), props.row]}
            />
          )}
        </For>
      </Show> */}
    </>
  );
};

export const App = () => {
  const { grid } = useContext(GridContext);
  return (
    <div>
      {grid.rows.map((row, i) => (
        <RenderRow row={row} key={i} />
      ))}
    </div>
  );
};
