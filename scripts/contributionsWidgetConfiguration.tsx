///<reference types="vss-web-extension-sdk" />
import "promise-polyfill/src/polyfill";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Toggle } from "office-ui-fabric-react/lib-amd/components/Toggle";

import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib-amd/components/Dropdown";

import { ContributionName } from "./data/contracts";
import { defaultFilter, IContributionFilter } from "./filter";
import { IdentityPicker } from "./controls/IdentityPicker";

type UserMode = "specific" | "all";

interface ExtendedFilter extends IContributionFilter {
  userMode: UserMode;
}

interface ConfigurationProps {
  filter: ExtendedFilter;
  onChange: (filter: ExtendedFilter) => void;
}

const userModeOptions: IDropdownOption[] = [
  { key: "specific", text: "Specific users" },
  { key: "all", text: "All contributors" },
];

class ConfigurationPanel extends React.Component<ConfigurationProps, {}> {
  render() {
    const { filter } = this.props;
    const userMode = filter.userMode || "specific";

    return (
      <div className="configuration-panel">
        <div className="config-section">
          <label className="config-label">Show contributions for</label>
          <Dropdown
            selectedKey={userMode}
            options={userModeOptions}
            onChanged={(option) => this.updateFilter({ userMode: option.key as UserMode })}
          />
        </div>

        {userMode === "specific" && (
          <div className="config-section">
            <label className="config-label">Users</label>
            <IdentityPicker
              identities={filter.identities}
              onIdentityChanged={(identities) => {
                this.updateFilter({ identities });
              }}
              forceValue={true}
              width={280}
              placeholder="Search for a user..."
            />
          </div>
        )}

        <div className="config-section">
          <label className="config-label">Scope</label>
          <Toggle
            checked={filter.allProjects}
            label="All projects"
            onChanged={(checked) => this.updateFilter({ allProjects: checked })}
          />
        </div>

        <div className="config-section">
          <label className="config-label">Contribution Types</label>
          <div className="provider-toggles">
            {this.renderProviderToggle("Commits", "Commit")}
            {this.renderProviderToggle("Created PRs", "CreatePullRequest")}
            {this.renderProviderToggle("Closed PRs", "ClosePullRequest")}
            {this.renderProviderToggle("Reviewed PRs", "ReviewPullRequest")}
            {this.renderProviderToggle("Created Work Items", "CreateWorkItem")}
            {this.renderProviderToggle("Resolved Work Items", "ResolveWorkItem")}
            {this.renderProviderToggle("Closed Work Items", "CloseWorkItem")}
            {this.renderProviderToggle("Changesets (TFVC)", "Changeset")}
          </div>
        </div>
      </div>
    );
  }

  private renderProviderToggle(label: string, provider: ContributionName) {
    const { filter } = this.props;
    return (
      <Toggle
        key={provider}
        checked={filter.enabledProviders[provider]}
        label={label}
        onChanged={(checked) => this.updateProvider(provider, checked)}
      />
    );
  }

  private updateFilter(partial: Partial<ExtendedFilter>) {
    const updatedFilter = { ...this.props.filter, ...partial };
    this.props.onChange(updatedFilter);
  }

  private updateProvider(provider: ContributionName, enabled: boolean) {
    const enabledProviders = { ...this.props.filter.enabledProviders };
    enabledProviders[provider] = enabled;
    this.updateFilter({ enabledProviders });
  }
}

interface WidgetSettings {
  filter: ExtendedFilter;
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
    WidgetHelpers.IncludeWidgetConfigurationStyles();

    VSS.register("ContributionsWidget-Configuration", () => {
      const container = document.querySelector(".configuration-container");
      let currentFilter: ExtendedFilter;
      let notifyChange: (eventName: string, eventArgs: any) => void;

      const handleFilterChange = (filter: ExtendedFilter) => {
        currentFilter = filter;

        // Re-render the panel
        ReactDOM.render(
          <ConfigurationPanel filter={filter} onChange={handleFilterChange} />,
          container
        );

        // Notify the widget of the change
        if (notifyChange) {
          const settings: WidgetSettings = { filter };
          notifyChange(
            WidgetHelpers.WidgetEvent.ConfigurationChange,
            WidgetHelpers.WidgetEvent.Args({
              data: JSON.stringify(settings),
            })
          );
        }
      };

      return {
        load: async (widgetSettings: any, widgetConfigurationContext: any) => {
          notifyChange = widgetConfigurationContext.notify.bind(widgetConfigurationContext);

          const settings = parseSettings(widgetSettings.customSettings.data);
          const baseFilter = settings.filter || (await defaultFilter.getValue());
          currentFilter = { ...baseFilter, userMode: baseFilter.userMode || "specific" };

          ReactDOM.render(
            <ConfigurationPanel filter={currentFilter} onChange={handleFilterChange} />,
            container
          );

          return WidgetHelpers.WidgetStatusHelper.Success();
        },
        onSave: () => {
          const settings: WidgetSettings = { filter: currentFilter };
          return WidgetHelpers.WidgetConfigurationSave.Valid({
            data: JSON.stringify(settings),
          });
        },
      };
    });

    VSS.notifyLoadSucceeded();
  }
);
