///<reference types="vss-web-extension-sdk" />
import "promise-polyfill/src/polyfill";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib-amd/components/Dropdown";

import { IUserContributions } from "./data/contracts";
import { getContributions } from "./data/provider";
import { getIdentities } from "./data/identities/getIdentities";
import { defaultFilter, IContributionFilter } from "./filter";
import { WidgetGraph } from "./controls/WidgetGraph";
import { IIdentity } from "./controls/IdentityPicker";

type UserMode = "specific" | "all";

interface ExtendedFilter extends IContributionFilter {
  userMode?: UserMode;
}

interface WidgetSettings {
  filter: ExtendedFilter;
}

interface WidgetState {
  contributions: IUserContributions[];
  allUsers: IIdentity[];
  selectedUserId: string | null; // null means "All users"
  loading: boolean;
  error?: string;
}

class ContributionsWidget extends React.Component<{ settings: WidgetSettings }, WidgetState> {
  constructor(props: { settings: WidgetSettings }) {
    super(props);
    this.state = {
      contributions: [],
      allUsers: [],
      selectedUserId: null,
      loading: true,
    };
  }

  componentDidMount() {
    this.loadContributions();
  }

  componentDidUpdate(prevProps: { settings: WidgetSettings }) {
    if (JSON.stringify(prevProps.settings) !== JSON.stringify(this.props.settings)) {
      this.loadContributions();
    }
  }

  async loadContributions() {
    this.setState({ loading: true, error: undefined });
    try {
      const filter = this.props.settings.filter;
      let identities = filter.identities;
      let allUsers: IIdentity[] = [];

      // If "all" mode, fetch all team members
      if (filter.userMode === "all") {
        const project = filter.allProjects ? undefined : VSS.getWebContext().project;
        const allIdentities = await getIdentities(project);
        // Filter out teams (containers) and map to IIdentity format
        allUsers = allIdentities
          .filter((id) => !id.isContainer)
          .map(
            (id): IIdentity => ({
              displayName: id.displayName,
              id: id.id,
              uniqueName: id.uniqueName || "",
              imageUrl: id.imageUrl || "",
            })
          )
          .sort((a, b) => a.displayName.localeCompare(b.displayName));

        // If a specific user is selected, only fetch for that user
        const { selectedUserId } = this.state;
        if (selectedUserId) {
          identities = allUsers.filter((u) => u.id === selectedUserId);
        } else {
          identities = allUsers;
        }
      }

      const effectiveFilter: IContributionFilter = {
        ...filter,
        identities,
      };

      const contributions = await getContributions(effectiveFilter);
      this.setState({ contributions, allUsers, loading: false });
    } catch (error) {
      console.error("Error loading contributions:", error);
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load contributions",
      });
    }
  }

  handleUserChange(option: IDropdownOption) {
    const selectedUserId = option.key === "all" ? null : (option.key as string);
    this.setState({ selectedUserId }, () => this.loadContributions());
  }

  render() {
    const { loading, error, contributions, allUsers, selectedUserId } = this.state;
    const { filter } = this.props.settings;
    const isAllMode = filter.userMode === "all";

    if (loading) {
      return (
        <div className="widget-loading">
          <div className="loading-spinner"></div>
          <span>Loading contributions...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="widget-error">
          <span>Error: {error}</span>
        </div>
      );
    }

    // Build user dropdown options when in "all" mode
    const userOptions: IDropdownOption[] = isAllMode
      ? [
          { key: "all", text: "All contributors" },
          ...allUsers.map((u) => ({ key: u.id, text: u.displayName })),
        ]
      : [];

    if (contributions.length === 0) {
      return (
        <div className="widget-empty">
          {isAllMode && allUsers.length > 0 && (
            <div className="user-filter">
              <Dropdown
                selectedKey={selectedUserId || "all"}
                options={userOptions}
                onChanged={(o) => this.handleUserChange(o)}
              />
            </div>
          )}
          <span>No contributions found</span>
        </div>
      );
    }

    return (
      <div className="widget-content">
        {isAllMode && allUsers.length > 0 && (
          <div className="user-filter">
            <Dropdown
              selectedKey={selectedUserId || "all"}
              options={userOptions}
              onChanged={(o) => this.handleUserChange(o)}
            />
          </div>
        )}
        {contributions.map((userContributions, index) => (
          <WidgetGraph key={userContributions.key || index} contributions={userContributions} />
        ))}
      </div>
    );
  }
}

function parseSettings(customSettings: string | null): WidgetSettings {
  if (customSettings) {
    try {
      return JSON.parse(customSettings);
    } catch (e) {
      console.warn("Failed to parse widget settings:", e);
    }
  }
  return { filter: null as any };
}

VSS.require(
  ["TFS/Dashboards/WidgetHelpers"],
  (WidgetHelpers: typeof import("TFS/Dashboards/WidgetHelpers")) => {
    WidgetHelpers.IncludeWidgetStyles();

    VSS.register("ContributionsWidget", () => {
      const container = document.querySelector(".widget-container");

      const renderWidget = async (widgetSettings: any): Promise<any> => {
        try {
          const settings = parseSettings(widgetSettings.customSettings.data);

          // Use default filter if no settings configured
          let filter = settings.filter;
          if (!filter) {
            filter = await defaultFilter.getValue();
          }

          ReactDOM.render(<ContributionsWidget settings={{ filter }} />, container);

          return WidgetHelpers.WidgetStatusHelper.Success();
        } catch (error) {
          console.error("Widget render error:", error);
          const message = error instanceof Error ? error.message : "Unknown error";
          return WidgetHelpers.WidgetStatusHelper.Failure(message);
        }
      };

      return {
        load: (widgetSettings: any) => {
          return renderWidget(widgetSettings);
        },
        reload: (widgetSettings: any) => {
          return renderWidget(widgetSettings);
        },
      };
    });

    VSS.notifyLoadSucceeded();
  }
);
