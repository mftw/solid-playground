import { GraphQLServer, PubSub } from "graphql-yoga";
import { IResolvers } from "graphql-tools";
import { faker } from '@faker-js/faker';

const GRID_CHANNEL = "GRID_CHANNEL";
const MOUSE_CHANNEL = "MOUSE_CHANNEL";

const pubsub = new PubSub();

const mousePos: MousePos = {
  x: 0,
  y: 0,
}

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
    name: String!
    cells: [DataPoint!]!
  }
  type Group {
    name: String!
    rows: [Row!]!
  }
  type Grid {
    groups: [Group!]!
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
  rows: Row[];
}

type Grid = {
  groups: Group[];
};

// const createDataPoint = (): DataPoint => ({
//   id: Math.random().toString(16).slice(2),
//   value: Math.random() * 100,
// });
const createDataPoint = (): DataPoint => ({
  id: Math.random().toString(16).slice(2),
  // value: Math.random() * 100,
  value: Number((Math.random() * 100).toFixed(3)),
  // value: 0,
});
const createRow = (numCells = 10): Row => ({
  name: `${faker.person.firstName()} ${faker.person.lastName()}`,
  cells: Array.from({ length: numCells }, () => createDataPoint()),
});
const createGroup = (numRows = 10): Group => ({name: faker.company.buzzVerb(), rows: Array.from({length: numRows}, () => createRow())})
const createGrid = (numGroups = 10): Grid => ({
  groups: Array.from({ length: numGroups }, () => createGroup()),
});

const grid = createGrid()

const findPointInGrid = (grid: Grid, id: string) => {
  for (const group of grid.groups) {
    for (const row of group.rows) {
      const dataPoint = row.cells.find((cell) => cell.id === id);
      if (dataPoint) {
        return dataPoint;
      }
    }
  }
  throw new Error("No data point");
};

const resolvers: IResolvers<any, { pubsub: PubSub, pubsub2: PubSub }> = {
  Query: {
    getGrid: () => grid,
    getMousePos: () => mousePos
  },
  Mutation: {
    setDataPoint: (
      _: unknown,
      { id, value }: DataPoint,
      { pubsub }
    ) => {
      const dataPoint = findPointInGrid(grid, id);
      dataPoint.value = value;
      pubsub.publish(GRID_CHANNEL, { grid: dataPoint })
      return dataPoint
    },
    setMousePos: (
      _: unknown,
      { x, y }: MousePos,
      { pubsub }
    ) => {
      mousePos.x = x;
      mousePos.y = y;
      pubsub.publish(MOUSE_CHANNEL, { mouse: mousePos })
      return mousePos
    }
  },
  Subscription: {
    grid: {
      subscribe: () => {
        return pubsub.asyncIterator(GRID_CHANNEL);
      },
    },
    mouse: {
      subscribe: () => {
        console.log("NEW SUBSCRIPTION!")
        return pubsub.asyncIterator(MOUSE_CHANNEL);
      },
    }
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
