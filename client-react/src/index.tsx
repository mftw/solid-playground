import ReactDOM from "react-dom";
import { GridContextProvider, App } from "./App";
import "./index.css";

ReactDOM.render(
  <GridContextProvider>
    <App />
  </GridContextProvider>,
  document.getElementById("root")
);
// ReactDOM.render(<div>hello</div>, document.getElementById("root"))
