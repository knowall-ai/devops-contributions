import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { DelayedFunction } from "VSS/Utils/Core";

import { IUserContributions } from "../data/contracts";
import { getContributions } from "../data/provider";
import { trackEvent } from "../events";
import { filterToIProperties, IContributionFilter } from "../filter";
import { Timings } from "../timings";
import { Graphs } from "./Graphs";

let renderNum = 0;
let graphsRoot: Root | null = null;

function getRoot(): Root {
  if (!graphsRoot) {
    const graphParent = $(".graphs-container")[0];
    graphsRoot = createRoot(graphParent);
  }
  return graphsRoot;
}

export function renderGraphs(filter: IContributionFilter) {
  const root = getRoot();
  const timings = new Timings();
  const currentRender = ++renderNum;
  /** Don't show the spinner all the time -- rendering the graph takes about 300 ms */
  const showSpinner = new DelayedFunction(null, 400, "showSpinner", () => {
    if (currentRender === renderNum) {
      const loadingContributions = filter.identities.map(
        (user): IUserContributions => ({ key: -1, data: {}, user })
      );
      root.render(
        <Graphs contributions={loadingContributions} loading={true} sharedScale={false} />
      );
      timings.measure("drawSpinner");
    }
  });
  showSpinner.start();
  getContributions(filter).then(
    (contributions) => {
      showSpinner.cancel();
      if (currentRender === renderNum) {
        timings.measure("getContributions");
        root.render(
          <Graphs contributions={contributions} loading={false} sharedScale={filter.sharedScale} />
        );
        timings.measure("drawGraph");
        trackEvent("loadGraph", filterToIProperties(filter), timings.measurements);
      }
    },
    (error) => {
      const message =
        (typeof error === "string" ? error : (error.serverError || error || {}).message) ||
        error + "" ||
        "unknown error";

      // tslint:disable-next-line:no-console
      console.error(error);
      trackEvent("error", { message, stack: error && error.stack });
    }
  );
}
