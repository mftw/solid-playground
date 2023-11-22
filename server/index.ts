import { GraphQLServer, PubSub } from "graphql-yoga";
import { IResolvers } from "graphql-tools";
import { faker } from "@faker-js/faker";

const GRID_CHANNEL = "GRID_CHANNEL";
const MOUSE_CHANNEL = "MOUSE_CHANNEL";

const pubsub = new PubSub();

const mousePos: MousePos = {
  x: 0,
  y: 0,
};

const typeDefs = `
  type MousePos {
    x: Float!
    y: Float!
  }
  type DataPoint {
    id: ID!
    value: Float!
  }
  type Row {
    id: ID!
    name: String!
    cells: [DataPoint!]!
    subRows: [Row]
  }
  type Grid {
    rows: [Row!]!
  }
  type Query {
    getGrid: Grid!
    getMousePos: MousePos!
  }
  type Mutation {
    setDataPoint(id: ID!, value: Float!): DataPoint
    setMousePos(x: Float!, y: Float!): MousePos
  }
  type Subscription {
    grid: DataPoint!
    mouse: MousePos!
  }
`;

type MousePos = {
  x: number;
  y: number;
};

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
type Grid = {
  rows: Row[];
};
const makeId = () => Math.random().toString(16).slice(2)
const createDataPoint = (): DataPoint => ({
  id: makeId(),
  // value: Number((Math.random() * 100).toFixed(3)),
  value: 0,
});

// const createRow = (numCells = 10): Row => ({
//   name: `${faker.person.firstName()} ${faker.person.lastName()}`,
//   cells: Array.from({ length: numCells }, () => createDataPoint()),
// });

// const createGroup = (numRows = 10, numCells = numRows): Group => ({
//   name: faker.company.buzzVerb(),
//   rows: Array.from({ length: numRows }, () => createRow(numCells)),
// });

// const createGrid = (
//   numGroups = 10,
//   numRows = numGroups,
//   numCells = numGroups
// ): Grid => ({
//   groups: Array.from({ length: numGroups }, () =>
//     createGroup(numRows, numCells)
//   ),
// });

const createRow2 = (numCells = 10, numSubrows = 3, depth = 3): Row => {
  const row: Row = {
    // name: faker.airline.airplane().name,
    id: makeId(),
    name: faker.company.name(),
    cells: Array.from({ length: numCells }, () => createDataPoint()),
  };
  if (depth) {
    row.subRows = Array.from({ length: numSubrows }, () =>
      createRow2(numCells, numSubrows, depth - 1)
    );
  }
  return row;
};

const createGrid2 = (
  numRows = 3,
  numSubRows = numRows,
  numCells = numRows
): Grid => ({
  rows: Array.from({ length: numRows }, () => createRow2(numCells, numSubRows, 4))
  // .map(row => {
  //   // const totals = row.
  //   if (row.subRows) {
  //     row.cells = row.cells.map((_, i) => {

  //     })
  //   }
  //   return row
  // }),
});

// const calcTotal = (row: Row) => {

// }

// const createGrid3 = (
//   numRows = 3,
//   numSubRows = numRows,
//   numCells = numRows
// ): Grid => ({
//   rows: Array.from({ length: numRows }, () => createRow2(numCells, numSubRows, 4)),
// });

// const grid = createGrid(2, 10, 5);
const grid = createGrid2(4, 8, 10);

const findPointInGrid = (grid: Grid, cellId: string) => {
  const recurse = (rows: Row[]): DataPoint | undefined => {
    for (const row of rows) {
      const dataPoint = row.cells.find((cell) => cell.id === cellId);
      if (dataPoint) {
        return dataPoint;
      }
      if (row.subRows) {
        return recurse(row.subRows);
      }
    }
  };
  const dataPoint = recurse(grid.rows);
  if (dataPoint) {
    return dataPoint;
  }
  throw new Error("No data point");
};

const resolvers: IResolvers<any, { pubsub: PubSub; pubsub2: PubSub }> = {
  Query: {
    getGrid: () => grid,
    getMousePos: () => mousePos,
  },
  Mutation: {
    setDataPoint: (_: unknown, { id, value }: DataPoint, { pubsub }) => {
      const dataPoint = findPointInGrid(grid, id);
      dataPoint.value = value;
      pubsub.publish(GRID_CHANNEL, { grid: dataPoint });
      return dataPoint;
    },
    setMousePos: (_: unknown, { x, y }: MousePos, { pubsub }) => {
      mousePos.x = x;
      mousePos.y = y;
      pubsub.publish(MOUSE_CHANNEL, { mouse: mousePos });
      return mousePos;
    },
  },
  Subscription: {
    grid: {
      subscribe: () => {
        return pubsub.asyncIterator(GRID_CHANNEL);
      },
    },
    mouse: {
      subscribe: () => {
        console.log("NEW SUBSCRIPTION!");
        return pubsub.asyncIterator(MOUSE_CHANNEL);
      },
    },
  },
};

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: ({ request, connection }) => {
    return {
      pubsub,
      request,
      connection,
    };
  },
});
server.start(() => console.log("Server is running on http://localhost:4000"));
